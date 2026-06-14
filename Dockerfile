# ============================================
# API Pavillon Les Lys - NestJS + Prisma
# ============================================

FROM node:20-alpine

# Installer les dépendances système nécessaires
# (chromium + polices requis par Puppeteer pour la génération des PDF)
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    python3 \
    make \
    g++ \
    wget \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Puppeteer : ne pas télécharger Chromium (incompatible Alpine/musl),
# utiliser le binaire système installé ci-dessus.
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json yarn.lock ./

# Installer les dépendances
RUN yarn install --frozen-lockfile --production=false

# Copier le code source
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Compiler l'application pour la production
RUN yarn build

# Créer les dossiers d'uploads (montés en volume au runtime)
RUN mkdir -p /app/uploads/proofs \
             /app/uploads/feedback \
             /app/uploads/checklists \
             /app/uploads/inventory

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Changer les permissions
RUN chown -R nestjs:nodejs /app
USER nestjs

# Exposer le port
EXPOSE 4000

# Exécuter les migrations Prisma puis démarrer l'application compilée
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]

