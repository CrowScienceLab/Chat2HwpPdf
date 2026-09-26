[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-p]{32}$')]
  [string]$ExtensionId
)

$ErrorActionPreference = 'Stop'
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw '이 스크립트는 관리자 PowerShell에서 실행해야 합니다.'
}

$installer = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'install.ps1'
$previousConfirmPreference = $ConfirmPreference
try {
  $ConfirmPreference = 'None'
  & $installer -ExtensionId $ExtensionId -MachineFallback -Confirm:$false
} finally {
  $ConfirmPreference = $previousConfirmPreference
}
