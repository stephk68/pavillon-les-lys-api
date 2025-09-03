# 🚀 CI/CD Pipeline - Pavillon Les Lys API

## 📋 Vue d'ensemble

Ce repository contient un pipeline CI/CD complet et robuste utilisant GitHub Actions pour automatiser les tests, la sécurité, les déploiements et les releases de l'API Pavillon Les Lys.

## 🔧 Workflows Disponibles

### 1. 🚀 Pipeline Principal CI/CD (`ci-cd.yml`)

**Déclencheurs :**
- Push sur `main`, `master`, `develop`
- Pull requests vers `main`, `master`
- Déclenchement manuel

**Étapes :**
1. **Tests & Qualité** - Linting, formatting, build, tests unitaires/intégration/e2e
2. **Sécurité** - Audit des dépendances, scan Snyk
3. **Build & Push** - Construction et publication de l'image Docker
4. **Déploiement Staging** - Auto-déploiement sur `develop`
5. **Déploiement Production** - Auto-déploiement sur `main/master`
6. **Notifications** - Slack et email

### 2. 🔍 Validation des Pull Requests (`pr-validation.yml`)

**Déclencheurs :**
- Ouverture, synchronisation, réouverture de PR
- PR marquée comme prête pour review

**Vérifications :**
- ✅ Validation basique (lint, format, build)
- 🗄️ Validation du schéma de base de données
- 🔒 Revue de sécurité
- 📊 Rapport de couverture de tests
- ⚡ Vérification des performances
- 📝 Qualité du code
- 🤖 Éligibilité pour auto-merge

### 3. 🏷️ Gestion des Releases (`release.yml`)

**Déclencheurs :**
- Tags de version (`v*.*.*`)
- Déclenchement manuel avec version

**Processus :**
1. Validation de la version
2. Suite complète de tests
3. Construction des artefacts de release
4. Génération automatique du changelog
5. Création de la release GitHub
6. Déploiement en production (si pas en pré-release)
7. Mise à jour de la documentation

### 4. 🔄 Déploiement Manuel & Rollback (`manual-deployment.yml`)

**Actions disponibles :**
- `deploy` - Déployer une version spécifique
- `rollback` - Retour à une version antérieure
- `restart` - Redémarrer les services
- `migrate` - Exécuter les migrations
- `seed` - Alimenter la base de données

**Environnements :**
- `staging` - Environnement de test
- `production` - Environnement de production

### 5. 🛡️ Sécurité & Dépendances (`security.yml`)

**Scans automatiques :**
- 📦 Audit des dépendances (yarn audit)
- 📋 Vérification des licences
- 🛡️ OWASP Dependency Check
- 🐳 Sécurité des conteneurs (Trivy, Grype)
- 🔒 Analyse de code (CodeQL)
- 🔑 Détection de secrets (TruffleHog, GitLeaks)

**Fréquence :**
- Hebdomadaire (lundi 9h UTC)
- À chaque push sur main
- Modifications de dépendances

## 🔐 Secrets Requis

### GitHub Secrets

```bash
# Container Registry
GITHUB_TOKEN                    # Auto-généré par GitHub

# Serveurs de déploiement
STAGING_SSH_PRIVATE_KEY         # Clé SSH pour staging
STAGING_HOST                    # IP/domain du serveur staging
STAGING_USER                    # Utilisateur SSH staging

PRODUCTION_SSH_PRIVATE_KEY      # Clé SSH pour production
PRODUCTION_HOST                 # IP/domain du serveur production
PRODUCTION_USER                 # Utilisateur SSH production

# Notifications
SLACK_WEBHOOK_URL               # Webhook Slack pour notifications
SMTP_SERVER                     # Serveur SMTP
SMTP_PORT                       # Port SMTP (587)
SMTP_USERNAME                   # Utilisateur email
SMTP_PASSWORD                   # Mot de passe email
NOTIFICATION_EMAIL              # Email pour notifications générales
RELEASE_NOTIFICATION_EMAIL      # Email pour notifications de release
PRODUCTION_NOTIFICATION_EMAIL   # Email pour notifications production
SECURITY_NOTIFICATION_EMAIL     # Email pour alertes sécurité

# Services tiers (optionnels)
SNYK_TOKEN                      # Token Snyk pour scan sécurité
SONAR_TOKEN                     # Token SonarCloud pour qualité
```

### Configuration des Secrets

1. **Aller dans Settings > Secrets and variables > Actions**
2. **Ajouter chaque secret avec sa valeur**
3. **Pour les environnements (staging/production) :**
   - Settings > Environments
   - Créer `staging` et `production`
   - Ajouter les secrets spécifiques à chaque environnement

## 🌍 Configuration des Environnements

### Staging Environment
```yaml
name: staging
url: https://api-staging.pavillon-les-lys.fr
protection_rules:
  - required_reviewers: 0
  - wait_timer: 0
secrets:
  - STAGING_SSH_PRIVATE_KEY
  - STAGING_HOST
  - STAGING_USER
```

