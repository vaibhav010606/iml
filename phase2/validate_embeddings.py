#!/usr/bin/env python3
"""
Phase 2, Plan 2.2 — Embedding validation
Asserts shape, dtype, and basic semantic sanity before FAISS indexing.
"""

import sys
import numpy as np
import pandas as pd
from pathlib import Path

DATA_DIR     = Path(__file__).parent.parent / "data"
VECTORS_FILE = DATA_DIR / "vectors.npy"
# Use the sampled dataset if it exists (generated during Phase 2 local prototype)
_sample = DATA_DIR / "logs_sample.parquet"
DATASET_FILE = _sample if _sample.exists() else DATA_DIR / "logs.parquet"

EXPECTED_DIM = 384


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def main():
    print("=" * 60)
    print("  Enterprise Search Engine — Embedding Validation (Phase 2.2)")
    print("=" * 60)

    # 1. Load
    vectors = np.load(VECTORS_FILE)
    df = pd.read_parquet(DATASET_FILE)

    # 2. Shape
    assert vectors.ndim == 2,         f"Expected 2D array, got {vectors.ndim}D"
    assert vectors.shape[0] == len(df), (
        f"Row mismatch: {vectors.shape[0]} vectors vs {len(df)} records"
    )
    assert vectors.shape[1] == EXPECTED_DIM, (
        f"Dim mismatch: got {vectors.shape[1]}, expected {EXPECTED_DIM}"
    )
    print(f"\n  ✅ Shape OK  → {vectors.shape}")

    # 3. Dtype
    assert vectors.dtype == np.float32, f"Expected float32, got {vectors.dtype}"
    print(f"  ✅ Dtype OK  → {vectors.dtype}")

    # 4. No NaN / Inf
    assert not np.isnan(vectors).any(), "NaN values detected in vectors!"
    assert not np.isinf(vectors).any(), "Inf values detected in vectors!"
    print(f"  ✅ No NaN/Inf detected")

    # 5. Semantic sanity — similar log lines should be closer than random pairs
    # Pick two dpkg lines that both mention "install"
    dpkg_mask = df["source"].str.startswith("dpkg") & df["text"].str.contains("install", case=False)
    if dpkg_mask.sum() >= 2:
        idx_a, idx_b = df[dpkg_mask].index[:2]
        sim_similar = cosine_similarity(vectors[idx_a], vectors[idx_b])
        idx_rand = df[~dpkg_mask].index[0] if (~dpkg_mask).sum() > 0 else 0
        sim_random = cosine_similarity(vectors[idx_a], vectors[idx_rand])
        print(f"\n  Semantic check:")
        print(f"    Similar pair (both 'install') cosine sim : {sim_similar:.4f}")
        print(f"    Random pair  cosine sim                  : {sim_random:.4f}")
        assert sim_similar > sim_random, (
            "Similar pairs should score higher than random pairs — model may be broken"
        )
        print(f"  ✅ Semantic ordering OK  (similar > random)")
    else:
        print("  ⚠  Not enough dpkg install lines for semantic check — skipped")

    # 6. Memory summary
    uncompressed_mb = vectors.nbytes / 1024 / 1024
    print(f"\n  Memory footprint (flat float32): {uncompressed_mb:.1f} MB")
    print(f"  Records validated              : {len(df):,}")
    print("\n[OK] Embeddings validated. Proceed to build_index.py")


if __name__ == "__main__":
    main()
