FROM node:22-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PYTHON_BIN=/opt/gongsiri-python/bin/python \
    GONGSIRI_AGENT_HOST=0.0.0.0

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN python3 -m venv /opt/gongsiri-python \
    && /opt/gongsiri-python/bin/pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend /app/backend
COPY assets /app/assets
COPY agent /app/agent

WORKDIR /app/agent
RUN corepack enable \
    && pnpm install --frozen-lockfile --config.strict-dep-builds=false \
    && pnpm build

CMD ["pnpm", "start"]
