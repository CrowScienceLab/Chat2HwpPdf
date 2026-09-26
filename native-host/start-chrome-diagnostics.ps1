# Run this manually as the ordinary Chrome user after closing Chrome via its menu.
# It does not stop any process, change policy, or enable remote debugging.
[CmdletBinding()]
param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$diagnosticRoot = Join-Path $projectRoot 'tmp\native-messaging-diagnostics'
$chrome = Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'
if (-not (Test-Path -LiteralPath $chrome)) { throw 'Chrome executable not found.' }
$running = @(Get-Process chrome -ErrorAction SilentlyContinue)
if ($CheckOnly) {
  [pscustomobject]@{ Chrome = $chrome; RunningProcesses = $running.Count; LogDirectory = $diagnosticRoot }
  return
}
if ($running.Count -gt 0) { throw 'Close Chrome using its menu first. No process was stopped. Logging flags require a fresh Chrome process.' }
New-Item -ItemType Directory -Path $diagnosticRoot -Force | Out-Null
$logPath = Join-Path $diagnosticRoot ('chrome-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
$arguments = @('--enable-logging', '--log-level=0', ('--log-file="' + $logPath + '"'))
# Visible interactive browser is intentional: the user runs the extension probe.
Start-Process -FilePath $chrome -ArgumentList $arguments
Write-Output ('Log: ' + $logPath)
Write-Output 'Reload AI Chat Exporter, then click its native connection check button. Return the result to Codex.'
