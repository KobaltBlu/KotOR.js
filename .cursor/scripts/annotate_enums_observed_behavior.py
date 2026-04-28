#!/usr/bin/env python3
"""
Insert neutral *Observed game behavior* lines into src/enums/**/*.ts when missing.
Idempotent. Uses ASCII punctuation only (UTF-8 safe).

Run from repo root:
  python .cursor/scripts/annotate_enums_observed_behavior.py
"""
from __future__ import annotations

import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parents[2]
ENUMS = REPO / "src" / "enums"
MARKER = " * KotOR JS - A remake"
OBS = " * Observed game behavior:"

# Paths (relative to src/enums) known to mix TSL-only symbols; append K1 note.
TSL_TOUCHED = frozenset(
    {
        pathlib.Path("controls") / "KeyMapAction.ts",
        pathlib.Path("engine") / "GameEngineType.ts",
        pathlib.Path("combat") / "BaseItemType.ts",
        pathlib.Path("combat") / "CombatFeatType.ts",
        pathlib.Path("dialog") / "DLGCameraAngle.ts",
        pathlib.Path("module") / "ModuleCreatureAnimState.ts",
    }
)


def tsl_note(rel: pathlib.Path) -> str:
    if rel in TSL_TOUCHED:
        return " Some entries are **TSL**-only; treat those values as **[N/A K1]** for the Windows GOG KotOR 1 reference client."
    return ""


def observed_body(rel: pathlib.Path) -> str:
    parts = rel.parts
    if "server" in parts:
        return (
            "**[N/A]** Host-side IPC or debugger message enums for this codebase; "
            "not a surface exported by the retail KotOR 1 game program."
        )
    if len(parts) == 1 and rel.name in ("ApplicationMode.ts", "ApplicationEnvironment.ts"):
        return (
            "**[N/A]** Host application mode and runtime (browser, Electron, Forge); "
            "not an on-disk game data enum from the shipped Windows client."
        )
    if len(parts) >= 1:
        top = parts[0]
        m = {
            "actions": "Numeric ids for the action queue and script actions the Odyssey engine resolves like the original client.",
            "audio": "Audio channel, encoding, and music modes matching how the classic client drives Miles/OpenAL-era sound data.",
            "chargen": "Character generation attribute slots aligned with the first game's character builder flow.",
            "combat": "Combat, weapon, damage, and dice enums consumed by the d20 rules path and attack resolution.",
            "controls": "Keyboard and mouse input enumerations for the host input layer mapping to game commands.",
            "dialog": "Dialog and camera mode constants aligned with GFF dialog runtime behavior in KotOR 1.",
            "effects": "Effect type, subtype, and duration ids used by the effect stack like the original engine tables.",
            "engine": "Tick, pause, map, feedback, and engine-mode constants for the main simulation loop.",
            "events": "Game and signal event type ids for the internal event bus ordering.",
            "graphics": "TGA, TPC, TXI pixel and layout enums matching packed texture helper data in archives.",
            "gui": "GUI layout and control ids; values follow classic KotOR UI data where applicable (**[N/A]** for pure host chrome).",
            "loaders": "Texture loader classification aligned with TPC/TGA handling in the resource stack.",
            "minigames": "Pazaak enums for the KotOR 1 minigame implementation.",
            "module": "World object, door, trigger, creature, and placeable state ids used by module runtime code.",
            "nwscript": "NWScript bytecode, data types, skills, and factions mirroring the NCS VM surface in the original client.",
            "odyssey": "MDL/MDX node, controller, walkmesh, and emitter flags matching compiled model semantics.",
            "resource": "GFF data types, endianness, cache scopes, LIP/SSF helpers aligned with packed resource formats.",
        }
        if top in m:
            return m[top] + tsl_note(rel)
    return (
        "Numeric constants consumed by this TypeScript engine; align values with the matching "
        "subsystem in the original Windows KotOR client when auditing parity."
    )


def insert_before_kotor(text: str, rel: pathlib.Path) -> str | None:
    if OBS in text:
        return None
    if MARKER not in text:
        return None
    line = f"{OBS} {observed_body(rel)}\n"
    return text.replace(MARKER, line + MARKER, 1)


def prepend_export_enum(text: str, rel: pathlib.Path) -> str:
    name = rel.stem
    return (
        "/**\n"
        f" * {name} enum.\n"
        " *\n"
        f"{OBS} {observed_body(rel)}\n"
        " *\n"
        " * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II\n"
        " *\n"
        f" * @file {rel.name}\n"
        " * @license GPL-3.0\n"
        " * @enum\n"
        " */\n"
        + text.lstrip("\n")
    )


def patch(path: pathlib.Path) -> bool:
    rel = path.relative_to(ENUMS)
    text = path.read_text(encoding="utf-8")
    if OBS in text:
        return False

    new = insert_before_kotor(text, rel)
    if new is not None:
        path.write_text(new, encoding="utf-8", newline="\n")
        return True

    stripped = text.lstrip()
    if stripped.startswith("export *"):
        block = (
            "/**\n"
            " * Barrel re-exports for this `enums/` subtree.\n"
            f"{OBS} constants map to engine and data paths in the retail client; "
            "see each leaf file for domain-specific K1 notes.\n"
            " */\n\n"
        )
        path.write_text(block + text, encoding="utf-8", newline="\n")
        return True

    if re.match(r"^export enum \w+", stripped):
        path.write_text(prepend_export_enum(text, rel), encoding="utf-8", newline="\n")
        return True

    print(f"warn: unhandled {path.relative_to(REPO)}", file=sys.stderr)
    return False


def main() -> int:
    if not ENUMS.is_dir():
        print("error: src/enums missing", file=sys.stderr)
        return 1
    n = 0
    for path in sorted(ENUMS.rglob("*.ts")):
        if patch(path):
            n += 1
    print(f"updated {n} files under src/enums")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
