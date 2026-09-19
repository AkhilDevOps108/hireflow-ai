# HIRE FLOW Architecture

## Problem
Hiring teams need a trustworthy, evidence-based way to evaluate large candidate pools against job descriptions without sacrificing human judgment. Current recruiting tooling often relies on shallow keyword matching, opaque scoring, or isolated chatbot experiences with little traceability.

HIRE FLOW combines:
- structured job intelligence
- resume and document ingestion
- hybrid retrieval
- deterministic matching logic
- agentic recruiter interaction
- interview intelligence
- auditability and evaluation

This is designed as a decision-support platform, not an automatic hiring system.

## Solution Overview
HIRE FLOW is a production-style recruitment intelligence platform built around a modular architecture:

- React frontend for recruiter workflows and AI assistant experiences
- FastAPI backend for domain services, auth, jobs, candidate APIs, and orchestration
- PostgreSQL for transactional data with pgvector for candidate and document embeddings
- LangGraph for recruiter-agent workflows and evidence-grounded reasoning
- Python document processing pipeline for extraction, chunking, and embedding
- Redis for async job processing and lightweight caching
- S3-compatible object storage for original resume documents
- OpenTelemetry + Langfuse + Prometheus + Grafana for observability

## High-Level Architecture

```text
React Frontend
      |
      v
FastAPI API
      |
      +---------------------------+
      |                           |
      v                           v
Agent Orchestrator          Document Pipeline
  - LangGraph                - PDF/DOCX/TXT parsing
  - Tool routing             - cleaning and chunking
  - Evidence grounding       - metadata extraction
  - Query planning           - embeddings
      |                           |
      v                           v
  Search / Match / Interview Agents   pgvector
      |                           |
      +---------------------------+
                  |
                  v
            Evidence Layer
                  |
                  v
         Deterministic Scoring
                  |
                  v
          Recruiter UI + Audit

Supporting systems:
- PostgreSQL
- Redis
- Object Storage
- Langfuse
- OTel
- Prometheus
- Grafana
```

## Core Design Principles
1. Deterministic first: scoring, filtering, ranking, and validation are implemented in code, not left to an LLM.
2. Evidence over hallucination: every AI claim is tied to retrieval evidence and citation metadata.
3. Human-in-the-loop: the recruiter stays accountable for final hiring decisions.
4. Modular services: domains are separated into jobs, candidates, documents, evaluation, observability, and security.
5. Production readiness: monitoring, retries, RBAC, audit logging, environment config, and CI/CD are planned from the start.

## Major Domains

### 1. Job Intelligence
- recruiter creates a job
- job description is analyzed for structured requirements
- system stores must-have, nice-to-have, experience, education, certifications, technologies, and domain filters

### 2. Candidate Ingestion
- PDF, DOCX, and TXT resumes are uploaded
- original documents are stored
- text, metadata, and structured candidate signals are extracted
- embeddings and searchable chunks are stored with citations

### 3. Hybrid Retrieval and Ranking
- vector search for semantic similarity
- keyword matching for skill and requirement filters
- PostgreSQL filters for experience, location, and structured metadata
- deterministic ranking combined with configurable weights

### 4. Matching Engine
- candidate profiles are compared to job requirements
- weighted sub-scores are computed across required skills, experience, education, projects, and nice-to-have skills
- matching output contains evidence, gaps, and confidence without making final decisions

### 5. Recruiter Agent
- natural language recruiter questions are translated into tool calls and evidence retrieval
- candidate, job, and match data are surfaced with citations
- the agent can compare candidates, generate questions, and explain rankings

### 6. Interview Intelligence
- interview questions are generated from the JD and candidate context
- candidate notes are analyzed against requirements and evidence
- evaluations are stored with structured confidence and follow-up questions

### 7. Evaluation and Observability
- retrieval, matching, tool usage, and prompt behavior are evaluated against datasets
- latency, token usage, and errors are monitored with OpenTelemetry and Langfuse

## Data Model Highlights
Key tables include:
- users
- organizations
- jobs
- job_requirements
- candidates
- candidate_documents
- candidate_skills
- candidate_experience
- candidate_projects
- document_chunks
- embeddings
- candidate_matches
- match_evidence
- interviews
- interview_questions
- interview_notes
- evaluations
- audit_logs
- agent_runs
- tool_calls
- prompt_versions
- model_versions

## Security Model
- RBAC for ADMIN, RECRUITER, and HIRING_MANAGER
- API authorization around candidate and organizational boundaries
- PII protection and no unnecessary logging of candidate records
- prompt injection safeguards during resume ingestion
- audit logging for every material AI action

## Phase-Based Delivery Strategy
The platform is delivered incrementally as requested:
- Phase 1: repository, Docker, PostgreSQL, FastAPI, React
- Phase 2: auth, jobs, candidates, uploads
- Phase 3: document ingestion and embeddings
- Phase 4: extraction engines
- Phase 5: matching and top 10 ranking
- Phase 6: evidence and RAG citations
- Phase 7: LangGraph recruiter agent
- Phase 8: interview intelligence
- Phase 9: MCP
- Phase 10: evaluation
- Phase 11: observability
- Phase 12: security
- Phase 13: Terraform
- Phase 14: CI/CD
- Phase 15: production deployment

## Deployment Model
The preferred production deployment pattern is:
- Cloud load balancer
- React frontend
- FastAPI backend
- PostgreSQL
- Redis
- Object storage
- LLM APIs
- monitoring stack

AWS is the primary target deployment reference, while the architecture remains portable to GCP and other cloud environments.
