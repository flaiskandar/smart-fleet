CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'dispatcher', 'finance', 'viewer')),
  name TEXT,
  email TEXT,
  is_active INTEGER DEFAULT 1,
  employee_id TEXT,
  last_login_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('driver', 'chargeman', 'admin', 'office')),
  phone TEXT,
  email TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  billing_address TEXT,
  short_code TEXT,
  tin TEXT,
  sst_reg_no TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS client_sites (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  name TEXT NOT NULL,
  address TEXT,
  latitude REAL,
  longitude REAL,
  geofence_radius_m REAL DEFAULT 100,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  plate_no TEXT UNIQUE NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('prime_mover', 'crane_truck', 'low_loader', 'service_van')),
  make_model TEXT NOT NULL,
  year INTEGER,
  can_bus_supported INTEGER DEFAULT 0,
  tank_capacity_l REAL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  driver_id TEXT,
  driver_name TEXT,
  chargeman_id TEXT,
  chargeman_name TEXT,
  current_odometer_km REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS generators (
  id TEXT PRIMARY KEY,
  serial_no TEXT UNIQUE NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  power_kva REAL NOT NULL,
  voltage_rating TEXT,
  fuel_type TEXT DEFAULT 'diesel',
  ble_beacon_id TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'deployed', 'maintenance', 'retired')),
  current_vehicle_id TEXT REFERENCES vehicles(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS trip_jobs (
  id TEXT PRIMARY KEY,
  job_number TEXT UNIQUE NOT NULL,
  client_id TEXT REFERENCES clients(id),
  site_id TEXT REFERENCES client_sites(id),
  site_address TEXT,
  job_type TEXT NOT NULL CHECK (job_type IN ('emergency', 'planned_shutdown', 'standby_contract')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'en_route', 'on_site', 'completed', 'cancelled', 'interrupted')),
  vehicle_id TEXT REFERENCES vehicles(id),
  generator_id TEXT REFERENCES generators(id),
  driver_id TEXT,
  chargeman_id TEXT,
  sla_minutes INTEGER DEFAULT 60,
  dispatched_at TEXT,
  site_arrival_at TEXT,
  completed_at TEXT,
  interrupted_reason TEXT,
  interrupted_at TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  notes TEXT,
  revenue_amount REAL,
  revenue_currency TEXT DEFAULT 'MYR',
  invoice_number TEXT,
  invoice_status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS fuel_logs (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT REFERENCES vehicles(id),
  trip_job_id TEXT,
  litres REAL NOT NULL,
  cost REAL,
  location TEXT,
  odometer_km REAL,
  anomaly_type TEXT,
  probe_reading_pct REAL,
  gps_lat REAL,
  gps_lon REAL,
  card_transaction_ref TEXT,
  card_provider TEXT,
  recorded_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS geofences (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  geofence_type TEXT DEFAULT 'client_site',
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  radius_meters REAL NOT NULL,
  radius_m REAL,
  client_id TEXT REFERENCES clients(id),
  client_site_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS geofence_events (
  id TEXT PRIMARY KEY,
  geofence_id TEXT REFERENCES geofences(id),
  vehicle_id TEXT REFERENCES vehicles(id),
  event_type TEXT NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT NOT NULL,
  message TEXT,
  body TEXT,
  type TEXT DEFAULT 'info',
  ref_table TEXT,
  ref_id TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle_telemetry (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT REFERENCES vehicles(id),
  gps_lat REAL,
  gps_lon REAL,
  speed_kmh REAL,
  fuel_level_pct REAL,
  ignition_on INTEGER DEFAULT 0,
  recorded_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ble_bindings (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT REFERENCES vehicles(id),
  generator_id TEXT REFERENCES generators(id),
  is_current INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pod_records (
  id TEXT PRIMARY KEY,
  trip_job_id TEXT REFERENCES trip_jobs(id),
  signature_data TEXT,
  photo_urls TEXT,
  notes TEXT,
  submitted_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staging_fuel_logs (
  id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staging_delivery_orders (
  id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staging_asset_updates (
  id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY,
  started_at TEXT,
  completed_at TEXT,
  status TEXT,
  records_synced INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS job_interrupts (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES trip_jobs(id),
  reason TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS asset_bindings (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT REFERENCES vehicles(id),
  generator_id TEXT REFERENCES generators(id),
  paired_at TEXT DEFAULT (datetime('now')),
  paired_by_user_id TEXT,
  unpaired_at TEXT,
  unpaired_by_user_id TEXT,
  is_current INTEGER DEFAULT 1,
  notes TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS generator_components (
  id TEXT PRIMARY KEY,
  generator_id TEXT REFERENCES generators(id),
  component_type TEXT NOT NULL,
  serial_number TEXT,
  manufacturer TEXT,
  model TEXT,
  installed_at TEXT,
  installed_by_user_id TEXT,
  removed_at TEXT,
  removed_by_user_id TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  updated_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle_components (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT REFERENCES vehicles(id),
  component_type TEXT NOT NULL,
  serial_number TEXT,
  manufacturer TEXT,
  model TEXT,
  installed_at TEXT,
  installed_by_user_id TEXT,
  removed_at TEXT,
  removed_by_user_id TEXT,
  status TEXT DEFAULT 'active',
  mileage_at_install REAL,
  notes TEXT,
  updated_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS maintenance_events (
  id TEXT PRIMARY KEY,
  asset_type TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  event_type TEXT,
  title TEXT,
  description TEXT,
  started_at TEXT,
  completed_at TEXT,
  performed_by_user_id TEXT,
  performed_by_contractor TEXT,
  cost_myr REAL,
  parts_replaced TEXT,
  meter_reading REAL,
  next_due_at TEXT,
  status TEXT DEFAULT 'planned',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS generator_hour_logs (
  id TEXT PRIMARY KEY,
  generator_id TEXT REFERENCES generators(id),
  hours_run REAL NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle_odometer_logs (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT REFERENCES vehicles(id),
  odometer_km REAL NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  quote_number TEXT UNIQUE NOT NULL,
  client_id TEXT REFERENCES clients(id),
  client_name TEXT,
  vehicle_id TEXT,
  vehicle_desc TEXT,
  generator_id TEXT,
  generator_desc TEXT,
  job_type TEXT DEFAULT 'standby_contract',
  duration_months INTEGER DEFAULT 1,
  rate_per_month REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  deposit_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  notes TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT,
  status_changed_by TEXT,
  status_changed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS job_photos (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES trip_jobs(id),
  filename TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);