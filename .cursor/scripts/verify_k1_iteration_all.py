#!/usr/bin/env python3
"""
Run all machine-verifiable K1 iteration checklists:
  - per-file + per-dir under `src/` (verify_k1_iteration_exhaustive.py)
  - per-file TS outside `src/` (diff_repo_ts_outside_src.py)
  - optional `.scss` / `.html` under `src/` (diff_optional_non_ts_src.py)

Exit 0 only if all pass.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PY = sys.executable


def run(script: str) -> int:
    r = subprocess.run([PY, str(REPO / ".cursor" / "scripts" / script)], cwd=REPO)
    return r.returncode


def main() -> int:
    r1 = run("verify_k1_iteration_exhaustive.py")
    if r1 != 0:
        return r1
    r2 = run("diff_repo_ts_outside_src.py")
    if r2 != 0:
        return r2
    r3 = run("diff_optional_non_ts_src.py")
    if r3 != 0:
        return r3
    print("ok: k1 exhaustive (src) + optional assets + repo satellite TS list")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
