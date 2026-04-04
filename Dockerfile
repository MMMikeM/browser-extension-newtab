FROM node:24-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack install -g pnpm@11.0.0-beta.6

FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm ci
COPY . .
ARG SERVER_URL VITE_VAPID_PUBLIC_KEY
RUN pnpm build && pnpm build:ext

FROM base AS runtime
WORKDIR /app
COPY --from=build /app/packages/server/src ./packages/server/src
COPY --from=build /app/packages/server/package.json ./packages/server/
COPY --from=build /app/packages/server/tsconfig.json ./packages/server/
COPY --from=build /app/packages/shared/src ./packages/shared/src
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/client/dist ./packages/client/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/tsconfig.base.json ./
EXPOSE 3000
WORKDIR /app/packages/server
CMD ["node", "--experimental-strip-types", "src/index.ts"]
