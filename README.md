# Pavillon Les Lys - API

API REST pour la gestion des réservations et événements du Pavillon Les Lys.

## Description

Application NestJS avec TypeScript pour la gestion complète d'un système de réservation d'événements, incluant la gestion des utilisateurs, réservations, paiements, devis et feedback.

## Fonctionnalités

### 🔐 Authentification et Autorisation

- **Inscription/Connexion** : Système complet d'authentification JWT
- **Gestion des rôles** : CLIENT, STAFF, ADMIN avec permissions spécifiques
- **Réinitialisation de mot de passe** : Système sécurisé de récupération
- **Protection des routes** : Guards personnalisés sans Passport

### 👥 Gestion des Utilisateurs

- **CRUD complet** des utilisateurs avec validation
- **Profils détaillés** : Informations personnelles et préférences
- **Recherche et filtrage** par nom, email, rôle
- **Statistiques utilisateur** : Réservations, paiements totaux
- **Gestion des permissions** : Utilisateurs ne peuvent modifier que leurs données

### 📅 Système de Réservation

- **Création de réservations** : Différents types d'événements supportés
- **Vérification de disponibilité** : Système anti-conflit automatique
- **Gestion des statuts** : PENDING → CONFIRMED → COMPLETED ou CANCELLED
- **Calendrier intégré** : Visualisation des créneaux disponibles
- **Notifications** : Alertes pour les réservations à venir

### 💰 Gestion des Paiements

- **Suivi des paiements** : PENDING, PAID, FAILED, REFUNDED
- **Intégration gateway** : Préparé pour Stripe, PayPal, etc.
- **Facturation** : Génération automatique de factures
- **Statistiques financières** : Revenus mensuels, totaux
- **Remboursements** : Système de gestion des retours

### 📋 Système de Devis

- **Création de devis** : Items multiples avec calculs automatiques
- **Liaison réservations** : Connexion devis ↔ réservations
- **Gestion des items** : Ajout, modification, suppression dynamique
- **Export/Import** : Formats multiples supportés
- **Duplication** : Réutilisation de devis existants

### 📝 Feedback et Évaluations

- **Collecte d'avis** : Notes et commentaires clients
- **Modération** : Système de validation des commentaires
- **Statistiques** : Moyennes et analyses des retours
- **Amélioration continue** : Identification des points d'amélioration

### 📊 Tableau de Bord et Analytics

- **Métriques en temps réel** : Réservations, revenus, utilisateurs
- **Graphiques** : Évolution des données dans le temps
- **Exports** : Rapports détaillés en PDF/Excel
- **Alertes** : Notifications pour événements importants

## Architecture Technique

### Stack

- **Framework** : NestJS avec TypeScript
- **Base de données** : PostgreSQL avec Prisma ORM
- **Authentification** : JWT avec guards personnalisés
- **Validation** : class-validator et class-transformer
- **Documentation** : Swagger/OpenAPI automatique

### Structure du Projet

```
src/
├── common/           # Services, guards, decorators partagés
│   ├── decorators/   # @CurrentUser, @Public, @Roles
│   ├── guards/       # Authentication, Authorization
│   └── services/     # PrismaService
├── resources/        # Modules métier
│   ├── auth/         # Authentification
│   ├── user/         # Gestion utilisateurs
│   ├── reservation/  # Système réservation
│   ├── payment/      # Gestion paiements
│   ├── quote/        # Système devis
│   └── feedback/     # Avis clients
└── middleware/       # Middlewares globaux
```

### Sécurité

- **JWT sécurisé** : Tokens avec expiration
- **CORS configuré** : Protection cross-origin
- **Validation stricte** : Tous les inputs validés
- **Rate limiting** : Protection contre le spam
- **Encryption** : Mots de passe hashés avec bcrypt

## Installation et Démarrage

### 🐳 Déploiement Docker (Recommandé)

La méthode la plus simple pour déployer l'application :

```bash
# Cloner le repository
git clone <repository-url>
cd pavillon-les-lys-api

# Configuration de l'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# Démarrage avec Docker Compose
docker compose up -d

# Initialisation de la base de données (migrations + seed)
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

📖 **Guide complet** : [DATASET.md](DATASET.md)

### 🛠️ Installation locale (Développement)

#### Prérequis

- Node.js 18+ et Yarn
- PostgreSQL 14+
- Git

#### Installation

```bash
# Cloner le repository
git clone <repository-url>
cd pavillon-les-lys-api

# Installer les dépendances
yarn install

# Configuration environnement
cp .env.example .env
# Configurer les variables dans .env

