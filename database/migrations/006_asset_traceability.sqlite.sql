-- Asset Binding History (Vehicle <-> Generator pairings)
CREATE TABLE IF NOT EXISTS asset_bindings (
  id                  TEXT PRIMARY KEY,
  vehicle_id          TEXT REFERENCES vehicles(id) NOT NULL,
  generator_id        TEXT REFERENCES generators(id) NOT NULL,
  paired_at           TEXT NOT NULL DEFAULT (datetime('now')),
  unpaired_at         TEXT,
  paired_by_user_id   TEXT REFERENCES users(id),
  unpaired_by_user_id TEXT REFERENCES users(id),
  notes               TEXT,
  is_current          INTEGER DEFAULT 1,
  created_at          TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_asset_bindings_vehicle ON asset_bindings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_asset_bindings_generator ON asset_bindings(generator_id);
CREATE INDEX IF NOT EXISTS idx_asset_bindings_current ON asset_bindings(is_current);

-- Component Tracking (Alternators, Engines, Controllers, etc.)
CREATE TABLE IF NOT EXISTS generator_components (
  id              TEXT PRIMARY KEY,
  generator_id    TEXT REFERENCES generators(id) NOT NULL,
  component_type  TEXT NOT NULL CHECK(component_type IN ('alternator','engine','controller','radiator','fuel_pump','starter_motor','voltage_regulator','battery_charger','other')),
  serial_number   TEXT,
  manufacturer    TEXT,
  model           TEXT,
  installed_at    TEXT NOT NULL DEFAULT (datetime('now')),
  removed_at      TEXT,
  installed_by_user_id TEXT REFERENCES users(id),
  removed_by_user_id   TEXT REFERENCES users(id),
  status          TEXT DEFAULT 'active' CHECK(status IN ('active','removed','failed','in_storage')),
  operating_hours_at_install REAL,
  operating_hours_at_removal REAL,
  notes           TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_components_generator ON generator_components(generator_id);
CREATE INDEX IF NOT EXISTS idx_components_type ON generator_components(component_type);
CREATE INDEX IF NOT EXISTS idx_components_status ON generator_components(status);

-- Vehicle Component Tracking (Engines, Transmissions, etc.)
CREATE TABLE IF NOT EXISTS vehicle_components (
  id              TEXT PRIMARY KEY,
  vehicle_id      TEXT REFERENCES vehicles(id) NOT NULL,
  component_type  TEXT NOT NULL CHECK(component_type IN ('engine','transmission','turbo','alternator','starter','radiator','fuel_injection_pump','ecu','other')),
  serial_number   TEXT,
  manufacturer    TEXT,
  model           TEXT,
  installed_at    TEXT NOT NULL DEFAULT (datetime('now')),
  removed_at      TEXT,
  installed_by_user_id TEXT REFERENCES users(id),
  removed_by_user_id   TEXT REFERENCES users(id),
  status          TEXT DEFAULT 'active' CHECK(status IN ('active','removed','failed','in_storage')),
  mileage_at_install REAL,
  mileage_at_removal REAL,
  notes           TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vehicle_components_vehicle ON vehicle_components(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_components_type ON vehicle_components(component_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_components_status ON vehicle_components(status);

-- Maintenance Events (for both generators and vehicles)
CREATE TABLE IF NOT EXISTS maintenance_events (
  id              TEXT PRIMARY KEY,
  asset_type      TEXT NOT NULL CHECK(asset_type IN ('generator','vehicle')),
  asset_id        TEXT NOT NULL,
  event_type      TEXT NOT NULL CHECK(event_type IN ('scheduled','breakdown','inspection','repair','overhaul','commissioning','decommissioning')),
  title           TEXT NOT NULL,
  description     TEXT,
  started_at      TEXT NOT NULL,
  completed_at    TEXT,
  performed_by_user_id TEXT REFERENCES users(id),
  performed_by_contractor TEXT,
  cost_myr        REAL,
  parts_replaced  TEXT, -- JSON array of component IDs or descriptions
  meter_reading   REAL, -- operating hours or km
  next_due_at     TEXT,
  status          TEXT DEFAULT 'planned' CHECK(status IN ('planned','in_progress','completed','cancelled')),
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON maintenance_events(asset_type, asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_type ON maintenance_events(event_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_events(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_dates ON maintenance_events(started_at);

-- Generator Operating Hours Log (from telemetry/fuel logs)
CREATE TABLE IF NOT EXISTS generator_hour_logs (
  id              TEXT PRIMARY KEY,
  generator_id    TEXT REFERENCES generators(id) NOT NULL,
  recorded_at     TEXT NOT NULL DEFAULT (datetime('now')),
  operating_hours REAL NOT NULL,
  recorded_by_user_id TEXT REFERENCES users(id),
  source          TEXT DEFAULT 'manual' CHECK(source IN ('manual','telemetry','fuel_probe')),
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_gen_hours_generator ON generator_hour_logs(generator_id);
CREATE INDEX IF NOT EXISTS idx_gen_hours_recorded ON generator_hour_logs(recorded_at);

-- Vehicle Odometer Logs
CREATE TABLE IF NOT EXISTS vehicle_odometer_logs (
  id              TEXT PRIMARY KEY,
  vehicle_id      TEXT REFERENCES vehicles(id) NOT NULL,
  recorded_at     TEXT NOT NULL DEFAULT (datetime('now')),
  odometer_km     REAL NOT NULL,
  recorded_by_user_id TEXT REFERENCES users(id),
  source          TEXT DEFAULT 'manual' CHECK(source IN ('manual','telemetry','fuel_card')),
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_veh_odometer_vehicle ON vehicle_odometer_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_veh_odometer_recorded ON vehicle_odometer_logs(recorded_at);