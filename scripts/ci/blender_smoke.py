#!/usr/bin/env python3
"""
Headless Blender smoke validation for CI.

This script is intended to run inside Blender's Python runtime:
  blender --background --factory-startup --python scripts/ci/blender_smoke.py

Optional environment variables:
  - KOTORBLENDER_PATH: absolute path to external addon checkout
  - KOTORBLENDER_MODULE: addon Python module name (default: kotorblender)
"""

import json
import os
import pathlib
import sys
import tempfile

import bpy


def ensure_smoke_output_dir() -> pathlib.Path:
    output_dir_env = os.environ.get("BLENDER_SMOKE_OUTPUT_DIR", "").strip()
    output_dir = (
        pathlib.Path(output_dir_env).resolve()
        if output_dir_env
        else pathlib.Path(tempfile.mkdtemp(prefix="kotor_blender_smoke_"))
    )
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def write_debug_report(output_dir: pathlib.Path, report: dict) -> None:
    report_path = output_dir / "report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")


def create_and_save_scene(output_dir: pathlib.Path) -> str:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(0.0, 0.0, 0.0))
    blend_path = output_dir / "smoke_scene.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    return str(blend_path)


def try_enable_kotorblender(report: dict) -> None:
    addon_path = os.environ.get("KOTORBLENDER_PATH", "").strip()
    addon_module = os.environ.get("KOTORBLENDER_MODULE", "kotorblender").strip() or "kotorblender"

    report["kotorblender"] = {
        "requested": bool(addon_path),
        "module": addon_module,
        "path": addon_path,
    }

    if not addon_path:
        report["kotorblender"]["status"] = "skipped"
        report["kotorblender"]["reason"] = "KOTORBLENDER_PATH not provided"
        return

    addon_dir = pathlib.Path(addon_path)
    if not addon_dir.exists():
        raise FileNotFoundError(f"KOTORBLENDER_PATH does not exist: {addon_path}")

    sys.path.insert(0, str(addon_dir.parent))

    __import__(addon_module)
    bpy.ops.preferences.addon_enable(module=addon_module)

    if addon_module not in bpy.context.preferences.addons.keys():
        raise RuntimeError(f"Addon {addon_module} did not appear in enabled add-ons list")

    report["kotorblender"]["status"] = "enabled"


def main() -> int:
    output_dir = ensure_smoke_output_dir()
    report = {
        "blender_version": ".".join(str(part) for part in bpy.app.version),
        "python_version": sys.version,
    }

    try:
        report["scene_file"] = create_and_save_scene(output_dir)
        try_enable_kotorblender(report)
        report["status"] = "ok"
        write_debug_report(output_dir, report)
        print(json.dumps(report, indent=2))
        return 0
    except Exception as exc:  # pylint: disable=broad-exception-caught
        report["status"] = "error"
        report["error"] = str(exc)
        write_debug_report(output_dir, report)
        print(json.dumps(report, indent=2))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
