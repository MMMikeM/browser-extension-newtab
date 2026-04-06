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

FROM scratch AS extension
COPY --from=client /app/packages/client/dist-extension /

FROM manifests AS server-build
COPY packages/server/src ./packages/server/src
COPY packages/server/tsconfig.json packages/server/tsup.config.ts ./packages/server/
COPY packages/shared/src ./packages/shared/src
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm i --frozen-lockfile --filter @newtab-todo/server --filter @newtab-todo/shared
RUN pnpm --filter @newtab-todo/server build
RUN pnpm --filter @newtab-todo/server --prod deploy --legacy /app/deploy

FROM node:24-alpine AS server
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=server-build /app/deploy .
COPY --from=client /app/packages/client/dist ./client/dist
ENV CLIENT_DIST_PATH=/app/client/dist
RUN echo "=== /app top-level ===" && du -sh /app/* && \
    echo "=== .pnpm top 20 ===" && du -sh /app/node_modules/.pnpm/* 2>/dev/null | sort -rh | head -20
EXPOSE 3000
# Restart loop: if Node crashes (e.g. libsql sync error on Fly resume)
# bring it back up immediately rather than waiting for the next health
# check to trigger a full machine restart.
# Exit codes 130 (SIGINT) and 143 (SIGTERM) are deliberate stops —
# don't restart, let the container exit cleanly for deploy/shutdown.
CMD ["sh", "-c", "while true; do node dist/index.js; code=$?; [ $code -eq 130 ] || [ $code -eq 143 ] && exit $code; echo \"server exited ($code), restarting in 1s\"; sleep 1; done"]
