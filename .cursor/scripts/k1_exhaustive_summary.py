#!/usr/bin/env python3
"""
Print a one-screen summary of the machine-enumerated K1 iteration surface for `@src` + satellite TS.

Run from repo root: python .cursor/scripts/k1_exhaustive_summary.py

To prove lists match disk, use: npm run k1:exhaustive:all (src TS, subdirs, optional scss+html, extensions TS)
"""
from __future__ import annotations

import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parents[2]
SRC = REPO / "src"
EXH = REPO / ".cursor" / "k1-iteration-todos-exhaustive.md"
REPOEXT = REPO / ".cursor" / "k1-iteration-todos-repo-ts-outside-src.md"
SUB = REPO / ".cursor" / "k1-iteration-todos-exhaustive-subdirs.md"
AST = REPO / ".cursor" / "k1-iteration-todos-optional-assets.md"


def count_glob(p: pathlib.Path, ext: str) -> int:
    return sum(1 for _ in p.rglob(f"*{ext}")) if p.is_dir() else 0


def footer_int(md: pathlib.Path, pattern: str) -> int | None:
    if not md.is_file():
        return None
    t = md.read_text(encoding="utf-8", errors="replace")
    m = re.search(pattern, t, re.IGNORECASE)
    return int(m.group(1)) if m else None


def dirs_with_ts() -> int:
    dirs: set[str] = set()
    for ext in (".ts", ".tsx"):
        for p in SRC.rglob(f"*{ext}"):
            d = p.parent.relative_to(SRC).as_posix()
            if d == ".":
                d = "."
            dirs.add(d)
    return len(dirs)


def main() -> int:
    n_ts = count_glob(SRC, ".ts")
    n_tsx = count_glob(SRC, ".tsx")
    n_disk = n_ts + n_tsx
    n_doc = footer_int(EXH, r"\*\*Total items:\*\*\s*(\d+)")
    n_sub = footer_int(SUB, r"\*\*Total directories:\*\*\s*(\d+)")
    n_ext = footer_int(REPOEXT, r"\*\*Total:\*\*\s*(\d+)")
    n_ast = footer_int(AST, r"\*\*Total:\*\*\s*(\d+)")
    n_dir_disk = dirs_with_ts()

    print("K1 iteration - enumerated surfaces (see .cursor/k1-iteration-axes.md)")
    print()
    print(f"  @src/  .ts:           {n_ts}")
    print(f"  @src/  .tsx:          {n_tsx}")
    print(f"  @src/  total:         {n_disk}  (k1-iteration-todos-exhaustive.md: {n_doc!r} rows)")
    print(f"  @src/  unique dirs:   {n_dir_disk}  (k1-iteration-todos-exhaustive-subdirs: {n_sub!r} rows)")
    print(f"  optional AST:        {n_ast!r}  (scss+html list)")
    print(f"  TS not under src/    {n_ext!r}  (EXT-#### list)")
    print()
    print("  Authoritative match check:  npm run k1:exhaustive:all")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
