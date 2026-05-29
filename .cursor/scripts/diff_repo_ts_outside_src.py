#!/usr/bin/env python3
"""Exit 0 iff k1-iteration-todos-repo-ts-outside-src.md matches on-disk **.ts|tsx** outside `src/`."""
from __future__ import annotations

import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parents[2]
MD = REPO / ".cursor" / "k1-iteration-todos-repo-ts-outside-src.md"
IGNORE_DIRS = {"node_modules", "dist", "coverage", "wiki", ".git", ".history"}


def disk() -> set[str]:
    s: set[str] = set()
    for ext in (".ts", ".tsx"):
        for p in REPO.rglob(f"*{ext}"):
            if not p.is_file():
                continue
            if any(part in IGNORE_DIRS for part in p.parts):
                continue
            rel = p.relative_to(REPO).as_posix().replace("\\", "/")
            if rel.startswith("src/"):
                continue
            s.add(rel)
    return s


def in_doc() -> set[str]:
    if not MD.is_file():
        print("error: missing", MD, file=sys.stderr)
        return set()
    t = MD.read_text(encoding="utf-8", errors="replace")
    s: set[str] = set()
    for line in t.splitlines():
        m = re.search(r"\(`([^`]+)`\)\s*$", line)
        if m and line.strip().startswith("- [ ]"):
            s.add(m.group(1).replace("\\", "/").strip())
    return s


def main() -> int:
    a, b = disk(), in_doc()
    extra, missing = sorted(a - b), sorted(b - a)
    print("on disk", len(a), "in doc", len(b), "missing", len(missing), "extra", len(extra))
    for e in extra[:25]:
        print("  extra:", e)
    for e in missing[:25]:
        print("  miss:", e)
    return 0 if not extra and not missing and len(a) == len(b) else 1


if __name__ == "__main__":
    raise SystemExit(main())
