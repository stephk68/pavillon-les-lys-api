# Tests - Pavillon Les Lys API

Ce dossier contient tous les tests pour l'API Pavillon Les Lys.

## Structure

```
src/test/
├── unit/              # Tests unitaires
│   ├── auth.service.spec.ts           # Tests du service d'authentification
│   ├── user.service.spec.ts           # Tests du service utilisateur
│   ├── reservation.service.spec.ts    # Tests du service de réservation
│   ├── payment.service.spec.ts        # Tests du service de paiement
│   ├── quote.service.spec.ts          # Tests du service de devis
│   ├── feedback.service.spec.ts       # Tests du service de feedback
│   ├── checklist-item.service.spec.ts # Tests du service de checklist
│   ├── authentication.guard.spec.ts   # Tests du guard d'authentification
│   ├── authorization.guard.spec.ts    # Tests du guard d'autorisation
│   └── owner.guard.spec.ts            # Tests du guard de propriété
├── integration/       # Tests d'intégration
│   ├── auth.controller.integration.spec.ts        # Tests d'intégration auth
│   ├── user.controller.integration.spec.ts        # Tests d'intégration user
│   └── reservation.controller.integration.spec.ts # Tests d'intégration reservation
├── mocks/            # Mocks et utilitaires
│   ├── prisma.mock.ts      # Mock Prisma avec jest-mock-extended
│   └── services.mock.ts    # Mocks des services
├── setup.ts          # Configuration globale des tests
└── jest-unit.json    # Configuration Jest pour tests unitaires
```

## Couverture Actuelle

### Services Testés ✅

- **AuthService** : Login, register, refresh token, validation
- **UserService** : CRUD utilisateurs, validation, recherche
- **ReservationService** : Création, modification, statuts, disponibilité
- **PaymentService** : Paiements, statuts, facturation, remboursements
- **QuoteService** : Devis, calculs, gestion des items
- **FeedbackService** : Tests basiques (service en développement)
- **ChecklistItemService** : Tests basiques (service en développement)

### Guards Testés ✅

- **AuthenticationGuard** : Vérification des tokens, accès public
- **AuthorizationGuard** : Vérification des rôles et permissions
- **OwnerOrAdminGuard** : Accès aux données personnelles

### Contrôleurs Testés ✅

- **AuthController** : Endpoints d'authentification (intégration)
- **UserController** : CRUD utilisateurs (intégration)
- **ReservationController** : Gestion des réservations (intégration)

## Types de Tests

### Tests Unitaires

- **Services** : Logique métier et interactions avec la base de données
- **Guards** : Authentification et autorisation
- **Utilitaires** : Fonctions helper et validation

### Tests d'Intégration

- **API Endpoints** : Tests end-to-end des routes HTTP
- **Authentication Flow** : Flux complet d'authentification
- **Business Logic** : Intégration entre services
- **Middleware** : Comportement des guards et interceptors

## Commandes

```bash
# Tous les tests
npm run test

# Tests en mode watch
npm run test:watch

# Tests unitaires uniquement
npm run test:unit
npm run test:unit:watch
npm run test:unit:cov

# Tests d'intégration uniquement
npm run test:integration
npm run test:integration:watch

# Tests end-to-end
npm run test:e2e

# Couverture de code complète
npm run test:cov
```

## Configuration

### Variables d'environnement pour les tests

Créer un fichier `.env.test` :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/pavilion_test_db"
JWT_SECRET="test-jwt-secret"
NODE_ENV="test"
```

### Base de données de test

```bash
# Créer la base de test
npx prisma migrate deploy --schema=./prisma/schema.prisma

# Réinitialiser entre les tests
npx prisma migrate reset --force --skip-seed
```

## Exemples de Tests

### Test de Service

```typescript
describe('UserService', () => {
  let service: UserService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should create user', async () => {
    // Test implementation
  });
});
```

### Test d'Intégration

```typescript
describe('AuthController (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should register user', async () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(201);
  });
});
```

## Bonnes Pratiques

### Structure des Tests

1. **Arrange** : Préparer les données et mocks
2. **Act** : Exécuter la fonction testée
3. **Assert** : Vérifier les résultats

### Nommage

- Fichiers : `*.spec.ts` pour les tests unitaires
- Fichiers : `*.integration.spec.ts` pour les tests d'intégration
- Describe blocks : Nom du service/controller testé
- Test cases : "should + action + condition"

### Mocking

```typescript
// Mock d'un service
const mockUserService = {
  findOne: jest.fn(),
  create: jest.fn(),
};

// Mock de Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  })),
}));
```

### Clean Up

```typescript
afterEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await app.close();
  await prismaService.$disconnect();
});
```

## Tests Couverts

### ✅ Services Testés

- [x] AuthService
- [x] ReservationService
- [x] PaymentService
- [ ] UserService (partiel)
- [ ] QuoteService
- [ ] FeedbackService

### ✅ Guards Testés

- [x] AuthenticationGuard
- [ ] AuthorizationGuard
- [ ] OwnerGuard

### ✅ Intégration Testée

- [x] Auth endpoints
- [ ] User endpoints
- [ ] Reservation endpoints
- [ ] Payment endpoints

## Coverage Goals

| Module      | Target Coverage |
| ----------- | --------------- |
| Services    | > 90%           |
| Controllers | > 80%           |
| Guards      | > 95%           |
| DTOs        | > 70%           |

## Debugging Tests

### Mode Debug

```bash
# Lancer avec debugger
npm run test:debug

# Avec breakpoints
NODE_OPTIONS='--inspect-brk' npm run test
```

### Logs en Tests

```typescript
// Activer les logs pendant les tests
beforeAll(() => {
  process.env.LOG_LEVEL = 'debug';
});
```

### Test Isolation

```typescript
// Nettoyer entre les tests
beforeEach(async () => {
  await prismaService.user.deleteMany();
  await prismaService.reservation.deleteMany();
});
```

## Métriques

### Rapports de Couverture

- **HTML** : `coverage/lcov-report/index.html`
- **JSON** : `coverage/coverage-final.json`
- **LCOV** : `coverage/lcov.info`

### CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: |
    npm run test:unit
    npm run test:integration
    npm run test:cov
```

## Ressources

- [Jest Documentation](https://jestjs.io/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
