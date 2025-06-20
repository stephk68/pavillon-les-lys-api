# Collection Postman - Pavillon Les Lys API

Cette collection Postman contient tous les endpoints de l'API Pavillon Les Lys avec des exemples complets et des tests automatisés.

## 📁 Contenu du dossier

- `Pavillon-Les-Lys-API.postman_collection.json` - Collection principale avec tous les endpoints
- `Pavillon-Les-Lys-Development.postman_environment.json` - Variables d'environnement pour le développement
- `Pavillon-Les-Lys-Production.postman_environment.json` - Variables d'environnement pour la production

## 🚀 Installation et Configuration

### 1. Importer la collection dans Postman

1. Ouvrez Postman
2. Cliquez sur **Import** (bouton en haut à gauche)
3. Sélectionnez **Upload Files**
4. Importez les 3 fichiers JSON du dossier `postman/`

### 2. Configurer l'environnement

1. Sélectionnez l'environnement "Pavillon Les Lys - Development" dans le menu déroulant en haut à droite
2. Les variables sont pré-configurées pour `localhost:3000`
3. Pour la production, utilisez l'environnement "Pavillon Les Lys - Production"

## 📋 Structure de la Collection

### 🔐 Authentication

- **Register** - Inscription d'un nouvel utilisateur
- **Login** - Connexion (sauvegarde automatique du token)
- **Get Profile** - Récupérer le profil utilisateur
- **Validate Token** - Vérifier la validité du token
- **Refresh Token** - Renouveler le token d'accès
- **Forgot Password** - Demande de réinitialisation
- **Reset Password** - Réinitialisation avec token
- **Logout** - Déconnexion

### 👤 Users

- **Create Client** - Créer un client (route publique)
- **Create Staff** - Créer du personnel (admin seulement)
- **Get All Users** - Liste avec filtres et pagination
- **Search Users** - Recherche par nom/email
- **Get Users Count** - Statistiques (admin seulement)
- **Get Users by Role** - Filtrage par rôle
- **Get User by ID** - Détails d'un utilisateur
- **Get User Stats** - Statistiques utilisateur
- **Update User** - Modification du profil
- **Update Password** - Changement de mot de passe
- **Delete User** - Suppression (admin seulement)

### 📅 Reservations

- **Create Reservation** - Nouvelle réservation
- **Get All Reservations** - Liste avec filtres avancés
- **Check Availability** - Vérification de disponibilité (public)
- **Get Available Slots** - Créneaux disponibles (public)
- **Get Reservation Stats** - Statistiques (admin/staff)
- **Get Upcoming Reservations** - Réservations à venir
- **Get My Reservations** - Mes réservations
- **Get User Reservations** - Réservations d'un utilisateur
- **Get Reservation by ID** - Détails d'une réservation
- **Update Reservation** - Modification
- **Confirm Reservation** - Confirmation (admin/staff)
- **Cancel Reservation** - Annulation
- **Complete Reservation** - Marquer comme terminée
- **Update Reservation Status** - Changement de statut
- **Delete Reservation** - Suppression (admin)

### 💰 Payments

- **Create Payment** - Nouveau paiement
- **Get All Payments** - Liste avec filtres
- **Get Payment Stats** - Statistiques (admin/staff)
- **Get Monthly Revenue** - Revenus mensuels
- **Get Payment by ID** - Détails d'un paiement
- **Update Payment** - Modification
- **Process Payment** - Traitement (admin/staff)
- **Refund Payment** - Remboursement (admin/staff)
- **Delete Payment** - Suppression (admin)

### 📋 Quotes

- **Create Quote** - Nouveau devis (admin/staff)
- **Get All Quotes** - Liste des devis
- **Get Quote Stats** - Statistiques
- **Get Quote by Reservation** - Devis d'une réservation
- **Get Quote by ID** - Détails d'un devis
- **Export Quote** - Export PDF
- **Update Quote** - Modification (admin/staff)
- **Accept Quote** - Acceptation client
- **Reject Quote** - Refus client
- **Delete Quote** - Suppression (admin)

