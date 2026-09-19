from __future__ import annotations

import hashlib
import re

from fastapi import Body, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import get_settings
from app.models import AuditEvent, InterviewEvaluation
from app.providers import get_llm_provider
from app.rag import index_document, query_index, summarize_hits
from app.services import (
    analyze_job_description,
    build_candidate_summary,
    create_candidate_record,
    create_job_record,
    extract_candidate_email,
    extract_candidate_name,
    extract_text_from_upload,
    extract_skills,
    generate_follow_up_questions,
    generate_role_specific_questions,
    group_candidates_for_job,
    list_ranked_candidates,
    map_candidate_to_requirements,
    parse_experience_years,
    search_candidates_with_query,
    summarize_interview_notes,
)
from app.storage import audit_store, candidates_store, evaluation_store, jobs_store

app = FastAPI(title="HireFlow API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_USERS = {
    "recruiter@hireflow.ai": "hireflow123",
    "hiring.manager@hireflow.ai": "hireflow123",
}


class LoginRequest(BaseModel):
    email: str
    password: str


class JobCreateRequest(BaseModel):
    title: str
    department: str
    location: str
    employment_type: str
    description: str


class AgentChatRequest(BaseModel):
    message: str


class InterviewGenerationRequest(BaseModel):
    candidate_id: str
    job_id: str


class CandidateQueryRequest(BaseModel):
    query: str
    job_id: str | None = None


class InterviewFollowupRequest(BaseModel):
    candidate_id: str
    job_id: str
    answer: str


class InterviewAnalysisRequest(BaseModel):
    candidate_id: str
    job_id: str
    notes: str


class RAGQueryRequest(BaseModel):
    query: str
    top_k: int = 5
    entity_type: str | None = None
    entity_id: str | None = None


def build_top_ai_candidates_answer() -> str:
    if not candidates_store:
        return "No candidates are available yet. Upload resumes first, then ask for top AI-skilled candidates."

    ai_skill_markers = {
        "ai",
        "genai",
        "llm",
        "machine learning",
        "mlops",
        "pytorch",
        "tensorflow",
        "scikit-learn",
        "rag",
        "langgraph",
    }

    ranked: list[tuple[int, float, str, str, list[str]]] = []
    for candidate in candidates_store.values():
        normalized = {skill.lower() for skill in candidate.skills}
        matched = sorted(marker for marker in ai_skill_markers if marker in normalized)
        if not matched:
            continue
        score = min(99, 58 + len(matched) * 9 + int(candidate.experience_years * 2))
        ranked.append((score, candidate.experience_years, candidate.name, candidate.email, matched))

    if not ranked:
        return "No candidates with explicit AI-related skills were detected yet. Upload AI-focused resumes or validate extracted skills."

    ranked.sort(key=lambda item: (-item[0], -item[1], item[2]))
    lines = ["Top candidates with AI skills:"]
    for index, (score, experience, name, email, matched) in enumerate(ranked[:5], start=1):
        lines.append(
            f"{index}. {name} ({email}) - score {score}% | experience {experience:.1f} years | AI skills: {', '.join(matched)}"
        )
    return "\n".join(lines)


def _requested_candidate_count(query: str, default: int = 5) -> int:
    lowered = query.lower()
    patterns = [
        r"top\s+(\d+)\s+candidates?",
        r"(\d+)\s+top\s+candidates?",
        r"need\s+(\d+)\s+candidates?",
        r"show\s+(\d+)\s+candidates?",
    ]
    for pattern in patterns:
        match = re.search(pattern, lowered)
        if match:
            return max(1, min(10, int(match.group(1))))
    return default


def _extract_phone_from_content(content: str) -> str:
    matches = re.findall(r"(?:\+?\d[\d\s\-()]{7,}\d)", content)
    for raw in matches:
        digits = re.sub(r"\D", "", raw)
        if len(digits) >= 10:
            return re.sub(r"\s+", " ", raw).strip()
    return "N/A"


