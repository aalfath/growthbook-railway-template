# Changelog

Each entry is one change that reaches deployers through Railway's "update available" notice. Breaking changes come first.

## 5.2.1 (2026-11-17)

- First release of this template: GrowthBook 5.2.1 (`growthbook/growthbook:5.2.1@sha256:0da8afcb9ed92d8e09abca3ea9d9531e29b7e39b0bccba03d9a3d4cc47f1f60d`), MongoDB 7.0.48.
- The web app and the API share one public domain through a built-in proxy (`/backend/*` → API), so login cookies work on `*.up.railway.app` with nothing to paste.
- Health check at `/healthz`; uploads on a volume; secrets generated at deploy.
