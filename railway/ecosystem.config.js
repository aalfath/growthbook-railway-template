// Upstream's ecosystem.config.js plus the same-domain proxy.
// The front-end is pinned to port 3000 so Railway's PORT goes to the proxy.
const APP = "/usr/local/src/app";
const autorestart = process.env.PM2_AUTORESTART === "true";
const max_memory_restart = process.env.PM2_MAX_MEMORY_RESTART || "6G";

module.exports = {
  apps: [
    { name: "back-end", script: "dist/server.js", cwd: `${APP}/packages/back-end`, autorestart, max_memory_restart },
    {
      name: "front-end",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: `${APP}/packages/front-end`,
      autorestart,
      max_memory_restart,
    },
    { name: "proxy", script: `${APP}/railway/proxy.js`, cwd: `${APP}/railway`, autorestart: true },
  ],
};
