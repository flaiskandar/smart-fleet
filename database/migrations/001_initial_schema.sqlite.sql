-- Express Powerr Smart Fleet - SQLite Schema
-- Compatible with both dev (SQLite) and prod (PostgreSQL)

CREATE TABLE IF NOT EXISTS vehicles (
  id              TEXT PRIMARY KEY,
  plate_no        TEXT UNIQUE NOT NULL,
  vehicle_type    TEXT NOT NULL CHECK(vehicle_type IN ('prime_mover','crane_truck','low_loader','service_van')),
  make_model      TEXT NOT NULL,
  year            INTEGER,
  can_bus_supported INTEGER DEFAULT 1,
  tank_capacity_l REAL,
  status          TEXT DEFAULT 'active',
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS generators (
  id              TEXT PRIMARY KEY,
  serial_no       TEXT UNIQUE NOT NULL,
  brand           TEXT,
  model           TEXT,
  voltage_rating  TEXT,
  power_kva       REAL,
  fuel_type       TEXT DEFAULT 'diesel',
  ble_beacon_id   TEXT UNIQUE,
  status          TEXT DEFAULT 'available' CHECK(status IN ('available','deployed','maintenance','retired')),
  current_vehicle_id TEXT REFERENCES vehicles(id),
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS employees (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL CHECK(role IN ('driver','engine_driver','chargeman','dispatcher','fleet_manager')),
  cert_number     TEXT,
  phone           TEXT,
  email           TEXT,
  is_active       INTEGER DEFAULT 1,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  short_code      TEXT,
  tin             TEXT,
  sst_reg_no      TEXT,
  is_active       INTEGER DEFAULT 1,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS client_sites (
  id              TEXT PRIMARY KEY,
  client_id       TEXT REFERENCES clients(id) NOT NULL,
  name            TEXT NOT NULL,
  address         TEXT,
  latitude        REAL,
  longitude       REAL,
  geofence_radius_m INTEGER DEFAULT 100,
  is_active       INTEGER DEFAULT 1,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trip_jobs (
  id                TEXT PRIMARY KEY,
  job_number        TEXT UNIQUE NOT NULL,
  client_id         TEXT REFERENCES clients(id),
  site_id           TEXT REFERENCES client_sites(id),
  site_address      TEXT,
  job_type          TEXT NOT NULL CHECK(job_type IN ('emergency','planned_shutdown','standby_contract')),
  status            TEXT DEFAULT 'pending' CHECK(status IN ('pending','dispatched','en_route','on_site','completed','cancelled','interrupted')),
  sla_minutes       INTEGER,
  vehicle_id        TEXT REFERENCES vehicles(id),
  generator_id      TEXT REFERENCES generators(id),
  driver_id         TEXT REFERENCES employees(id),
  chargeman_id      TEXT REFERENCES employees(id),
  notes             TEXT,
  dispatched_at     TEXT,
  site_arrival_at   TEXT,
  completed_at      TEXT,
  interrupted_reason TEXT,
  interrupted_at    TEXT,
  revenue_amount    REAL DEFAULT 0,
  revenue_currency  TEXT DEFAULT 'MYR',
  invoice_number    TEXT,
  invoice_status    TEXT DEFAULT 'pending' CHECK(invoice_status IN ('pending','issued','paid','cancelled')),
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fuel_logs (
  id                  TEXT PRIMARY KEY,
  vehicle_id          TEXT REFERENCES vehicles(id) NOT NULL,
  trip_job_id         TEXT REFERENCES trip_jobs(id),
  litres              REAL NOT NULL,
  fuel_type           TEXT DEFAULT 'diesel',
  probe_reading_pct   REAL,
  gps_lat             REAL,
  gps_lon             REAL,
  card_transaction_ref TEXT,
  card_provider       TEXT,
  is_manual_entry     INTEGER DEFAULT 0,
  recorded_at         TEXT NOT NULL DEFAULT (datetime('now')),
  created_at          TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pod_records (
  id              TEXT PRIMARY KEY,
  trip_job_id     TEXT REFERENCES trip_jobs(id) NOT NULL,
  signature_data  TEXT,
  photo_urls      TEXT DEFAULT '[]',
  notes           TEXT,
  submitted_by    TEXT REFERENCES employees(id),
  submitted_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ble_scan_events (
  id              TEXT PRIMARY KEY,
  vehicle_id      TEXT REFERENCES vehicles(id) NOT NULL,
  beacon_id       TEXT NOT NULL,
  rssi            INTEGER,
  scanned_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ble_bindings (
  id              TEXT PRIMARY KEY,
  vehicle_id      TEXT REFERENCES vehicles(id) NOT NULL,
  generator_id    TEXT REFERENCES generators(id) NOT NULL,
  beacon_id       TEXT NOT NULL,
  bound_at        TEXT DEFAULT (datetime('now')),
  unbound_at      TEXT,
  is_current      INTEGER DEFAULT 1,
  UNIQUE(vehicle_id, generator_id)
);

CREATE TABLE IF NOT EXISTS geofences (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  geofence_type   TEXT NOT NULL DEFAULT 'client_site',
  latitude        REAL NOT NULL,
  longitude       REAL NOT NULL,
  radius_m        INTEGER NOT NULL DEFAULT 100,
  client_site_id  TEXT REFERENCES client_sites(id),
  is_active       INTEGER DEFAULT 1,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS geofence_events (
  id              TEXT PRIMARY KEY,
  geofence_id     TEXT REFERENCES geofences(id) NOT NULL,
  vehicle_id      TEXT REFERENCES vehicles(id) NOT NULL,
  event_type      TEXT NOT NULL CHECK(event_type IN ('entry','exit','dwell')),
  gps_lat         REAL,
  gps_lon         REAL,
  event_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle_telemetry (
  id              TEXT PRIMARY KEY,
  vehicle_id      TEXT REFERENCES vehicles(id) NOT NULL,
  gps_lat         REAL,
  gps_lon         REAL,
  speed_kmh       REAL,
  engine_rpm      INTEGER,
  fuel_level_pct  REAL,
  engine_hours    REAL,
  odometer_km     REAL,
  dtc_codes       TEXT,
  ignition_on     INTEGER,
  recorded_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staging_fuel_logs (
  id                  TEXT PRIMARY KEY,
  fleet_cloud_id      TEXT,
  vehicle_id          TEXT,
  litres              REAL,
  gps_coords          TEXT,
  card_ref            TEXT,
  recorded_at         TEXT,
  status              TEXT DEFAULT 'pending' CHECK(status IN ('pending','validated','error')),
  error_message       TEXT,
  synced_at           TEXT,
  created_at          TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staging_delivery_orders (
  id                  TEXT PRIMARY KEY,
  fleet_cloud_id      TEXT,
  trip_job_id         TEXT,
  client_name         TEXT,
  site_address        TEXT,
  generator_serial    TEXT,
  signature_b64       TEXT,
  photo_urls          TEXT DEFAULT '[]',
  status              TEXT DEFAULT 'pending' CHECK(status IN ('pending','validated','error')),
  error_message       TEXT,
  synced_at           TEXT,
  created_at          TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staging_asset_updates (
  id                  TEXT PRIMARY KEY,
  asset_type          TEXT NOT NULL,
  asset_id            TEXT,
  gps_coords          TEXT,
  last_known_location TEXT,
  status              TEXT DEFAULT 'pending' CHECK(status IN ('pending','validated','error')),
  error_message       TEXT,
  synced_at           TEXT,
  created_at          TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staging_mileage (
  id                  TEXT PRIMARY KEY,
  vehicle_id          TEXT,
  odometer_km         REAL,
  engine_hours        REAL,
  reading_at          TEXT,
  status              TEXT DEFAULT 'pending' CHECK(status IN ('pending','validated','error')),
  error_message       TEXT,
  synced_at           TEXT,
  created_at          TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id              TEXT PRIMARY KEY,
  table_name      TEXT NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_success  INTEGER DEFAULT 0,
  records_error    INTEGER DEFAULT 0,
  started_at      TEXT,
  completed_at    TEXT,
  status          TEXT DEFAULT 'completed'
);

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  username        TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  employee_id     TEXT REFERENCES employees(id),
  role            TEXT NOT NULL DEFAULT 'viewer',
  is_active       INTEGER DEFAULT 1,
  last_login_at   TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- SQLite doesn't support CREATE INDEX IF NOT EXISTS per-index,
-- so we use a simple approach: try and ignore errors.
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_generators_status ON generators(status);
CREATE INDEX IF NOT EXISTS idx_trip_jobs_status ON trip_jobs(status);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle ON fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_ble_bindings_current ON ble_bindings(is_current);
