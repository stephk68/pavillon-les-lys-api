# ============================================
# API Pavillon Les Lys - NestJS + Prisma
# ============================================

FROM node:20-alpine

# Installer les dépendances système nécessaires
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    python3 \
    make \
    g++ \
    wget \
    && rm -rf /var/cache/apk/*

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

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Changer les permissions
RUN chown -R nestjs:nodejs /app
USER nestjs

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["sh", "-c", "yarn start:dev"]

