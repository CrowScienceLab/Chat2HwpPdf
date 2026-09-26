import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

const host = process.argv[2] || path.resolve(import.meta.dirname, '../native-host/bin/AIChatExporter.HwpHost.exe');
const requestId = `smoke-${Date.now()}`;
const payload = JSON.stringify({
  schemaVersion: 2,
  title: "AI Chat Exporter Native Protocol Probe",
  source: "protocol-smoke-test",
  createdAt: new Date().toISOString(),
  privacy: "local-only",
  diagnostics: {},
  format: "HWPX",
  html: "<!doctype html><html lang=\"ko\"><head><meta charset=\"utf-8\"><title>Native Protocol Probe</title></head><body><h1>Native Messaging Protocol Probe</h1><p>로컬 전용 연결 검증 문서입니다.</p></body></html>"
});

function frame(message) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  return Buffer.concat([header, body]);
}

const child = spawn(host, ["chrome-extension://lklaihbbbhglmfoemgaanmbichelcaob/", "--parent-window=0"], {
  stdio: ["pipe", "pipe", "pipe"], windowsHide: true
});
const output = [];
let stderr = "";
child.stdout.on("data", (chunk) => output.push(chunk));
child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });

child.stdin.write(frame({ type: "start", requestId, totalChunks: 1 }));
child.stdin.write(frame({ type: "chunk", requestId, index: 0, data: payload }));
child.stdin.write(frame({ type: "finish", requestId }));
child.stdin.end();

const timer = setTimeout(() => child.kill(), 90000);
const exitCode = await new Promise((resolve) => child.on("exit", resolve));
clearTimeout(timer);

const data = Buffer.concat(output);
if (data.length < 4) throw new Error(`Native host returned no framed response. exit=${exitCode} stderr=${stderr}`);
const length = data.readUInt32LE(0);
const response = JSON.parse(data.subarray(4, 4 + length).toString("utf8"));
if (!response.ok) throw new Error(response.error || "Native host smoke test failed");
console.log(JSON.stringify(response, null, 2));
