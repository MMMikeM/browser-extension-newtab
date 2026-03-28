FROM node:24-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/ patches/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
ARG SERVER_URL
ENV SERVER_URL=${SERVER_URL}
ENV VITE_VAPID_PUBLIC_KEY=BMqPDaTMUgZtFkfOlQdan2gbrl4SRxdO2MD6gRTC2yDcRiY60MjILnCapUQjPAm3C0xpUlH-xh1pT_eMJuFHUV4
ENV NO_PRERENDER=1
RUN pnpm build

FROM base AS runtime
WORKDIR /app
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
