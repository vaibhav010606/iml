#!/usr/bin/env python3
"""
Phase 1, Plan 1.1 — Environment verification
Confirms all required libraries are importable and prints version info.
"""

import sys

REQUIRED = [
    ("sentence_transformers", "sentence-transformers"),
    ("faiss", "faiss-cpu"),
    ("pandas", "pandas"),
    ("numpy", "numpy"),
    ("tqdm", "tqdm"),
]

print("=" * 55)
print("  Enterprise Search Engine — Environment Check")
print("=" * 55)

all_ok = True
for module, pkg in REQUIRED:
    try:
        mod = __import__(module)
        version = getattr(mod, "__version__", "n/a")
        print(f"  ✅  {pkg:<25} {version}")
    except ImportError as e:
        print(f"  ❌  {pkg:<25} MISSING — {e}")
        all_ok = False

print("-" * 55)
print(f"  Python: {sys.version.split()[0]}")
print("=" * 55)

if not all_ok:
    print("\n[FAIL] Some packages are missing. Run:")
    print("  pip install -r requirements.txt")
    sys.exit(1)

print("\n[OK] Environment is ready. Proceed to load_dataset.py")
