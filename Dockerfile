# ============================================
# API Pavillon Les Lys - NestJS + Prisma
# Build multi-stage : image finale légère (pas de devDeps, pas de cache yarn,
# pas d'outils de compilation, pas de code source).
# ============================================

# ─── Stage 1 : build (compilation TS + génération client Prisma) ───
FROM node:20-alpine AS builder

# Outils nécessaires pour compiler les modules natifs (bcrypt) au build
RUN apk add --no-cache libc6-compat openssl python3 make g++

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN npx prisma generate && yarn build

# ─── Stage 2 : dépendances de production uniquement ───
FROM node:20-alpine AS proddeps

RUN apk add --no-cache libc6-compat openssl python3 make g++

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=true && yarn cache clean

# Le client Prisma doit être généré dans ce node_modules de production
COPY prisma ./prisma
RUN npx prisma generate

# ─── Stage 3 : runtime (image finale) ───
FROM node:20-alpine AS runtime

# Dépendances RUNTIME seulement : chromium + polices pour Puppeteer (PDF).
# Pas de python3/make/g++ ici → image plus légère.
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

WORKDIR /app

# node_modules de prod (avec client Prisma généré) + build compilé
COPY --from=proddeps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Fichiers nécessaires au runtime : manifeste + schéma/migrations/seed Prisma.
# (nest-cli.json et yarn.lock ne servent qu'au build, pas au runtime.)
COPY package.json ./
COPY prisma ./prisma

# Dossiers d'uploads (montés en volume au runtime) + utilisateur non-root
RUN mkdir -p /app/uploads/proofs \
             /app/uploads/feedback \
             /app/uploads/checklists \
             /app/uploads/inventory \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nestjs -u 1001 -G nodejs \
    && chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 4000

# Migrations Prisma puis démarrage de l'application compilée
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
