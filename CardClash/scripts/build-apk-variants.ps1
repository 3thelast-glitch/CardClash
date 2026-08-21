param(
  [ValidateSet('player', 'developer', 'both')]
  [string]$Variant = 'both'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Invoke-CheckedCommand {
  param([scriptblock]$Command, [string]$FailureMessage)
  & $Command
  if ($LASTEXITCODE -ne 0) { throw $FailureMessage }
}

function Stop-ProjectGradleDaemon {
  if (Test-Path '.\android\gradlew.bat') {
    Push-Location '.\android'
    try { & .\gradlew.bat --stop | Out-Host } finally { Pop-Location }
  }
}

Write-Host "`n[1/3] Installing dependencies and checking project..." -ForegroundColor Cyan
Invoke-CheckedCommand { pnpm install --frozen-lockfile } 'Dependency installation failed.'
Invoke-CheckedCommand { pnpm check } 'TypeScript check failed.'
Invoke-CheckedCommand { pnpm test } 'Project tests failed.'

$variants = if ($Variant -eq 'both') { @('player', 'developer') } else { @($Variant) }
$outputDirectory = Join-Path $projectRoot 'builds'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

foreach ($currentVariant in $variants) {
  Write-Host "`n[2/3] Preparing $currentVariant variant..." -ForegroundColor Cyan
  Stop-ProjectGradleDaemon
  $env:APP_VARIANT = $currentVariant
  Invoke-CheckedCommand { npx expo prebuild --clean --platform android } "Expo prebuild failed for $currentVariant."

  $config = (npx expo config --type public --json | ConvertFrom-Json)
  $version = $config.version
  $packageName = $config.android.package

  Write-Host "[3/3] Building APK: $($config.name) | version $version | $packageName" -ForegroundColor Cyan
  Push-Location '.\android'
  try {
    Invoke-CheckedCommand { .\gradlew.bat assembleRelease } "APK build failed for $currentVariant."
  } finally {
    Pop-Location
  }

  $apkSource = Join-Path $projectRoot 'android\app\build\outputs\apk\release\app-release.apk'
  if (-not (Test-Path $apkSource)) { throw "APK output was not found: $apkSource" }

  $apkDestination = Join-Path $outputDirectory "CardClash-$currentVariant-$version.apk"
  Copy-Item -Force $apkSource $apkDestination
  Write-Host "APK created: $apkDestination" -ForegroundColor Green
}

Remove-Item Env:APP_VARIANT -ErrorAction SilentlyContinue
Write-Host "`nRequested APK builds completed. Player and developer use separate packages." -ForegroundColor Green
