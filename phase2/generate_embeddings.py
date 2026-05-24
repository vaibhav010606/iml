#!/usr/bin/env python3
"""
Phase 2, Plan 2.1 — Dense embedding generation
Loads logs.parquet, encodes text with all-MiniLM-L6-v2,
saves vectors as data/vectors.npy for FAISS indexing.

Output:
  data/vectors.npy   — float32 array of shape (N, 384)
"""

import numpy as np
import pandas as pd
from pathlib import Path
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

# ── Config ────────────────────────────────────────────────────────────────────

DATA_DIR    = Path(__file__).parent.parent / "data"
INPUT_FILE  = DATA_DIR / "logs.parquet"
OUTPUT_FILE = DATA_DIR / "vectors.npy"

MODEL_NAME   = "all-MiniLM-L6-v2"   # 384-dim, fast, battle-tested
BATCH_SIZE   = 64                    # smaller batches = lower memory pressure on i3-7020U
DEVICE       = "cpu"
NUM_THREADS  = 4                     # match nproc — saturate all cores
SAMPLE_SIZE  = 2000                  # local prototype cap; set to None for full corpus (use Databricks)



# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  Enterprise Search Engine — Embedding Generation (Phase 2.1)")
    print("=" * 60)

    # 0. Tune CPU threading
    import torch
    torch.set_num_threads(NUM_THREADS)
    print(f"\n  CPU threads: {torch.get_num_threads()}")

    # 1. Load dataset
    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Dataset not found: {INPUT_FILE}\n"
            "Run phase1/load_dataset.py first."
        )
    df = pd.read_parquet(INPUT_FILE)
    texts = df["text"].tolist()
    print(f"\n  Loaded {len(texts):,} log entries from {INPUT_FILE.name}")

    # Sample for local prototype — full corpus runs on Databricks (Phase 4)
    if SAMPLE_SIZE and len(texts) > SAMPLE_SIZE:
        import random
        random.seed(42)
        idx = sorted(random.sample(range(len(texts)), SAMPLE_SIZE))
        texts = [texts[i] for i in idx]
        df = df.iloc[idx].reset_index(drop=True)
        print(f"  Sampled to {len(texts):,} records for local prototype (SAMPLE_SIZE={SAMPLE_SIZE})")
        # Re-save the sampled DataFrame so FAISS index IDs align
        df.to_parquet(INPUT_FILE.with_name("logs_sample.parquet"), index=False)

    # 2. Load model
    print(f"\n  Loading model: {MODEL_NAME} ...")
    model = SentenceTransformer(MODEL_NAME, device=DEVICE)
    print(f"  Model loaded  → embedding dim = {model.get_embedding_dimension()}")

    # 3. Encode in batches
    print(f"\n  Encoding {len(texts):,} texts (batch_size={BATCH_SIZE}) ...")
    vectors = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=False,   # raw vectors for PQ; PQ handles its own quantisation
    )

    # 4. Ensure float32 (FAISS requirement)
    vectors = vectors.astype("float32")

    # 5. Save
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    np.save(OUTPUT_FILE, vectors)

    print(f"\n  ✅ Saved → {OUTPUT_FILE}")
    print(f"  Shape  : {vectors.shape}")
    print(f"  Dtype  : {vectors.dtype}")
    print(f"  Memory : {vectors.nbytes / 1024 / 1024:.1f} MB (uncompressed)")
    print("\n[OK] Embeddings ready. Proceed to build_index.py")


if __name__ == "__main__":
    main()
