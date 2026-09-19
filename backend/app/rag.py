from __future__ import annotations

import math
import re
from collections import Counter
from typing import Any
from uuid import uuid4

from app.storage import rag_chunk_store


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

    return {"entity_type": entity_type, "entity_id": entity_id, "chunks_indexed": indexed}


def query_index(
    query: str,
    top_k: int = 5,
    entity_type: str | None = None,
    entity_id: str | None = None,
) -> list[dict[str, Any]]:
    query_vector = to_sparse_vector(query)
    if not query_vector:
        return []

    scored: list[tuple[float, dict[str, Any]]] = []
    for chunk in rag_chunk_store.values():
        if entity_type and chunk["entity_type"] != entity_type:
            continue
        if entity_id and chunk["entity_id"] != entity_id:
            continue
        score = cosine_similarity(query_vector, chunk["vector"])
        if score <= 0:
            continue
        scored.append((score, chunk))

    scored.sort(key=lambda item: item[0], reverse=True)
    result: list[dict[str, Any]] = []
    for score, chunk in scored[: max(1, top_k)]:
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
