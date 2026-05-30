#!/usr/bin/env python3
"""Exit 0 iff k1-iteration-todos-optional-assets.md lists every .scss and .html under src/."""
from __future__ import annotations

import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parents[2]
SRC = REPO / "src"
AST = REPO / ".cursor" / "k1-iteration-todos-optional-assets.md"
SUFFIX = {".scss", ".html"}


def main() -> None:
    if not AST.is_file():
        print("error: missing", AST, file=sys.stderr)
        sys.exit(1)
    text = AST.read_text(encoding="utf-8", errors="replace")
    in_doc: set[str] = set()
    for line in text.splitlines():
        m = re.search(r"\(`([^`]+)`\)\s*$", line)
        if m and "AST-" in line and line.strip().startswith("- [ ]"):
            in_doc.add(m.group(1).replace("\\", "/").strip())
    on_disk: set[str] = set()
    for p in SRC.rglob("*"):
        if p.suffix.lower() in SUFFIX and p.is_file():
            on_disk.add(p.relative_to(SRC).as_posix().replace("\\", "/"))
    extra = sorted(in_doc - on_disk)
    missing = sorted(on_disk - in_doc)
    print("optional scss/html: on disk", len(on_disk), "in doc", len(in_doc), "missing", len(missing), "extra", len(extra))
    for e in extra[:30]:
        print("  extra:", e)
    for e in missing[:30]:
        print("  miss:", e)
    sys.exit(0 if not extra and not missing else 1)


if __name__ == "__main__":
    main()
