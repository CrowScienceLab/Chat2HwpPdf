[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content -LiteralPath (Join-Path $projectRoot 'manifest.json') -Raw | ConvertFrom-Json
$version = $manifest.version
$dist = Join-Path $projectRoot "dist\$version"
if (Test-Path -LiteralPath $dist) {
  $archive = Join-Path 'D:\App coding\_archive\AI-Chat-Exporter' ("package-$version-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $archive) | Out-Null
  # Both paths are fixed descendants of the coding workspace; preserve previous artifacts.
  Move-Item -LiteralPath $dist -Destination $archive
}
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$stage = Join-Path $projectRoot ("tmp\package-" + [Guid]::NewGuid().ToString('N'))
$extension = Join-Path $stage 'extension'
$source = Join-Path $stage 'source'
New-Item -ItemType Directory -Force -Path $extension,$source | Out-Null
$runtime = @('manifest.json','background.js','popup','content','styles','icons','setup')
foreach ($relative in $runtime) {
  Copy-Item -LiteralPath (Join-Path $projectRoot $relative) -Destination $extension -Recurse
}
Copy-Item -LiteralPath (Join-Path $projectRoot 'THIRD_PARTY_NOTICES.md') -Destination $extension
Compress-Archive -Path (Join-Path $extension '*') -DestinationPath (Join-Path $dist "Chat2HwpPdf-Chrome-$version.zip")
$sourceFiles = @('manifest.json','background.js','popup','content','styles','icons','setup','scripts','tests','package.json','package-lock.json','README.md','THIRD_PARTY_NOTICES.md','.gitignore')
foreach ($relative in $sourceFiles) { Copy-Item -LiteralPath (Join-Path $projectRoot $relative) -Destination $source -Recurse }
New-Item -ItemType Directory -Force -Path (Join-Path $source 'docs'),(Join-Path $source 'native-host\security') | Out-Null
foreach ($doc in @('index.md','index.html','privacy.md','privacy.html','advanced-install.md','release-readiness.md','store-listing.ko.md','hwp-editable-equations.md')) {
  Copy-Item -LiteralPath (Join-Path $projectRoot "docs\$doc") -Destination (Join-Path $source 'docs')
}
Copy-Item -LiteralPath (Join-Path $projectRoot 'native-host\src') -Destination (Join-Path $source 'native-host') -Recurse
Get-ChildItem -LiteralPath (Join-Path $projectRoot 'native-host') -File | Where-Object { $_.Extension -eq '.ps1' -or $_.Name -eq 'README.md' } | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $source 'native-host') }
Copy-Item -LiteralPath (Join-Path $projectRoot 'native-host\security\README.md') -Destination (Join-Path $source 'native-host\security')
Compress-Archive -Path (Join-Path $source '*') -DestinationPath (Join-Path $dist "Chat2HwpPdf-Source-$version.zip")
Copy-Item -LiteralPath (Join-Path $projectRoot 'native-host\bin\Chat2HwpPdf-Setup.exe') -Destination $dist
New-Item -ItemType Directory -Force -Path (Join-Path $dist 'docs') | Out-Null
foreach ($relative in @('README.md','THIRD_PARTY_NOTICES.md','docs\index.md','docs\index.html','docs\privacy.md','docs\privacy.html','docs\advanced-install.md','docs\release-readiness.md','docs\store-listing.ko.md','docs\hwp-editable-equations.md')) { Copy-Item -LiteralPath (Join-Path $projectRoot $relative) -Destination (Join-Path $dist $relative) }
$hashes = Get-ChildItem -LiteralPath $dist -File -Recurse | Sort-Object FullName | ForEach-Object { "{0}  {1}" -f (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant(), $_.FullName.Substring($dist.Length + 1).Replace('\','/') }
[IO.File]::WriteAllLines((Join-Path $dist 'SHA256SUMS.txt'), $hashes, (New-Object Text.UTF8Encoding($false)))
Write-Output $dist