### ⭐ Feedback

- **Create Feedback** - Nouveau commentaire
- **Get All Feedback** - Liste des feedbacks
- **Get Feedback by ID** - Détails d'un feedback
- **Update Feedback** - Modification
- **Delete Feedback** - Suppression

### ✅ Checklist Items

- **Create Checklist Item** - Nouvel élément
- **Get All Checklist Items** - Liste des éléments
- **Get Checklist Item by ID** - Détails d'un élément
- **Update Checklist Item** - Modification (marquer comme fait)
- **Delete Checklist Item** - Suppression

## 🔄 Workflow d'utilisation

### 1. Authentification

```
1. Register ou Login
2. Le token est automatiquement sauvegardé
3. Tous les autres endpoints utilisent ce token
```

### 2. Création d'une réservation complète

```
1. Check Availability (vérifier dispo)
2. Create Reservation (créer réservation)
3. Create Quote (créer devis - admin/staff)
4. Accept Quote (accepter devis - client)
5. Create Payment (créer paiement)
6. Process Payment (traiter paiement - admin/staff)
7. Confirm Reservation (confirmer - admin/staff)
```

### 3. Gestion événement

```
1. Create Checklist Items (créer checklist)
2. Update Checklist Items (cocher éléments)
3. Complete Reservation (marquer terminé)
4. Create Feedback (commentaire client)
```

## 🔧 Variables d'environnement

### Variables automatiques

- `access_token` - Sauvegardé automatiquement lors du login
- `user_id` - ID de l'utilisateur connecté

### Variables à définir manuellement

- `reservation_id` - ID d'une réservation pour les tests
- `payment_id` - ID d'un paiement pour les tests
- `quote_id` - ID d'un devis pour les tests
- `feedback_id` - ID d'un feedback pour les tests
- `item_id` - ID d'un élément de checklist

## 📝 Exemples de données

### Création d'utilisateur

```json
{
  "email": "client@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+33123456789"
}
```

### Création de réservation

```json
{
  "eventType": "WEDDING",
  "start": "2024-06-15T14:00:00.000Z",
  "end": "2024-06-15T23:00:00.000Z",
  "attendees": 120
}
```

### Création de paiement

```json
{
  "reservationId": "uuid-reservation",
  "amount": 2500.0,
  "type": "DEPOSIT",
  "method": "CREDIT_CARD"
}
```

## 🎯 Tests automatisés

La collection inclut des tests automatisés qui :

- Sauvegardent automatiquement les tokens d'accès
- Extraient les IDs des réponses pour les requêtes suivantes
- Vérifient les codes de statut HTTP
- Valident la structure des réponses JSON

## 🔐 Sécurité et Autorisations

### Rôles disponibles

- **CLIENT** - Utilisateur standard
- **EVENT_MANAGER** - Gestionnaire d'événements
- **ADMIN** - Administrateur complet

### Permissions par rôle

- **Routes publiques** : Register, Login, Check Availability, etc.
- **CLIENT** : Ses propres réservations, paiements, profil
- **EVENT_MANAGER** : Toutes les réservations, création devis, stats
- **ADMIN** : Accès complet, gestion utilisateurs, suppression

## 🚨 Codes d'erreur courants

- **400** - Données invalides (vérifier le format JSON)
- **401** - Token manquant ou invalide
- **403** - Permissions insuffisantes
- **404** - Ressource non trouvée
- **409** - Conflit (ex: créneaux non disponibles)
- **422** - Erreur de validation des données

## 📞 Support

Pour toute question sur l'utilisation de cette collection :

1. Vérifiez que l'API est démarrée sur `localhost:3000`
2. Assurez-vous d'être connecté (token valide)
3. Vérifiez les permissions requises pour chaque endpoint
4. Consultez les exemples de réponses dans la collection

## 🔄 Mise à jour

Cette collection est mise à jour automatiquement avec l'évolution de l'API. Réimportez les fichiers JSON pour obtenir les dernières modifications.
