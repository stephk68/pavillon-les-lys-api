# Guide Développement Frontend - Pavillon Les Lys

Guide complet pour l'intégration frontend avec l'API Pavillon Les Lys.

## 🚀 Aperçu de l'API

**Base URL** : `http://localhost:3000` (développement)  
**Documentation** : `http://localhost:3000/api/docs`  
**Format** : JSON REST API  
**Authentification** : JWT Bearer Token

## 🔐 Authentification

### Endpoints Auth

| Méthode | Endpoint                | Description                 | Public |
| ------- | ----------------------- | --------------------------- | ------ |
| POST    | `/auth/register`        | Inscription utilisateur     | ✅     |
| POST    | `/auth/login`           | Connexion                   | ✅     |
| POST    | `/auth/forgot-password` | Demande reset password      | ✅     |
| POST    | `/auth/reset-password`  | Reset password              | ✅     |
| GET     | `/auth/profile`         | Profil utilisateur connecté | ❌     |
| POST    | `/auth/refresh`         | Refresh token               | ❌     |
| POST    | `/auth/logout`          | Déconnexion                 | ❌     |
| GET     | `/auth/validate`        | Validation token            | ❌     |

### Flux d'authentification

```typescript
// 1. Connexion
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});

const { access_token, user } = await loginResponse.json();

// 2. Stockage du token
localStorage.setItem('token', access_token);
localStorage.setItem('user', JSON.stringify(user));

// 3. Utilisation dans les requêtes
const headers = {
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
};
```

### Gestion des erreurs auth

```typescript
// Intercepteur pour gérer l'expiration des tokens
const handleApiCall = async (url: string, options: RequestInit) => {
  const response = await fetch(url, options);

  if (response.status === 401) {
    // Token expiré - rediriger vers login
    localStorage.removeItem('token');
    window.location.href = '/login';
    return;
  }

  return response;
};
```

## 👥 Gestion des Utilisateurs

### Permissions par rôle

| Rôle       | Permissions                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| **CLIENT** | - Voir/modifier son profil<br>- Créer ses réservations<br>- Voir ses paiements                                       |
| **STAFF**  | - Toutes permissions CLIENT<br>- Voir tous les utilisateurs<br>- Gérer les réservations<br>- Confirmer les paiements |
| **ADMIN**  | - Toutes permissions STAFF<br>- Gérer les utilisateurs<br>- Supprimer des données<br>- Accès aux statistiques        |

### Endpoints Utilisateurs

```typescript
// Récupérer tous les utilisateurs (ADMIN/STAFF)
GET /users?role=CLIENT&skip=0&take=20

// Recherche utilisateurs
GET /users/search?q=jean

// Profil utilisateur
GET /users/:id

// Modifier utilisateur
PATCH /users/:id

// Changer mot de passe
PATCH /users/:id/password
```

### Exemples d'intégration

```typescript
// Composant de liste des utilisateurs
const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const response = await fetch('/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setUsers(data);
      setLoading(false);
    };

    fetchUsers();
  }, []);

  // Render logic...
};
```

## 📅 Système de Réservation

### Statuts des réservations

| Statut      | Description                | Actions possibles         |
| ----------- | -------------------------- | ------------------------- |
| `PENDING`   | En attente de confirmation | Confirmer, Annuler        |
| `CONFIRMED` | Confirmée                  | Annuler, Marquer terminée |
| `COMPLETED` | Terminée                   | Aucune                    |
| `CANCELLED` | Annulée                    | Aucune                    |

### Types d'événements

```typescript
enum EventType {
  WEDDING = 'WEDDING',
  BIRTHDAY = 'BIRTHDAY',
  CONFERENCE = 'CONFERENCE',
  SEMINAR = 'SEMINAR',
  OTHER = 'OTHER',
}
```

### Endpoints Réservations

```typescript
// Vérifier disponibilité (PUBLIC)
GET /reservations/availability?start=2025-06-20T10:00&end=2025-06-20T18:00

// Créneaux disponibles (PUBLIC)
GET /reservations/available-slots?date=2025-06-20

// Créer réservation
POST /reservations
{
  "eventType": "WEDDING",
  "start": "2025-06-20T10:00:00Z",
  "end": "2025-06-20T18:00:00Z",
  "attendees": 150,
  "notes": "Mariage en extérieur"
}

// Mes réservations
GET /reservations/my-reservations

// Confirmer réservation (STAFF/ADMIN)
PATCH /reservations/:id/confirm
```

### Composant de calendrier

