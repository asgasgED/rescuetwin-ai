$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $root
try {
  npx.cmd --no-install tsc -p tsconfig.role3-tests.json
  if ($LASTEXITCODE -ne 0) { throw "Error de compilación del módulo de IA." }
  node tests/run_tests.cjs
  if ($LASTEXITCODE -ne 0) { throw "Fallo en pruebas de IA." }
  node tests/test_nvidia_payload.cjs
  if ($LASTEXITCODE -ne 0) { throw "Fallo en pruebas de NVIDIA." }
  Write-Output "OK - Pruebas del módulo de IA completas (proveedor simulado)."
} finally { Pop-Location }
