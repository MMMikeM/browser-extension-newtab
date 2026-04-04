FROM node:24-alpine AS base
RUN apk add --no-cache ca-certificates
RUN corepack enable && corepack install -g pnpm@11.0.0-beta.6

ENV CI=true

# Shared workspace manifests — inherited by both build and prod stages
FROM base AS manifests
WORKDIR /app
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY turbo.json tsconfig.base.json ./

FROM manifests AS client
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm fetch
COPY packages/client/package.json packages/client/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm i --frozen-lockfile
COPY . .
ARG SERVER_URL VITE_VAPID_PUBLIC_KEY
RUN pnpm build:ext

FROM manifests AS server
COPY packages/server/src ./packages/server/src
COPY packages/server/tsconfig.json ./packages/server/
COPY packages/shared/src ./packages/shared/src
COPY --from=client /app/packages/client/dist ./packages/client/dist
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm i --prod --filter @newtab-todo/server --filter @newtab-todo/shared
EXPOSE 3000
WORKDIR /app/packages/server
CMD ["node", "--import=tsx", "src/index.ts"]
