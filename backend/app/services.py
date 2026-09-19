from __future__ import annotations

import math
import io
import re
from typing import Any

from app.models import Candidate, Job, MatchResult, Requirement
from app.storage import candidates_store, jobs_store, match_store

KNOWN_SKILLS = {
    "python",
    "aws",
    "kubernetes",
    "terraform",
    "docker",
    "langgraph",
    "rag",
    "llmops",
    "opentelemetry",
    "azure",
    "gcp",
    "javascript",
    "typescript",
    "java",
    "go",
    "sql",
    "postgres",
    "spark",
    "airflow",
    "mlops",
    "machine learning",
    "genai",
    "llm",
    "data engineering",
    "kafka",
    "redis",
    "microservices",
    "ci/cd",
    "github",
    "linux",
    "bash",
    "node",
    "react",
    "frontend",
    "front-end",
    "css",
    "html",
    "fastapi",
    "pytorch",
    "tensorflow",
    "scikit-learn",
    "rust",
    "elasticsearch",
    "databricks",
    "eks",
    "ecs",
    "lambda",
    "s3",
    "iam",
    "vpc",
    "networking",
    "security",
}

ROLE_KEYWORD_MAP: dict[str, list[str]] = {
    "front end engineer": ["frontend", "front-end", "react", "javascript", "typescript", "css", "html", "node"],
    "frontend engineer": ["frontend", "front-end", "react", "javascript", "typescript", "css", "html", "node"],
    "backend engineer": ["backend", "python", "java", "go", "fastapi", "microservices", "sql", "postgres"],
    "ml engineer": ["machine learning", "pytorch", "tensorflow", "scikit-learn", "mlops", "python"],
    "data engineer": ["data engineering", "spark", "airflow", "kafka", "sql", "python"],
}

QUERY_STOPWORDS = {
    "i",
    "need",
    "a",
    "an",
    "the",
    "for",
    "with",
    "good",
    "candidate",
    "candidates",
    "show",
    "find",
    "me",
    "to",
    "and",
    "or",
    "of",
    "in",
    "on",
    "at",
}


def normalize_skill(skill: str) -> str:
    return re.sub(r"[^a-z0-9+/\- ]+", "", skill.lower()).strip().replace("  ", " ")


def extract_skills(text: str) -> list[str]:
    text_low = text.lower()
    found: list[str] = []
    for skill in sorted(KNOWN_SKILLS, key=len, reverse=True):
        if skill in text_low and skill not in found:
            found.append(skill)
    return found


def parse_experience_years(text: str) -> float:
    patterns = [
        r"(?:overall|total)?\s*experience\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:\+\s*)?(?:years?|yrs?|yoe)\s*(?:(\d+)\s*(?:months?|mos?|m))?",
        r"(\d+)\s*y(?:ears?)?\s*(\d+)\s*m(?:onths?)?\b",
        r"(\d+(?:\.\d+)?)\s*(?:\+\s*)?(?:years?|yrs?|yoe)\b",
        r"(\d+)\+\s*(?:yrs?|years?)\b",
    ]
    lowered = text.lower()

    comprehensive = re.search(patterns[0], lowered, re.IGNORECASE)
    if comprehensive:
        years = float(comprehensive.group(1))
        months_group = comprehensive.group(2)
        if months_group:
            years += float(months_group) / 12.0
        return round(years, 1)

    ym_match = re.search(patterns[1], lowered, re.IGNORECASE)
    if ym_match:
        years = float(ym_match.group(1))
        months = float(ym_match.group(2))
        return round(years + (months / 12.0), 1)

    for pattern in (patterns[2], patterns[3]):
        match = re.search(pattern, lowered, re.IGNORECASE)
        if match:
            return float(match.group(1))
    return 0.0


