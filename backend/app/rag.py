from __future__ import annotations

import logging
import math
import os
import re
import threading
from collections import Counter
from typing import Any
from uuid import uuid4

from app.storage import rag_chunk_store

try:
    import faiss
except Exception:  # pragma: no cover - runtime dependency may be unavailable
    faiss = None

try:
    import numpy as np
except Exception:  # pragma: no cover - runtime dependency may be unavailable
    np = None

try:
    from sentence_transformers import SentenceTransformer
except Exception:  # pragma: no cover - runtime dependency may be unavailable
    SentenceTransformer = None


logger = logging.getLogger(__name__)

DENSE_WEIGHT = 0.7
SPARSE_WEIGHT = 0.3
DEFAULT_DENSE_MODEL = os.getenv("RAG_EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")

_dense_lock = threading.Lock()
_dense_model: Any | None = None
_dense_model_failed = False
_dense_index: Any | None = None
_dense_chunk_ids: list[str] = []


def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9_+\-/]{2,}", text.lower())


def to_sparse_vector(text: str) -> dict[str, float]:
    tokens = tokenize(text)
    if not tokens:
        return {}
    counts = Counter(tokens)
    total = sum(counts.values())
    return {token: count / total for token, count in counts.items()}


def cosine_similarity(vec_a: dict[str, float], vec_b: dict[str, float]) -> float:
    if not vec_a or not vec_b:
        return 0.0
    dot = sum(value * vec_b.get(token, 0.0) for token, value in vec_a.items())
    norm_a = math.sqrt(sum(value * value for value in vec_a.values()))
    norm_b = math.sqrt(sum(value * value for value in vec_b.values()))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def _get_dense_model() -> Any | None:
    global _dense_model, _dense_model_failed

    if _dense_model_failed:
        return None
    if _dense_model is not None:
        return _dense_model
    if SentenceTransformer is None or np is None or faiss is None:
        return None

    with _dense_lock:
        if _dense_model is not None:
            return _dense_model
        if _dense_model_failed:
            return None
        try:
            _dense_model = SentenceTransformer(DEFAULT_DENSE_MODEL)
            return _dense_model
        except Exception as exc:  # pragma: no cover - depends on runtime/model availability
            _dense_model_failed = True
            logger.warning("Dense model initialization failed, sparse fallback will be used: %s", exc)
            return None


def _encode_texts(texts: list[str]) -> Any | None:
    model = _get_dense_model()
    if model is None or np is None:
        return None
    if not texts:
        return None

    vectors = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
    vectors = np.asarray(vectors, dtype="float32")
    if vectors.ndim == 1:
        vectors = vectors.reshape(1, -1)
    return vectors


def _rebuild_dense_index() -> None:
    global _dense_index, _dense_chunk_ids

    if np is None or faiss is None:
        _dense_index = None
        _dense_chunk_ids = []
        return

    chunk_items = list(rag_chunk_store.values())
    if not chunk_items:
        _dense_index = None
        _dense_chunk_ids = []
        return

    texts = [str(chunk["text"]) for chunk in chunk_items]
    vectors = _encode_texts(texts)
    if vectors is None or len(vectors) == 0:
        _dense_index = None
        _dense_chunk_ids = []
        return

    index = faiss.IndexFlatIP(vectors.shape[1])
    index.add(vectors)
    _dense_index = index
    _dense_chunk_ids = [str(chunk["id"]) for chunk in chunk_items]


def _normalize_scores(score_map: dict[str, float]) -> dict[str, float]:
    if not score_map:
        return {}

    values = list(score_map.values())
    low = min(values)
    high = max(values)
    if math.isclose(low, high):
        return {key: 1.0 for key in score_map}
    span = high - low
    return {key: (value - low) / span for key, value in score_map.items()}


def _dense_query_scores(query: str, allowed_chunk_ids: set[str], top_k: int) -> dict[str, float]:
    if _dense_index is None or not _dense_chunk_ids:
        return {}
    if np is None:
        return {}

    query_vectors = _encode_texts([query])
    if query_vectors is None or len(query_vectors) == 0:
        return {}

    dense_top_k = min(max(top_k * 8, 32), _dense_index.ntotal)
    if dense_top_k <= 0:
        return {}

    scores, indices = _dense_index.search(query_vectors, dense_top_k)
    dense_scores: dict[str, float] = {}
    for score, row_index in zip(scores[0], indices[0]):
        if row_index < 0:
            continue
        chunk_id = _dense_chunk_ids[row_index]
        if chunk_id not in allowed_chunk_ids:
            continue
        dense_scores[chunk_id] = max(float(score), dense_scores.get(chunk_id, float("-inf")))
    return dense_scores


