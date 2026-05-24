#!/usr/bin/env python3
"""
Phase 3, Plan 3.2 — Natural language query against FAISS PQ index
Usage:
  python query_index.py "kernel network interface failed"
  python query_index.py "package installation error" --k 10
"""

import sys
import argparse
import numpy as np
import pandas as pd
import faiss
from pathlib import Path
from sentence_transformers import SentenceTransformer

DATA_DIR     = Path(__file__).parent.parent / "data"
VECTORS_FILE = DATA_DIR / "vectors.npy"
INDEX_FILE   = DATA_DIR / "index.faiss"
_sample = DATA_DIR / "logs_sample.parquet"
DATASET_FILE = _sample if _sample.exists() else DATA_DIR / "logs.parquet"

MODEL_NAME = "all-MiniLM-L6-v2"
SNIPPET_LEN = 120


def search(query: str, k: int = 5) -> pd.DataFrame:
    """Embed query → search PQ index → return ranked DataFrame."""
    # Load assets (cached in a real server; simple reload here)
    model = SentenceTransformer(MODEL_NAME, device="cpu")
    index = faiss.read_index(str(INDEX_FILE))
    df    = pd.read_parquet(DATASET_FILE)

    # Embed query — must be float32 row vector
    q_vec = model.encode([query], convert_to_numpy=True).astype("float32")

    # Search
    distances, ids = index.search(q_vec, k)

    # Build results
    results = []
    for rank, (doc_id, dist) in enumerate(zip(ids[0], distances[0]), start=1):
        if doc_id < 0:          # FAISS returns -1 for empty slots
            continue
        row = df.iloc[doc_id]
        snippet = row["text"][:SNIPPET_LEN] + ("…" if len(row["text"]) > SNIPPET_LEN else "")
        results.append({
            "rank"    : rank,
            "doc_id"  : int(doc_id),
            "source"  : row["source"],
            "score"   : float(dist),          # L2 distance — lower = more similar
            "snippet" : snippet,
        })

    return pd.DataFrame(results)


def main():
    parser = argparse.ArgumentParser(description="Search log corpus with FAISS PQ")
    parser.add_argument("query", help="Natural language search query")
    parser.add_argument("--k", type=int, default=5, help="Number of results (default 5)")
    args = parser.parse_args()

    print(f"\n  Query : \"{args.query}\"")
    print(f"  Top-{args.k} results from FAISS PQ index\n")
    print("=" * 80)

    results = search(args.query, k=args.k)

    if results.empty:
        print("  No results found.")
        return

    for _, row in results.iterrows():
        print(f"  #{row['rank']:02d}  [{row['source']}]  score={row['score']:.4f}  id={row['doc_id']}")
        print(f"       {row['snippet']}")
        print()

    print("=" * 80)
    print(f"  ✅ Search complete — {len(results)} results returned")


if __name__ == "__main__":
    main()