def _extract_companies_from_content(content: str) -> list[str]:
    found = re.findall(r"(?:company|client)\s*:?\s*([^\n\r]+)", content, flags=re.IGNORECASE)
    cleaned: list[str] = []
    for item in found:
        token = item.strip(" .,-")
        token = re.sub(r"\s{2,}", " ", token)
        token = re.split(r"\s{2,}|\s+-\s+|\s+\d{4}", token)[0].strip()
        if token and token.lower() not in {c.lower() for c in cleaned}:
            cleaned.append(token)
    return cleaned[:3]


def _is_structured_candidate_request(query: str) -> bool:
    lowered = query.lower()
    hints = ["candidate", "candidates", "jd", "job description", "matching", "top", "role"]
    return any(hint in lowered for hint in hints)


def build_structured_candidates_table(query: str) -> str:
    count = _requested_candidate_count(query, default=5)
    output = search_candidates_with_query(query, job=None, llm_hint="")
    results = output.get("results", [])[:count]
    if not results:
        return "No matching candidates found for this JD query. Upload more resumes or broaden required skills."

    header = [
        "| Rank | Name | Email | Phone | Experience | Key Skills | Companies |",
        "|---|---|---|---|---:|---|---|",
    ]
    rows: list[str] = []
    for index, item in enumerate(results, start=1):
        candidate = candidates_store.get(item.get("candidate_id", ""))
        content = candidate.content if candidate else ""
        phone = _extract_phone_from_content(content) if content else "N/A"
        companies = _extract_companies_from_content(content) if content else []
        company_text = ", ".join(companies) if companies else "N/A"
        skills_text = ", ".join(item.get("skills", [])[:6]) or "N/A"
        rows.append(
            "| "
            f"{index} | {item.get('name', 'N/A')} | {item.get('email', 'N/A')} | {phone} | "
            f"{float(item.get('experience_years', 0)):.1f} yrs | {skills_text} | {company_text} |"
        )

    intro = f"Top {len(results)} candidates matching your JD request:"
    return "\n".join([intro, *header, *rows])


def create_audit_event(entity_type: str, entity_id: str, action: str, actor: str, details: dict[str, object] | None = None) -> None:
    audit_store.append(
        AuditEvent(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor=actor,
            details=details or {},
        )
    )


def hash_token(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": get_settings().app_name}


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "HireFlow backend is running."}


@app.post("/auth/login")
def login(payload: LoginRequest = Body(...)) -> dict[str, object]:
    user = DEFAULT_USERS.get(payload.email)
    if user is None or user != payload.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = f"hf.{hash_token(payload.email)}.{hash_token(payload.password)}"
    return {
        "token": {"access_token": token, "token_type": "bearer"},
        "user": {"email": payload.email, "role": "RECRUITER"},
    }


@app.post("/jobs")
def create_job(payload: JobCreateRequest = Body(...)):
    job = create_job_record(
        payload.title,
        payload.department,
        payload.location,
        payload.employment_type,
        payload.description,
    )
    create_audit_event("job", job.id, "job_created", "recruiter", {"title": job.title})
    return job


@app.post("/jobs/upload-description")
async def create_job_from_description(
    file: UploadFile = File(...),
    title: str = Form("Uploaded Role"),
    department: str = Form("General"),
    location: str = Form("Remote"),
    employment_type: str = Form("Full-time"),
):
    payload = await file.read()
    description = extract_text_from_upload(file.filename or "job_description.txt", file.content_type, payload)
    job = create_job_record(title, department, location, employment_type, description)
    index_document("job", job.id, description, {"title": title, "source": file.filename or "uploaded_jd"})
    create_audit_event("job", job.id, "job_description_uploaded", "recruiter", {"file": file.filename or "unknown"})
    return job


@app.get("/jobs")
def list_jobs():
    return list(jobs_store.values())


