import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const failures = [];

if (manifest.manifest_version !== 3) failures.push("manifest_version must be 3");
const forbidden = ["<all_urls>", "tabs", "webRequest", "history", "downloads", "debugger"];
for (const permission of [...(manifest.permissions || []), ...(manifest.host_permissions || [])]) {
  if (forbidden.includes(permission)) failures.push(`forbidden permission: ${permission}`);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory() && ['node_modules', 'vendor', 'tmp', 'dist', '.git'].includes(entry.name)) return [];
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(root);
for (const file of files.filter((name) => name.endsWith(".js"))) {
  try { new vm.Script(fs.readFileSync(file, "utf8"), { filename: file }); }
  catch (error) { failures.push(`${path.relative(root, file)}: ${error.message}`); }
}

const required = [
  "popup/popup.html", "popup/popup.js", "styles/print.css",
  "content/adapters/chatgpt.js", "content/exporter/math-preserver.js",
  "content/exporter/print-engine.js", "content/exporter/hwp-package.js",
  "native-host/src/Program.cs", "native-host/build.ps1", "native-host/install.ps1",
  "native-host/install-machine.ps1", "native-host/uninstall.ps1", "tests/hwp-fixture.html", "icons/icon-128.png"
];
for (const relative of required) if (!fs.existsSync(path.join(root, relative))) failures.push(`missing: ${relative}`);

for (const relative of ["popup/popup.js", "content/utils/site-detector.js", "content/adapters/notebooklm.js"]) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  if (!source.includes("notebook.google.com") || !source.includes("notebooklm.google.com")) {
    failures.push(`${relative}: both NotebookLM domains must be supported`);
  }
}

const notebookAdapterSource = fs.readFileSync(path.join(root, "content/adapters/notebooklm.js"), "utf8");
for (const actualSelectorSignal of [
  "to-user-message-card-content",
  "from-user-message-card-content",
  "labs-tailwind-doc-viewer.note-editor",
  "노트 제목 수정 가능"
]) {
  if (!notebookAdapterSource.includes(actualSelectorSignal)) {
    failures.push(`NotebookLM adapter missing live DOM signal: ${actualSelectorSignal}`);
  }
}

const chatgptAdapterSource = fs.readFileSync(path.join(root, "content/adapters/chatgpt.js"), "utf8");
for (const liveChatGptSignal of ["내가 한 말", "You said", "ChatGPT\\s*", "messageContainerFromHeading"]) {
  if (!chatgptAdapterSource.includes(liveChatGptSignal)) {
    failures.push(`ChatGPT adapter missing live semantic signal: ${liveChatGptSignal}`);
  }
}

const popupSource = fs.readFileSync(path.join(root, "popup/popup.js"), "utf8");
const printEngineSource = fs.readFileSync(path.join(root, "content/exporter/print-engine.js"), "utf8");
if (!popupSource.includes('fetch(chrome.runtime.getURL("styles/print.css"))')) {
  failures.push("popup must load print CSS from its extension origin");
}
if (printEngineSource.includes("fetch(")) {
  failures.push("content print engine must not fetch extension resources from the page origin");
}

if (!(manifest.optional_permissions || []).includes("nativeMessaging")) {
  failures.push("nativeMessaging must remain optional");
}
if ((manifest.permissions || []).includes("nativeMessaging")) {
  failures.push("nativeMessaging must not be a required install-time permission");
}

const hwpPackageSource = fs.readFileSync(path.join(root, "content/exporter/hwp-package.js"), "utf8");
for (const signal of ["replaceMathWithEquations", "schemaVersion: 2", 'privacy: "local-only"']) {
  if (!hwpPackageSource.includes(signal)) failures.push(`HWP package missing safety/fidelity signal: ${signal}`);
}
if (/rasterizeMath|replaceMathWithImages/.test(hwpPackageSource)) failures.push("HWP math must use editable equations, not raster images");

const nativeHostSource = fs.readFileSync(path.join(root, "native-host/src/Program.cs"), "utf8");
for (const signal of ["HWPFrame.HwpObject", "HWPX", "local-only", "64 * 1024 * 1024"]) {
  if (!nativeHostSource.includes(signal)) failures.push(`native host missing protocol/COM signal: ${signal}`);
}
if (!nativeHostSource.includes('FilePathCheckerModuleExample')) {
  failures.push("native host must use the official security module registration name");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`AI Chat Exporter validation passed (${files.length} files checked).`);
