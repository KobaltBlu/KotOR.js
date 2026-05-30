#!/usr/bin/env python3
"""
Recompute per-top-level `src/` ts/tsx counts and refresh the table in
`.cursor/k1-src-directory-coverage.md` (between TABLE_START and TABLE_END markers).
Run from repository root: python .cursor/scripts/regenerate_k1_src_directory_coverage.py
"""
from __future__ import annotations

import pathlib
import re
import sys
from collections import Counter

REPO = pathlib.Path(__file__).resolve().parents[2]
MD = REPO / ".cursor" / "k1-src-directory-coverage.md"
SRC = REPO / "src"


def counts() -> tuple[Counter[str], int]:
    c: Counter[str] = Counter()
    for p in SRC.rglob("*"):
        if p.suffix not in (".ts", ".tsx"):
            continue
        rel = p.relative_to(SRC)
        top = "(src root)" if len(rel.parts) == 1 else rel.parts[0]
        c[top] += 1
    return c, sum(c.values())


# Notes col: hand-maintained; counts refresh when you run this script.
DIR_NOTES: dict[str, str] = {
    "(src root)": r"`GameInitializer`, `KotOR`, `LoadingScreen`, `GameState`, `index.d.ts` — entry/bootstrap; parts **N/A** to gameplay EXE",
    "actions": r"Map to `Action*` / action queue; batch with P0-AXE",
    "apps": r"**Many [N/A EXE]**: debugger, launcher, forge UI — retail binary not authority for UI-only",
    "audio": r"P1-AV; client audio",
    "combat": r"P1-CMB; rules + `CombatMessageTLK`",
    "controls": r"P1-CTL",
    "effects": r"P0-AXE-02; `Effect*` stacks",
    "electron": r"**N/A EXE** — host process",
    "engine": r"P0-ENG; **SaveGame**, `INIManager`, rules, pathfinding",
    "enums": r"P1-EN-01; batch by domain; many TSL — **[N/A K1]** with reason",
    "events": r"P1-EVT",
    "game": r"P1-GUI-02; K1 client UI (`game/kotor/`)",
    "gui": r"P1-GUI",
    "interface": r"P1-IF-01; shapes for GFF/TLK",
    "loaders": r"P1-ODY-01",
    "managers": r"P1-MGR",
    "module": r"P0-MOD",
    "nwscript": r"P0-NWS",
    "odyssey": r"P1-ODY; rendering/model host (partial N/A if tooling)",
    "resource": r"P0-RES-01..08; **BIF, KEY, ERF, RIM, GFF, 2DA, TLK, LTR, TPC**",
    "server": r"**Often N/A** to retail single-player EXE unless paralleled",
    "shaders": r"P1-ODY-05; GPU, not 1:1 to gameplay EXE",
    "talents": r"P1-TL-01; K1 force/talent set",
    "tests": r"Harness — parity via fixtures, not line-by-line EXE",
    "three": r"P1-ODY-04",
    "types": r"Shared types; N/A to EXE unless re-exports game structs",
    "utility": r"P0-UBN-01 + format helpers used by `resource/`",
    "video": r"P1-AV-02",
    "worker": r"Texture thread; P1-ODY-06",
}

MARKER_START = "<!-- K1_DIR_TABLE_START -->"
MARKER_END = "<!-- K1_DIR_TABLE_END -->"


def main() -> int:
    if not SRC.is_dir():
        print("error: src/ not found", file=sys.stderr)
        return 1
    c, total = counts()
    def col_top(t: str) -> str:
        if t == "(src root)":
            return "`(src root)`"
        return f"`{t}/`"

    lines = [
        "| Top-level (under `src/`) | `.ts` / `.tsx` files | Notes for K1 ↔ `k1_win_gog_swkotor.exe` |",
        "|-------------------------|----------------------|----------------------------------------|",
    ]
    for top in sorted(c.keys()):
        note = DIR_NOTES.get(top, "—")
        lines.append(f"| {col_top(top)} | {c[top]} | {note} |")
    exh = REPO / ".cursor" / "k1-iteration-todos-exhaustive.md"
    exh_n: int | None = None
    if exh.is_file():
        t = exh.read_text(encoding="utf-8", errors="replace")
        m = re.search(r"\*\*Total items:\*\*\s*(\d+)", t)
        if m:
            exh_n = int(m.group(1))
    if exh_n is not None and total != exh_n:
        print(
            f"warning: disk ts/tsx total {total} != exhaustive footer {exh_n} in k1-iteration-todos-exhaustive.md",
            file=sys.stderr,
        )
    lines.append("")
    lines.append(
        f"| **TOTAL** | **{total}** | Must match [k1-iteration-todos-exhaustive.md](k1-iteration-todos-exhaustive.md) |"
    )
    body = "\n".join(lines)

    if not MD.exists():
        print(f"error: missing {MD}", file=sys.stderr)
        return 1
    text = MD.read_text(encoding="utf-8")
    if MARKER_START not in text or MARKER_END not in text:
        print("error: markers not found; insert TABLE markers in k1-src-directory-coverage.md", file=sys.stderr)
        return 1
    new_text = re.sub(
        re.escape(MARKER_START) + r".*?" + re.escape(MARKER_END),
        MARKER_START + "\n" + body + "\n" + MARKER_END,
        text,
        count=1,
        flags=re.DOTALL,
    )
    MD.write_text(new_text, encoding="utf-8", newline="\n")
    print(f"updated {MD} ({total} files)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
