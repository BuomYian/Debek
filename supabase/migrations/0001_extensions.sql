-- Extensions required by the schema.
--
-- pgcrypto   -> gen_random_uuid() for primary keys. (PostgreSQL 13+ ships
--               this as a core builtin too, but we enable the extension
--               explicitly so the migration is portable to any Postgres
--               15+ instance, Supabase-hosted or local.)
-- btree_gist -> required for the EXCLUDE ... USING gist constraint that
--               makes doctor double-booking impossible at the database
--               level (Section 4, appointments table).
-- pg_trgm    -> trigram indexes so patient name/phone lookup (Section
--               5.2) stays fast for partial, ILIKE-style search, on top
--               of the full-text index added in 0005_patients.sql.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;
create extension if not exists pg_trgm;
