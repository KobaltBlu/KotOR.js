#!/usr/bin/env python3
"""
Regenerate .cursor/k1-iteration-todos-exhaustive.md: one checkbox per src/**/*.ts|tsx
with unambiguous (relative/path/from/src) in parentheses.
Run from repo root: python .cursor/scripts/regenerate_exhaustive_src_checklist.py
"""
from __future__ import annotations

import pathlib
import textwrap

REPO = pathlib.Path(__file__).resolve().parents[2]
SRC = REPO / "src"
OUT = REPO / ".cursor" / "k1-iteration-todos-exhaustive.md"

HEADER = """# K1 reference - exhaustive `src/` TypeScript checklist (canonical)

**Regenerate:** `python .cursor/scripts/regenerate_exhaustive_src_checklist.py` after large moves.

**Companion:** [k1-iteration-todos.md](k1-iteration-todos.md) (thematic P0-P2 + MCP batches).

**Rule:** Each box is (a) **done** with MCP support from `k1_win_gog_swkotor.exe` and TS updated if needed, or (b) **[N/A K1]** / **[N/A host]** / **TSL** with a one-line reason in private notes. Do not paste tool names, paths to research binaries, or addresses into `src/` comments (see k1_swkotor plan).

**Counts below** must equal `rg --glob '*.{ts,tsx}' -l src | wc` on a clean tree.

---
"""


def main() -> None:
    files: list[pathlib.Path] = []
    for ext in (".ts", ".tsx"):
        files.extend(SRC.rglob(f"*{ext}"))
    files = sorted({p.resolve() for p in files}, key=lambda p: str(p).lower())

    lines: list[str] = [HEADER]
    n = 0
    for p in files:
        rel = p.relative_to(SRC).as_posix()
        name = p.name
        n += 1
        # ID: SRC-0001 ... (stable ordering)
        lines.append(f"- [ ] SRC-{n:04d}: `{name}` (`{rel}`)\n")
    body = "".join(lines)
    body += f"\n---\n**Total items:** {n} (all `.ts` and `.tsx` under `src/`)\n"
    OUT.write_text(body, encoding="utf-8", newline="\n")
    print(f"Wrote {n} entries to {OUT.relative_to(REPO)}")


if __name__ == "__main__":
    main()
