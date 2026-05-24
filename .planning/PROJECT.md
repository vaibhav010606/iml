# Enterprise Semantic Search Engine

## What This Is

A portfolio-ready, enterprise-grade semantic search system that uses FAISS Product Quantization (PQ) to compress and search millions of document vectors efficiently. The system spans three layers:

1. **Local prototype** — prove math and compression work on raw text data with FAISS PQ
2. **Cloud pipeline** — distributed embedding generation via Databricks PySpark + MLflow experiment tracking
3. **Frontend dashboard** — Next.js search UI that hits the MLflow-served REST endpoint

This project is split between two engineers: **Vaibhav** handles the core ML pipeline (Phases 1–2), **Vishal** handles the Next.js frontend (Phase 3) — work can proceed in parallel after Phase 1 is validated.

## Core Value

Demonstrate a production-level vector search architecture — not a toy demo — with real compression tradeoffs (memory vs. recall), cloud orchestration, and a clean user-facing interface.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Embeddings | `sentence-transformers` (`all-MiniLM-L6-v2`) |
| Vector Index | FAISS `IndexPQ` |
| Data wrangling | Pandas, NumPy |
| Cloud compute | Databricks (PySpark) |
| Experiment tracking | MLflow |
| Model serving | MLflow Model Serving REST API |
| Auth / access | GCP IAM roles |
| Frontend | Next.js 14 (App Router), React |
| State management | React `useState` / `useEffect` |

## Context

- Target environment: Local Kali Linux → GCP / Databricks cloud
- Dataset: TBD (text files, system logs, or similar — chosen at Phase 1 start)
- Split workload: ML pipeline (Vaibhav) + Frontend (Vishal, starts Phase 3)
- Portfolio artifact: all code should be clean and presentable on GitHub

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Python venv environment with all ML dependencies installed
- [ ] Sample dataset loaded into Pandas DataFrame
- [ ] Dense embeddings generated via `all-MiniLM-L6-v2`
- [ ] FAISS `IndexPQ` trained and searchable (not flat index)
- [ ] PQ parameters: 384-dim vectors, 8 sub-vectors, 8 bits each
- [ ] Query function: embed text → search index → return doc IDs
- [ ] Databricks PySpark job for distributed embedding generation
- [ ] MLflow experiment logs: `m`, `nbits`, memory footprint, Recall@10
- [ ] Optimal PQ config selected from MLflow run comparison
- [ ] MLflow Model Serving REST API endpoint deployed
- [ ] GCP IAM roles restrict endpoint access
- [ ] Next.js project with Search Bar + Results Container components
- [ ] Next.js API route proxies backend (hides API keys from client)
- [ ] Results display: title, snippet, match score
- [ ] Loading state while backend searches

### Out of Scope

- Real-time index updates — static index, periodically rebuilt
- Authentication/login for end users — IAM protects the ML endpoint only
- Re-ranking layer — pure FAISS PQ retrieval only for now
- Mobile-specific design — desktop-first frontend

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| `IndexPQ` over `IndexFlatL2` | Compression is the core thesis — flat index defeats the point | — Pending |
| `all-MiniLM-L6-v2` as embedding model | Lightweight, 384-dim, fast inference, well-known benchmark | — Pending |
| MLflow for tracking | Native Databricks integration, UI comparison is the demo story | — Pending |
| Next.js App Router | Current standard, supports API routes for key proxying | — Pending |
| Parallel workstreams (Vaibhav + Vishal) | Frontend can start once Phase 1 API contract is defined | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

---
*Last updated: 2026-05-25 after initialization*
