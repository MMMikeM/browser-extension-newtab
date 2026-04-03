FROM node:24-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack install -g pnpm@11.0.0-beta.6

FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/ patches/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm ci
COPY . .
ARG SERVER_URL TURSO_DATABASE_URL TURSO_AUTH_TOKEN VITE_VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_PUBLIC_KEY VAPID_SUBJECT
RUN pnpm build && pnpm build:ext

FROM base AS runtime
WORKDIR /app
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