```typescript
const CalendarView = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);

  const checkAvailability = async (start: Date, end: Date) => {
    const response = await fetch(
      `/reservations/availability?start=${start.toISOString()}&end=${end.toISOString()}`,
    );
    const { available } = await response.json();
    return available;
  };

  // Intégration avec react-calendar ou fullcalendar
};
```

## 💰 Gestion des Paiements

### Statuts des paiements

| Statut     | Description              |
| ---------- | ------------------------ |
| `PENDING`  | En attente de traitement |
| `PAID`     | Payé avec succès         |
| `FAILED`   | Échec du paiement        |
| `REFUNDED` | Remboursé                |

### Flux de paiement

```typescript
// 1. Créer un paiement
const payment = await fetch('/payments', {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({
    amount: 50000, // en centimes (500.00 XOF)
    type: 'CARD',
    reservationId: 'reservation-uuid',
    description: 'Paiement réservation mariage',
  }),
});

// 2. Traiter le paiement
const result = await fetch(`/payments/${paymentId}/process`, {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({
    paymentMethod: {
      // Données du gateway (Stripe, PayPal, etc.)
    },
  }),
});
```

### Intégration Stripe (exemple)

```typescript
import { loadStripe } from '@stripe/stripe-js';

const PaymentForm = ({ amount, paymentId }) => {
  const stripe = await loadStripe('pk_...');

  const handlePayment = async (paymentMethod) => {
    // Traiter via l'API
    const response = await fetch(`/payments/${paymentId}/process`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ paymentMethod }),
    });

    if (response.ok) {
      // Paiement réussi
      redirectToSuccess();
    }
  };
};
```

## 📋 Système de Devis

### Structure d'un devis

```typescript
interface Quote {
  id: string;
  items: QuoteItem[];
  totalAmount: number;
  currency: string;
  reservationId?: string;
  createdAt: Date;
}

interface QuoteItem {
  name: string;
  description?: string;
  quantity: number;
  price: number;
  unit?: string;
}
```

### Gestion des items

```typescript
// Composant d'édition de devis
const QuoteEditor = ({ quoteId }) => {
  const [items, setItems] = useState([]);

  const addItem = async (item: QuoteItem) => {
    await fetch(`/quotes/${quoteId}/items`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(item),
    });
    // Rafraîchir la liste
  };

  const updateItem = async (index: number, item: QuoteItem) => {
    await fetch(`/quotes/${quoteId}/items/${index}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify(item),
    });
  };
};
```

## 📊 Tableaux de Bord

### Dashboard Admin

```typescript
const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    reservations: 0,
    revenue: 0,
    pending: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [userStats, reservationStats, paymentStats] = await Promise.all([
        fetch('/users/count', { headers: authHeaders }),
        fetch('/reservations/stats', { headers: authHeaders }),
        fetch('/payments/stats', { headers: authHeaders }),
      ]);

      // Combiner les données
    };
  }, []);
};
```

### Graphiques recommandés

```typescript
// Avec Chart.js ou Recharts
import { LineChart, BarChart, PieChart } from 'recharts';

const RevenueChart = ({ data }) => (
  <LineChart data={data}>
    <XAxis dataKey="month" />
    <YAxis />
    <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
  </LineChart>
);
```

## 🔍 Recherche et Filtrage

### Patterns de recherche

```typescript
// Recherche avec debouncing
const useSearch = (endpoint: string, delay = 300) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (query.length > 2) {
        const response = await fetch(`${endpoint}?q=${query}`, {
          headers: authHeaders,
        });
        setResults(await response.json());
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [query, delay]);

  return { query, setQuery, results };
};
```

### Filtres avancés

```typescript
// Composant de filtres
const FilterPanel = ({ onFiltersChange }) => {
  const [filters, setFilters] = useState({
    status: '',
    eventType: '',
    dateRange: { start: '', end: '' },
    role: '',
  });

  const applyFilters = () => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    onFiltersChange(queryParams.toString());
  };
};
```

## 📱 Responsive Design

### Points de rupture recommandés

```css
/* Mobile First */
.container {
  padding: 1rem;
}

@media (min-width: 768px) {
  /* Tablet */
  .container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
}

