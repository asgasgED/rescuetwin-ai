
from pathlib import Path
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def leer(ruta):
    return (ROOT / ruta).read_text(encoding="utf-8")


# 1. Cargar y validar los datos del proyecto.
meta = json.loads(leer("public/data/dataset_meta.json"))
grafo = json.loads(leer("public/data/graph.json"))
lugares = json.loads(leer("public/data/places.geojson"))
escenarios = json.loads(leer("public/data/scenarios.json"))
expectativas = json.loads(leer("public/data/test_expectations.json"))
generado = leer("src/lib/generated/dataset.ts")

assert meta["sourceType"] == "osm", "La cartografia no es OSM"
assert '"sourceType":"osm"' in generado, (
    "La API no esta usando el dataset OSM"
)

assert len(grafo["nodes"]) >= 600, "Hay menos de 600 nodos"
assert len(grafo["edges"]) >= 800, "Hay menos de 800 tramos"
assert len(lugares["features"]) >= 4, "Faltan lugares en el GeoJSON"
assert len(escenarios["blocked"]["blockedRoadIds"]) > 0, (
    "No hay vias bloqueadas en los escenarios"
)
assert len(expectativas["cases"]) == 6, (
    "Se esperaban seis casos de prueba"
)

# 2. Verificar que existan los archivos críticos.
archivos_criticos = [
    "src/app/api/simulate/route.ts",
    "src/app/api/plan/route.ts",
    "src/lib/ai.ts",
    "src/lib/simulator.ts",
    "src/app/shared/page.tsx",
    "docs/api-contracts.md",
    ".env.example",
]

faltantes = [
    ruta for ruta in archivos_criticos
    if not (ROOT / ruta).is_file()
]

assert not faltantes, (
    f"Faltan archivos criticos: {', '.join(faltantes)}"
)

# 3. Comprobar la plantilla de variables de entorno.
assert "NVIDIA_API_KEY" in leer(".env.example"), (
    ".env.example no declara NVIDIA_API_KEY"
)

# 4. Comprobar que .env.local no esté rastreado por Git.
# El archivo puede existir localmente; no se lee ni se imprime su contenido.
git_dir = subprocess.run(
    ["git", "rev-parse", "--show-toplevel"],
    cwd=ROOT,
    capture_output=True,
    text=True,
)

if git_dir.returncode == 0:
    raiz_git = Path(git_dir.stdout.strip()).resolve()

    try:
        ruta_relativa = (ROOT / ".env.local").resolve().relative_to(
            raiz_git
        ).as_posix()
    except ValueError:
        ruta_relativa = None

    if ruta_relativa is not None:
        rastreado = subprocess.run(
            ["git", "ls-files", "--error-unmatch", ruta_relativa],
            cwd=raiz_git,
            capture_output=True,
            text=True,
        )

        assert rastreado.returncode != 0, (
            ".env.local no debe estar rastreado por Git"
        )

print(
    "OK - Integracion: OSM, grafo, GeoJSON, seis casos, "
    "modulos, archivos criticos y configuracion local verificados."
)