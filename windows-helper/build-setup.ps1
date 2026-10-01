[CmdletBinding()]
param([ValidatePattern('^[a-p]{32}$')][string]$ExtensionId)
$ErrorActionPreference = 'Stop'
function Get-ArtifactHash([string]$filePath) {
  $algorithm = [Security.Cryptography.SHA256]::Create(); $stream = [IO.File]::OpenRead($filePath)
  try { return [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-','') } finally { $stream.Dispose(); $algorithm.Dispose() }
}

$nativeRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $nativeRoot 'build.ps1')
if (-not $ExtensionId) { $release = Get-Content -LiteralPath (Join-Path (Split-Path -Parent $nativeRoot) 'release.json') -Raw | ConvertFrom-Json; $ExtensionId = $release.extensionId }
$compiler = 'C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe'
$dll = Join-Path $nativeRoot 'security\official\FilePathCheckerModuleExample.dll'
if (-not (Test-Path -LiteralPath $dll)) {
  [void][Reflection.Assembly]::LoadWithPartialName('System.IO.Compression.FileSystem')
  [IO.Compression.ZipFile]::ExtractToDirectory((Join-Path $nativeRoot 'security\official-automation.zip'), (Join-Path $nativeRoot 'security\official'))
}
$actual = (Get-ArtifactHash $dll)
if ($actual -ne '9AC5B97C47AC8AED1E8BCA27A3EEF39411361D8F68C262509F0C40A8F9D21BB6') { throw '공식 보안 모듈 체크섬이 다릅니다.' }
$extensionFile = Join-Path $nativeRoot 'bin\ExtensionId.txt'
[IO.File]::WriteAllText($extensionFile, $ExtensionId, (New-Object Text.UTF8Encoding($false)))
$setup = Join-Path $nativeRoot 'bin\Chat2HwpPdf-Setup.exe'
$hostExe = Join-Path $nativeRoot 'bin\AIChatExporter.HwpHost.exe'
& $compiler /nologo /target:winexe /platform:x86 /optimize+ /out:$setup /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll "/resource:$hostExe,Host.exe" "/resource:$dll,Security.dll" "/resource:$extensionFile,ExtensionId.txt" (Join-Path $nativeRoot 'src\Setup.cs') (Join-Path $nativeRoot 'src\ReleaseInfo.cs') "/win32icon:$(Join-Path (Split-Path -Parent $nativeRoot) 'branding\app.ico')" "/resource:$(Join-Path (Split-Path -Parent $nativeRoot) 'branding\app.ico'),App.ico"
if ($LASTEXITCODE -ne 0) { throw '설치 패키지 빌드 실패' }
Write-Output $setup