@media (min-width: 1024px) {
  /* Desktop */
  .sidebar {
    position: fixed;
    width: 250px;
  }

  .main-content {
    margin-left: 250px;
  }
}
```

### Navigation mobile

```typescript
const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)}>
        {/* Hamburger icon */}
      </button>

      <nav className={`mobile-nav ${isOpen ? 'open' : ''}`}>
        {/* Navigation items */}
      </nav>
    </>
  );
};
```

## 🚨 Gestion d'Erreurs

### Codes d'erreur communs

| Code  | Description           | Action                         |
| ----- | --------------------- | ------------------------------ |
| `400` | Données invalides     | Afficher erreurs de validation |
| `401` | Non authentifié       | Rediriger vers login           |
| `403` | Accès interdit        | Afficher message d'erreur      |
| `404` | Ressource non trouvée | Page 404                       |
| `500` | Erreur serveur        | Réessayer ou contact support   |

### Hook de gestion d'erreurs

```typescript
const useErrorHandler = () => {
  const showError = (error: any) => {
    if (error.status === 401) {
      logout();
      return;
    }

    // Afficher notification d'erreur
    toast.error(error.message || 'Une erreur est survenue');
  };

  return { showError };
};
```

## 🔔 Notifications

### Types de notifications

```typescript
enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

// Avec react-toastify
import { toast } from 'react-toastify';

const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast.warning(message),
  info: (message: string) => toast.info(message),
};
```

### Notifications temps réel

```typescript
// Avec Socket.io ou Server-Sent Events
const useRealTimeNotifications = () => {
  useEffect(() => {
    const eventSource = new EventSource('/api/notifications/stream');

    eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      notify[notification.type](notification.message);
    };

    return () => eventSource.close();
  }, []);
};
```

## 🎨 Composants UI Recommandés

### Stack technologique suggérée

**React/Next.js** :

- `@headlessui/react` - Composants accessibles
- `@heroicons/react` - Icônes
- `react-hook-form` - Gestion des formulaires
- `react-query` - Gestion du cache API
- `tailwindcss` - Styling

**Vue/Nuxt** :

- `@headlessui/vue` - Composants accessibles
- `@heroicons/vue` - Icônes
- `vee-validate` - Validation formulaires
- `@tanstack/vue-query` - Cache API

### Composants essentiels

```typescript
// DataTable avec pagination
const DataTable = ({ data, columns, pagination, onPageChange, loading }) => {
  // Implémentation avec tri, filtres, pagination
};

// Modal de confirmation
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  // Implémentation modale de confirmation
};

// Form avec validation
const ValidatedForm = ({ schema, onSubmit, defaultValues }) => {
  // Intégration react-hook-form + yup/zod
};
```

## 🔧 Outils de Développement

### Configuration recommandée

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  }
}
```

### Variables d'environnement

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 📋 Checklist de Déploiement

### Avant la mise en production

- [ ] Variables d'environnement configurées
- [ ] HTTPS activé
- [ ] CORS configuré pour le domaine de production
- [ ] Gestion d'erreurs complète
- [ ] Tests e2e passés
- [ ] Performance optimisée (lazy loading, code splitting)
- [ ] SEO configuré (meta tags, sitemap)
- [ ] Analytics intégrés
- [ ] Monitoring d'erreurs (Sentry)

### Performance

```typescript
// Lazy loading des composants
const AdminDashboard = lazy(() => import('./AdminDashboard'));
const UserProfile = lazy(() => import('./UserProfile'));

// Optimisation des requêtes
const { data, isLoading } = useQuery(
  ['users', filters],
  () => fetchUsers(filters),
  {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  },
);
```

## 💡 Bonnes Pratiques

### Structure des dossiers

```
src/
├── components/       # Composants réutilisables
│   ├── ui/          # Composants de base (Button, Input, etc.)
│   └── forms/       # Formulaires spécifiques
├── pages/           # Pages de l'application
├── hooks/           # Hooks personnalisés
├── services/        # Services API
├── utils/           # Fonctions utilitaires
├── types/           # Types TypeScript
└── constants/       # Constantes globales
```

### Gestion d'état

```typescript
// Context pour l'authentification
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const login = async (credentials) => {
    const response = await authService.login(credentials);
    setUser(response.user);
    setToken(response.access_token);
    localStorage.setItem('token', response.access_token);
  };

  return (
    <AuthContext.Provider value={{ user, token, login }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Tests

```typescript
// Tests avec Testing Library
import { render, screen, fireEvent } from '@testing-library/react';

test('should login user successfully', async () => {
  render(<LoginForm />);

  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'test@example.com' }
  });

  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: 'password123' }
  });

  fireEvent.click(screen.getByRole('button', { name: /login/i }));

  expect(await screen.findByText(/welcome/i)).toBeInTheDocument();
});
```

---

## 📞 Support

Pour toute question technique :

- **Documentation API** : http://localhost:3000/api/docs
- **Repository** : [GitHub](https://github.com/your-org/pavillon-les-lys-api)
- **Email** : dev@pavilion-les-lys.com

Bon développement ! 🚀
