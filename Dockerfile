# syntax=docker/dockerfile:1

# ---- build ----
FROM node:22-slim AS build
WORKDIR /app
# OpenSSL is required by the Prisma engines.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
# Install deps first. postinstall runs `prisma generate`, so the schema must be present.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
# Build the Next.js app.
COPY . .
RUN npm run build

# ---- run ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
# Bring the fully built app across, including node_modules (the prisma CLI + tsx are
# used at startup to apply the schema and seed the admin user).
COPY --from=build /app ./
EXPOSE 3000
# Applies the DB schema and seeds, then runs the CMD.
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
