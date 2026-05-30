#!/usr/bin/env python3
"""
Verify `.cursor/k1-iteration-todos-exhaustive-subdirs.md` matches disk:
every directory under src/ that directly contains a .ts or .tsx must appear
exactly once as SUBDIR-xxxx, and the markdown must not list stale dirs.

Run from repo root:
  python .cursor/scripts/diff_exhaustive_src_subdirs.py
"""
from __future__ import annotations

import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parents[2]
SRC = REPO / "src"
MD = REPO / ".cursor" / "k1-iteration-todos-exhaustive-subdirs.md"


def dirs_on_disk() -> set[str]:
    s: set[str] = set()
    for ext in (".ts", ".tsx"):
        for p in SRC.rglob(f"*{ext}"):
            s.add(p.parent.relative_to(SRC).as_posix())
    return s


def dirs_in_doc(text: str) -> set[str]:
    found: set[str] = set()
    # - [ ] SUBDIR-0001: `src/foo/bar/` — **3** file(s) directly here
    pat = re.compile(
        r"SUBDIR-\d{4}:\s*`src/([^`]+)/`\s*—",
    )
    for m in pat.finditer(text):
        found.add(m.group(1))
    root_pat = re.compile(r"SUBDIR-\d{4}:\s*`src/`\s*—")
    if root_pat.search(text):
        found.add(".")
    return found


def main() -> int:
    if not MD.is_file():
        print(f"error: missing {MD} — run regenerate_exhaustive_src_subdirs.py", file=sys.stderr)
        return 1
    disk = dirs_on_disk()
    text = MD.read_text(encoding="utf-8")
    doc = dirs_in_doc(text)
    missing = sorted(disk - doc, key=str.lower)
    extra = sorted(doc - disk, key=str.lower)
    if missing or extra:
        if missing:
            print("missing from doc (first 20):", missing[:20], file=sys.stderr)
        if extra:
            print("extra in doc (first 20):", extra[:20], file=sys.stderr)
        print(f"on disk {len(disk)} in doc {len(doc)} missing {len(missing)} extra {len(extra)}", file=sys.stderr)
        return 1
    print(f"ok: {len(disk)} directories, doc matches disk")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
