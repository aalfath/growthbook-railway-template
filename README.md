[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template/growthbook-1?utm_medium=integration&utm_source=button&utm_campaign=growthbook)

# GrowthBook on Railway

A one-click Railway template for [GrowthBook](https://github.com/growthbook/growthbook), the open-source platform for feature flags, A/B testing and product analytics (MIT core).

## What it deploys

| Service | Source | State |
|---|---|---|
| **GrowthBook** | this repo: `growthbook/growthbook:5.2.1`, pinned by digest `sha256:0da8afcb…f1f60d` | uploads volume at `/usr/local/src/app/packages/back-end/uploads` |
| **MongoDB** | `mongo:7.0.48`, pinned by digest | volume at `/data/db` |

- **One public domain for everything.** GrowthBook runs a web app (port 3000) and an API (port 3100), and its login cookies only work when both are on the same site. Two `*.up.railway.app` domains are *not* the same site (`up.railway.app` is a public suffix), so this image adds a small proxy on `PORT` (8080): `/backend/*` goes to the API, everything else to the web app. `APP_ORIGIN` comes from the Railway domain, and `API_HOST` is `APP_ORIGIN` + `/backend`. Nothing to paste after deploy.
- **Health check:** `/healthz` answers 200 only when both the API and the web app respond.
- The app runs as the image's own non-root user (uid 1000). The start script only fixes the ownership of the uploads volume (Railway mounts volumes as root) before it drops privileges.

## After deploy

Open the public URL and **register straight away**: the first account becomes the admin of the instance. There is no default login.

Point your SDKs at `https://YOUR-DOMAIN/backend` as the API host (GrowthBook's SDK setup pages show it for you).

## Variables

Every value is generated or derived, so the deploy asks you nothing.

| Service | Variable | Default | What it is |
|---|---|---|---|
| GrowthBook | `MONGODB_URI` | built from the MongoDB service's references | Database connection (`/growthbook?authSource=admin`) |
| GrowthBook | `JWT_SECRET` | `${{secret(64)}}` | Signs login tokens |
| GrowthBook | `ENCRYPTION_KEY` | `${{secret(64)}}` | Encrypts data source credentials. Never change it after you add a data source |
| GrowthBook | `APP_ORIGIN` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` | Public URL. Set it to your custom domain if you add one |
| GrowthBook | `PORT` | `8080` | Port of the built-in proxy |
| MongoDB | `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` | `mongo` / generated | MongoDB root user |

Baked into the `Dockerfile`: `NODE_ENV=production`, `BACKEND_PORT=3100`, `UPLOAD_METHOD=local`, `EXPRESS_TRUST_PROXY_OPTS=true` (secure cookies behind Railway's proxy), `GB_STATS_ENGINE_MIN_POOL_SIZE=0` (starts the Python stats engine only when needed) and `PM2_AUTORESTART=true`.

Optional, add them as variables when you need them ([upstream reference](https://docs.growthbook.io/self-host/env)):
- Email (invites, password resets): `EMAIL_ENABLED=true`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_FROM`.
- Telemetry off: `DISABLE_TELEMETRY=true`.
- AI features: `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`.
- S3 or Google Cloud uploads instead of the volume: `UPLOAD_METHOD`, `S3_BUCKET`, …
- `API_HOST` only if you serve the API somewhere other than `APP_ORIGIN/backend`.

## Updates

Railway tells everyone who deployed this template when a change lands on this repo's `main` branch. A version bump changes the pinned image in `Dockerfile`, and [CHANGELOG.md](CHANGELOG.md) lists what changed, with breaking changes first. Read it, then apply the update from your Railway project. GrowthBook migrates its MongoDB data itself on start.

## Run it elsewhere

```sh
docker build -t growthbook-railway .
docker run -p 8080:8080 \
  -e MONGODB_URI='mongodb://USER:PASS@HOST:27017/growthbook?authSource=admin' \
  -e JWT_SECRET=... -e ENCRYPTION_KEY=... -e APP_ORIGIN=http://localhost:8080 \
  -v gb-uploads:/usr/local/src/app/packages/back-end/uploads growthbook-railway
```

Upstream docs: https://docs.growthbook.io/self-host
