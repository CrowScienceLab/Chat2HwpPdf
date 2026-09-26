$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$output = Join-Path $projectRoot 'tmp\site-compatibility'
Start-Transcript -LiteralPath (Join-Path $output 'native-session.log') -Force
try {
  $hostExe = Join-Path $env:LOCALAPPDATA 'CrowScienceLab\Chat2HwpPdf\AIChatExporter.HwpHost.exe'
  foreach ($site in @('gemini','notebook','claude','partial','all-omitted','notebook-tags')) {
    & $hostExe --self-test (Join-Path $output "$site.json") (Join-Path $output "$site.hwpx")
    if ($LASTEXITCODE -ne 0) { throw "$site conversion failed" }
  }
  'PASS: all synthetic site and partial conversion payloads saved by the installed host.'
} catch {
  Write-Output $_.Exception.ToString()
  exit 1
} finally { Stop-Transcript }
