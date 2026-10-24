$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $root
try {
  npx.cmd --no-install tsc --noEmit
  if ($LASTEXITCODE -ne 0) { throw "Error de TypeScript." }
  npm.cmd run lint
  if ($LASTEXITCODE -ne 0) { throw "Error de ESLint." }
  node tests/test_frontend_share.mjs
  if ($LASTEXITCODE -ne 0) { throw "Error en enlaces compartidos." }
  powershell -NoProfile -ExecutionPolicy Bypass -File tests/run_tests_geo.ps1
  if ($LASTEXITCODE -ne 0) { throw "Error en el Rol 2." }
  powershell -NoProfile -ExecutionPolicy Bypass -File tests/run_tests_ia.ps1
  if ($LASTEXITCODE -ne 0) { throw "Error en el Rol 3." }
  Write-Output "OK - SYNAPSE: verificaciones locales completas."
} finally { Pop-Location }
