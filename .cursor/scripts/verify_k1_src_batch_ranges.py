#!/usr/bin/env python3
"""
Verify k1-iteration-todos-exhaustive.md SRC ranges vs batch formula:
  batch_size = 10, batch k covers SRC-{(k-1)*10+1} .. SRC-{min(k*10, N)}
Exit 0 when every SRC row is covered exactly once by ceil(N/10) batches.
"""
from __future__ import annotations

import math
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
EXHAUSTIVE = REPO_ROOT / ".cursor" / "k1-iteration-todos-exhaustive.md"


def main() -> int:
    text = EXHAUSTIVE.read_text(encoding="utf-8")
    rows = re.findall(r"^- \[.\] (SRC-\d{4}):", text, flags=re.MULTILINE)
    n = len(rows)
    if n == 0:
        print("No SRC rows parsed", file=sys.stderr)
        return 2
    expected = [f"SRC-{i:04d}" for i in range(1, n + 1)]
    if rows != expected:
        print("SRC IDs non-contiguous or misnumbered vs expected SRC-0001..", file=sys.stderr)
        return 3
    batch_size = 10
    num_batches = math.ceil(n / batch_size)
    for k in range(1, num_batches + 1):
        start = (k - 1) * batch_size + 1
        end = min(k * batch_size, n)
        label_lo = f"SRC-{start:04d}"
        label_hi = f"SRC-{end:04d}"
        assert label_lo == rows[start - 1]
        assert label_hi == rows[end - 1]
    print(f"ok: {n} SRC rows, {num_batches} batches of up to {batch_size}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
