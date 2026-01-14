-- Script de seed simple pour PostgreSQL
-- Données de base pour Pavillon Les Lys

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insérer des utilisateurs de test
INSERT INTO "User" (id, email, password, "firstName", "lastName", role, "isFirstLogin", "createdAt", "updatedAt") VALUES
('admin-001', 'admin@pavillonleslys.com', '$2b$10$rQZ8K9vL2nM3oP4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9u', 'Admin', 'Pavillon', 'ADMIN', false, NOW(), NOW()),
('manager-001', 'manager@pavillonleslys.com', '$2b$10$rQZ8K9vL2nM3oP4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9u', 'Manager', 'Events', 'EVENT_MANAGER', false, NOW(), NOW()),
('client-001', 'client@example.com', '$2b$10$rQZ8K9vL2nM3oP4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9u', 'John', 'Doe', 'CLIENT', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insérer des réservations de test
INSERT INTO "Reservation" (id, "userId", "eventType", start, "end", attendees, status, "createdAt", "updatedAt") VALUES
('reservation-001', 'client-001', 'MARIAGE', NOW() + INTERVAL '30 days', NOW() + INTERVAL '30 days' + INTERVAL '8 hours', 150, 'PENDING', NOW(), NOW()),
('reservation-002', 'client-001', 'ANNIVERSAIRE', NOW() + INTERVAL '60 days', NOW() + INTERVAL '60 days' + INTERVAL '6 hours', 80, 'CONFIRMED', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insérer des devis de test
INSERT INTO "Quote" (id, "totalAmount", currency, "createdAt", "updatedAt") VALUES
('quote-001', 2500000.00, 'XOF', NOW(), NOW()),
('quote-002', 1800000.00, 'XOF', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Mettre à jour les réservations avec les devis
UPDATE "Reservation" SET "quoteId" = 'quote-001' WHERE id = 'reservation-001';
UPDATE "Reservation" SET "quoteId" = 'quote-002' WHERE id = 'reservation-002';

-- Insérer des paiements de test
INSERT INTO "Payment" (id, "reservationId", amount, currency, type, status, "dueDate", "userId", "createdAt", "updatedAt") VALUES
('payment-001', 'reservation-001', 1250000.00, 'XOF', 'ACOMPTE', 'PENDING', NOW() + INTERVAL '15 days', 'client-001', NOW(), NOW()),
('payment-002', 'reservation-001', 1250000.00, 'XOF', 'SOLDE', 'PENDING', NOW() + INTERVAL '25 days', 'client-001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insérer des éléments de checklist de test
INSERT INTO "ChecklistItem" (id, "reservationId", title, completed, "assignedTo", "dueAt", "createdAt", "updatedAt") VALUES
('checklist-001', 'reservation-001', 'Confirmer la décoration', false, 'manager-001', NOW() + INTERVAL '20 days', NOW(), NOW()),
('checklist-002', 'reservation-001', 'Valider le menu', false, 'manager-001', NOW() + INTERVAL '15 days', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insérer des avis de test
INSERT INTO "Feedback" (id, "userId", "reservationId", rating, comment, "createdAt", "updatedAt") VALUES
('feedback-001', 'client-001', 'reservation-002', 5, 'Excellent service, je recommande vivement !', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Log de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Seed data inserted successfully for Pavillon Les Lys!';
END $$;

