#!/usr/bin/env node
// Railway entrypoint for GrowthBook (distroless image, so no shell).
// 1. Make the uploads volume writable for uid 1000 (Railway mounts volumes as root).
// 2. Derive APP_ORIGIN / API_HOST from the Railway domain when they are unset.
// 3. Run the back-end, front-end and the same-domain proxy as uid 1000.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const APP_DIR = "/usr/local/src/app";
const UPLOADS = path.join(APP_DIR, "packages/back-end/uploads");
const UID = 1000;
const GID = 1000;
const log = (m) => console.error(`[railway-entry] ${m}`);

function chownTree(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.chownSync(dir, UID, GID);
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = fs.lstatSync(p);
      if (st.uid !== UID) fs.lchownSync(p, UID, GID);
      if (st.isDirectory()) chownTree(p);
    }
  } catch (err) {
    log(`could not prepare ${dir}: ${err.message}`);
  }
}

const env = { ...process.env };
if (process.getuid && process.getuid() === 0) chownTree(UPLOADS);

const domain = env.RAILWAY_PUBLIC_DOMAIN;
if (!env.APP_ORIGIN && domain) env.APP_ORIGIN = `https://${domain}`;
if (!env.API_HOST && env.APP_ORIGIN) env.API_HOST = `${env.APP_ORIGIN.replace(/\/+$/, "")}/backend`;
if (!env.HOME || env.HOME === "/root") env.HOME = "/tmp";
log(`APP_ORIGIN=${env.APP_ORIGIN || "(unset)"} API_HOST=${env.API_HOST || "(unset)"} PORT=${env.PORT || 8080}`);

const opts = { cwd: APP_DIR, env, stdio: "inherit" };
if (process.getuid && process.getuid() === 0) Object.assign(opts, { uid: UID, gid: GID });
const child = spawn(
  process.execPath,
  ["scripts/run-apps.js", "start", path.join(APP_DIR, "railway/ecosystem.config.js")],
  opts,
);
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
