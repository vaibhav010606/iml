#!/usr/bin/env python3
"""
Phase 1, Plan 1.2 — System log ingestion
Reads multiple /var/log sources, normalises to a clean DataFrame,
and saves it as data/logs.parquet for downstream phases.

Output schema:
  id      : int   — unique row index
  source  : str   — log file name (e.g. "dpkg.log.1")
  raw     : str   — original log line
  text    : str   — cleaned, searchable text (timestamps stripped)
"""

import os
import re
import subprocess
import pandas as pd
from pathlib import Path
from tqdm import tqdm

# ── Config ────────────────────────────────────────────────────────────────────

OUTPUT_DIR = Path(__file__).parent.parent / "data"
OUTPUT_FILE = OUTPUT_DIR / "logs.parquet"
PREVIEW_FILE = OUTPUT_DIR / "logs_preview.csv"   # human-readable preview

# Log sources — readable without sudo
LOG_SOURCES = [
    "/var/log/dpkg.log",
    "/var/log/dpkg.log.1",
    "/var/log/alternatives.log.1",
    "/var/log/fontconfig.log",
    "/var/log/macchanger.log",
]

# Journal fetch (last 5000 lines — no sudo needed for current user's session)
JOURNAL_LINES = 5000

# Min text length after cleaning (skip noise lines)
MIN_TEXT_LEN = 20

# ── Helpers ───────────────────────────────────────────────────────────────────

# Patterns to strip from log text to make it more semantically meaningful
_TIMESTAMP_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s*"           # dpkg-style
    r"|^[A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2}\s+\S+\s+"  # syslog-style
)
_HEX_RE = re.compile(r"\b[0-9a-fA-F]{8,}\b")
_MULTI_SPACE_RE = re.compile(r"\s{2,}")


def clean_text(raw: str) -> str:
    """Strip timestamps and normalise whitespace; keep semantic content."""
    text = _TIMESTAMP_RE.sub("", raw).strip()
    text = _HEX_RE.sub("<HEX>", text)
    text = _MULTI_SPACE_RE.sub(" ", text)
    return text


def read_file(path: str) -> list[tuple[str, str]]:
    """Return list of (source_name, raw_line) from a plain-text log file."""
    p = Path(path)
    if not p.exists():
        print(f"  ⚠  Skipping {path} — not found")
        return []
    rows = []
    with open(p, "r", errors="replace") as f:
        for line in f:
            line = line.rstrip("\n")
            if line.strip():
                rows.append((p.name, line))
    return rows


def read_journal(n: int = JOURNAL_LINES) -> list[tuple[str, str]]:
    """Pull recent journal entries via journalctl (no sudo required)."""
    try:
        result = subprocess.run(
            ["journalctl", "--no-pager", "-n", str(n), "--output=short"],
            capture_output=True, text=True, timeout=15
        )
        lines = result.stdout.splitlines()
        return [("journal", line) for line in lines if line.strip()]
    except Exception as e:
        print(f"  ⚠  journalctl unavailable: {e}")
        return []


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  Enterprise Search Engine — Log Ingestion (Phase 1.2)")
    print("=" * 60)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_rows: list[tuple[str, str]] = []

    # 1. Read plain-text log files
    for path in tqdm(LOG_SOURCES, desc="Reading log files"):
        rows = read_file(path)
        all_rows.extend(rows)
        print(f"     {Path(path).name:<30} {len(rows):>6} lines")

    # 2. Read journal
    print("\n  Fetching journal logs...")
    journal_rows = read_journal()
    all_rows.extend(journal_rows)
    print(f"     {'journal':<30} {len(journal_rows):>6} lines")

    print(f"\n  Total raw lines collected: {len(all_rows):,}")

    # 3. Build DataFrame
    print("\n  Building DataFrame...")
    df = pd.DataFrame(all_rows, columns=["source", "raw"])
    df["text"] = df["raw"].apply(clean_text)

    # 4. Filter noise
    before = len(df)
    df = df[df["text"].str.len() >= MIN_TEXT_LEN].reset_index(drop=True)
    df.insert(0, "id", df.index)
    after = len(df)
    print(f"  Filtered noise: {before - after} short lines removed")
    print(f"  Final dataset:  {after:,} records")

    # 5. Per-source breakdown
    print("\n  Records per source:")
    for src, count in df["source"].value_counts().items():
        print(f"     {src:<30} {count:>6}")

    # 6. Save
    df.to_parquet(OUTPUT_FILE, index=False)
    df.head(50).to_csv(PREVIEW_FILE, index=False)

    print(f"\n  ✅ Saved → {OUTPUT_FILE}")
    print(f"  ✅ Preview → {PREVIEW_FILE}")

    # 7. Schema check
    print("\n  DataFrame shape:", df.shape)
    print("  Columns:", list(df.columns))
    print("\n  Sample rows:")
    print(df[["id", "source", "text"]].head(5).to_string(index=False))
    print("\n[OK] Dataset ready. Proceed to generate_embeddings.py")


if __name__ == "__main__":
    main()