def _sparse_query_scores(chunks: list[dict[str, Any]], query_vector: dict[str, float]) -> dict[str, float]:
    sparse_scores: dict[str, float] = {}
    for chunk in chunks:
        score = cosine_similarity(query_vector, chunk["vector"])
        if score > 0:
            sparse_scores[str(chunk["id"])] = score
    return sparse_scores


def _fuse_scores(sparse_scores: dict[str, float], dense_scores: dict[str, float]) -> dict[str, float]:
    sparse_norm = _normalize_scores(sparse_scores)
    dense_norm = _normalize_scores(dense_scores)
    candidate_ids = set(sparse_norm.keys()) | set(dense_norm.keys())

    fused: dict[str, float] = {}
    for chunk_id in candidate_ids:
        fused[chunk_id] = (dense_norm.get(chunk_id, 0.0) * DENSE_WEIGHT) + (sparse_norm.get(chunk_id, 0.0) * SPARSE_WEIGHT)
    return fused


def split_chunks(text: str, chunk_size: int = 900, overlap: int = 120) -> list[str]:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return []

    chunks: list[str] = []
    start = 0
    step = max(1, chunk_size - overlap)
    while start < len(cleaned):
        end = min(len(cleaned), start + chunk_size)
        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == len(cleaned):
            break
        start += step
    return chunks


def index_document(entity_type: str, entity_id: str, text: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    metadata = metadata or {}
    existing_ids = [
        chunk_id
        for chunk_id, chunk in rag_chunk_store.items()
        if chunk["entity_type"] == entity_type and chunk["entity_id"] == entity_id
    ]
    for chunk_id in existing_ids:
        rag_chunk_store.pop(chunk_id, None)

    chunks = split_chunks(text)
    indexed = 0
    for order, chunk_text in enumerate(chunks):
        vector = to_sparse_vector(chunk_text)
        chunk_id = str(uuid4())
        rag_chunk_store[chunk_id] = {
            "id": chunk_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "chunk_order": order,
            "text": chunk_text,
            "vector": vector,
            "metadata": metadata,
        }
        indexed += 1

    try:
        _rebuild_dense_index()
    except Exception as exc:  # pragma: no cover - dense indexing failures should not break sparse indexing
        logger.warning("Dense index rebuild failed, sparse fallback will be used: %s", exc)

    return {"entity_type": entity_type, "entity_id": entity_id, "chunks_indexed": indexed}


def query_index(
    query: str,
    top_k: int = 5,
    entity_type: str | None = None,
    entity_id: str | None = None,
) -> list[dict[str, Any]]:
    query_vector = to_sparse_vector(query)
    if not query_vector and _dense_index is None:
        return []

    filtered_chunks: list[dict[str, Any]] = []
    for chunk in rag_chunk_store.values():
        if entity_type and chunk["entity_type"] != entity_type:
            continue
        if entity_id and chunk["entity_id"] != entity_id:
            continue
        filtered_chunks.append(chunk)

    if not filtered_chunks:
        return []

    sparse_scores = _sparse_query_scores(filtered_chunks, query_vector) if query_vector else {}
    allowed_chunk_ids = {str(chunk["id"]) for chunk in filtered_chunks}
    dense_scores: dict[str, float] = {}
    try:
        dense_scores = _dense_query_scores(query, allowed_chunk_ids, max(1, top_k))
    except Exception as exc:  # pragma: no cover - runtime safety
        logger.warning("Dense retrieval failed, sparse fallback will be used: %s", exc)

    fused_scores = _fuse_scores(sparse_scores, dense_scores)
    if not fused_scores:
        return []

    chunks_by_id = {str(chunk["id"]): chunk for chunk in filtered_chunks}
    ranked = sorted(fused_scores.items(), key=lambda item: item[1], reverse=True)

    result: list[dict[str, Any]] = []
    for chunk_id, score in ranked[: max(1, top_k)]:
        chunk = chunks_by_id.get(chunk_id)
        if chunk is None:
            continue
        result.append(
            {
                "chunk_id": chunk["id"],
                "score": round(score, 4),
                "entity_type": chunk["entity_type"],
                "entity_id": chunk["entity_id"],
                "text": chunk["text"],
                "metadata": chunk["metadata"],
            }
        )
    return result


def summarize_hits(hits: list[dict[str, Any]]) -> str:
    if not hits:
        return "No relevant evidence found in local indexed resumes or job descriptions."
    lines = []
    for index, hit in enumerate(hits, start=1):
        snippet = hit["text"][:220]
        lines.append(
            f"[{index}] {hit['entity_type']}:{hit['entity_id']} score={hit['score']} evidence={snippet}"
        )
    return "\n".join(lines)
