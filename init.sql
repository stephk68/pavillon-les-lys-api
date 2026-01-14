-- Script d'initialisation de la base de données Pavillon Les Lys
-- Ce fichier est automatiquement exécuté au démarrage du conteneur PostgreSQL

-- Créer la base de données si elle n'existe pas déjà
-- (PostgreSQL le fait automatiquement avec POSTGRES_DB)

-- Extensions utiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Configuration de base
SET timezone = 'Europe/Paris';

-- Commentaire pour confirmer l'initialisation
COMMENT ON DATABASE pavillon_les_lys IS 'Base de données pour l''application Pavillon Les Lys - Gestion d''événements';

-- Log de l'initialisation
DO $$
BEGIN
    RAISE NOTICE 'Base de données Pavillon Les Lys initialisée avec succès !';
END $$;