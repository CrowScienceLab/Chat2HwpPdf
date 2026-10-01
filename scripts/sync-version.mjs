import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const release = JSON.parse(fs.readFileSync(path.join(root, 'release.json'), 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(release.version) || !/^[a-p]{32}$/.test(release.extensionId)) throw new Error('Invalid release configuration');
for (const name of ['chrome-extension/manifest.json', 'package.json', 'package-lock.json']) {
  const file = path.join(root, name);
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  value.version = release.version;
  if (value.packages?.['']) value.packages[''].version = release.version;
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
fs.writeFileSync(path.join(root, 'chrome-extension/release-config.js'), `// Generated from release.json by scripts/sync-version.mjs.\nwindow.CrowRelease = Object.freeze(${JSON.stringify({ version: release.version, extensionId: release.extensionId, downloadUrl: `https://github.com/${release.repository}/releases/download/v${release.version}/Chat2HwpPdf-Setup.exe` }, null, 2)});\n`);
fs.writeFileSync(path.join(root, 'windows-helper/src/ReleaseInfo.cs'), `// Generated from release.json.\nusing System.Reflection;\n[assembly: AssemblyVersion("${release.version}.0")]\n[assembly: AssemblyFileVersion("${release.version}.0")]\ninternal static class ReleaseInfo { public const string Version = "${release.version}"; }\n`);
console.log(`Extension and Windows helper: ${release.version}`);
