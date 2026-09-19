from fastapi.testclient import TestClient

import app.rag as rag_module
from app.main import app

client = TestClient(app)


def test_login_flow() -> None:
    response = client.post(
        "/auth/login",
        json={"email": "recruiter@hireflow.ai", "password": "hireflow123"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["email"] == "recruiter@hireflow.ai"
    assert "token" in payload


def test_job_creation_and_listing() -> None:
    response = client.post(
        "/jobs",
        json={
            "title": "Senior MLOps Engineer",
            "department": "Platform",
            "location": "Remote",
            "employment_type": "Full-time",
            "description": "Build AWS infrastructure using Python, Kubernetes, Terraform and Docker.",
        },
    )
    assert response.status_code == 200
    job = response.json()
    assert job["title"] == "Senior MLOps Engineer"

    list_response = client.get("/jobs")
    assert list_response.status_code == 200
    bodies = list_response.json()
    assert any(item["title"] == "Senior MLOps Engineer" for item in bodies)


def test_job_analysis_extracts_requirements() -> None:
    job_response = client.post(
        "/jobs",
        json={
            "title": "Senior MLOps Engineer",
            "department": "Platform",
            "location": "Remote",
            "employment_type": "Full-time",
            "description": "Need Python, AWS, Kubernetes, Terraform, Docker, 4+ years of experience, and LangGraph or RAG.",
        },
    )
    job_id = job_response.json()["id"]

    analyze_response = client.post(f"/jobs/{job_id}/analyze")
    assert analyze_response.status_code == 200
    requirements = analyze_response.json()["requirements"]
    assert any(req["name"] == "Python" for req in requirements)
    assert any(req["name"] == "AWS" for req in requirements)


def test_candidate_upload_and_listing() -> None:
    response = client.post(
        "/candidates/upload",
        files={
            "file": (
                "candidate_a.pdf",
                b"John Doe\nSenior Software Engineer\nEmail: john@example.com\nPython AWS Kubernetes Terraform Docker\n5 years experience",
                "application/pdf",
            )
        },
    )
    assert response.status_code == 200
    candidate = response.json()
    assert candidate["name"] == "John Doe"
    assert candidate["email"] == "john@example.com"
    assert "python" in candidate["skills"]

    listing = client.get("/candidates")
    assert listing.status_code == 200
    data = listing.json()
    assert any(item["email"] == "john@example.com" for item in data)


def test_candidate_upload_extracts_experience_variants() -> None:
    response = client.post(
        "/candidates/upload",
        files={
            "file": (
                "candidate_exp.txt",
                b"Jane Expert\nEmail: jane.expert@example.com\nOverall Experience: 4 yrs 6 months\nPython AWS\n",
                "text/plain",
            )
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["experience_years"] >= 4.4


def test_candidate_upload_extracts_spaced_email() -> None:
    response = client.post(
        "/candidates/upload",
        files={
            "file": (
                "candidate_email.txt",
                b"Akhil Kumar\nContact: akhilkumar.ak102 @ gmail . com\nFrontend Engineer\nReact TypeScript\n",
                "text/plain",
            )
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["email"] == "akhilkumar.ak102@gmail.com"


def test_rag_query_returns_hits_for_uploaded_candidate() -> None:
    upload = client.post(
        "/candidates/upload",
        files={
            "file": (
                "candidate_rag.txt",
                b"Alice Doe\nEmail: alice@example.com\nBuilt Kubernetes platform on AWS using Terraform and Docker.\n",
                "text/plain",
            )
        },
    )
    assert upload.status_code == 200

    rag_response = client.post(
        "/rag/query",
        json={"query": "kubernetes aws terraform", "top_k": 3, "entity_type": "candidate"},
    )
    assert rag_response.status_code == 200
    body = rag_response.json()
    assert body["count"] >= 1
    assert len(body["hits"]) >= 1


def test_rag_query_falls_back_when_dense_search_errors(monkeypatch) -> None:
    upload = client.post(
        "/candidates/upload",
        files={
            "file": (
                "candidate_rag_fallback.txt",
                b"Bob Smith\nEmail: bob@example.com\nPython AWS Kubernetes Terraform Docker\n",
                "text/plain",
            )
        },
    )
    assert upload.status_code == 200

    def broken_dense(*args, **kwargs):
        raise RuntimeError("dense retrieval failure")

    monkeypatch.setattr(rag_module, "_dense_query_scores", broken_dense)
    rag_response = client.post(
        "/rag/query",
        json={"query": "python aws kubernetes", "top_k": 3, "entity_type": "candidate"},
    )
    assert rag_response.status_code == 200
    body = rag_response.json()
    assert body["count"] >= 1
    assert len(body["hits"]) >= 1


def test_top_candidates_endpoint() -> None:
    job_response = client.post(
        "/jobs",
        json={
            "title": "Senior MLOps Engineer",
            "department": "Platform",
            "location": "Remote",
            "employment_type": "Full-time",
            "description": "Python AWS Kubernetes Terraform Docker",
        },
    )
    job_id = job_response.json()["id"]

    upload_response = client.post(
        "/candidates/upload",
        files={"file": ("candidate_b.pdf", b"Python AWS Kubernetes Terraform Docker 5 years experience", "application/pdf")},
        data={"name": "Jane Doe", "email": "jane@example.com"},
    )
    assert upload_response.status_code == 200

    top_response = client.get(f"/jobs/{job_id}/top-candidates")
    assert top_response.status_code == 200
    payload = top_response.json()
    assert "candidates" in payload
    assert len(payload["candidates"]) >= 1


def test_query_candidates_with_frontend_role_text() -> None:
    upload = client.post(
        "/candidates/upload",
        files={
            "file": (
                "candidate_frontend.txt",
                b"Priya Frontend\nEmail: priya.frontend@example.com\n5 years experience\nReact JavaScript TypeScript CSS HTML\n",
                "text/plain",
            )
        },
    )
    assert upload.status_code == 200

    query_response = client.post(
        "/candidates/query",
        json={"query": "i need a good candidate for front end engineer"},
    )
    assert query_response.status_code == 200
    body = query_response.json()
    assert body["count"] >= 1
    top = body["results"][0]
    assert top["match_score"] >= 70
    assert "react" in [skill.lower() for skill in top["skills"]]
