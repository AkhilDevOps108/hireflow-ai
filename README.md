# HireFlow AI

![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-2563eb)
![Backend](https://img.shields.io/badge/Backend-FastAPI-16a34a)
![Runtime](https://img.shields.io/badge/Runtime-Docker%20Compose-0ea5e9)
![LLM](https://img.shields.io/badge/LLM-Gemini-f59e0b)

HireFlow is an evidence-first recruitment intelligence platform built for faster, fairer, and more transparent hiring decisions.

It helps recruiters move from unstructured resumes and job descriptions to ranked candidates, explainable matches, interview guidance, and auditable decisions in one workflow.

## Elevator Pitch

Recruiters often review hundreds of resumes manually, with inconsistent criteria and weak traceability.

HireFlow converts resumes and JDs into structured intelligence, uses deterministic scoring + retrieval-backed AI assistance, and returns clear candidate recommendations with evidence.

## The Problem

- Hiring decisions are slowed by manual screening and fragmented tools.
- Keyword-only filtering misses strong candidates and creates noisy shortlists.
- Black-box AI outputs are hard to trust and defend.
- Interview preparation and evaluation are often inconsistent across interviewers.

## Our Solution

HireFlow provides an end-to-end recruiter cockpit:

1. Ingest resumes and job descriptions
2. Extract candidate signals and role requirements
3. Match and rank candidates deterministically
4. Ask copilot questions in natural language
5. Generate interview questions and follow-ups
6. Produce evaluation summaries and audit logs

## Key Features

- Resume ingestion: PDF, DOCX, TXT
- Job description ingestion and requirement extraction
- Deterministic candidate ranking with score breakdowns
- Natural-language candidate query
- Structured copilot responses for top-N candidate asks
- Interview question generation and note analysis
- Audit trail for recruiter and AI actions
- Local-first runtime with optional cloud LLM

## Why This Is Useful for Real Recruiting Teams

- Faster first-pass screening with consistent logic
- Better shortlist quality through skills + experience + context
- Explainability for every recommendation
- Reusable interview intelligence and decision memory

## Architecture

```mermaid
flowchart LR
	UI[Recruiter UI\nReact + TypeScript] --> API[FastAPI Backend]

	API --> INGEST[Ingestion Layer\nResume + JD Upload]
	API --> MATCH[Matching Engine\nDeterministic Scoring]
	API --> COPILOT[Copilot Orchestrator\nTool Selection]
	API --> INTERVIEW[Interview Intelligence]
	API --> AUDIT[Audit Trail]

	INGEST --> EXTRACT[Text Extraction\nPDF/DOCX/TXT]
	EXTRACT --> RAG[Local RAG Index\nChunk + Retrieval]

	MATCH --> CSTORE[(Candidate Store)]
	MATCH --> JSTORE[(Job Store)]

	COPILOT --> RAG
	COPILOT --> LLM[Gemini / OpenAI-Compatible]
```

## Copilot Request Flow

```mermaid
sequenceDiagram
	participant Recruiter
	participant Frontend
	participant Backend
	participant Retrieval
	participant LLM

	Recruiter->>Frontend: Ask hiring question
	Frontend->>Backend: POST /agent/chat
	Backend->>Retrieval: Get relevant evidence
	Backend->>LLM: Generate grounded response
	LLM-->>Backend: Response
	Backend-->>Frontend: Answer + tool + citations
	Frontend-->>Recruiter: Structured, readable output
```

## Technical Stack

- Frontend: React, TypeScript, Vite
- Backend: FastAPI, Pydantic
- Runtime: Docker Compose
- Data: In-memory domain stores (current implementation)
- Optional infra available in compose: Postgres and Redis
- LLM: Gemini (primary), OpenAI-compatible provider (optional)

## Quick Start (3 Minutes)

### 1) Prerequisites

- Docker
- Docker Compose
- Gemini API key

### 2) Configure Environment

```bash
cp .env.example .env
```

Set required values in `.env`:

- `LLM_PROVIDER=gemini`
- `GEMINI_API_KEY=your_key`
- `GEMINI_MODEL=models/gemini-3-flash-preview`

### 3) Start Everything

```bash
docker compose up -d --build
```

### 4) Open App

- Frontend: http://localhost:5173
- Backend: http://localhost:8001
- Health: http://localhost:8001/health

## Environment Variables

### Required

| Variable | Purpose | Example |
|---|---|---|
| `APP_ENV` | Runtime mode | `development` |
| `DATABASE_URL` | DB connection string | `postgresql+psycopg://postgres:postgres@localhost:5433/hireflow` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6380/0` |
| `JWT_SECRET` | App secret | `change-me-in-production` |
| `LLM_PROVIDER` | Active provider | `gemini` |
| `GEMINI_API_KEY` | Gemini API key | `your_key` |
| `GEMINI_MODEL` | Gemini model id | `models/gemini-3-flash-preview` |

### Optional

| Variable | Purpose |
|---|---|
| `GEMINI_USE_GOOGLE_SEARCH` | Enable Gemini web-search tool |
| `LLM_API_KEY` | OpenAI-compatible key |
| `LLM_MODEL` | OpenAI-compatible model |
| `LLM_BASE_URL` | OpenAI-compatible endpoint |
| `EMBEDDING_API_KEY` | Future embedding integration |
| `LANGFUSE_PUBLIC_KEY` | Optional observability |
| `LANGFUSE_SECRET_KEY` | Optional observability |

## Core API Surface

### Platform

- `GET /health`
- `POST /auth/login`

### Jobs

- `POST /jobs`
- `POST /jobs/upload-description`
- `GET /jobs`
- `GET /jobs/{job_id}`
- `POST /jobs/{job_id}/analyze`
- `GET /jobs/{job_id}/top-candidates`

### Candidates

- `POST /candidates/upload`
- `POST /candidates/upload-batch`
- `GET /candidates`
- `GET /candidates/{candidate_id}`
- `GET /candidates/{candidate_id}/summary`
- `POST /candidates/query`

### Copilot and Retrieval

- `POST /agent/chat`
- `POST /rag/query`
- `POST /rag/reindex`

### Interview and Evaluation

- `POST /interviews/generate`
- `POST /interviews/followup`
- `POST /interviews/analyze`
- `GET /evaluations`
- `GET /audit`

## What Judges Should Evaluate in This Build

### 1) Product Completeness

- Upload a JD and resumes
- Query top candidates
- Open candidate summaries and mappings
- Generate interview questions and evaluations

### 2) AI Quality and Practicality

- LLM used for grounded assistant behavior
- Deterministic ranking ensures stable outputs
- Structured recruiter responses for top-N asks

### 3) Transparency

- Evidence-aware outputs
- Audit trail of actions
- Clear missing-information signaling

## Demo Script (Recommended)

1. Create or upload a JD
2. Upload 3-5 resumes
3. Ask copilot: “Show top 3 candidates matching this JD…”
4. Review candidate table (name, email, phone, experience, skills, companies)
5. Generate interview questions
6. Analyze notes and review evaluation output
7. Open audit trail to inspect action history

## Current Limitations

- Candidate/job data is currently in-memory for rapid prototyping
- Restart clears uploaded candidate records
- Gemini billing/quota issues will affect live LLM behavior

## Roadmap After Hackathon

- Persist candidates/jobs/evaluations in Postgres
- Add persistent vector index and citation UI
- Add team/org RBAC and stronger auth
- Add benchmark datasets and quality dashboards

## Responsible AI Principles

- Recruiter-in-the-loop decisions only
- No autonomous hiring decisions
- Evidence over hallucination
- Explainability over opaque scoring

## Project Structure

```text
.
├── backend
│   ├── app
│   └── tests
├── frontend
│   └── src
├── docker-compose.yml
├── ARCHITECTURE.md
└── IMPLEMENTATION_PLAN.md
```
