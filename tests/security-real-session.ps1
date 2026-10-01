[CmdletBinding()]
param([switch]$InstallForCurrentUser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$log = Join-Path $projectRoot 'tmp\equations\real-session.log'
Start-Transcript -LiteralPath $log -Force
try {
  $setup = Join-Path $projectRoot 'windows-helper\bin\Chat2HwpPdf-Setup.exe'
  $selfTest = Start-Process -FilePath $setup -ArgumentList '--self-test' -WindowStyle Hidden -Wait -PassThru
  if ($selfTest.ExitCode -ne 0) { throw 'Installer isolated self-test failed' }
  & (Join-Path $PSScriptRoot 'security-module-smoke.ps1')
  'PASS: real Windows session security module conversion.'
  if ($InstallForCurrentUser) {
    $hostKey = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Software\Google\Chrome\NativeMessagingHosts\com.ai_chat_exporter.hwp')
    try { $manifestPath = $hostKey.GetValue('') } finally { $hostKey.Dispose() }
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    $origin = @($manifest.allowed_origins)
    if ($origin.Count -ne 1 -or $origin[0] -notmatch '^chrome-extension://([a-p]{32})/$') { throw 'Ambiguous Chrome extension ID' }
    $extensionId = $Matches[1]
    $appRoot = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'CrowScienceLab\Chat2HwpPdf'
    $output = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Chat2Hwp&Pdf'
    $settings = Join-Path $appRoot 'settings.json'
    if (Test-Path -LiteralPath $settings) { $output = (Get-Content -LiteralPath $settings -Raw | ConvertFrom-Json).outputDirectory }
    $moduleDirectory = Join-Path $appRoot 'Security'
    $arguments = @('--install',$extensionId,('"' + $output + '"'),('"' + $moduleDirectory + '"'))
    $install = Start-Process -FilePath $setup -ArgumentList $arguments -WindowStyle Hidden -Wait -PassThru
    if ($install.ExitCode -ne 0) { throw 'Current-user installation failed' }
    $installedHost = Join-Path $appRoot 'AIChatExporter.HwpHost.exe'
    $fixture = Join-Path $projectRoot 'tmp\equations\fixture.json'
    $saved = Join-Path $projectRoot 'tmp\equations\installed-module.hwpx'
    & $installedHost --self-test $fixture $saved
    if ($LASTEXITCODE -ne 0) { throw 'Installed host conversion failed' }
    $edited = Join-Path $projectRoot 'tmp\equations\installed-module-edited.hwpx'
    & $installedHost --edit-test $saved $edited
    if ($LASTEXITCODE -ne 0) { throw 'Installed host editing failed' }
    [ordered]@{ passed=$true; version=(Get-Content -LiteralPath (Join-Path $projectRoot 'release.json') -Raw | ConvertFrom-Json).version; extensionId=$extensionId; installRoot=$appRoot; outputDirectory=$output; modulePath=(Join-Path $moduleDirectory 'FilePathCheckerModuleExample.dll'); saved=$saved; edited=$edited } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $projectRoot 'tmp\equations\installation-result.json') -Encoding UTF8
    'PASS: current-user installation, conversion, equation edit and save.'
  }
} catch {
  Write-Output $_.Exception.ToString()
  exit 1
} finally { Stop-Transcript }
