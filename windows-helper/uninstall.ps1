[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param([switch]$MachineFallback)

$hostName = 'com.ai_chat_exporter.hwp'
$installRoot = Join-Path $env:LOCALAPPDATA 'AIChatExporter\NativeHost'
if ($PSCmdlet.ShouldProcess($installRoot, 'Chrome/Edge 네이티브 호스트 등록과 설치 파일 제거')) {
  foreach ($browser in @('Google\Chrome', 'Microsoft\Edge')) {
    $key = "HKCU:\Software\$browser\NativeMessagingHosts\$hostName"
    if (Test-Path -LiteralPath $key) { Remove-Item -LiteralPath $key -Recurse -Force }
  }
  if (Test-Path -LiteralPath $installRoot) { Remove-Item -LiteralPath $installRoot -Recurse -Force }
  Write-Output 'AI Chat Exporter 네이티브 호스트를 제거했습니다.'
}

if ($MachineFallback) {
  $machineRoot = Join-Path $env:ProgramData 'AIChatExporter\NativeHost'
  if ($PSCmdlet.ShouldProcess($machineRoot, 'Chrome/Edge HKLM 네이티브 호스트 등록과 ProgramData 설치 파일 제거')) {
    foreach ($browser in @('Google\Chrome', 'Microsoft\Edge')) {
      $subKey = "Software\$browser\NativeMessagingHosts\$hostName"
      foreach ($view in @([Microsoft.Win32.RegistryView]::Registry32, [Microsoft.Win32.RegistryView]::Registry64)) {
        $baseKey = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::LocalMachine, $view)
        try { $baseKey.DeleteSubKeyTree($subKey, $false) }
        finally { $baseKey.Dispose() }
      }
    }
    if (Test-Path -LiteralPath $machineRoot) { Remove-Item -LiteralPath $machineRoot -Recurse -Force }
    Write-Output 'AI Chat Exporter 시스템 수준 네이티브 호스트를 제거했습니다.'
  }
}
