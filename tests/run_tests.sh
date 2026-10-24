#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf .test-build
tsc -p tsconfig.geo-tests.json
node tests/test_module.cjs
python tests/test_data.py
python tests/test_osm_import.py
