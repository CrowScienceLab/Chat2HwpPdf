import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const executable = process.argv[2] || path.join(root, "windows-helper/bin/AIChatExporter.HwpHost.exe");
const child = spawn(executable, [], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
const chunks = [];
let stderr = "";
child.stdout.on("data", chunk => chunks.push(chunk));
child.stderr.on("data", chunk => { stderr += chunk; });
const requests = ["probe-1", "probe-2"];
for (const requestId of requests) {
  const body = Buffer.from(JSON.stringify({ type: "ping", requestId }), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length);
  // Deliberately split the frame to exercise ReadExactly, not just JSON handling.
  child.stdin.write(header.subarray(0, 2));
  child.stdin.write(Buffer.concat([header.subarray(2), body]));
}
child.stdin.end();
const timer = setTimeout(() => child.kill(), 5000);
let code;
try {
  code = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
} finally { clearTimeout(timer); }
assert.equal(code, 0, stderr || "Host exited unsuccessfully or timed out");
const bytes = Buffer.concat(chunks);
let offset = 0;
for (const requestId of requests) {
  assert.ok(bytes.length - offset >= 4, "Missing frame header");
  const length = bytes.readUInt32LE(offset);
  offset += 4;
  assert.ok(length > 0 && bytes.length - offset >= length, "Truncated response");
  const reply = JSON.parse(bytes.subarray(offset, offset + length));
  offset += length;
  assert.deepEqual(reply, { ok: true, type: "pong", requestId, hostVersion: JSON.parse((await import("node:fs")).readFileSync(path.join(root, "release.json"), "utf8")).version });
}
assert.equal(offset, bytes.length, "Unexpected stdout outside native frames");
console.log("PASS: two framed ping responses; direct process test only, not Chrome discovery.");
