# syntax=docker/dockerfile:1.7

# Build stage
FROM node:20-bookworm AS build

WORKDIR /app

# Public env vars used in client components are baked at build time.
ARG NEXT_PUBLIC_API_URL=https://api.qafela.taahad.com
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY next.config.js tsconfig.json next-env.d.ts ./
COPY app ./app
COPY components ./components
COPY lib ./lib

RUN npm run build \
  && npm prune --omit=dev


# Runtime stage
FROM node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/next.config.js ./next.config.js
COPY --from=build /app/.next ./.next

EXPOSE 3000

CMD ["npm","run","start","--","-p","3000","-H","0.0.0.0"]

