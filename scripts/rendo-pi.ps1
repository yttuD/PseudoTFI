$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
Push-Location -LiteralPath $taskRoot
try {
    & node '.pi/sdd/cli.mjs' ui
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
