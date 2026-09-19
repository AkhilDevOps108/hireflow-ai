from __future__ import annotations

from app.models import AuditEvent, Candidate, InterviewEvaluation, Job, MatchResult

jobs_store: dict[str, Job] = {}
candidates_store: dict[str, Candidate] = {}
match_store: dict[str, MatchResult] = {}
evaluation_store: dict[str, InterviewEvaluation] = {}
audit_store: list[AuditEvent] = []
rag_chunk_store: dict[str, dict[str, object]] = {}


def get_jobs_store() -> dict[str, Job]:
    return jobs_store


def get_candidates_store() -> dict[str, Candidate]:
    return candidates_store


def get_match_store() -> dict[str, MatchResult]:
    return match_store


def get_evaluation_store() -> dict[str, InterviewEvaluation]:
    return evaluation_store


def get_audit_store() -> list[AuditEvent]:
    return audit_store


def get_rag_chunk_store() -> dict[str, dict[str, object]]:
    return rag_chunk_store
