-- Express Powerr Solutions - Smart Fleet System
-- Initial Schema Migration
-- Requires PostgreSQL 14+ with TimescaleDB extension

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CORE ENUM TYPES
-- ============================================================
CREATE TYPE vehicle_type AS ENUM (
  'prime_mover', 'crane_truck', 'low_loader', 'service_van'
);

CREATE TYPE generator_status AS ENUM (
  'available', 'deployed', 'maintenance', 'retired'
);

CREATE TYPE job_type AS ENUM (
  'emergency', 'planned_shutdown', 'standby_contract'
);

CREATE TYPE job_status AS ENUM (
  'pending', 'dispatched', 'en_route', 'on_site', 'completed', 'cancelled'
);

CREATE TYPE sync_status AS ENUM (
  'pending', 'validated', 'error'
);

CREATE TYPE geofence_event_type AS ENUM (
  'entry', 'exit', 'dwell'
);

CREATE TYPE employee_role AS ENUM (
  'driver', 'engine_driver', 'chargeman', 'dispatcher', 'fleet_manager'
);

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TABLE vehicles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate_no        VARCHAR(20) UNIQUE NOT NULL,
  vehicle_type    vehicle_type NOT NULL,
  make_model      VARCHAR(100) NOT NULL,
  year            SMALLINT,
  can_bus_supported BOOLEAN DEFAULT TRUE,
  tank_capacity_l NUMERIC(8,1),
  status          VARCHAR(20) DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_type ON vehicles(vehicle_type);
CREATE INDEX idx_vehicles_status ON vehicles(status);

