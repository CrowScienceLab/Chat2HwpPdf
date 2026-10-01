[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
[void][Reflection.Assembly]::LoadWithPartialName('System.IO.Compression.FileSystem')
function Get-ArtifactHash([string]$filePath) {
  $algorithm = [Security.Cryptography.SHA256]::Create(); $stream = [IO.File]::OpenRead($filePath)
  try { return [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-','') } finally { $stream.Dispose(); $algorithm.Dispose() }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$extensionRoot = Join-Path $projectRoot 'chrome-extension'
$release = Get-Content -LiteralPath (Join-Path $projectRoot 'release.json') -Raw | ConvertFrom-Json
$manifest = Get-Content -LiteralPath (Join-Path $extensionRoot 'manifest.json') -Raw | ConvertFrom-Json
$version = $release.version
if ($version -notmatch '^\d+\.\d+\.\d+$' -or $manifest.version -ne $version) { throw 'Release/manifest version mismatch' }
$setup = Join-Path $projectRoot 'windows-helper\bin\Chat2HwpPdf-Setup.exe'
$hostBinary = Join-Path $projectRoot 'windows-helper\bin\AIChatExporter.HwpHost.exe'
foreach ($file in @($setup, $hostBinary)) { if ([Diagnostics.FileVersionInfo]::GetVersionInfo($file).FileVersion -ne ($version+'.0')) { throw "Native binary version mismatch: $file" } }
$dist = Join-Path $projectRoot "dist\$version"
$archiveRoot = Join-Path (Split-Path -Parent $projectRoot) '_archive\AI_Chat2Hwpx_Pdf'
if (Test-Path -LiteralPath $dist) {
  $resolved = (Resolve-Path -LiteralPath $dist).Path
  if (-not $resolved.StartsWith($projectRoot+'\dist\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected distribution path' }
  New-Item -ItemType Directory -Force -Path $archiveRoot | Out-Null
  Move-Item -LiteralPath $resolved -Destination (Join-Path $archiveRoot ("package-$version-"+(Get-Date -Format 'yyyyMMdd-HHmmss-fff')))
}
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$stage = Join-Path $projectRoot ('tmp\package-'+[Guid]::NewGuid().ToString('N'))
$extension = Join-Path $stage 'extension'
$source = Join-Path $stage 'source'
New-Item -ItemType Directory -Force -Path $extension,$source | Out-Null
Copy-Item -Path (Join-Path $extensionRoot '*') -Destination $extension -Recurse
Copy-Item -LiteralPath (Join-Path $projectRoot 'THIRD_PARTY_NOTICES.md') -Destination $extension
[IO.Compression.ZipFile]::CreateFromDirectory($extension, (Join-Path $dist "Chat2HwpPdf-Chrome-$version.zip"))
foreach ($relative in @('chrome-extension','branding','scripts','tests','docs','release.json','package.json','package-lock.json','README.md','HANDOFF.md','THIRD_PARTY_NOTICES.md','.gitignore')) { Copy-Item -LiteralPath (Join-Path $projectRoot $relative) -Destination $source -Recurse }
New-Item -ItemType Directory -Force -Path (Join-Path $source 'windows-helper\security') | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'windows-helper\src') -Destination (Join-Path $source 'windows-helper') -Recurse
Get-ChildItem -LiteralPath (Join-Path $projectRoot 'windows-helper') -File | Where-Object { $_.Extension -eq '.ps1' -or $_.Name -eq 'README.md' } | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $source 'windows-helper') }
foreach ($relative in @('README.md','official-automation.zip')) { Copy-Item -LiteralPath (Join-Path $projectRoot "windows-helper\security\$relative") -Destination (Join-Path $source 'windows-helper\security') }
[IO.Compression.ZipFile]::CreateFromDirectory($source, (Join-Path $dist "Chat2HwpPdf-Source-$version.zip"))
Copy-Item -LiteralPath $setup -Destination $dist
Copy-Item -LiteralPath (Join-Path $projectRoot 'chrome-extension\icons\icon-128.png') -Destination (Join-Path $dist 'Chat2HwpPdf-Icon-128.png')
Copy-Item -LiteralPath (Join-Path $projectRoot 'branding\app-large.png') -Destination (Join-Path $dist 'Chat2HwpPdf-Large-512.png')
Copy-Item -LiteralPath (Join-Path $projectRoot 'branding\store-promo.png') -Destination (Join-Path $dist 'Chat2HwpPdf-Store-440x280.png')
Copy-Item -LiteralPath (Join-Path $projectRoot 'docs\release-0.4.7.md') -Destination $dist
$hashes = Get-ChildItem -LiteralPath $dist -File | Sort-Object Name | ForEach-Object { '{0}  {1}' -f (Get-ArtifactHash $_.FullName).ToLowerInvariant(), $_.Name }
[IO.File]::WriteAllLines((Join-Path $dist 'SHA256SUMS.txt'), $hashes, (New-Object Text.UTF8Encoding($false)))
$resolvedStage = (Resolve-Path -LiteralPath $stage).Path
if (-not $resolvedStage.StartsWith($projectRoot+'\tmp\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected staging path' }
New-Item -ItemType Directory -Force -Path $archiveRoot | Out-Null
Move-Item -LiteralPath $resolvedStage -Destination (Join-Path $archiveRoot ("stage-$version-"+(Get-Date -Format 'yyyyMMdd-HHmmss-fff')))
Write-Output $dist
