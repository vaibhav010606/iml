#!/usr/bin/env python3
"""
Phase 3, Plan 3.3 — Validation: 3 known queries must return expected results
Runs test queries against the PQ index and asserts docs appear in top-k.
"""

import sys
import numpy as np
import pandas as pd
import faiss
from pathlib import Path
from sentence_transformers import SentenceTransformer

DATA_DIR     = Path(__file__).parent.parent / "data"
INDEX_FILE   = DATA_DIR / "index.faiss"
_sample = DATA_DIR / "logs_sample.parquet"
DATASET_FILE = _sample if _sample.exists() else DATA_DIR / "logs.parquet"

MODEL_NAME = "all-MiniLM-L6-v2"
K          = 10   # search top-10; all test queries must appear in top-K

# ── Test Cases ────────────────────────────────────────────────────────────────
# Each test: (query_text, substring_that_must_appear_in_top_k_results)
# Chosen to match real content from dpkg/journal/alternatives logs.
TEST_CASES = [
    ("package installation configure",     "configure"),
    ("alternative update link group",      "link group"),   # alternatives.log always has this phrase
    ("cron session opened root",           "cron"),
]


def run_tests():
    print("=" * 65)
    print("  Enterprise Search Engine — Index Validation (Phase 3.3)")
    print("=" * 65)

    model = SentenceTransformer(MODEL_NAME, device="cpu")
    index = faiss.read_index(str(INDEX_FILE))
    df    = pd.read_parquet(DATASET_FILE)

    passed = 0
    failed = 0

    for i, (query, expected_substring) in enumerate(TEST_CASES, start=1):
        q_vec = model.encode([query], convert_to_numpy=True).astype("float32")
        distances, ids = index.search(q_vec, K)

        # Check if any top-K result contains the expected substring
        found = False
        match_rank = None
        for rank, doc_id in enumerate(ids[0], start=1):
            if doc_id < 0:
                continue
            text = df.iloc[doc_id]["text"].lower()
            if expected_substring.lower() in text:
                found = True
                match_rank = rank
                break

        status = "✅ PASS" if found else "❌ FAIL"
        print(f"\n  Test {i}/{len(TEST_CASES)} — {status}")
        print(f"    Query    : \"{query}\"")
        print(f"    Expects  : text containing \"{expected_substring}\"")
        if found:
            hit = df.iloc[ids[0][match_rank - 1]]
            print(f"    Found at : rank #{match_rank}  [{hit['source']}]")
            print(f"    Snippet  : {hit['text'][:100]}…")
            passed += 1
        else:
            print(f"    Result   : Not found in top-{K}")
            # Print what we DID find for debugging
            top3 = [df.iloc[ids[0][r]]["text"][:80] for r in range(min(3, K)) if ids[0][r] >= 0]
            for r, t in enumerate(top3, 1):
                print(f"    Top-{r}    : {t}")
            failed += 1

    print(f"\n{'=' * 65}")
    print(f"  Results: {passed}/{len(TEST_CASES)} passed, {failed} failed")

    if failed > 0:
        print("\n  ⚠  Some tests failed — check PQ params or expand dataset.")
        sys.exit(1)
    else:
        print("\n[OK] All validation tests passed. Index is working correctly.")


if __name__ == "__main__":
    run_tests()
