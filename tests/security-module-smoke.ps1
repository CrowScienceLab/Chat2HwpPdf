[CmdletBinding()]
param([string]$ModulePath)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$moduleDll = Join-Path $projectRoot 'native-host\security\official\FilePathCheckerModuleExample.dll'
if ($ModulePath) { $moduleDll = (Resolve-Path -LiteralPath $ModulePath).Path }
$hostExe = Join-Path $projectRoot 'native-host\bin\AIChatExporter.HwpHost.exe'
$outputFile = Join-Path $projectRoot 'tmp\equations\security-module.hwpx'
$inputFile = Join-Path $projectRoot 'tmp\equations\fixture.json'
$registryPath = 'Software\HNC\HwpAutomation\Modules'
$moduleName = 'FilePathCheckerModuleExample'
$base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser, [Microsoft.Win32.RegistryView]::Registry32)
$key = $base.CreateSubKey($registryPath)
$uses = $base.CreateSubKey("$registryPath\Uses")
$oldValue = $key.GetValue($moduleName)
$oldKind = if ($null -ne $oldValue) { $key.GetValueKind($moduleName) } else { $null }
$oldUse = $uses.GetValue($moduleName)
$oldUseKind = if ($null -ne $oldUse) { $uses.GetValueKind($moduleName) } else { $null }
try {
  $key.SetValue($moduleName, $moduleDll, [Microsoft.Win32.RegistryValueKind]::String)
  $uses.DeleteValue($moduleName, $false)
  & $hostExe --self-test $inputFile $outputFile
  if ($LASTEXITCODE -ne 0) { throw '공식 보안 모듈 COM 변환 검증 실패' }
  if ((Get-Item -LiteralPath $outputFile).Length -eq 0) { throw '저장 파일이 비어 있습니다.' }
  $edited = Join-Path $projectRoot 'tmp\equations\security-module-edited.hwpx'
  & $hostExe --edit-test $outputFile $edited
  if ($LASTEXITCODE -ne 0) { throw 'Equation edit/reopen failed' }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [IO.Compression.ZipFile]::OpenRead($edited)
  try {
    $section = $zip.GetEntry('Contents/section0.xml')
    $reader = New-Object IO.StreamReader($section.Open())
    try { [xml]$xml = $reader.ReadToEnd() } finally { $reader.Dispose() }
    $equations = $xml.SelectNodes("//*[local-name()='equation']")
    if ($equations.Count -ne 6) { throw 'Equation count changed' }
    $firstScript = $equations[0].SelectSingleNode("*[local-name()='script']").InnerText
    if ($firstScript -ne 'F = m a + 1') { throw 'Edited equation was not persisted' }
  } finally { $zip.Dispose() }
  Write-Output 'PASS: reopened HWPX, edited equation, saved; six equation objects preserved.'
  Write-Output 'PASS: official module registered through HwpObject.RegisterModule; real COM conversion saved HWPX.'
} finally {
  if ($null -eq $oldValue) { $key.DeleteValue($moduleName, $false) } else { $key.SetValue($moduleName, $oldValue, $oldKind) }
  if ($null -eq $oldUse) { $uses.DeleteValue($moduleName, $false) } else { $uses.SetValue($moduleName, $oldUse, $oldUseKind) }
  $uses.Dispose(); $key.Dispose(); $base.Dispose()
  Write-Output 'Original product-specific registry values restored.'
}