-- ============================================================
-- GENERATORS
-- ============================================================
CREATE TABLE generators (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  serial_no       VARCHAR(50) UNIQUE NOT NULL,
  brand           VARCHAR(50),
  model           VARCHAR(100),
  voltage_rating  VARCHAR(20),
  power_kva       NUMERIC(8,1),
  fuel_type       VARCHAR(20) DEFAULT 'diesel',
  ble_beacon_id   VARCHAR(50) UNIQUE,
  status          generator_status DEFAULT 'available',
  current_vehicle_id UUID REFERENCES vehicles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_generators_status ON generators(status);
CREATE INDEX idx_generators_beacon ON generators(ble_beacon_id);
CREATE INDEX idx_generators_vehicle ON generators(current_vehicle_id);

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(100) NOT NULL,
  role            employee_role NOT NULL,
  cert_number     VARCHAR(50),
  phone           VARCHAR(20),
  email           VARCHAR(100),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_employees_role ON employees(role);
CREATE INDEX idx_employees_active ON employees(is_active);

-- ============================================================
-- CLIENTS (TNB, SESB, Industrial)
-- ============================================================
CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(150) NOT NULL,
  short_code      VARCHAR(20),
  tin             VARCHAR(20),
  sst_reg_no      VARCHAR(30),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENT SITES (with geofence coordinates)
-- ============================================================
CREATE TABLE client_sites (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID REFERENCES clients(id) NOT NULL,
  name            VARCHAR(150) NOT NULL,
  address         TEXT,
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  geofence_radius_m INTEGER DEFAULT 100,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_sites_client ON client_sites(client_id);

-- ============================================================
-- TRIP / JOBS (dispatch records)
-- ============================================================
CREATE TABLE trip_jobs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_number        VARCHAR(30) UNIQUE NOT NULL,
  client_id         UUID REFERENCES clients(id),
  site_id           UUID REFERENCES client_sites(id),
  site_address      TEXT,
  job_type          job_type NOT NULL,
  status            job_status DEFAULT 'pending',
  sla_minutes       INTEGER,
  vehicle_id        UUID REFERENCES vehicles(id),
  generator_id      UUID REFERENCES generators(id),
  driver_id         UUID REFERENCES employees(id),
  chargeman_id      UUID REFERENCES employees(id),
  notes             TEXT,
  dispatched_at     TIMESTAMPTZ,
  site_arrival_at   TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trip_jobs_status ON trip_jobs(status);
CREATE INDEX idx_trip_jobs_client ON trip_jobs(client_id);
CREATE INDEX idx_trip_jobs_vehicle ON trip_jobs(vehicle_id);
CREATE INDEX idx_trip_jobs_dates ON trip_jobs(dispatched_at, completed_at);

-- ============================================================
-- FUEL LOGS (from probes + card transactions)
-- ============================================================
CREATE TABLE fuel_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id          UUID REFERENCES vehicles(id) NOT NULL,
  trip_job_id         UUID REFERENCES trip_jobs(id),
  litres              NUMERIC(8,2) NOT NULL,
  fuel_type           VARCHAR(20) DEFAULT 'diesel',
  probe_reading_pct   NUMERIC(5,1),
  gps_lat             NUMERIC(10,7),
  gps_lon             NUMERIC(10,7),
  card_transaction_ref VARCHAR(100),
  card_provider       VARCHAR(30),
  is_manual_entry     BOOLEAN DEFAULT FALSE,
  recorded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fuel_logs_vehicle ON fuel_logs(vehicle_id);
CREATE INDEX idx_fuel_logs_trip ON fuel_logs(trip_job_id);
CREATE INDEX idx_fuel_logs_recorded ON fuel_logs(recorded_at DESC);

-- Convert to hypertable for time-series
SELECT create_hypertable('fuel_logs', 'recorded_at', if_not_exists => TRUE);

-- ============================================================
-- PROOF OF DELIVERY RECORDS
-- ============================================================
CREATE TABLE pod_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_job_id     UUID REFERENCES trip_jobs(id) NOT NULL,
  signature_data  TEXT,
  photo_urls      JSONB DEFAULT '[]'::jsonb,
  notes           TEXT,
  submitted_by    UUID REFERENCES employees(id),
  submitted_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pod_records_trip ON pod_records(trip_job_id);

-- ============================================================
-- BLE SCAN EVENTS (beacon sightings)
-- ============================================================
CREATE TABLE ble_scan_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id      UUID REFERENCES vehicles(id) NOT NULL,
  beacon_id       VARCHAR(50) NOT NULL,
  rssi            SMALLINT,
  scanned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ble_scans_vehicle ON ble_scan_events(vehicle_id);
CREATE INDEX idx_ble_scans_beacon ON ble_scan_events(beacon_id);
CREATE INDEX idx_ble_scans_time ON ble_scan_events(scanned_at DESC);

SELECT create_hypertable('ble_scan_events', 'scanned_at', if_not_exists => TRUE);

-- ============================================================
-- BLE BINDING STATE (current vehicle-generator mapping)
-- ============================================================
CREATE TABLE ble_bindings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id      UUID REFERENCES vehicles(id) NOT NULL,
  generator_id    UUID REFERENCES generators(id) NOT NULL,
  beacon_id       VARCHAR(50) NOT NULL,
  bound_at        TIMESTAMPTZ DEFAULT NOW(),
  unbound_at      TIMESTAMPTZ,
  is_current      BOOLEAN DEFAULT TRUE,
  UNIQUE(vehicle_id, generator_id, is_current)
);

CREATE INDEX idx_ble_bindings_current ON ble_bindings(is_current) WHERE is_current = TRUE;

-- ============================================================
-- GEOFENCES
-- ============================================================
CREATE TABLE geofences (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(100) NOT NULL,
  geofence_type   VARCHAR(30) NOT NULL DEFAULT 'client_site',
  latitude        NUMERIC(10,7) NOT NULL,
  longitude       NUMERIC(10,7) NOT NULL,
  radius_m        INTEGER NOT NULL DEFAULT 100,
  client_site_id  UUID REFERENCES client_sites(id),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geofences_active ON geofences(is_active);

-- ============================================================
-- GEOFENCE EVENTS (vehicle entry/exit)
-- ============================================================
CREATE TABLE geofence_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  geofence_id     UUID REFERENCES geofences(id) NOT NULL,
  vehicle_id      UUID REFERENCES vehicles(id) NOT NULL,
  event_type      geofence_event_type NOT NULL,
  gps_lat         NUMERIC(10,7),
  gps_lon         NUMERIC(10,7),
  event_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_geofence_events_gf ON geofence_events(geofence_id);
CREATE INDEX idx_geofence_events_vehicle ON geofence_events(vehicle_id);
CREATE INDEX idx_geofence_events_time ON geofence_events(event_at DESC);

SELECT create_hypertable('geofence_events', 'event_at', if_not_exists => TRUE);

-- ============================================================
-- VEHICLE TELEMETRY (time-series)
-- ============================================================
CREATE TABLE vehicle_telemetry (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id      UUID REFERENCES vehicles(id) NOT NULL,
  gps_lat         NUMERIC(10,7),
  gps_lon         NUMERIC(10,7),
  speed_kmh       NUMERIC(6,1),
  engine_rpm      INTEGER,
  fuel_level_pct  NUMERIC(5,1),
  engine_hours    NUMERIC(10,1),
  odometer_km     NUMERIC(10,1),
  dtc_codes       TEXT,
  ignition_on     BOOLEAN,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicle_telemetry_vid ON vehicle_telemetry(vehicle_id);
CREATE INDEX idx_vehicle_telemetry_time ON vehicle_telemetry(recorded_at DESC);

SELECT create_hypertable('vehicle_telemetry', 'recorded_at', if_not_exists => TRUE);

-- ============================================================
-- ERP STAGING TABLES
-- ============================================================

-- Staging: Fuel logs for ERP
CREATE TABLE staging_fuel_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fleet_cloud_id      UUID,
  vehicle_id          UUID,
  litres              NUMERIC(8,2),
  gps_coords          TEXT,
  card_ref            VARCHAR(100),
  recorded_at         TIMESTAMPTZ,
  status              sync_status DEFAULT 'pending',
  error_message       TEXT,
  synced_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staging_fuel_status ON staging_fuel_logs(status);

-- Staging: Delivery Orders
CREATE TABLE staging_delivery_orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fleet_cloud_id      UUID,
  trip_job_id         UUID,
  client_name         VARCHAR(150),
  site_address        TEXT,
  generator_serial    VARCHAR(50),
  signature_b64       TEXT,
  photo_urls          JSONB DEFAULT '[]'::jsonb,
  status              sync_status DEFAULT 'pending',
  error_message       TEXT,
  synced_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staging_do_status ON staging_delivery_orders(status);

-- Staging: Asset location updates
CREATE TABLE staging_asset_updates (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_type          VARCHAR(20) NOT NULL,
  asset_id            UUID,
  gps_coords          TEXT,
  last_known_location TEXT,
  status              sync_status DEFAULT 'pending',
  error_message       TEXT,
  synced_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staging_asset_status ON staging_asset_updates(status);

-- Staging: Mileage / odometer for PO triggering
CREATE TABLE staging_mileage (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id          UUID,
  odometer_km         NUMERIC(10,1),
  engine_hours        NUMERIC(10,1),
  reading_at          TIMESTAMPTZ,
  status              sync_status DEFAULT 'pending',
  error_message       TEXT,
  synced_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staging_mileage_status ON staging_mileage(status);

-- ============================================================
-- SYNC LOG (audit trail for ERP sync jobs)
-- ============================================================
CREATE TABLE sync_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name      VARCHAR(50) NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_success  INTEGER DEFAULT 0,
  records_error    INTEGER DEFAULT 0,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  status          VARCHAR(20) DEFAULT 'completed'
);

-- ============================================================
-- USERS (for admin portal login)
-- ============================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username        VARCHAR(50) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  employee_id     UUID REFERENCES employees(id),
  role            VARCHAR(30) NOT NULL DEFAULT 'viewer',
  is_active       BOOLEAN DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
