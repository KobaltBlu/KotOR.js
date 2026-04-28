#!/usr/bin/env python3
"""
Insert neutral *Observed game behavior* lines into src/interface/**/*.ts
when missing. Idempotent (skips if already present).

Run from repo root:
  python .cursor/scripts/annotate_interface_observed_behavior.py
"""
from __future__ import annotations

import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parents[2]
IFACE = REPO / "src" / "interface"
MARKER = " * KotOR JS - A remake"
OBS_TAG = " * Observed game behavior:"


def bucket(rel: pathlib.Path) -> str:
    parts = rel.parts
    return parts[0] if parts else "interface"


def observed_line(rel: pathlib.Path) -> str:
    b = bucket(rel)
    lines = {
        "animation": "animation state slots used when driving creature and dialog faces like the original render loop.",
        "area": "area list, grass, and ambient shapes tied to ARE-style module data the classic client loads.",
        "combat": "combat action payloads the combat round and attack path consume like the original resolver.",
        "dialog": "dialog runtime fields (camera, stunts, checks) aligned with GFF-backed dialog resources in K1.",
        "engine": "engine globals, perception, path points, and render context grouping—mirrors engine service state, not a second on-disk format.",
        "filesystem": "directory listing options for the install-root adapter that backs the same logical folders as the retail data layout.",
        "graphics": "TGA/TPC discovery and screen-resolution shapes used on the texture path toward GPU sampling.",
        "gui": "control contracts for the web/Electron UI; **[N/A]** 1:1 Win32 control parity—names follow in-game data where applicable.",
        "input": "host key state; **[N/A]** to NWScript VM—maps player input into the same actions the classic client would issue.",
        "loaders": "queued texture references for async loading analogous to the client texture manager queue.",
        "minigames": "Pazaak card and table shapes for the K1 minigame set.",
        "module": "module runtime and editor payloads (VIS rooms, scripts, icons) tied to on-disk module formats.",
        "nwscript": "NWScript action definitions and VM store-state shapes used by the bytecode runtime.",
        "odyssey": "model, walkmesh, perimeter, and controller contracts aligned with compiled MDL/MDX semantics.",
        "resource": "packed resource headers and JSON interchange shapes for BIF/KEY/ERF/RIM/GFF/texture/LIP/LYT families.",
        "talents": "spell/feat UI mode results; authoritative gameplay numbers remain in 2DA and `engine/rules`.",
        "twoDA": "2DA animation column projections consumed by table parsers.",
        "utility": "async loop options for host-side batching (**[N/A]** to retail EXE internals).",
    }
    body = lines.get(b, "TypeScript contract for data surfaced by the matching engine or tool module in this codebase.")
    return f"{OBS_TAG} {body}\n"


def insert_before_kotor(text: str, rel: pathlib.Path) -> str | None:
    if OBS_TAG in text:
        return None
    if MARKER not in text:
        return None
    line = observed_line(rel)
    return text.replace(MARKER, line + MARKER, 1)


