[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$hostRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
& node (Join-Path (Split-Path -Parent $hostRoot) 'scripts\sync-version.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Version synchronization failed' }
$source = Join-Path $hostRoot 'src\Program.cs'
$outputDirectory = Join-Path $hostRoot 'bin'
$output = Join-Path $outputDirectory 'AIChatExporter.HwpHost.exe'
$compiler = 'C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe'

if (-not (Test-Path -LiteralPath $compiler)) {
  throw '.NET Framework x86 C# compiler를 찾지 못했습니다.'
}

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
& $compiler /nologo /target:exe /platform:x86 /optimize+ /out:$output /reference:System.Web.Extensions.dll /reference:System.Windows.Forms.dll /reference:Microsoft.CSharp.dll $source (Join-Path $hostRoot 'src\ReleaseInfo.cs') "/win32icon:$(Join-Path (Split-Path -Parent $hostRoot) 'branding\app.ico')"
if ($LASTEXITCODE -ne 0) { throw "네이티브 호스트 빌드 실패: $LASTEXITCODE" }
Write-Output $output
