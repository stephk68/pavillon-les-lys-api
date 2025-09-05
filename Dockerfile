## Robust multi-stage Dockerfile for Pavillon Les Lys API (NestJS + Prisma)
# Stage 1: Dependencies and build
FROM node:20.13.0-alpine AS builder

# System deps for node-gyp/native modules and openssl
RUN apk add --no-cache libc6-compat openssl python3 make g++ wget

WORKDIR /app

# Use Yarn if present; install Yarn 1.x only if missing
RUN yarn --version || (npm install -g yarn@1.22.22 && yarn --version)

# Copy manifests first to leverage Docker cache for dependency install
COPY package.json yarn.lock ./

# Install all deps (dev included) for build
RUN yarn install --frozen-lockfile

# Copy the rest of the project (filtered by .dockerignore)
COPY . .

# Generate Prisma client (requires schema and node_modules)
RUN npx prisma generate

# Build NestJS (outputs to dist/)
RUN yarn build

# Prepare production node_modules
RUN rm -rf node_modules && \
  YARN_ENABLE_IMMUTABLE_INSTALLS=false yarn install --frozen-lockfile --production && \
  yarn cache clean

# Stage 2: Production runtime image
FROM node:20.13.0-alpine AS runner

# Minimal system deps for SSL
RUN apk add --no-cache libc6-compat openssl wget

# Create non-root user
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
USER nestjs
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Copy runtime artifacts from builder
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy entrypoint script
COPY --chown=nestjs:nodejs docker-entrypoint.sh ./
USER root
RUN chmod +x docker-entrypoint.sh
USER nestjs

# Healthcheck against the Nest health endpoint (adjust if different)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://localhost:3000/health | grep -q 'status' || exit 1

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