def extract_text_from_upload(file_name: str, content_type: str | None, payload: bytes) -> str:
    ext = (file_name.rsplit(".", 1)[-1].lower() if "." in file_name else "")
    mime = (content_type or "").lower()

    try:
        if ext == "pdf" or "pdf" in mime:
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(payload))
            pages = [page.extract_text() or "" for page in reader.pages]
            return "\n".join(pages).strip()

        if ext == "docx" or "wordprocessingml" in mime:
            from docx import Document

            document = Document(io.BytesIO(payload))
            paragraphs = [paragraph.text for paragraph in document.paragraphs if paragraph.text.strip()]
            return "\n".join(paragraphs).strip()

        if ext in {"txt", "md", "csv", "json", "log"} or "text/" in mime:
            return payload.decode("utf-8", errors="replace")
    except Exception:
        pass

    text = payload.decode("utf-8", errors="replace")
    if text.count("\uFFFD") > max(5, len(text) // 20):
        return payload.decode("latin-1", errors="replace")
    return text


def extract_candidate_email(text: str) -> str:
    compact = re.sub(r"\s+", " ", text)
    compact = re.sub(r"\s*@\s*", "@", compact)
    compact = re.sub(r"\s*\.\s*", ".", compact)
    direct_match = re.search(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}", compact)
    if direct_match:
        return direct_match.group(0).lower()

    obfuscated = re.search(
        r"([A-Za-z0-9._%+\-]+)\s*(?:@|\(at\)|\[at\]|\sat\s)\s*([A-Za-z0-9\-]+)\s*(?:\.|\(dot\)|\[dot\]|\sdot\s)\s*([A-Za-z]{2,})",
        compact,
        re.IGNORECASE,
    )
    if not obfuscated:
        return ""
    return f"{obfuscated.group(1)}@{obfuscated.group(2)}.{obfuscated.group(3)}".lower()


def extract_candidate_name(text: str) -> str:
    for marker in ["Name:", "Candidate Name:", "Full Name:"]:
        match = re.search(rf"{re.escape(marker)}\s*([A-Z][A-Za-z]+(?:[ \t]+[A-Z][A-Za-z]+)+)", text)
        if match:
            return match.group(1).strip()

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines[:8]:
        cleaned = re.sub(r"\s+", " ", line)
        if len(cleaned) <= 60 and re.fullmatch(r"[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+", cleaned):
            return cleaned
    return ""


def extract_projects(text: str) -> list[str]:
    projects: list[str] = []
    lines = [line.strip(" -\t") for line in text.splitlines() if line.strip()]
    for line in lines:
        lowered = line.lower()
        if any(keyword in lowered for keyword in ["project", "built", "designed", "led", "implemented", "deployed"]):
            cleaned = re.sub(r"\s+", " ", line)
            if 20 <= len(cleaned) <= 180 and cleaned not in projects:
                projects.append(cleaned)
        if len(projects) >= 6:
            break
    return projects


def extract_qualifications(text: str) -> list[str]:
    qualifications: list[str] = []
    patterns = {
        "Bachelor's Degree": r"\b(b\.?(tech|e)|bachelor(?:'s)?\s+degree)\b",
        "Master's Degree": r"\b(m\.?(tech|e|s)|master(?:'s)?\s+degree)\b",
        "AWS Certification": r"\baws\b.{0,30}\b(cert|certified|certification)\b",
        "Kubernetes Certification": r"\b(kubernetes|cka|ckad)\b.{0,30}\b(cert|certified|certification)\b",
        "Terraform Certification": r"\bterraform\b.{0,30}\b(cert|certified|certification)\b",
    }
    lowered = text.lower()
    for label, pattern in patterns.items():
        if re.search(pattern, lowered, re.IGNORECASE):
            qualifications.append(label)
    return qualifications


def analyze_job_description(description: str) -> dict[str, Any]:
    normalized = description.lower()
    must_have: list[str] = []
    nice_to_have: list[str] = []
    primary_stack = {"python", "aws", "kubernetes", "terraform", "docker", "sql", "java", "go", "azure", "gcp", "spark", "kafka", "postgres", "linux", "bash"}

    for skill in sorted(KNOWN_SKILLS, key=len, reverse=True):
        if skill in normalized:
            if skill in primary_stack:
                must_have.append(skill)
            elif skill in {"langgraph", "rag", "llmops", "opentelemetry", "genai", "llm"}:
                nice_to_have.append(skill)

    if not must_have:
        for skill in ["python", "aws", "kubernetes", "terraform", "docker"]:
            if skill in normalized:
                must_have.append(skill)

    required_display = []
    for skill in must_have:
        display = {
            "python": "Python",
            "aws": "AWS",
            "kubernetes": "Kubernetes",
            "terraform": "Terraform",
            "docker": "Docker",
            "sql": "SQL",
            "azure": "Azure",
            "gcp": "GCP",
            "java": "Java",
            "go": "Go",
            "postgres": "PostgreSQL",
            "linux": "Linux",
            "bash": "Bash",
        }.get(skill, skill.title())
        required_display.append(display)

    experience_match = re.search(r"(\d+)\+?\s*years?", description, re.IGNORECASE)
    minimum_experience = int(experience_match.group(1)) if experience_match else 4

    return {
        "must_have": sorted(set(required_display)),
        "nice_to_have": sorted(set(skill.title() for skill in nice_to_have)),
        "minimum_experience_years": minimum_experience,
        "responsibilities": [
            "Build scalable platform systems",
            "Collaborate with engineering teams",
            "Drive cloud operations and reliability",
        ],
    }


def create_job_record(title: str, department: str, location: str, employment_type: str, description: str) -> Job:
    job = Job(title=title, department=department, location=location, employment_type=employment_type, description=description)
    analysis = analyze_job_description(description)
    for skill in analysis["must_have"]:
        job.requirements.append(Requirement(name=skill, priority="must_have", source="job-description"))
    for skill in analysis["nice_to_have"]:
        job.requirements.append(Requirement(name=skill, priority="nice_to_have", source="job-description"))
    if not job.requirements:
        for skill in ["Python", "AWS", "Kubernetes", "Terraform", "Docker"]:
            job.requirements.append(Requirement(name=skill, priority="must_have", source="job-description"))
    jobs_store[job.id] = job
    return job


def create_candidate_record(name: str, email: str, file_name: str, content: str) -> Candidate:
    skills = extract_skills(content)
    experience_years = parse_experience_years(content)
    projects = extract_projects(content)
    qualifications = extract_qualifications(content)
    candidate = Candidate(
        name=name,
        email=email,
        experience_years=experience_years,
        skills=skills,
        projects=projects,
        qualifications=qualifications,
        source_file=file_name or f"{name}.pdf",
        content=content,
    )
    candidates_store[candidate.id] = candidate
    return candidate


def identify_unclear_information(candidate: Candidate, job: Job) -> list[str]:
    unclear: list[str] = []
    if candidate.experience_years <= 0:
        unclear.append("Years of experience require manual validation")
    if not candidate.projects:
        unclear.append("Project evidence not clearly stated")
    if not candidate.qualifications:
        unclear.append("Qualifications or certifications not clearly stated")

    job_requirements = [req.name for req in job.requirements]
    lower_content = candidate.content.lower()
    for req in job_requirements:
        normalized = normalize_skill(req)
        if normalized and normalized not in lower_content and req not in unclear:
            unclear.append(f"Need stronger evidence for requirement: {req}")
    return unclear[:8]


def build_candidate_summary(candidate: Candidate, job: Job | None = None) -> dict[str, Any]:
    job_context = job.title if job else "General talent pool"
    summary = (
        f"{candidate.name} has {candidate.experience_years:.1f} years of experience with "
        f"{', '.join(candidate.skills[:5]) or 'core technical skills not yet extracted'}"
    )
    return {
        "candidate_id": candidate.id,
        "name": candidate.name,
        "email": candidate.email,
        "experience_years": candidate.experience_years,
        "skills": candidate.skills,
        "projects": candidate.projects,
        "qualifications": candidate.qualifications,
        "unclear_information": candidate.unclear_information,
        "summary": f"{summary}. Context: {job_context}.",
    }


def build_score_breakdown(candidate: Candidate, job: Job, matched_count: int, total_requirements: int) -> dict[str, int]:
    required_skills = round((matched_count / total_requirements) * 45) if total_requirements else 0
    minimum_experience = analyze_job_description(job.description)["minimum_experience_years"]
    experience_points = 20 if candidate.experience_years >= minimum_experience else max(0, round((candidate.experience_years / max(1, minimum_experience)) * 20))
    projects_points = min(15, len(candidate.projects) * 5)
    education_points = min(10, len(candidate.qualifications) * 5)
    nice_skills = [req for req in job.requirements if req.priority == "nice_to_have"]
    if not nice_skills:
        nice_to_have_points = 10
    else:
        matched_nice = sum(1 for req in nice_skills if normalize_skill(req.name) in {normalize_skill(skill) for skill in candidate.skills})
        nice_to_have_points = round((matched_nice / len(nice_skills)) * 10)

    return {
        "required_skills": min(45, required_skills),
        "experience": min(20, experience_points),
        "projects": min(15, projects_points),
        "education": min(10, education_points),
        "nice_to_have": min(10, nice_to_have_points),
    }


def score_candidate_for_job(candidate: Candidate, job: Job) -> MatchResult:
    job_requirements = job.requirements
    if not job_requirements:
        job_requirements = [Requirement(name="python", priority="must_have")]  # safe fallback

    candidate_skill_set = {normalize_skill(skill) for skill in candidate.skills}
    matched = [req.name for req in job_requirements if normalize_skill(req.name) in candidate_skill_set]
    missing = [req.name for req in job_requirements if normalize_skill(req.name) not in candidate_skill_set]
    score_breakdown = build_score_breakdown(candidate, job, len(matched), len(job_requirements))
    match_score = sum(score_breakdown.values())
    unclear = identify_unclear_information(candidate, job)

    result = MatchResult(
        candidate_id=candidate.id,
        job_id=job.id,
        match_score=match_score,
        score_breakdown=score_breakdown,
        matched_skills=matched,
        missing_skills=missing[:5],
        unclear_areas=unclear,
        evidence_confidence=min(99, max(70, match_score)),
        summary=f"{candidate.name} matched {len(matched)} of {len(job_requirements)} requirements for {job.title}.",
    )
    match_store[result.candidate_id + ":" + result.job_id] = result
    return result


def list_ranked_candidates(job: Job) -> list[dict[str, Any]]:
    ranked: list[dict[str, Any]] = []
    for candidate in candidates_store.values():
        result = score_candidate_for_job(candidate, job)
        ranked.append(
            {
                "candidate_id": candidate.id,
                "name": candidate.name,
                "email": candidate.email,
                "experience_years": candidate.experience_years,
                "match_score": result.match_score,
                "score_breakdown": result.score_breakdown,
                "matched_skills": result.matched_skills,
                "missing_skills": result.missing_skills,
                "unclear_areas": result.unclear_areas,
                "evidence_confidence": result.evidence_confidence,
            }
        )
    return sorted(ranked, key=lambda item: (-item["match_score"], -item["experience_years"], item["email"]))[:10]


def group_candidates_for_job(job: Job) -> dict[str, list[dict[str, Any]]]:
    grouped = {"strong_match": [], "potential_match": [], "needs_validation": []}
    for candidate in candidates_store.values():
        result = score_candidate_for_job(candidate, job)
        payload = {
            "candidate_id": candidate.id,
            "name": candidate.name,
            "match_score": result.match_score,
            "missing_skills": result.missing_skills,
            "unclear_areas": result.unclear_areas,
        }
        if result.match_score >= 85 and not result.unclear_areas:
            grouped["strong_match"].append(payload)
        elif result.match_score >= 65:
            grouped["potential_match"].append(payload)
        else:
            grouped["needs_validation"].append(payload)
    return grouped


def map_candidate_to_requirements(candidate: Candidate, job: Job) -> dict[str, Any]:
    result = score_candidate_for_job(candidate, job)
    requirement_map: list[dict[str, Any]] = []
    for req in job.requirements:
        normalized = normalize_skill(req.name)
        matched = normalized in {normalize_skill(skill) for skill in candidate.skills}
        requirement_map.append(
            {
                "requirement": req.name,
                "priority": req.priority,
                "status": "verified" if matched else "missing",
                "evidence": (
                    f"Found reference to {req.name} in {candidate.source_file}" if matched else "No explicit evidence found in candidate profile"
                ),
            }
        )

    return {
        "candidate_id": candidate.id,
        "job_id": job.id,
        "overall_match": result.match_score,
        "score_breakdown": result.score_breakdown,
        "requirement_map": requirement_map,
        "missing_information": result.unclear_areas,
        "summary": result.summary,
    }


def generate_role_specific_questions(candidate: Candidate, job: Job) -> list[dict[str, str]]:
    mapped = map_candidate_to_requirements(candidate, job)
    questions: list[dict[str, str]] = []
    categories = ["technical", "architecture", "project_deep_dive", "experience_validation", "behavioral"]
    for index, req in enumerate(mapped["requirement_map"][:5]):
        category = categories[index % len(categories)]
        if req["status"] == "verified":
            question = f"You listed {req['requirement']}. Can you describe a production scenario where you applied it and what measurable impact it had?"
            reason = f"Candidate profile contains evidence for {req['requirement']} and the role requires it."
        else:
            question = f"This role requires {req['requirement']}. Tell me about your direct hands-on exposure and where you used it in recent work."
            reason = f"Requirement {req['requirement']} is not clearly evidenced and needs validation."
        questions.append({"category": category, "question": question, "reason": reason})

    if not questions:
        questions.append(
            {
                "category": "technical",
                "question": "Walk me through your most relevant project for this role and the trade-offs you made.",
                "reason": "Fallback question to validate role alignment when evidence is sparse.",
            }
        )
    return questions


def generate_follow_up_questions(answer: str, candidate: Candidate, job: Job) -> list[str]:
    follow_ups: list[str] = []
    if len(answer.split()) < 20:
        follow_ups.append("Can you provide a concrete example with scale, impact, and your specific ownership?")

    mapping = map_candidate_to_requirements(candidate, job)
    for req in mapping["requirement_map"]:
        if req["status"] == "missing":
            follow_ups.append(f"Please share one project where you used {req['requirement']} and how you validated the outcome.")
        if len(follow_ups) >= 5:
            break
    return follow_ups


def summarize_interview_notes(notes: str, candidate: Candidate, job: Job) -> dict[str, Any]:
    mapping = map_candidate_to_requirements(candidate, job)
    lowered = notes.lower()
    validated: list[str] = []
    unvalidated: list[str] = []
    for req in mapping["requirement_map"]:
        req_name = req["requirement"].lower()
        if req_name in lowered:
            validated.append(req["requirement"])
        else:
            unvalidated.append(req["requirement"])

    follow_ups = [
        f"Ask the candidate to provide deeper evidence for {requirement}."
        for requirement in unvalidated[:5]
    ]
    return {
        "candidate_id": candidate.id,
        "job_id": job.id,
        "requirements_validated": validated,
        "requirements_unvalidated": unvalidated,
        "follow_up_questions": follow_ups,
        "summary": (
            f"Interview notes validated {len(validated)} requirements and left {len(unvalidated)} areas needing follow-up."
        ),
        "status": "ready_for_review" if validated else "needs_human_validation",
    }


def parse_candidate_query_to_filters(query: str) -> dict[str, Any]:
    lowered = query.lower()
    required_skills = [skill for skill in sorted(KNOWN_SKILLS, key=len, reverse=True) if skill in lowered]

    for role_label, role_skills in ROLE_KEYWORD_MAP.items():
        if role_label in lowered:
            for role_skill in role_skills:
                if role_skill not in required_skills:
                    required_skills.append(role_skill)

    experience_match = re.search(r"(?:more than|at least|>=?)\s*(\d+(?:\.\d+)?)\s*years?", lowered)
    min_experience = float(experience_match.group(1)) if experience_match else 0.0
    score_match = re.search(r"(?:above|over|>=?)\s*(\d{2,3})\s*%", lowered)
    min_score = int(score_match.group(1)) if score_match else 0
    excludes = [skill for skill in sorted(KNOWN_SKILLS, key=len, reverse=True) if f"no {skill}" in lowered or f"without {skill}" in lowered]
    return {
        "required_skills": required_skills,
        "excluded_skills": excludes,
        "min_experience": min_experience,
        "min_score": min_score,
    }


def _extract_query_terms(query: str, llm_hint: str = "") -> list[str]:
    combined = f"{query} {llm_hint}".lower()
    raw_terms = re.findall(r"[a-z0-9+#\-.]{2,}", combined)
    terms = [term for term in raw_terms if term not in QUERY_STOPWORDS]

    for known in sorted(KNOWN_SKILLS, key=len, reverse=True):
        if known in combined and known not in terms:
            terms.append(known)

    for role_label, mapped in ROLE_KEYWORD_MAP.items():
        if role_label in combined:
            for item in mapped:
                if item not in terms:
                    terms.append(item)

    deduped: list[str] = []
    for term in terms:
        if term not in deduped:
            deduped.append(term)
    return deduped[:30]


def _compute_keyword_relevance(candidate: Candidate, query_terms: list[str]) -> int:
    if not query_terms:
        return 55

    haystack = " ".join(
        [
            candidate.name,
            candidate.email,
            " ".join(candidate.skills),
            " ".join(candidate.projects),
            " ".join(candidate.qualifications),
            candidate.content,
        ]
    ).lower()

    matched_terms = [term for term in query_terms if term in haystack]
    coverage = len(matched_terms) / max(1, len(query_terms))
    keyword_score = 45 + round(coverage * 45)

    role_bonus = 0
    if any(role in " ".join(query_terms) for role in ["front end engineer", "frontend engineer"]):
        if any(skill in {normalize_skill(s) for s in candidate.skills} for skill in {"react", "javascript", "typescript"}):
            role_bonus += 8

    experience_bonus = min(7, int(candidate.experience_years))
    return min(99, keyword_score + role_bonus + experience_bonus)


def search_candidates_with_query(query: str, job: Job | None = None, llm_hint: str = "") -> dict[str, Any]:
    filters = parse_candidate_query_to_filters(query)
    candidates = list(candidates_store.values())
    query_terms = _extract_query_terms(query, llm_hint)
    if job is not None:
        ranked = {item["candidate_id"]: item for item in list_ranked_candidates(job)}
    else:
        ranked = {}

    results: list[dict[str, Any]] = []
    for candidate in candidates:
        skills_norm = {normalize_skill(skill) for skill in candidate.skills}
        required = [normalize_skill(skill) for skill in filters["required_skills"]]
        required = [skill for skill in required if skill]
        matched_required = [skill for skill in required if skill in skills_norm]
        minimum_required_matches = max(1, math.ceil(len(required) * 0.4)) if required else 0
        has_required = len(matched_required) >= minimum_required_matches if required else True
        has_excluded = any(normalize_skill(skill) in skills_norm for skill in filters["excluded_skills"])
        if not has_required or has_excluded:
            continue
        if candidate.experience_years < filters["min_experience"]:
            continue

        deterministic_score = ranked.get(candidate.id, {}).get("match_score", 0)
        lexical_score = _compute_keyword_relevance(candidate, query_terms)
        score = round((deterministic_score * 0.65) + (lexical_score * 0.35)) if deterministic_score else lexical_score

        if filters["min_score"] and score < filters["min_score"]:
            continue

        results.append(
            {
                "candidate_id": candidate.id,
                "name": candidate.name,
                "email": candidate.email,
                "experience_years": candidate.experience_years,
                "skills": candidate.skills,
                "match_score": score,
                "relevance_score": lexical_score,
                "matched_required_skills": matched_required,
                "required_skill_match_ratio": round((len(matched_required) / len(required)) if required else 1.0, 2),
            }
        )

    return {
        "query": query,
        "llm_hint_used": bool(llm_hint.strip()),
        "query_terms": query_terms,
        "filters": filters,
        "count": len(results),
        "results": sorted(results, key=lambda item: (-item["match_score"], -item["experience_years"], item["name"])),
    }
