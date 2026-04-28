#!/usr/bin/env python3
"""
One-shot proof that canonical K1 iteration lists still cover every `src/**/*.ts|tsx`
and every directory that directly contains TS.

Run from repo root:
  python .cursor/scripts/verify_k1_iteration_exhaustive.py

Exit 0 only if:
  - diff_exhaustive_src.py exits 0
  - diff_exhaustive_src_subdirs.py exits 0
  - on-disk .ts/.tsx count matches the footer in k1-iteration-todos-exhaustive.md
"""
from __future__ import annotations

import pathlib
import re
import subprocess
import sys

REPO = pathlib.Path(__file__).resolve().parents[2]
SRC = REPO / "src"
EXH = REPO / ".cursor" / "k1-iteration-todos-exhaustive.md"


def disk_ts_count() -> int:
    n = 0
    for ext in (".ts", ".tsx"):
        n += sum(1 for _ in SRC.rglob(f"*{ext}"))
    return n


def footer_total() -> int | None:
    if not EXH.is_file():
        return None
    text = EXH.read_text(encoding="utf-8", errors="replace")
    m = re.search(r"\*\*Total items:\*\*\s*(\d+)", text)
    return int(m.group(1)) if m else None


def main() -> int:
    py = sys.executable
    r1 = subprocess.run([py, str(REPO / ".cursor/scripts/diff_exhaustive_src.py")], cwd=REPO)
    r2 = subprocess.run([py, str(REPO / ".cursor/scripts/diff_exhaustive_src_subdirs.py")], cwd=REPO)
    if r1.returncode != 0 or r2.returncode != 0:
        return 1
    disk = disk_ts_count()
    foot = footer_total()
    if foot is None:
        print("error: could not parse Total items from k1-iteration-todos-exhaustive.md", file=sys.stderr)
        return 1
    if disk != foot:
        print(f"error: disk ts/tsx count {disk} != exhaustive footer {foot}", file=sys.stderr)
        print("hint: python .cursor/scripts/regenerate_exhaustive_src_checklist.py", file=sys.stderr)
        return 1
    print(f"ok: exhaustive lists match disk ({disk} ts/tsx files)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
