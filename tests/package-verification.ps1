Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = (Resolve-Path '.').Path
$release = Get-Content release.json -Raw | ConvertFrom-Json
$zipFile = Join-Path $projectRoot "dist\$($release.version)\Chat2HwpPdf-Chrome-$($release.version).zip"
$zip = [IO.Compression.ZipFile]::OpenRead($zipFile)
try {
  $names = @($zip.Entries | ForEach-Object { $_.FullName.Replace('\','/') })
  foreach ($required in @('manifest.json','background.js','helper-client.js','release-config.js','setup/setup.html','icons/icon-128.png')) { if ($names -notcontains $required) { throw "Missing extension entry: $required" } }
  if ($names | Where-Object { $_ -match '(^|/)(_local-history|node_modules|tests|windows-helper|\.git)(/|$)' }) { throw 'Unexpected development files in extension ZIP' }
  foreach ($entry in $zip.Entries) {
    if ($entry.Name -eq '') { continue }
    $relative = $entry.FullName.Replace('/', '\')
    $source = if ($relative -eq 'THIRD_PARTY_NOTICES.md') { Join-Path $projectRoot $relative } else { Join-Path $projectRoot "chrome-extension\$relative" }
    $stream = $entry.Open(); $sha = [Security.Cryptography.SHA256]::Create()
    try { $actual = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','') } finally { $stream.Dispose(); $sha.Dispose() }
    if ($actual -ne (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash) { throw "ZIP/source mismatch: $relative" }
  }
} finally { $zip.Dispose() }
$sourceZip = Join-Path $projectRoot "dist\$($release.version)\Chat2HwpPdf-Source-$($release.version).zip"
$zip = [IO.Compression.ZipFile]::OpenRead($sourceZip)
try {
  $names = @($zip.Entries | ForEach-Object { $_.FullName.Replace('\','/') })
  foreach ($required in @('chrome-extension/manifest.json','windows-helper/src/Program.cs','windows-helper/src/Setup.cs','windows-helper/src/ReleaseInfo.cs','windows-helper/security/official-automation.zip','release.json','scripts/package.ps1','tests/onboarding.mjs')) { if ($names -notcontains $required) { throw "Missing source entry: $required" } }
  if ($names | Where-Object { $_ -match '(^|/)(node_modules|tmp|dist|\.git|bin)(/|$)' }) { throw 'Unexpected generated files in source ZIP' }
} finally { $zip.Dispose() }
Write-Output 'PASS: ZIP runtime files match development sources; extension root manifest correct; separated source archive rebuild inputs present; no temporary files packaged.'
