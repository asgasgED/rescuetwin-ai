#!/usr/bin/env python3
"""Prueba HTTP real de /api/simulate en Next.js (sin librerías externas).

Uso: python tests/smoke_http.py --base http://localhost:3000
Ejecutar tras npm run dev en el repo de Next.js de SYNAPSE.
"""
from __future__ import annotations
import argparse
import json
import math
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
HOMES = ("home_01", "home_02", "home_03")
SCENARIOS = ("normal", "blocked")


def request_json(url: str) -> tuple[int, object]:
    req = Request(url, headers={"Accept": "application/json", "User-Agent": "SYNAPSE-Geo-SmokeTest/1.0"})
    try:
        with urlopen(req, timeout=12) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except HTTPError as exc:
        return exc.code, json.loads(exc.read().decode("utf-8"))


def verify(base: str) -> None:
    f = ROOT / "public/data/test_expectations.json"
    if not f.is_file():
        raise AssertionError(f"Falta {f}: ejecutar desde la raíz del proyecto con el dataset real.")
    snapshot = json.loads(f.read_text(encoding="utf-8"))
    expected = {(case["originId"], case["scenario"]): case for case in snapshot["cases"]}
    assert len(expected) == 6, "Deben existir seis expectativas."
    distances = {}
    tests = 0
    for home in HOMES:
        for scenario in SCENARIOS:
            url = f"{base.rstrip('/')}/api/simulate?{urlencode({'scenario': scenario, 'originId': home})}"
            status, obj = request_json(url)
            assert status == 200, f"{home}/{scenario}: HTTP {status}"
            assert isinstance(obj, dict)
            assert obj.get("originId") == home, f"Origen incorrecto: {home}"
            assert obj.get("scenario") == scenario, f"Escenario incorrecto: {scenario}"
            assert obj.get("destinationId") == "meeting_01"
            assert obj.get("roads", {}).get("type") == "FeatureCollection"
            assert obj.get("riskZones", {}).get("type") == "FeatureCollection"
            assert isinstance(obj.get("blockedRoadIds"), list)
            assert isinstance(obj.get("provenance", {}).get("roads"), str)
            assert isinstance(obj.get("warning"), str) and obj["warning"]
            route = obj.get("route")
            assert route is not None, f"{home}/{scenario}: no hay ruta"
            assert route.get("type") == "Feature"
            assert route.get("geometry", {}).get("type") == "LineString"
            coords = route["geometry"].get("coordinates", [])
            assert len(coords) >= 2
            assert all(len(p) == 2 and all(isinstance(x, (float, int)) for x in p) for p in coords)
            distance = obj.get("routeDistanceM")
            assert isinstance(distance, (int, float)) and distance > 0
            want = expected[(home, scenario)]["routeDistanceM"]
            assert math.isclose(distance, want, abs_tol=0.01), f"{home}/{scenario}: {distance} m != {want} m"
            if scenario == "normal":
                assert not obj["blockedRoadIds"], "Normal no debe bloquear calles."
            else:
                assert obj["blockedRoadIds"], "Blocked debe bloquear al menos una calle."
            distances[(home, scenario)] = distance
            tests += 1
            print(f"OK {home} {scenario}: {distance:.3f} m (HTTP 200)")
        assert distances[(home, "blocked")] > distances[(home, "normal")], f"{home}: no hubo desvío"
    for params, key in [({"scenario":"invalid","originId":"home_01"}, "INVALID_SCENARIO"),
                        ({"scenario":"normal","originId":"home_99"}, "INVALID_ORIGIN")]:
        url = f"{base.rstrip('/')}/api/simulate?{urlencode(params)}"
        status, obj = request_json(url)
        assert status == 400, f"Se esperaba 400, resultado {status}"
        assert isinstance(obj, dict) and obj.get("error", {}).get("code") == key
        tests += 1
    for filename in ("places.geojson", "roads.geojson"):
        status, obj = request_json(f"{base.rstrip('/')}/data/{filename}")
        assert status == 200 and isinstance(obj, dict) and obj.get("type") == "FeatureCollection", filename
        tests += 1
    print(f"SYNAPSE ✅ {tests} comprobaciones HTTP: 6 rutas, 2 errores 400 y 2 recursos estáticos.")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--base", default="http://localhost:3000", help="URL del servidor Next.js en ejecución")
    args = p.parse_args()
    try:
        verify(args.base)
    except (AssertionError, URLError, TimeoutError, OSError, ValueError) as e:
        raise SystemExit(f"SYNAPSE ❌ Error en smoke test HTTP: {e}\n"
                         "Verifica que npm run dev esté activo, los archivos integrados y el dataset OSM regenerado.")


if __name__ == "__main__":
    main()
