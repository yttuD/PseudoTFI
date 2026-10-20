$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$taskTarget = Join-Path $taskRoot '.pi/runtime/antigravity/agy.exe'
if (Test-Path -LiteralPath $taskTarget) {
    & $taskTarget --version
    exit $LASTEXITCODE
}
$taskPlatform = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'windows_arm64' } else { 'windows_amd64' }
$taskManifest = Invoke-RestMethod -Uri "https://antigravity-cli-auto-updater-974169037036.us-central1.run.app/manifests/$taskPlatform.json"
New-Item -ItemType Directory -Force -Path (Split-Path $taskTarget -Parent) | Out-Null
$taskPending = "$taskTarget.pending"
Invoke-WebRequest -Uri $taskManifest.url -OutFile $taskPending
$taskHash = (Get-FileHash -LiteralPath $taskPending -Algorithm SHA512).Hash.ToLower()
if ($taskHash -ne $taskManifest.sha512.ToLower()) { throw 'SHA512 incorrecto: no ejecutar el binario.' }
Move-Item -LiteralPath $taskPending -Destination $taskTarget
& $taskTarget --version
exit $LASTEXITCODE
