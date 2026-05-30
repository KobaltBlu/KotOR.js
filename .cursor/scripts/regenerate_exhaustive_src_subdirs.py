#!/usr/bin/env python3
"""
Regenerate `.cursor/k1-iteration-todos-exhaustive-subdirs.md`:
one checkbox per directory under `src/` that directly contains at least one
`.ts` or `.tsx` file (200-ish rows). This is the exhaustive *folder* axis
alongside the per-file list in `k1-iteration-todos-exhaustive.md`.

Run from repo root:
  python .cursor/scripts/regenerate_exhaustive_src_subdirs.py
"""
from __future__ import annotations

import pathlib
import sys
from collections import defaultdict

REPO = pathlib.Path(__file__).resolve().parents[2]
SRC = REPO / "src"
OUT = REPO / ".cursor" / "k1-iteration-todos-exhaustive-subdirs.md"

HEADER = """# K1 reference — exhaustive `src/` **directory** checklist (canonical)

**Regenerate:** `python .cursor/scripts/regenerate_exhaustive_src_subdirs.py` after large moves under `src/`.

**Companion lists**

- **Per file:** [k1-iteration-todos-exhaustive.md](k1-iteration-todos-exhaustive.md) (must match on-disk `src/**/*.ts|tsx` count; verify script enforces this)
- **Thematic + 29 top-level trees:** [k1-iteration-todos.md](k1-iteration-todos.md)

**Rule:** Each row is a folder that **directly** holds one or more `.ts`/`.tsx` files. When iterating K1 ↔ `k1_win_gog_swkotor.exe`, either validate every file in that folder (via the per-file list) or mark the whole folder **[N/A]** in private notes with one reason (e.g. Forge-only UI, holocron harness).

**Verify:** `python .cursor/scripts/diff_exhaustive_src_subdirs.py` (must exit 0).

---

"""


def main() -> int:
    if not SRC.is_dir():
        print("error: src/ not found", file=sys.stderr)
        return 1

    # rel_dir -> set of basenames
    by_dir: dict[str, list[str]] = defaultdict(list)
    for ext in (".ts", ".tsx"):
        for p in SRC.rglob(f"*{ext}"):
            rel_dir = p.parent.relative_to(SRC).as_posix()
            by_dir[rel_dir].append(p.name)

    rows: list[tuple[str, int]] = []
    # `(src root)` first, then alphabetical
    for d in sorted(by_dir.keys(), key=lambda s: (0 if s == "." else 1, s.lower())):
        if d == ".":
            key = "(src root)"
        else:
            key = d
        n = len(by_dir[d])
        rows.append((key, n))

    lines = [HEADER]
    for i, (d, n) in enumerate(rows, start=1):
        path = "`src/`" if d == "(src root)" else f"`src/{d}/`"
        lines.append(f"- [ ] SUBDIR-{i:04d}: {path} — **{n}** file(s) directly here\n")

    body = "".join(lines)
    body += f"\n---\n**Total directories:** {len(rows)} (each contains ≥1 `.ts` or `.tsx`)\n"
    OUT.write_text(body, encoding="utf-8", newline="\n")
    print(f"Wrote {len(rows)} directory rows to {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
