from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class Requirement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    priority: str = "must_have"
    source: str = "job-description"


class Job(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str
    department: str
    location: str
    employment_type: str
    description: str
    requirements: list[Requirement] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Candidate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    email: str
    experience_years: float = 0.0
    skills: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    qualifications: list[str] = Field(default_factory=list)
    unclear_information: list[str] = Field(default_factory=list)
    source_file: str = ""
    content: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MatchResult(BaseModel):
    candidate_id: str
    job_id: str
    match_score: int
    score_breakdown: dict[str, int] = Field(default_factory=dict)
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    unclear_areas: list[str] = Field(default_factory=list)
    evidence_confidence: int
    summary: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InterviewQuestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    candidate_id: str
    job_id: str
    question: str
    category: str = "technical"


class InterviewEvaluation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    candidate_id: str
    job_id: str
    requirements_validated: list[str] = Field(default_factory=list)
    requirements_unvalidated: list[str] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)
    summary: str = ""
    status: str = "ready_for_review"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AuditEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    entity_type: str
    entity_id: str
    action: str
    actor: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    details: dict[str, Any] = Field(default_factory=dict)
