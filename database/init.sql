-- CiviFix PostgreSQL/PostGIS bootstrap marker.
-- The official postgis image enables the database at container creation;
-- Django migrations create the application schema. This file is intentionally
-- not a fake replacement for a PostgreSQL dump.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
