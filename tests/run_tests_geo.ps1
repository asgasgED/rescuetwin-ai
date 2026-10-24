$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $root
try {
  if (Test-Path .test-build) { Remove-Item -Recurse -Force .test-build }
  npx.cmd --no-install tsc -p tsconfig.geo-tests.json
  if ($LASTEXITCODE -ne 0) { throw "Error de compilación geoespacial." }
  node tests/test_module.cjs
  if ($LASTEXITCODE -ne 0) { throw "Fallo en pruebas del motor geoespacial." }
  python tests/test_data.py
  if ($LASTEXITCODE -ne 0) { throw "Fallo al validar los GeoJSON." }
  python tests/test_osm_import.py
  if ($LASTEXITCODE -ne 0) { throw "Fallo en la prueba del importador OSM." }
  python tests/test_integracion.py
  if ($LASTEXITCODE -ne 0) { throw "Fallo de integridad de datos." }
  Write-Output "OK - Pruebas geoespaciales completas."
} finally { Pop-Location }
