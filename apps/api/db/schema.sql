-- Aarogya Atlas: FHIR-aligned schema for healthcare facility intelligence.
-- Local Postgres + pgvector mirror of a Databricks Lakebase + Mosaic Vector Search target.

CREATE EXTENSION IF NOT EXISTS vector;

-- =========================================================================
-- FHIR R4 Location  (https://www.hl7.org/fhir/location.html)
-- One row per physical or virtual healthcare facility.
-- =========================================================================
CREATE TABLE IF NOT EXISTS fhir_location (
    id              TEXT PRIMARY KEY,                  -- stable id (e.g. "osm-1234567")
    source          TEXT NOT NULL,                     -- 'osm' | 'abdm-hfr' | 'synthetic'
    source_id       TEXT NOT NULL,                     -- raw id in the source system
    name            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active',    -- FHIR status: active | suspended | inactive
    type            TEXT[],                            -- FHIR location-physical-type codes
    -- Address
    address_line    TEXT,
    address_city    TEXT,
    address_district TEXT,
    address_state   TEXT,
    address_postal_code TEXT,
    address_country TEXT NOT NULL DEFAULT 'IN',
    -- Geo (raw — Haversine in SQL; no PostGIS dep)
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    -- Hours of operation (FHIR HoursOfOperation; opening_hours OSM tag normalised)
    hours_of_operation JSONB,
    phone           TEXT,
    -- Original raw payload (so we never lose source detail)
    raw             JSONB,
    -- Audit
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_fhir_location_state    ON fhir_location (address_state);
CREATE INDEX IF NOT EXISTS idx_fhir_location_district ON fhir_location (address_district);
CREATE INDEX IF NOT EXISTS idx_fhir_location_latlon   ON fhir_location (latitude, longitude);

-- =========================================================================
-- FHIR R4 HealthcareService  (https://www.hl7.org/fhir/healthcareservice.html)
-- A capability/service offered at a location (e.g. "ECG", "Dialysis").
-- Sourced from structured tags (OSM healthcare:speciality) AND from
-- LLM extraction over messy free-text intake notes.
-- =========================================================================
CREATE TABLE IF NOT EXISTS fhir_healthcareservice (
    id              BIGSERIAL PRIMARY KEY,
    location_id     TEXT NOT NULL REFERENCES fhir_location(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,                     -- e.g. "Dialysis"
    category        TEXT,                              -- broad bucket
    speciality      TEXT,                              -- SNOMED-aligned where possible
    -- Provenance: how do we know this capability exists?
    evidence_source TEXT NOT NULL,                     -- 'osm-tag' | 'llm-extraction' | 'crowdsourced'
    evidence_text   TEXT,                              -- the raw snippet that supports the claim
    confidence      REAL NOT NULL DEFAULT 1.0,         -- 0..1
    asserted_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hcs_location   ON fhir_healthcareservice (location_id);
CREATE INDEX IF NOT EXISTS idx_hcs_speciality ON fhir_healthcareservice (speciality);

-- =========================================================================
-- Payer eligibility (Ayushman Bharat, ESI, CGHS, private, cash-only)
-- =========================================================================
CREATE TABLE IF NOT EXISTS facility_payer (
    location_id     TEXT NOT NULL REFERENCES fhir_location(id) ON DELETE CASCADE,
    payer           TEXT NOT NULL,                     -- 'ayushman-bharat' | 'cghs' | 'esi' | 'private' | 'cash'
    accepted        BOOLEAN NOT NULL DEFAULT TRUE,
    evidence_source TEXT NOT NULL,
    asserted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (location_id, payer)
);

-- =========================================================================
-- Live status feed: "is the dialysis machine working today?"
-- Mocked for the demo, but the schema is real and crowd-sourceable.
-- =========================================================================
CREATE TABLE IF NOT EXISTS facility_status_event (
    id              BIGSERIAL PRIMARY KEY,
    location_id     TEXT NOT NULL REFERENCES fhir_location(id) ON DELETE CASCADE,
    service_name    TEXT NOT NULL,                     -- e.g. "Dialysis", "MRI"
    status          TEXT NOT NULL,                     -- 'available' | 'down' | 'queue-long' | 'unknown'
    reported_by     TEXT NOT NULL,                     -- 'asha-worker' | 'patient-sms' | 'staff' | 'mock'
    note            TEXT,
    reported_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_loc_time ON facility_status_event (location_id, reported_at DESC);

-- =========================================================================
-- Free-text intake notes (the "10,000 messy records" of the challenge brief).
-- Embedded with bge-m3 (multilingual) so the agent can semantic-search them.
-- =========================================================================
CREATE TABLE IF NOT EXISTS intake_note (
    id              BIGSERIAL PRIMARY KEY,
    location_id     TEXT REFERENCES fhir_location(id) ON DELETE CASCADE,
    text            TEXT NOT NULL,
    language        TEXT,
    embedding       vector(1024),                      -- bge-m3 = 1024 dim
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index for cosine similarity on embedding search
CREATE INDEX IF NOT EXISTS idx_intake_note_embedding
    ON intake_note USING hnsw (embedding vector_cosine_ops);

-- =========================================================================
-- Helper: Haversine distance in km. Avoids PostGIS dependency.
-- =========================================================================
CREATE OR REPLACE FUNCTION haversine_km(lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
                                        lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION)
RETURNS DOUBLE PRECISION AS $$
    SELECT 6371.0 * acos(
        LEAST(1.0, GREATEST(-1.0,
            cos(radians(lat1)) * cos(radians(lat2)) *
            cos(radians(lon2) - radians(lon1)) +
            sin(radians(lat1)) * sin(radians(lat2))
        ))
    );
$$ LANGUAGE SQL IMMUTABLE PARALLEL SAFE;
