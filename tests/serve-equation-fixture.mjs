import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = new Set(["/tests/hwp-equation-browser.html", "/tests/hwp-equation-browser.js", "/content/exporter/math-preserver.js", "/content/exporter/hwp-equations.js", "/content/exporter/hwp-package.js"]);
http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/fixture-result" && request.headers.origin === "http://127.0.0.1:18766") {
    let body = "";
    request.on("data", chunk => { body += chunk; if (body.length > 1024 * 1024) request.destroy(); });
    request.on("end", () => {
      try {
        const data = JSON.parse(body);
        if (data.source !== "synthetic-fixture" || data.schemaVersion !== 2 || !Array.isArray(data.equations)) throw new Error();
        fs.mkdirSync(path.join(root, "tmp/equations"), { recursive: true });
        fs.writeFileSync(path.join(root, "tmp/equations/browser-fixture.json"), JSON.stringify(data, null, 2));
        response.writeHead(200); response.end("saved");
      } catch { response.writeHead(400); response.end(); }
    }); return;
  }
  if (request.method !== "GET" || !files.has(request.url)) { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { "Content-Type": request.url.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", "Cache-Control": "no-store" });
  response.end(fs.readFileSync(path.join(root, request.url)));
}).listen(18766, "127.0.0.1", () => console.log("http://127.0.0.1:18766/tests/hwp-equation-browser.html"));
