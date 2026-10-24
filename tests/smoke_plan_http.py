#!/usr/bin/env python3
"""Prueba HTTP real contra Next.js; requiere proveedor configurado con clave válida."""
import json, sys, argparse, urllib.request, urllib.error

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:3000")
a = ap.parse_args()
url = a.base.rstrip("/") + "/api/plan"

def query(obj):
    data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers={"Content-Type":"application/json"}, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=65) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        return err.code, json.loads(err.read().decode("utf-8"))

base = {"scenario":"blocked", "scenarioSummary":"Cierre ilustrativo en Catacaos", "routeAvailable":True,
        "family":{"adults":2,"children":1,"olderAdults":1,"reducedMobility":False,"pets":False}}
code, result = query(base)
if code != 200:
    print(f"ERROR proveedor/servidor {code}: {result}")
    print("Revisar .env.local (sin compartir credenciales) y logs del servidor.")
    sys.exit(1)
required = {"title","summary","before","during","kit","sources","disclaimer"}
assert set(result) == required, result
assert all(isinstance(result[x],list) and len(result[x])>=1 for x in ("before","during","kit","sources"))
assert result["sources"] and all("gob.pe" in x["url"] for x in result["sources"])
print("OK 200 plan LLM real, campos del contrato y fuentes curadas")
code, invalid = query({**base, "scenario":"unknown"})
assert code==400 and invalid.get("error",{}).get("code")=="INVALID_REQUEST", (code, invalid)
print("OK 400 INVALID_REQUEST")
print("SYNAPSE Rol 3: prueba HTTP real terminada.")
