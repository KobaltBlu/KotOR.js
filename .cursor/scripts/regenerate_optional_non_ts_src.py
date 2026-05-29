#!/usr/bin/env python3
"""Optional manifest: .scss, .html under src/ (UI/layout; K1 screen parity is manual or design-tied)."""
from __future__ import annotations

import pathlib

REPO = pathlib.Path(__file__).resolve().parents[2]
SRC = REPO / "src"
OUT = REPO / ".cursor" / "k1-iteration-todos-optional-assets.md"

SUFFIX = {".scss", ".html"}

HEADER = """# K1 alignment — optional non-TypeScript `src` assets (UI / markup)

**Scope:** In-repo `.scss` and `.html` under `src/`. **Not** required to map to `k1_win_gog_swkotor.exe` symbols; use for **visual/UX** parity and Forge UI consistency.

**TypeScript** canonical list: [k1-iteration-todos-exhaustive.md](k1-iteration-todos-exhaustive.md).

**Regen:** `python .cursor/scripts/regenerate_optional_non_ts_src.py`

---
"""


def main() -> None:
    files = sorted(
        (p for p in SRC.rglob("*") if p.suffix in SUFFIX and p.is_file()),
        key=lambda p: str(p).lower(),
    )
    lines = [HEADER]
    for n, p in enumerate(files, 1):
        rel = p.relative_to(SRC).as_posix()
        lines.append(f"- [ ] AST-{n:04d}: `{p.name}` (`{rel}`)\n")
    lines.append(f"\n---\n**Total:** {len(files)}\n")
    OUT.write_text("".join(lines), encoding="utf-8", newline="\n")
    print(f"Wrote {len(files)} to {OUT.relative_to(REPO)}")


if __name__ == "__main__":
    main()