# Setup base de données
yarn prisma generate
yarn prisma migrate dev
yarn prisma db seed  # Optionnel
```

### Variables d'environnement

```env
DATABASE_URL="postgresql://user:password@localhost:5432/pavilion_db"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3000
NODE_ENV="development"
```

## Démarrage de l'application

```bash
# Mode développement avec hot-reload
yarn run start:dev

# Mode production
yarn run build
yarn run start:prod

# Mode debug
yarn run start:debug
```

## Tests

L'API dispose d'une architecture de tests complète couvrant tous les services, guards et endpoints principaux.

### Architecture des Tests

```text
src/test/
├── unit/              # Tests unitaires (services, guards)
├── integration/       # Tests d'intégration (endpoints)
├── mocks/            # Mocks Prisma et services
└── setup.ts          # Configuration globale
```

### Commandes de Tests

```bash
# Tous les tests
yarn run test

# Tests unitaires uniquement
yarn run test:unit
yarn run test:unit:watch

# Tests d'intégration uniquement
yarn run test:integration

# Tests end-to-end
yarn run test:e2e

# Couverture de code
yarn run test:cov
yarn run test:unit:cov

# Tests en mode watch
yarn run test:watch
```

### Services Testés

- ✅ **AuthService** - Authentification complète
- ✅ **UserService** - Gestion des utilisateurs
- ✅ **ReservationService** - Système de réservation
- ✅ **PaymentService** - Gestion des paiements
- ✅ **QuoteService** - Système de devis
- ✅ **Guards** - Authentification et autorisation

### Tests d'Intégration

- ✅ **Auth endpoints** - Login, register, profile
- ✅ **User endpoints** - CRUD utilisateurs
- ✅ **Reservation endpoints** - Gestion réservations

> 📖 **Documentation détaillée** : [src/test/README.md](src/test/README.md)

## Base de Données

```bash
# Générer le client Prisma
yarn prisma generate

# Créer une migration
yarn prisma migrate dev --name <nom-migration>

# Réinitialiser la DB
yarn prisma migrate reset

# Seed (jeu de données de démonstration)
yarn db:seed

# Ouvrir Prisma Studio
yarn prisma studio
```

## API Documentation

Une fois l'application démarrée, la documentation Swagger est disponible à :

- **Local** : <http://localhost:3000/api/docs>
- **Production** : <https://your-domain.com/api/docs>

### 📮 Collection Postman

Une collection Postman complète est disponible avec tous les endpoints et exemples :

- **Collection** : `postman/Pavillon-Les-Lys-API.postman_collection.json`
- **Environnement Dev** : `postman/Pavillon-Les-Lys-Development.postman_environment.json`
- **Environnement Prod** : `postman/Pavillon-Les-Lys-Production.postman_environment.json`

#### 🚀 Installation rapide

1. Importez les 3 fichiers JSON dans Postman
2. Sélectionnez l'environnement "Development"
3. Utilisez **Register** puis **Login** pour commencer
4. Le token est automatiquement sauvegardé pour tous les autres endpoints

#### 📋 Fonctionnalités incluses

- ✅ **78 endpoints** couvrant toute l'API
- ✅ **Tests automatisés** avec sauvegarde de tokens
- ✅ **Exemples complets** avec données réalistes
- ✅ **Workflow de réservation** de bout en bout
- ✅ **Variables d'environnement** pré-configurées
- ✅ **Documentation détaillée** : [postman/README.md](postman/README.md)

## Déploiement

### Docker

```bash
# Build et démarrage
docker compose up -d

# Logs
docker compose logs -f api
```

### Production

```bash
# Build optimisé
yarn build

# Démarrage production
yarn start:prod

# Avec PM2
pm2 start ecosystem.config.js
```

## Configuration

### CORS

```typescript
// main.ts
app.enableCors({
  origin: ["http://localhost:3000", "https://your-frontend.com"],
  credentials: true,
});
```

### Swagger

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle("Pavillon Les Lys API")
  .setDescription("API de gestion des réservations")
  .setVersion("1.0")
  .addBearerAuth()
  .build();
```

## Contribution

1. **Fork** le project
2. **Créer** une branche feature (`git checkout -b feature/amazing-feature`)
3. **Commit** les changements (`git commit -m 'Add amazing feature'`)
4. **Push** vers la branche (`git push origin feature/amazing-feature`)
5. **Ouvrir** une Pull Request

## Support et Contact

- **Email** : <support@pavilion-les-lys.com>
- **Documentation** : [docs.pavilion-les-lys.com](https://docs.pavilion-les-lys.com)
- **Issues** : [GitHub Issues](https://github.com/your-org/pavillon-les-lys-api/issues)

## License

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

Ressources utiles:

- Données initiales semées: voir DATASET.md