@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    job = jobs_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.post("/jobs/{job_id}/analyze")
def analyze_job(job_id: str):
    job = jobs_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    analysis = analyze_job_description(job.description)
    output = {
        "job_id": job.id,
        "title": job.title,
        "requirements": [
            {"id": req.id, "name": req.name, "priority": req.priority, "source": req.source}
            for req in job.requirements
        ],
        "summary": analysis,
    }
    create_audit_event("job", job.id, "job_analyzed", "ai", {"requirements": len(output["requirements"])})
    return output


@app.post("/candidates/upload")
async def upload_candidate(
    file: UploadFile = File(...),
    name: str | None = Form(None),
    email: str | None = Form(None),
):
    payload = await file.read()
    content = extract_text_from_upload(file.filename or "candidate_resume.txt", file.content_type, payload)
    inferred_name = extract_candidate_name(content) or (name or "")
    inferred_email = extract_candidate_email(content) or (email or "")
    inferred_experience = parse_experience_years(content)
    inferred_skills = extract_skills(content)

    candidate = create_candidate_record(
        inferred_name or (file.filename or "Candidate"),
        inferred_email or f"unknown-{len(candidates_store) + 1}@resume.local",
        file.filename or f"{inferred_name or 'candidate'}.pdf",
        content,
    )

    candidate.experience_years = inferred_experience or candidate.experience_years
    candidate.skills = inferred_skills or candidate.skills
    candidate.unclear_information = [
        "Project evidence requires recruiter validation" if not candidate.projects else "",
        "Qualification details require recruiter validation" if not candidate.qualifications else "",
    ]
    candidate.unclear_information = [item for item in candidate.unclear_information if item]

    candidates_store[candidate.id] = candidate
    indexed = index_document(
        "candidate",
        candidate.id,
        content,
        {"name": candidate.name, "email": candidate.email, "source_file": candidate.source_file},
    )
    create_audit_event("candidate", candidate.id, "candidate_uploaded", "recruiter", {"source": candidate.source_file})
    create_audit_event("rag", candidate.id, "rag_indexed", "system", {"chunks": indexed["chunks_indexed"]})
    return candidate


@app.post("/candidates/upload-batch")
async def upload_candidates_batch(files: list[UploadFile] = File(...)):
    created: list[object] = []
    for file in files:
        payload = await file.read()
        content = extract_text_from_upload(file.filename or "candidate_resume.txt", file.content_type, payload)
        inferred_name = extract_candidate_name(content) or (file.filename or "Candidate")
        inferred_email = extract_candidate_email(content) or f"unknown-{len(candidates_store) + 1}@resume.local"
        candidate = create_candidate_record(
            inferred_name,
            inferred_email,
            file.filename or f"{inferred_name}.pdf",
            content,
        )
        candidates_store[candidate.id] = candidate
        index_document(
            "candidate",
            candidate.id,
            content,
            {"name": candidate.name, "email": candidate.email, "source_file": candidate.source_file},
        )
        created.append(candidate)
        create_audit_event("candidate", candidate.id, "candidate_uploaded_batch", "recruiter", {"source": candidate.source_file})
    return {"count": len(created), "candidates": created}


@app.get("/candidates")
def list_candidates():
    return list(candidates_store.values())


