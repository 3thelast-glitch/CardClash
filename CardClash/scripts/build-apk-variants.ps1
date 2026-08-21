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

Write-Host "`n[1/3] تثبيت الاعتمادات والتحقق من المشروع..." -ForegroundColor Cyan
Invoke-CheckedCommand { pnpm install --frozen-lockfile } 'فشل تثبيت الاعتمادات.'
Invoke-CheckedCommand { pnpm check } 'فشل فحص TypeScript.'
Invoke-CheckedCommand { pnpm test } 'فشلت اختبارات المشروع.'

$variants = if ($Variant -eq 'both') { @('player', 'developer') } else { @($Variant) }
$outputDirectory = Join-Path $projectRoot 'builds'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

foreach ($currentVariant in $variants) {
  Write-Host "`n[2/3] تجهيز نسخة $currentVariant..." -ForegroundColor Cyan
  Stop-ProjectGradleDaemon
  $env:APP_VARIANT = $currentVariant
  Invoke-CheckedCommand { npx expo prebuild --clean --platform android } "فشل Expo Prebuild لنسخة $currentVariant."

  $config = (npx expo config --type public --json | ConvertFrom-Json)
  $version = $config.version
  $packageName = $config.android.package

  Write-Host "[3/3] بناء APK: $($config.name) — الإصدار $version — $packageName" -ForegroundColor Cyan
  Push-Location '.\android'
  try {
    Invoke-CheckedCommand { .\gradlew.bat assembleRelease } "فشل بناء APK لنسخة $currentVariant."
  } finally {
    Pop-Location
  }

  $apkSource = Join-Path $projectRoot 'android\app\build\outputs\apk\release\app-release.apk'
  if (-not (Test-Path $apkSource)) { throw "لم يُعثر على ملف APK الناتج: $apkSource" }

  $apkDestination = Join-Path $outputDirectory "CardClash-$currentVariant-$version.apk"
  Copy-Item -Force $apkSource $apkDestination
  Write-Host "تم إنشاء النسخة: $apkDestination" -ForegroundColor Green
}

Remove-Item Env:APP_VARIANT -ErrorAction SilentlyContinue
Write-Host "`nاكتمل بناء النسخ المطلوبة. ثبّت اللاعب والمطوّر كحزمتين منفصلتين." -ForegroundColor Green