def patch_file(path: pathlib.Path) -> bool:
    rel = path.relative_to(IFACE)
    text = path.read_text(encoding="utf-8")
    if OBS_TAG in text:
        return False

    new = insert_before_kotor(text, rel)
    if new is not None:
        path.write_text(new, encoding="utf-8", newline="\n")
        return True

    # --- special files (no standard KotOR header line) ---
    name = path.name
    if name == "index.ts":
        block = (
            "/**\n"
            " * Barrel re-exports for this `interface/` subtree.\n"
            f"{OBS_TAG} types only; K1 parity is on the implementing modules referenced here.\n"
            " */\n\n"
        )
        if text.startswith("/**"):
            return False
        path.write_text(block + text, encoding="utf-8", newline="\n")
        return True

    if path == IFACE / "engine" / "IEngineRenderContext.ts":
        path.write_text(
            "/**\n"
            " * Engine render context placeholder.\n"
            f"{OBS_TAG} **[N/A]** stub - render context lives in the Three.js host stack, not a named type in the classic EXE API.\n"
            " */\n"
            + text
        )
        return True

    if path == IFACE / "engine" / "IGameContext.ts":
        path.write_text(
            "/**\n"
            " * Per-frame game context for camera, lighting, and state groups.\n"
            f"{OBS_TAG} groups the same concerns the original renderer and tick loop keep internally (web stack differs).\n"
            " */\n\n"
            + text
        )
        return True

    if path == IFACE / "gui" / "IGUIControlListNode.ts":
        path.write_text(
            text.replace(
                "/**\n * Minimal list-item payload",
                "/**\n * Minimal list-item payload\n *\n"
                f"{OBS_TAG} list row data for inventory-style UI; parallels what the classic client shows in list controls.\n *\n",
                1,
            )
        )
        return True

    if path == IFACE / "gui" / "IGUIShaderMaterial.ts":
        path.write_text(
            "/**\n"
            " * GUI-facing Three.js shader material shape.\n"
            f"{OBS_TAG} **[N/A]** GPU API - uniform layout follows this engine's web renderer, not a direct D3D type export.\n"
            " */\n\n"
            + text
        )
        return True

    if path == IFACE / "minigames" / "IPazaakCard.ts":
        path.write_text(
            "/**\n"
            " * Pazaak card definition for UI and logic.\n"
            f"{OBS_TAG} card fields match the K1 Pazaak minigame data the original client uses in play.\n"
            " */\n\n"
            + text
        )
        return True

    if path == IFACE / "minigames" / "IPazaakTable.ts":
        path.write_text(
            "/**\n"
            " * Pazaak table state.\n"
            f"{OBS_TAG} table slots and deck state for the same minigame surface as the retail K1 client.\n"
            " */\n\n"
            + text
        )
        return True

    if path == IFACE / "minigames" / "IPazaakTableSlot.ts":
        path.write_text(
            "/**\n"
            " * One slot on the Pazaak table.\n"
            f"{OBS_TAG} slot occupancy and modifiers analogous to the classic minigame board.\n"
            " */\n\n"
            + text
        )
        return True

    if path == IFACE / "resource" / "IGFFFieldJSON.ts":
        path.write_text(
            "/**\n"
            " * JSON-friendly view of one GFF field.\n"
            f"{OBS_TAG} mirrors GFF field typing and nested struct lists the original client reads from binary GFF on disk.\n"
            " */\n\n"
            + text
        )
        return True

    if path == IFACE / "resource" / "IGFFStructJSON.ts":
        path.write_text(
            "/**\n"
            " * JSON-friendly view of one GFF struct.\n"
            f"{OBS_TAG} label + field map layout matches serialized GFF struct semantics from classic module/save data.\n"
            " */\n\n"
            + text
        )
        return True

    if path == IFACE / "module" / "IVISRoom.ts":
        path.write_text(
            text.replace(
                "/**\n * Interface for a VISRoom\n *\n * @author",
                "/**\n * Interface for a VISRoom\n *\n"
                f"{OBS_TAG} room visibility list entries matching `.vis` / module room sets the original client resolves.\n *\n * @author",
                1,
            )
        )
        return True

    if path == IFACE / "odyssey" / "IAdjacentWalkableFaces.ts":
        path.write_text(
            "/**\n"
            " * Walkmesh adjacency for path queries.\n"
            f"{OBS_TAG} face/edge adjacency used like walkmesh neighbor tests in the original pathfinder.\n"
            " */\n\n"
            + text
        )
        return True

    if path == IFACE / "odyssey" / "IOdysseyModelAnimationData.ts":
        path.write_text(
            text.replace(
                " * Use object to satisfy no-empty-object-type; extend with concrete fields when defined.\n *\n * @file",
                " * Use object to satisfy no-empty-object-type; extend with concrete fields when defined.\n *\n"
                f"{OBS_TAG} extend to match MDL animation chunk fields the retail renderer consumes once fully typed.\n *\n * @file",
                1,
            )
        )
        return True

    print(f"warn: no rule for {path.relative_to(REPO)}", file=sys.stderr)
    return False


def main() -> int:
    if not IFACE.is_dir():
        print("error: src/interface missing", file=sys.stderr)
        return 1
    n = 0
    for path in sorted(IFACE.rglob("*.ts")):
        if patch_file(path):
            n += 1
    print(f"updated {n} files under src/interface")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