@app.get("/candidates/{candidate_id}")
def get_candidate(candidate_id: str):
    candidate = candidates_store.get(candidate_id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@app.get("/candidates/{candidate_id}/summary")
def candidate_summary(candidate_id: str, job_id: str | None = None):
    candidate = candidates_store.get(candidate_id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found")
    job = jobs_store.get(job_id) if job_id else None
    summary = build_candidate_summary(candidate, job)
    create_audit_event("candidate", candidate_id, "candidate_summary_generated", "ai", {"job_id": job_id or "none"})
    return summary


@app.get("/jobs/{job_id}/top-candidates")
def get_top_candidates(job_id: str):
    job = jobs_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    candidates = list_ranked_candidates(job)
    create_audit_event("job", job_id, "top_candidates_requested", "recruiter", {"count": len(candidates)})
    return {"job_id": job_id, "candidates": candidates}


@app.get("/jobs/{job_id}/candidates")
def get_job_candidates(job_id: str):
    job = jobs_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return list_ranked_candidates(job)


@app.get("/jobs/{job_id}/candidate-groups")
def get_candidate_groups(job_id: str):
    job = jobs_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    groups = group_candidates_for_job(job)
    create_audit_event("job", job_id, "candidate_groups_requested", "recruiter", {"groups": list(groups.keys())})
    return {"job_id": job_id, "groups": groups}


@app.get("/jobs/{job_id}/candidates/{candidate_id}/mapping")
def get_candidate_requirement_mapping(job_id: str, candidate_id: str):
    candidate = candidates_store.get(candidate_id)
    job = jobs_store.get(job_id)
    if candidate is None or job is None:
        raise HTTPException(status_code=404, detail="Candidate or job not found")
    mapping = map_candidate_to_requirements(candidate, job)
    create_audit_event("match", f"{candidate_id}:{job_id}", "candidate_mapping_generated", "ai", {"score": mapping["overall_match"]})
    return mapping


@app.post("/candidates/query")
def query_candidates(payload: CandidateQueryRequest = Body(...)):
    job = jobs_store.get(payload.job_id) if payload.job_id else None
    provider = get_llm_provider()
    llm_hint = provider.generate(
        prompt=(
            "Expand this recruiter query into concise search terms and role-related technical keywords. "
            "Return only comma-separated terms. Query: "
            f"{payload.query}"
        ),
        system_prompt="You produce short keyword expansions for candidate search retrieval.",
    )
    if "local fallback mode" in llm_hint.lower():
        llm_hint = ""

    output = search_candidates_with_query(payload.query, job, llm_hint=llm_hint)
    create_audit_event(
        "candidate_search",
        payload.job_id or "global",
        "candidate_query_executed",
        "recruiter",
        {"query": payload.query, "count": output["count"], "llm_hint_used": bool(llm_hint)},
    )
    return output


@app.post("/agent/chat")
def recruiter_agent_chat(payload: AgentChatRequest = Body(...)):
    lower_message = payload.message.lower()
    if "top 10" in lower_message or "top candidates" in lower_message:
        tool = "get_top_candidates"
    elif "aws" in lower_message and "kubernetes" in lower_message:
        tool = "filter_candidates"
    else:
        tool = "search_candidates"

    if tool == "get_top_candidates" and ("ai" in lower_message or "ml" in lower_message or "genai" in lower_message or "llm" in lower_message):
        response_text = build_top_ai_candidates_answer()
        rag_hits = []
    elif _is_structured_candidate_request(payload.message):
        response_text = build_structured_candidates_table(payload.message)
        rag_hits = []
    else:
        rag_hits = query_index(payload.message, top_k=5)
        rag_context = summarize_hits(rag_hits)
        provider = get_llm_provider()
        response_text = provider.generate(
            f"User query: {payload.message}\n\nRetrieved evidence:\n{rag_context}",
            system_prompt=(
                "You are a grounded recruiting assistant. Use only retrieved evidence. "
                "If evidence is insufficient, say what is missing."
            ),
        )

        if "local fallback mode" in response_text.lower():
            raise HTTPException(
                status_code=503,
                detail=(
                    "LLM provider is unavailable. Assistant fallback is disabled for chat queries. "
                    "Check API key validity, model availability, and billing status."
                ),
            )

    create_audit_event(
        "agent",
        "copilot",
        "agent_query_executed",
        "recruiter",
        {"tool": tool, "query": payload.message, "retrieved_chunks": len(rag_hits)},
    )
    return {"answer": response_text, "tool": tool, "status": "ready", "citations": rag_hits}


@app.post("/rag/query")
def rag_query(payload: RAGQueryRequest = Body(...)):
    hits = query_index(
        payload.query,
        top_k=payload.top_k,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
    )
    provider = get_llm_provider()
    evidence = summarize_hits(hits)
    answer = provider.generate(
        f"Query: {payload.query}\n\nEvidence:\n{evidence}",
        system_prompt=(
            "Answer strictly from evidence. Quote missing data clearly. "
            "Do not fabricate candidate details."
        ),
    )
    create_audit_event("rag", payload.entity_id or "global", "rag_query_executed", "recruiter", {"query": payload.query, "hits": len(hits)})
    return {"query": payload.query, "count": len(hits), "hits": hits, "answer": answer}


@app.post("/rag/reindex")
def rag_reindex_all():
    indexed = {"jobs": 0, "candidates": 0, "chunks": 0}
    for job in jobs_store.values():
        response = index_document("job", job.id, job.description, {"title": job.title, "source": "job_record"})
        indexed["jobs"] += 1
        indexed["chunks"] += int(response["chunks_indexed"])

    for candidate in candidates_store.values():
        response = index_document(
            "candidate",
            candidate.id,
            candidate.content,
            {"name": candidate.name, "email": candidate.email, "source_file": candidate.source_file},
        )
        indexed["candidates"] += 1
        indexed["chunks"] += int(response["chunks_indexed"])

    create_audit_event("rag", "global", "rag_reindex_executed", "system", indexed)
    return indexed


@app.post("/interviews/generate")
def generate_interview_questions(payload: InterviewGenerationRequest = Body(...)):
    candidate = candidates_store.get(payload.candidate_id)
    job = jobs_store.get(payload.job_id)
    if candidate is None or job is None:
        raise HTTPException(status_code=404, detail="Candidate or job not found")

    generated = generate_role_specific_questions(candidate, job)
    create_audit_event("interview", f"{payload.candidate_id}:{payload.job_id}", "interview_questions_generated", "ai", {"count": len(generated)})
    return {"candidate_id": payload.candidate_id, "job_id": payload.job_id, "questions": generated}


@app.post("/interviews/followup")
def generate_followup_questions(payload: InterviewFollowupRequest = Body(...)):
    candidate = candidates_store.get(payload.candidate_id)
    job = jobs_store.get(payload.job_id)
    if candidate is None or job is None:
        raise HTTPException(status_code=404, detail="Candidate or job not found")
    follow_ups = generate_follow_up_questions(payload.answer, candidate, job)
    create_audit_event("interview", f"{payload.candidate_id}:{payload.job_id}", "followup_questions_generated", "ai", {"count": len(follow_ups)})
    return {"candidate_id": payload.candidate_id, "job_id": payload.job_id, "follow_up_questions": follow_ups}


@app.post("/interviews/analyze")
def analyze_interview_notes(payload: InterviewAnalysisRequest = Body(...)):
    candidate = candidates_store.get(payload.candidate_id)
    job = jobs_store.get(payload.job_id)
    if candidate is None or job is None:
        raise HTTPException(status_code=404, detail="Candidate or job not found")
    summary = summarize_interview_notes(payload.notes, candidate, job)
    evaluation = InterviewEvaluation(**summary)
    evaluation_store[evaluation.id] = evaluation
    create_audit_event("evaluation", evaluation.id, "interview_evaluation_generated", "ai", {"candidate_id": payload.candidate_id, "job_id": payload.job_id})
    return evaluation


@app.get("/evaluations")
def list_evaluations():
    return list(evaluation_store.values())


@app.get("/audit")
def list_audit_events():
    return [
        {
            "id": event.id,
            "timestamp": event.timestamp,
            "entity_type": event.entity_type,
            "entity_id": event.entity_id,
            "action": event.action,
            "actor": event.actor,
            "details": event.details,
        }
        for event in reversed(audit_store)
    ]
