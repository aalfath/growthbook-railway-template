// Same-domain reverse proxy for GrowthBook on Railway.
//   /backend/*  -> back-end API (127.0.0.1:3100), prefix stripped
//   /healthz    -> 200 only when both the back-end and the front-end answer
//   everything else -> Next.js front-end (127.0.0.1:3000)
// One public domain keeps GrowthBook's auth cookies first-party: two
// *.up.railway.app domains are cross-site (up.railway.app is a public suffix).
"use strict";
const http = require("node:http");
const net = require("node:net");

const PORT = Number(process.env.PORT) || 8080;
const FRONT = { host: "127.0.0.1", port: 3000 };
const BACK = { host: "127.0.0.1", port: Number(process.env.BACKEND_PORT) || 3100 };
const PREFIX = "/backend";

function route(url) {
  if (url === PREFIX || url.startsWith(PREFIX + "/") || url.startsWith(PREFIX + "?")) {
    let rest = url.slice(PREFIX.length) || "/";
    if (rest.startsWith("?")) rest = "/" + rest;
    return { target: BACK, path: rest, backend: true };
  }
  return { target: FRONT, path: url, backend: false };
}

// The back-end scopes its refresh-token cookie to Path=/auth; move it under /backend.
function fixCookies(headers) {
  const sc = headers["set-cookie"];
  if (!sc) return;
  headers["set-cookie"] = sc.map((c) => c.replace(/;\s*path=\/auth(?=;|$)/i, `; Path=${PREFIX}/auth`));
}

function probe(t, p) {
  return new Promise((resolve) => {
    const req = http.get({ ...t, path: p, timeout: 4000 }, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(false));
  });
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/healthz") {
    const [b, f] = await Promise.all([probe(BACK, "/healthcheck"), probe(FRONT, "/api/init")]);
    res.writeHead(b && f ? 200 : 503, { "content-type": "application/json" });
    return res.end(JSON.stringify({ backend: b, frontend: f }));
  }
  const r = route(req.url);
  const up = http.request(
    { ...r.target, method: req.method, path: r.path, headers: req.headers },
    (ures) => {
      const headers = { ...ures.headers };
      if (r.backend) fixCookies(headers);
      res.writeHead(ures.statusCode, ures.statusMessage, headers);
      ures.pipe(res);
    },
  );
  up.on("error", (err) => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
    res.end(`GrowthBook is starting or unavailable (${err.code || err.message})\n`);
  });
  req.pipe(up);
});

// WebSocket / upgrade passthrough.
server.on("upgrade", (req, socket, head) => {
  const r = route(req.url);
  const up = net.connect(r.target.port, r.target.host, () => {
    let raw = `${req.method} ${r.path} HTTP/${req.httpVersion}\r\n`;
    for (let i = 0; i < req.rawHeaders.length; i += 2) raw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
    up.write(raw + "\r\n");
    if (head && head.length) up.write(head);
    up.pipe(socket).pipe(up);
  });
  up.on("error", () => socket.destroy());
  socket.on("error", () => up.destroy());
});

server.requestTimeout = 0;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
// Listen on IPv6 and IPv4 where the host allows it, else IPv4 only.
server.once("error", (err) => {
  if (err.code !== "EAFNOSUPPORT" && err.code !== "EADDRNOTAVAIL") throw err;
  server.listen(PORT, "0.0.0.0", () => console.error(`[proxy] listening on 0.0.0.0:${PORT}`));
});
server.listen(PORT, "::", () => console.error(`[proxy] listening on [::]:${PORT}`));
