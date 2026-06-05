#!/usr/bin/env bash
# Smoke-test dev FS middleware on a running webpack:serve-hmr instance.
# Usage: KOTOR_DEV_PORT=8170 ./scripts/prove-dev-fs-smoke.sh
set -euo pipefail

PORT="${KOTOR_DEV_PORT:-8095}"
BASE="http://127.0.0.1:${PORT}"

stat_chitin=$(curl -sf "${BASE}/__kotor_dev_fs?action=stat&path=chitin.key")
echo "stat chitin.key: ${stat_chitin}"
echo "${stat_chitin}" | grep -q '"exists":true' || { echo "FAIL: chitin.key missing"; exit 1; }

stat_bik=$(curl -sf "${BASE}/__kotor_dev_fs?action=stat&path=Movies/leclogo.bik")
echo "stat Movies/leclogo.bik: ${stat_bik}"
echo "${stat_bik}" | grep -q '"exists":true' || { echo "FAIL: leclogo.bik missing"; exit 1; }

hex=$(curl -sf "${BASE}/__kotor_dev_fs?action=read&path=chitin.key&offset=0&length=4" | xxd -p | tr -d '\n')
echo "chitin.key first 4 bytes: ${hex}"
test -n "${hex}" || { echo "FAIL: empty read"; exit 1; }

echo "OK: dev FS smoke passed on port ${PORT}"
