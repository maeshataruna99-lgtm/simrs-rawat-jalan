-- User PostgreSQL khusus baca (read-only) untuk query dashboard service Node (C.2, D.6 — poin 9.3).
-- Dijalankan otomatis saat volume PostgreSQL baru dibuat; untuk database yang sudah berjalan,
-- jalankan skrip ini pada database `simrs` dan `simrs_test`.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'simrs_readonly') THEN
    CREATE ROLE simrs_readonly LOGIN PASSWORD 'simrs_ro_dev';
  END IF;
END $$;

GRANT CONNECT ON DATABASE simrs TO simrs_readonly;
GRANT CONNECT ON DATABASE simrs_test TO simrs_readonly;

\connect simrs
GRANT USAGE ON SCHEMA public TO simrs_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO simrs_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO simrs_readonly;

\connect simrs_test
GRANT USAGE ON SCHEMA public TO simrs_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO simrs_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO simrs_readonly;
