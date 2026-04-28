#!/usr/bin/env python3
"""
Regenerate `.cursor/k1-iteration-todos-repo-ts-outside-src.md`:
one checkbox per `**/*.{ts,tsx}` in the repo that is NOT under `src/`.

K1 `k1_win_gog_swkotor.exe` parity: **[N/A]** (IDE / VS Code extension / LSP tooling),
unless a row is explicitly about NWScript token parity with the game — then
cross-check intrinsics in private notes, not 1:1 with every EXE symbol.

Skips: node_modules, dist, coverage, wiki, .git, .history

Run from repo root:
  python .cursor/scripts/regenerate_repo_ts_outside_src_checklist.py
"""
from __future__ import annotations

import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parents[2]
OUT = REPO / ".cursor" / "k1-iteration-todos-repo-ts-outside-src.md"

IGNORE_DIRS = {"node_modules", "dist", "coverage", "wiki", ".git", ".history"}


def collect() -> list[pathlib.Path]:
    found: list[pathlib.Path] = []
    for ext in (".ts", ".tsx"):
        for p in REPO.rglob(f"*{ext}"):
            if not p.is_file():
                continue
            if any(part in IGNORE_DIRS for part in p.parts):
                continue
            rel = p.relative_to(REPO)
            if len(rel.parts) and rel.parts[0] == "src":
                continue
            found.append(p.resolve())
    return sorted(set(found), key=lambda p: str(p).lower())


def main() -> int:
    files = collect()
    lines: list[str] = [
        "# K1 plan — TypeScript **outside** `src/` (repo satellite)\n\n",
        "**Not** part of the **1490** [k1-iteration-todos-exhaustive.md](k1-iteration-todos-exhaustive.md) "
        "rows. The game client reference binary does not apply line-by-line; treat as **editor / LSP / "
        "tooling** unless you document a specific NWScript or data-path contract.\n\n",
        "**Regenerate:** `python .cursor/scripts/regenerate_repo_ts_outside_src_checklist.py`\n\n"
        "**Verify:** `python .cursor/scripts/diff_repo_ts_outside_src.py` (exit 0)\n\n"
        "---\n\n",
    ]
    for i, p in enumerate(files, start=1):
        rel = p.relative_to(REPO).as_posix()
        name = p.name
        lines.append(f"- [ ] EXT-{i:04d}: `{name}` (`{rel}`)\n")
    body = "".join(lines)
    body += f"\n---\n**Total:** {len(files)} (all `.ts` / `.tsx` not under `src/`)\n"
    OUT.write_text(body, encoding="utf-8", newline="\n")
    print(f"Wrote {len(files)} entries to {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
