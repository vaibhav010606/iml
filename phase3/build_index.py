#!/usr/bin/env python3
"""
Phase 3, Plan 3.1 — FAISS Product Quantization index builder
Trains an IndexPQ on the log vectors and saves it to data/index.faiss.

PQ Config:
  d     = 384  (embedding dimension — must match all-MiniLM-L6-v2)
  m     = 8    (number of sub-vectors; 384 / 8 = 48 dims each)
  nbits = 8    (bits per sub-vector; 2^8 = 256 centroids)

Compression ratio vs. flat float32:
  Flat  : 384 dims × 4 bytes = 1536 bytes/vector
  PQ    : 8 sub-vectors × 1 byte = 8 bytes/vector → ~192× compression
"""

import time
import numpy as np
import faiss
from pathlib import Path

DATA_DIR    = Path(__file__).parent.parent / "data"
VECTORS_FILE = DATA_DIR / "vectors.npy"
INDEX_FILE  = DATA_DIR / "index.faiss"

# PQ parameters
D     = 384   # embedding dimension
M     = 8     # sub-vectors (D must be divisible by M)
NBITS = 8     # bits per sub-vector


def human_size(nbytes: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if nbytes < 1024:
            return f"{nbytes:.1f} {unit}"
        nbytes /= 1024
    return f"{nbytes:.1f} TB"


def main():
    print("=" * 60)
    print("  Enterprise Search Engine — FAISS PQ Index Build (Phase 3.1)")
    print("=" * 60)

    # 1. Load vectors
    vectors = np.load(VECTORS_FILE)
    N = vectors.shape[0]
    print(f"\n  Vectors loaded: {N:,} × {D}d  ({human_size(vectors.nbytes)})")

    assert vectors.dtype == np.float32, "Vectors must be float32"
    assert vectors.shape[1] == D, f"Expected dim {D}, got {vectors.shape[1]}"
    assert D % M == 0, f"D ({D}) must be divisible by M ({M})"

    # 2. Build index
    print(f"\n  Building IndexPQ(d={D}, m={M}, nbits={NBITS}) ...")
    print(f"  Compression: {D * 4} bytes/vec (flat) → {M * NBITS // 8} bytes/vec (PQ)")
    index = faiss.IndexPQ(D, M, NBITS)

    # 3. Train — PQ learns codebooks from training data
    print(f"\n  Training on {N:,} vectors ...")
    t0 = time.time()
    index.train(vectors)
    train_time = time.time() - t0
    print(f"  ✅ Trained in {train_time:.1f}s  (is_trained={index.is_trained})")

    # 4. Add vectors
    print(f"\n  Adding {N:,} vectors to index ...")
    t1 = time.time()
    index.add(vectors)
    add_time = time.time() - t1
    print(f"  ✅ Added in {add_time:.1f}s  (index.ntotal={index.ntotal:,})")

    # 5. Save
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(INDEX_FILE))
    index_size = INDEX_FILE.stat().st_size
    print(f"\n  ✅ Saved → {INDEX_FILE}")
    print(f"  Index size on disk: {human_size(index_size)}")

    flat_size = N * D * 4
    ratio = flat_size / index_size
    print(f"  Compression ratio : {ratio:.1f}× vs. flat float32")

    print(f"\n  Summary:")
    print(f"    Vectors         : {N:,}")
    print(f"    Dimension       : {D}")
    print(f"    PQ m / nbits    : {M} / {NBITS}")
    print(f"    Training time   : {train_time:.1f}s")
    print(f"    Index file size : {human_size(index_size)}")
    print(f"    Compression     : {ratio:.1f}×")
    print("\n[OK] Index built. Proceed to query_index.py")


if __name__ == "__main__":
    main()
