FROM node:24-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack install -g pnpm@11.0.0-beta.6

ENV CI=true

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm fetch

FROM deps AS client
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm i --frozen-lockfile --prefer-offline
COPY . .
ARG SERVER_URL VITE_VAPID_PUBLIC_KEY
RUN pnpm build:ext

FROM base AS server
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/server/src ./packages/server/src
COPY packages/server/tsconfig.json ./packages/server/
COPY packages/shared/src ./packages/shared/src
COPY --from=client /app/packages/client/dist ./packages/client/dist
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm i --prod --filter @newtab-todo/server --filter @newtab-todo/shared
EXPOSE 3000
WORKDIR /app/packages/server
CMD ["node", "--import=tsx", "src/index.ts"]
