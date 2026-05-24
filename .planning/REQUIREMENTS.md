# Requirements

_Derived from project blueprint and team discussion on 2026-05-25._

---

## Table Stakes (Must Have)

### Phase 1 — Local Prototype (Core Engine)

| ID | Requirement | Notes |
|----|-------------|-------|
| R01 | Python venv initialized with `sentence-transformers`, `faiss-cpu`, `pandas`, `numpy` | `pip install` only, no conda |
| R02 | Sample dataset loaded into Pandas DataFrame | ≥ 100 text documents; format TBD by Vaibhav |
| R03 | Dense embeddings generated using `all-MiniLM-L6-v2` | Vectors must be 384-dimensional float32 |
| R04 | FAISS `IndexPQ` initialized with `m=8`, `nbits=8` | NOT `IndexFlatL2` — PQ compression is the point |
| R05 | Index trained on sample vectors, then populated | `index.train()` → `index.add()` |
| R06 | Query function: natural language → embed → search → return doc IDs + distances | Must return top-k results with scores |
| R07 | Manual validation: at least 3 test queries return correct documents | Sanity check before cloud scale-up |

### Phase 2 — Cloud Scaling & Orchestration

| ID | Requirement | Notes |
|----|-------------|-------|
| R08 | Full dataset uploaded to GCS bucket | Accessible by Databricks cluster |
| R09 | Databricks PySpark job chunks and embeds text across workers | Parallelizes embedding generation; output is partitioned parquet/delta |
| R10 | MLflow experiment initialized in Databricks notebook | Tracks each PQ config run |
| R11 | MLflow logs `m`, `nbits`, memory footprint (MB), Recall@10 per run | Enables parameter sweep comparison |
| R12 | Best PQ config selected from MLflow UI run comparison | Document the chosen `m`, `nbits` values |
| R13 | Embedding model + trained FAISS index packaged as MLflow model | `mlflow.pyfunc` or custom flavor |
| R14 | MLflow Model Serving REST endpoint deployed | Returns JSON: doc IDs + scores |
| R15 | GCP IAM roles restrict endpoint to authorized callers | At minimum: service account auth |

### Phase 3 — Frontend Dashboard

| ID | Requirement | Notes |
|----|-------------|-------|
| R16 | Next.js project initialized (`create-next-app@latest`, App Router) | Vishal's workstream |
| R17 | Search Bar component with input + submit trigger | Controlled component with React state |
| R18 | Results Container component renders results list | Maps over JSON array |
| R19 | Next.js API route (`/api/search`) proxies MLflow endpoint | API key / service account credentials server-side only |
| R20 | Loading state shown while backend call is in flight | Spinner or skeleton UI |
| R21 | Each result card shows: title, text snippet, match score | Score formatted as percentage or float |

---

## Nice-to-Haves (Post-MVP)

| ID | Requirement | Notes |
|----|-------------|-------|
| N01 | Pagination of search results | If result set > 10 |
| N02 | Filter by document type or date | Metadata must be stored alongside vectors |
| N03 | Dark mode toggle on frontend | |
| N04 | Recall@10 live metric displayed in dashboard | Requires ground-truth labels |
| N05 | IVF+PQ hybrid index (`IndexIVFPQ`) for larger datasets | Better recall at scale than pure PQ |

---

## Out of Scope

| Item | Reason |
|------|--------|
| Real-time index updates | Index is rebuilt offline on a schedule |
| End-user authentication (login/signup) | Out of scope for portfolio demo |
| Re-ranking (cross-encoder) | Adds complexity; pure retrieval is the focus |
| Mobile-responsive frontend | Desktop-first for now |
| Multi-language embeddings | English corpus only |

---

## Open Questions

- [ ] **What dataset?** System logs, internal docs, Wikipedia subset, or custom text files? (Decision needed before R02)
- [ ] **How large is the cloud dataset?** Determines Databricks cluster sizing (R09)
- [ ] **MLflow on Databricks or standalone?** Blueprint implies Databricks-hosted MLflow (R10–R14)
- [ ] **Frontend deployment target?** Vercel, Cloud Run, or local dev only for portfolio?
