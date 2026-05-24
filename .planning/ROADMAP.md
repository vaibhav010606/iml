# Roadmap

_Enterprise Semantic Search Engine — v1.0_

---

## Milestone 1: End-to-End Working Demo

**Goal:** Local FAISS PQ prototype → cloud-scaled pipeline → Next.js search UI querying a live endpoint.

---

## Phase 1 — Environment & Data Ingestion ✅ READY TO PLAN

**Owner:** Vaibhav  
**Goal:** Prove the environment works and data flows into a DataFrame cleanly.

### Plans

| # | Plan | Description |
|---|------|-------------|
| 1.1 | `setup_env.py` | Create Python venv, install deps (`sentence-transformers`, `faiss-cpu`, `pandas`, `numpy`), verify imports |
| 1.2 | `load_dataset.py` | Decide on dataset, write ingestion script, output clean Pandas DataFrame with `id`, `text` columns |

**Verification:** `df.head()` prints without error; all imports succeed.

---

## Phase 2 — Embedding Generation ✅ READY TO PLAN

**Owner:** Vaibhav  
**Goal:** Convert text corpus to 384-dim float32 vectors.

### Plans

| # | Plan | Description |
|---|------|-------------|
| 2.1 | `generate_embeddings.py` | Load `all-MiniLM-L6-v2`, batch-encode DataFrame text, save vectors as `.npy` |
| 2.2 | `validate_embeddings.py` | Assert shape is `(N, 384)`, dtype is `float32`, no NaN values |

**Verification:** `vectors.shape == (N, 384)` and cosine similarity of similar docs is > 0.7.

---

## Phase 3 — FAISS Product Quantization Index 🔒 BLOCKED ON PHASE 2

**Owner:** Vaibhav  
**Goal:** Build, train, and query a `IndexPQ` index — the core compression thesis.

### Plans

| # | Plan | Description |
|---|------|-------------|
| 3.1 | `build_index.py` | Initialize `faiss.IndexPQ(384, 8, 8)`, train on vectors, add vectors, save index to disk |
| 3.2 | `query_index.py` | Load index, embed a text query, run `index.search(q, k=5)`, return doc IDs + distances |
| 3.3 | `validate_index.py` | Run 3 known queries, assert correct doc IDs in top-5 results |

**Verification:** 3 test queries return expected document IDs in top-5; index file saved to disk.

---

## Phase 4 — Databricks PySpark Embedding Pipeline 🔒 BLOCKED ON PHASE 3

**Owner:** Vaibhav  
**Goal:** Scale embedding generation to millions of records using distributed compute.

### Plans

| # | Plan | Description |
|---|------|-------------|
| 4.1 | `upload_to_gcs.py` | Script to upload full dataset to GCS bucket |
| 4.2 | `pyspark_embed.py` | Databricks notebook: load from GCS, chunk text, distribute embedding via PySpark UDF, write output delta table |
| 4.3 | `collect_index.py` | Gather distributed vectors, build and save FAISS PQ index |

**Verification:** Databricks job completes without OOM errors; output delta table has `id`, `embedding` columns.

---

## Phase 5 — MLflow Experiment Tracking 🔒 BLOCKED ON PHASE 4

**Owner:** Vaibhav  
**Goal:** Log PQ parameter sweeps, compare runs, pick the best config.

### Plans

| # | Plan | Description |
|---|------|-------------|
| 5.1 | `mlflow_experiment.py` | Databricks notebook: wrap Phase 3 index build in `mlflow.start_run()`, log `m`, `nbits`, memory MB |
| 5.2 | `recall_metric.py` | Compute Recall@10 on a held-out test set, log to MLflow |
| 5.3 | `select_best_run.py` | Query MLflow API to find run with best Recall@10 at lowest memory; document chosen params |

**Verification:** MLflow UI shows ≥ 3 runs with different `m`/`nbits`; best run is tagged and documented.

---

## Phase 6 — MLflow Model Serving & IAM 🔒 BLOCKED ON PHASE 5

**Owner:** Vaibhav  
**Goal:** Expose the search system as a secured REST API.

### Plans

| # | Plan | Description |
|---|------|-------------|
| 6.1 | `package_model.py` | Package `all-MiniLM-L6-v2` + FAISS index as MLflow `pyfunc` model |
| 6.2 | `deploy_endpoint.sh` | Deploy MLflow model to serving endpoint; capture endpoint URL |
| 6.3 | `configure_iam.sh` | Create GCP service account, assign minimal IAM roles, test authenticated request |
| 6.4 | `test_endpoint.py` | POST a query to the live endpoint, assert JSON response with doc IDs + scores |

**Verification:** `curl` with bearer token returns JSON; unauthenticated request returns 403.

---

## Phase 7 — Next.js Frontend Dashboard 🔒 BLOCKED ON PHASE 6 (API contract)

**Owner:** Vishal (can start from Phase 3 with mock API)  
**Goal:** Clean search UI that queries the live endpoint and renders results.

### Plans

| # | Plan | Description |
|---|------|-------------|
| 7.1 | `init_nextjs.sh` | `npx create-next-app@latest` with App Router; set up project structure |
| 7.2 | `SearchBar.tsx` | Controlled input component; `onSubmit` triggers API call |
| 7.3 | `api/search/route.ts` | Server-side Next.js route handler; reads `SEARCH_API_URL` + `SEARCH_API_KEY` from env; proxies to MLflow endpoint |
| 7.4 | `ResultCard.tsx` | Renders single result: title, snippet (truncated to 200 chars), score badge |
| 7.5 | `ResultsContainer.tsx` | Maps over results array; shows loading skeleton; empty state |
| 7.6 | `integration_test.ts` | End-to-end: enter query → results render in < 3s |

**Verification:** Search query returns ≥ 1 result with title, snippet, score within 3 seconds; no API key visible in browser network tab.

---

## Parallel Workstream Plan

```
Vaibhav:  [Phase 1] → [Phase 2] → [Phase 3] → [Phase 4] → [Phase 5] → [Phase 6]
                                      ↓
                            Share API contract (endpoint URL + request/response schema)
                                      ↓
Vishal:                          [Phase 7 with mock] ──────────────────→ [Phase 7 live]
```

Vishal can build Phase 7 against a mock API response from Phase 3 onwards. Integration happens when Phase 6 endpoint is live.

---

## State

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 | 🟡 Ready | Start here — answer open dataset question first |
| Phase 2 | ⬜ Pending | |
| Phase 3 | ⬜ Pending | |
| Phase 4 | ⬜ Pending | Needs GCS bucket and Databricks access |
| Phase 5 | ⬜ Pending | |
| Phase 6 | ⬜ Pending | Needs GCP IAM access |
| Phase 7 | ⬜ Pending | Vishal — can start after Phase 3 schema is locked |
