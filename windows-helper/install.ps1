[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-p]{32}$')]
  [string]$ExtensionId,
  [switch]$MachineFallback,
  [switch]$ProjectLocal
)

$ErrorActionPreference = 'Stop'
$hostName = 'com.ai_chat_exporter.hwp'
$sourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceExe = Join-Path $sourceRoot 'bin\AIChatExporter.HwpHost.exe'
$installRoot = Join-Path $env:LOCALAPPDATA 'AIChatExporter\NativeHost'
$projectRoot = Join-Path $sourceRoot 'bin'
$projectManifest = Join-Path $projectRoot "$hostName.json"
# Preserve an existing project-local installation when updating the host.
foreach ($browser in @('Google\Chrome', 'Microsoft\Edge')) {
  $registered = Get-Item -LiteralPath "HKCU:\Software\$browser\NativeMessagingHosts\$hostName" -ErrorAction SilentlyContinue
  if ($registered -and $registered.GetValue('') -eq $projectManifest) { $ProjectLocal = $true }
}
if ($ProjectLocal) { $installRoot = $projectRoot }
$installedExe = Join-Path $installRoot 'AIChatExporter.HwpHost.exe'
$manifestPath = Join-Path $installRoot "$hostName.json"

if (-not (Test-Path -LiteralPath $sourceExe)) { throw '먼저 windows-helper\build.ps1을 실행해 주세요.' }
$manifest = [ordered]@{
  name = $hostName
  description = 'Local-only HWP/HWPX exporter for AI Chat Exporter'
  path = $installedExe
  type = 'stdio'
  allowed_origins = @("chrome-extension://$ExtensionId/")
} | ConvertTo-Json -Depth 4

if ($PSCmdlet.ShouldProcess($installRoot, '네이티브 호스트 복사 및 Chrome/Edge HKCU 등록')) {
  New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
  if ([IO.Path]::GetFullPath($sourceExe) -ne [IO.Path]::GetFullPath($installedExe)) {
    Copy-Item -LiteralPath $sourceExe -Destination $installedExe -Force
  }
  # PowerShell 5.1 and 7 must write identical UTF-8 bytes.
  [IO.File]::WriteAllText($manifestPath, $manifest, (New-Object Text.UTF8Encoding($false)))
  foreach ($browser in @('Google\Chrome', 'Microsoft\Edge')) {
    $key = "HKCU:\Software\$browser\NativeMessagingHosts\$hostName"
    New-Item -Path $key -Force | Out-Null
    Set-Item -Path $key -Value $manifestPath
  }
  Write-Output "설치 완료: $manifestPath"
}

if ($MachineFallback) {
  $machineRoot = Join-Path $env:ProgramData 'AIChatExporter\NativeHost'
  $machineExe = Join-Path $machineRoot 'AIChatExporter.HwpHost.exe'
  $machineManifestPath = Join-Path $machineRoot "$hostName.json"
  $machineManifest = [ordered]@{
    name = $hostName
    description = 'Local-only HWP/HWPX exporter for AI Chat Exporter'
    path = $machineExe
    type = 'stdio'
    allowed_origins = @("chrome-extension://$ExtensionId/")
  } | ConvertTo-Json -Depth 4

  if ($PSCmdlet.ShouldProcess($machineRoot, '네이티브 호스트를 ProgramData에 복사하고 Chrome/Edge HKLM 등록')) {
    New-Item -ItemType Directory -Force -Path $machineRoot | Out-Null
    Copy-Item -LiteralPath $sourceExe -Destination $machineExe -Force
    [IO.File]::WriteAllText($machineManifestPath, $machineManifest, (New-Object Text.UTF8Encoding($false)))
    foreach ($browser in @('Google\Chrome', 'Microsoft\Edge')) {
      $subKey = "Software\$browser\NativeMessagingHosts\$hostName"
      foreach ($view in @([Microsoft.Win32.RegistryView]::Registry32, [Microsoft.Win32.RegistryView]::Registry64)) {
        $baseKey = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::LocalMachine, $view)
        try {
          $key = $baseKey.CreateSubKey($subKey, $true)
          try { $key.SetValue('', $machineManifestPath, [Microsoft.Win32.RegistryValueKind]::String) }
          finally { $key.Dispose() }
        } finally { $baseKey.Dispose() }
      }
    }
    Write-Output "시스템 수준 설치 완료: $machineManifestPath"
  }
}
