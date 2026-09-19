# HIRE FLOW

HIRE FLOW is an evidence-first, agentic recruitment intelligence platform designed for recruiter decision support.

## Problem
Recruiters need to evaluate large candidate pools against job descriptions using transparent criteria, grounded evidence, and human oversight. Generic resume parsers and ungrounded AI chat tools are not enough.

## Solution
HIRE FLOW combines structured job extraction, candidate profile ingestion, hybrid candidate search, deterministic matching, recruiter AI assistants, interview intelligence, and auditability in one platform.

## Core Architecture
See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system design.

## Implementation Roadmap
See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the incremental delivery plan.

## Current Repository State
This repository is being built in phases. The current phase establishes the foundation: Docker Compose, FastAPI backend, React frontend, and PostgreSQL stack.

## Local Development
```bash
docker compose up --build
```

Available local services:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8001
- PostgreSQL: localhost:5433
- Redis: localhost:6380

## Stack
- React + TypeScript + Vite + Tailwind
- FastAPI + Pydantic + SQLAlchemy
- PostgreSQL + pgvector
- LangGraph for agent workflows
- Redis for async processing
- OpenTelemetry + Langfuse + Prometheus + Grafana

## Important Principles
- no automated hiring decisions
- evidence-backed outputs
- deterministic scoring over arbitrary LLM scoring
- recruiter-in-the-loop decision support
- secure, audited operations
