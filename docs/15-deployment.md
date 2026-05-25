# 15. Deployment — Vercel + Railway

## Target Topology

```
Vercel
└── frontend/  Next.js app

Railway
├── backend/   FastAPI service
└── agent/     Node Pi agent HTTP service
```

This split keeps the user-facing UI on Vercel and keeps long-running backend/agent processes on Railway.

## Frontend — Vercel

- Root Directory: `frontend`
- Install Command: `pnpm install --frozen-lockfile --config.strict-dep-builds=false`
- Build Command: `pnpm build`
- Output: Next.js default

Environment variables:

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://<railway-backend-domain>
```

The frontend calls its own Next route handlers in the browser. Server-side route handlers proxy to `NEXT_PUBLIC_API_BASE_URL`.

## Backend — Railway

- Service root: repository root
- Config file: `backend/railway.toml`
- Dockerfile: `backend/Dockerfile`
- Healthcheck: `/`

Required environment variables:

```dotenv
UPSTAGE_API_KEY=
DART_API_KEY=
GONGSIRI_AGENT_URL=https://<railway-agent-domain>
GONGSIRI_AUTH_MODE=dev
```

Optional environment variables:

```dotenv
UPSTAGE_MODEL=solar-pro3
UPSTAGE_BASE_URL=https://api.upstage.ai/v1
KRX_API_KEY=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
GONGSIRI_DB_MODE=memory
GONGSIRI_DB_PATH=data/dev.sqlite
```

## Agent — Railway

- Service root: repository root
- Config file: `agent/railway.toml`
- Dockerfile: `agent/Dockerfile`
- Healthcheck: `/health`

Required environment variables:

```dotenv
UPSTAGE_API_KEY=
```

Optional environment variables:

```dotenv
UPSTAGE_MODEL=solar-pro3
UPSTAGE_BASE_URL=https://api.upstage.ai/v1
DART_API_KEY=
GONGSIRI_CONTRACT_VERSION=v1
GONGSIRI_SCHEDULER_INTERVAL_MINUTES=30
GONGSIRI_CHECKPOINT_PATH=
```

The agent binds to `0.0.0.0` inside the Docker image and uses Railway's `PORT` when `GONGSIRI_AGENT_PORT` is unset.

## Smoke Checks

Run these after Preview/Production URLs are available:

```bash
curl -i https://<vercel-frontend-domain>/
curl -i https://<railway-backend-domain>/
curl -i https://<railway-agent-domain>/health
```

Do not run real DART/Upstage workflows unless explicitly approved.
