-- DEPRECATED: Do not use init.sql for production or fresh installs.
-- Use the formal migration runner instead:
--
--   cd backend && npm run migrate
--
-- Migrations live in src/db/migrations/ and are tracked in schema_migrations.
-- This file is retained only for historical reference of the earliest schema.

SELECT 'Use npm run migrate instead of init.sql' AS notice;