### Production Environment
```yaml
name: production
url: https://api.pavillon-les-lys.fr
protection_rules:
  - required_reviewers: 1
  - wait_timer: 5  # 5 minutes
  - restricted_to_branches: [main, master]
secrets:
  - PRODUCTION_SSH_PRIVATE_KEY
  - PRODUCTION_HOST
  - PRODUCTION_USER
```

## 🚀 Guide de Déploiement

### Déploiement Automatique

#### Staging
```bash
# Push sur develop déclenche un déploiement staging
git checkout develop
git push origin develop
```

#### Production
```bash
# Push sur main déclenche un déploiement production
git checkout main
git merge develop
git push origin main
```

### Déploiement Manuel

1. **Aller dans Actions > Manual Deployment & Rollback**
2. **Cliquer "Run workflow"**
3. **Sélectionner :**
   - Environment: `staging` ou `production`
   - Action: `deploy`, `rollback`, `restart`, `migrate`, `seed`
   - Version (optionnel)
   - Force (pour bypasser les confirmations)

### Release

#### Release Automatique
```bash
# Créer un tag et push
git tag v1.2.3
git push origin v1.2.3
```

#### Release Manuelle
1. **Actions > Release Management**
2. **Run workflow**
3. **Spécifier version et type (pre-release ou non)**

## 📊 Monitoring et Notifications

### Slack Notifications
- ✅ Déploiements réussis
- ❌ Échecs de déploiement
- 🚨 Alertes sécurité
- 🏷️ Nouvelles releases

### Email Notifications
- Déploiements production
- Échecs critiques
- Alertes sécurité
- Nouvelles releases

### Status Badges

Ajoutez ces badges à votre README :

```markdown
![CI/CD](https://github.com/stephk68/pavillon-les-lys-api/workflows/CI%2FCD%20Pipeline/badge.svg)
![Security](https://github.com/stephk68/pavillon-les-lys-api/workflows/Security%20%26%20Dependency%20Scan/badge.svg)
![Release](https://github.com/stephk68/pavillon-les-lys-api/workflows/Release%20Management/badge.svg)
```

## 🛠️ Configuration Serveur

### Prérequis Serveur

```bash
# Structure sur le serveur
/opt/pavillon-les-lys-api/
├── docker-compose.yml
├── .env
└── data/
    └── postgres/

# Utilisateur de déploiement
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy

# Clé SSH
mkdir -p /home/deploy/.ssh
echo "YOUR_PUBLIC_KEY" >> /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### Docker Compose Production

```yaml
version: '3.8'
services:
  api:
    image: ghcr.io/stephk68/pavillon-les-lys-api:latest
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

## 🐛 Dépannage

### Échecs Courants

#### Tests Échouent
```bash
# Vérifier localement
yarn test:unit
yarn test:integration
yarn test:e2e

# Vérifier la base de données
yarn prisma migrate deploy
yarn db:seed
```

#### Build Docker Échoue
```bash
# Tester le build localement
docker build -t test-build .
docker run --rm test-build
```

#### Déploiement SSH Échoue
```bash
# Vérifier la connexion SSH
ssh -i ~/.ssh/deploy_key deploy@your-server.com

# Vérifier Docker sur le serveur
docker ps
docker-compose ps
```

#### Base de Données
```bash
# Sur le serveur
docker-compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB

# Vérifier les migrations
docker-compose exec api yarn prisma migrate status
```

### Logs et Debugging

```bash
# Logs des workflows GitHub
# Aller dans Actions > Workflow run > Job > Step

# Logs serveur
docker-compose logs -f api
docker-compose logs -f postgres

# Health check
curl -f https://api.pavillon-les-lys.fr/health
```

## 📈 Optimisations et Bonnes Pratiques

### Performance
- ✅ Cache Docker multi-stage
- ✅ Parallélisation des jobs
- ✅ Cache des dépendances Node.js
- ✅ Optimisation des images (Alpine)

### Sécurité
- ✅ Scan automatique des vulnérabilités
- ✅ Vérification des secrets
- ✅ Analyse de code statique
- ✅ Images minimales

### Fiabilité
- ✅ Tests sur base de données réelle
- ✅ Health checks après déploiement
- ✅ Rollback automatique en cas d'échec
- ✅ Environnements protégés

### Notifications
- ✅ Notifications multi-canaux
- ✅ Rapports détaillés
- ✅ Escalade selon la criticité

## 🔄 Évolutions Futures

### Améliorations Prévues
- [ ] Tests de charge automatisés
- [ ] Déploiement multi-région
- [ ] Métriques et monitoring avancés
- [ ] Auto-scaling basé sur la charge
- [ ] Backup automatique des bases de données
- [ ] Tests de récupération d'incident

### Intégrations Possibles
- [ ] PagerDuty pour les alertes
- [ ] DataDog pour le monitoring
- [ ] AWS CloudWatch pour les logs
- [ ] Terraform pour l'infrastructure
- [ ] Kubernetes pour l'orchestration

---

**🎉 Votre pipeline CI/CD est maintenant configuré et prêt à utiliser !**

Pour toute question ou amélioration, n'hésitez pas à créer une issue ou une pull request.
