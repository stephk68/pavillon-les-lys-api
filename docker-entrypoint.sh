#!/bin/sh
set -e

echo "🚀 Starting Pavillon Les Lys API..."

# Attendre que la base de données soit prête
echo "⏳ Waiting for database..."
until npx prisma db push --accept-data-loss 2>/dev/null || npx prisma migrate deploy 2>/dev/null; do
  echo "Database not ready, waiting..."
  sleep 2
done

# Exécuter les migrations
echo "🗄️ Running migrations..."
npx prisma migrate deploy || echo "⚠️ No migrations to apply or migrations failed"

# Exécuter le seed si pas encore fait
echo "🌱 Seeding database..."
npm run seed || echo "⚠️ Seed skipped (data may already exist)"

echo "✅ Database setup completed"

# Démarrer l'application
echo "🎯 Starting application..."
exec "$@"
