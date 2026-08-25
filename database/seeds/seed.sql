-- Express Powerr Solutions - Seed Data (PostgreSQL)
-- Uses ON CONFLICT DO NOTHING for idempotent inserts

INSERT INTO clients (id, name, short_code, tin, sst_reg_no) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Tenaga Nasional Berhad', 'TNB', 'C1234567890', 'SST-0012345'),
  ('c0000001-0000-0000-0000-000000000002', 'Sabah Electricity Sdn Bhd', 'SESB', 'C0987654321', 'SST-0054321'),
  ('c0000001-0000-0000-0000-000000000003', 'Sime Darby Industrial', 'SDI', 'C1122334455', 'SST-0098765')
ON CONFLICT (id) DO NOTHING;

INSERT INTO client_sites (id, client_id, name, address, latitude, longitude, geofence_radius_m) VALUES
  ('s0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'TNB Paka Power Plant', 'Paka, Terengganu', 4.6234, 103.4210, 200),
  ('s0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'TNB Connaught Bridge', 'Klang, Selangor', 3.0500, 101.4500, 150),
  ('s0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000002', 'SESB Kota Kinabalu', 'KK, Sabah', 5.9800, 116.0800, 150),
  ('s0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000003', 'Sime Darby Bukit Raja', 'Bukit Raja, Klang', 3.0700, 101.4300, 100)
ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicles (id, plate_no, vehicle_type, make_model, year, can_bus_supported, tank_capacity_l) VALUES
  ('v0000001-0000-0000-0000-000000000001', 'WXX 1234', 'prime_mover',   'Scania R460',        2022, true,  400),
  ('v0000001-0000-0000-0000-000000000002', 'WXX 5678', 'prime_mover',   'Volvo FH500',         2021, true,  450),
  ('v0000001-0000-0000-0000-000000000003', 'WXX 9012', 'crane_truck',   'Hino 700 Series',     2023, true,  300),
  ('v0000001-0000-0000-0000-000000000004', 'WXX 3456', 'crane_truck',   'Isuzu Giga',          2020, true,  280),
  ('v0000001-0000-0000-0000-000000000005', 'WXX 7890', 'low_loader',    'Trailer (40ft)',      2022, false, NULL),
  ('v0000001-0000-0000-0000-000000000006', 'WXX 2345', 'low_loader',    'Trailer (20ft)',      2021, false, NULL),
  ('v0000001-0000-0000-0000-000000000007', 'WXX 6789', 'service_van',   'Toyota Hiace',        2023, false, 70),
  ('v0000001-0000-0000-0000-000000000008', 'WXX 0123', 'service_van',   'Mitsubishi L300',     2019, false, 55)
ON CONFLICT (id) DO NOTHING;

INSERT INTO generators (id, serial_no, brand, model, voltage_rating, power_kva, ble_beacon_id, status) VALUES
  ('g0000001-0000-0000-0000-000000000001', 'CAT-C15-001',  'Caterpillar', 'C15',     '415V/3Ph', 500, 'GEN-BEACON-A001', 'available'),
  ('g0000001-0000-0000-0000-000000000002', 'CAT-C18-002',  'Caterpillar', 'C18',     '415V/3Ph', 600, 'GEN-BEACON-A002', 'available'),
  ('g0000001-0000-0000-0000-000000000003', 'PER-401-003',  'Perkins',     '401A',    '230V/1Ph', 40,  'GEN-BEACON-B001', 'deployed'),
  ('g0000001-0000-0000-0000-000000000004', 'PER-1106-004', 'Perkins',     '1106A',   '415V/3Ph', 250, 'GEN-BEACON-B002', 'available'),
  ('g0000001-0000-0000-0000-000000000005', 'KOH-100RE-005','Kohler',      '100RE',   '415V/3Ph', 100, 'GEN-BEACON-C001', 'available'),
  ('g0000001-0000-0000-0000-000000000006', 'KOH-200RE-006','Kohler',      '200RE',   '415V/3Ph', 200, 'GEN-BEACON-C002', 'maintenance'),
  ('g0000001-0000-0000-0000-000000000007', 'CAT-3512-007', 'Caterpillar', '3512',    '11kV/HV', 1500,'GEN-BEACON-A003', 'available'),
  ('g0000001-0000-0000-0000-000000000008', 'DEN-600-008',  'Denyo',       'DL600',   '415V/3Ph', 600, 'GEN-BEACON-D001', 'retired'),
  ('g0000001-0000-0000-0000-000000000009', 'CAT-C9-009',   'Caterpillar', 'C9',      '415V/3Ph', 350, 'GEN-BEACON-A004', 'available'),
  ('g0000001-0000-0000-0000-000000000010', 'PER-403-010',  'Perkins',     '403A',    '230V/1Ph', 30,  'GEN-BEACON-B003', 'available')
ON CONFLICT (id) DO NOTHING;

INSERT INTO employees (id, name, role, cert_number, phone, email) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'Ahmad bin Ismail',    'driver',       'CDL-12345', '012-3456789', 'ahmad@expresspowerr.my'),
  ('e0000001-0000-0000-0000-000000000002', 'Rajan a/l Muthu',     'engine_driver','ED-23456',  '013-4567890', 'rajan@expresspowerr.my'),
  ('e0000001-0000-0000-0000-000000000003', 'Michael Wong',        'chargeman',    'CH-34567',  '014-5678901', 'mwong@expresspowerr.my'),
  ('e0000001-0000-0000-0000-000000000004', 'Sharma Krishnan',     'driver',       'CDL-45678', '015-6789012', 'sharma@expresspowerr.my'),
  ('e0000001-0000-0000-0000-000000000005', 'Fatimah binti Aziz',  'chargeman',    'CH-56789',  '016-7890123', 'fatimah@expresspowerr.my'),
  ('e0000001-0000-0000-0000-000000000006', 'Tan Chee Meng',       'fleet_manager','FM-67890',  '017-8901234', 'tan@expresspowerr.my'),
  ('e0000001-0000-0000-0000-000000000007', 'Siti Nurshahira',     'dispatcher',   'DP-78901',  '018-9012345', 'siti@expresspowerr.my')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, username, password_hash, employee_id, role) VALUES
  ('u0000001-0000-0000-0000-000000000001', 'admin',
   '$2b$10$SJbZtCVXiQt/tm0UkTlzzeW5cGfX5PwyJRXp1fpWMwqHcpmRB8mUC',
   'e0000001-0000-0000-0000-000000000006', 'super_admin'),
  ('u0000001-0000-0000-0000-000000000002', 'dispatcher',
   '$2b$10$SJbZtCVXiQt/tm0UkTlzzeW5cGfX5PwyJRXp1fpWMwqHcpmRB8mUC',
   'e0000001-0000-0000-0000-000000000007', 'dispatcher'),
  ('u0000001-0000-0000-0000-000000000003', 'finance',
   '$2b$10$SJbZtCVXiQt/tm0UkTlzzeW5cGfX5PwyJRXp1fpWMwqHcpmRB8mUC',
   NULL, 'finance')
ON CONFLICT (id) DO NOTHING;

INSERT INTO geofences (id, name, geofence_type, latitude, longitude, radius_m, client_site_id) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'TNB Paka',    'client_site', 4.6234, 103.4210, 200, 's0000001-0000-0000-0000-000000000001'),
  ('f0000001-0000-0000-0000-000000000002', 'TNB Connaught','client_site',3.0500, 101.4500, 150, 's0000001-0000-0000-0000-000000000002'),
  ('f0000001-0000-0000-0000-000000000003', 'SESB KK',      'client_site',5.9800, 116.0800, 150, 's0000001-0000-0000-0000-000000000003'),
  ('f0000001-0000-0000-0000-000000000004', 'Express Powerr Klang Depot', 'depot', 3.0400, 101.4200, 100, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO trip_jobs (id, job_number, client_id, site_id, site_address, job_type, status,
    sla_minutes, vehicle_id, generator_id, driver_id, chargeman_id,
    dispatched_at, site_arrival_at, completed_at) VALUES
  ('j0000001-0000-0000-0000-000000000001', 'JOB-2026-0001',
   'c0000001-0000-0000-0000-000000000001', 's0000001-0000-0000-0000-000000000002',
   'TNB Connaught Bridge, Klang', 'emergency', 'completed', 60,
   'v0000001-0000-0000-0000-000000000001', 'g0000001-0000-0000-0000-000000000001',
   'e0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000003',
   '2026-07-15 08:30:00+08', '2026-07-15 09:15:00+08', '2026-07-15 14:00:00+08'),
  ('j0000001-0000-0000-0000-000000000002', 'JOB-2026-0002',
   'c0000001-0000-0000-0000-000000000001', 's0000001-0000-0000-0000-000000000001',
   'TNB Paka Power Plant, Terengganu', 'planned_shutdown', 'dispatched', 120,
   'v0000001-0000-0000-0000-000000000003', 'g0000001-0000-0000-0000-000000000007',
   'e0000001-0000-0000-0000-000000000004', 'e0000001-0000-0000-0000-000000000005',
   '2026-07-23 06:00:00+08', NULL, NULL),
  ('j0000001-0000-0000-0000-000000000003', 'JOB-2026-0003',
   'c0000001-0000-0000-0000-000000000003', 's0000001-0000-0000-0000-000000000004',
   'Sime Darby Bukit Raja', 'standby_contract', 'pending', NULL,
   NULL, NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fuel_logs (id, vehicle_id, trip_job_id, litres, probe_reading_pct, gps_lat, gps_lon,
    card_transaction_ref, card_provider, recorded_at) VALUES
  ('fl000001-0000-0000-0000-000000000001', 'v0000001-0000-0000-0000-000000000001',
   'j0000001-0000-0000-0000-000000000001', 120.5, 75.0, 3.0500, 101.4500,
   'PETRONAS-20260715-001', 'Petronas', '2026-07-15 08:45:00+08'),
  ('fl000001-0000-0000-0000-000000000002', 'v0000001-0000-0000-0000-000000000001',
   'j0000001-0000-0000-0000-000000000001', 80.0, 45.0, 3.0510, 101.4510,
   'PETRONAS-20260715-002', 'Petronas', '2026-07-15 12:30:00+08'),
  ('fl000001-0000-0000-0000-000000000003', 'v0000001-0000-0000-0000-000000000003',
   'j0000001-0000-0000-0000-000000000002', 150.0, 90.0, 4.6234, 103.4210,
   'SHELL-20260723-001', 'Shell', '2026-07-23 07:15:00+08')
ON CONFLICT (id) DO NOTHING;

INSERT INTO geofence_events (id, geofence_id, vehicle_id, event_type, gps_lat, gps_lon, event_at) VALUES
  ('ge000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000002',
   'v0000001-0000-0000-0000-000000000001', 'entry', 3.0500, 101.4500, '2026-07-15 09:10:00+08'),
  ('ge000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000002',
   'v0000001-0000-0000-0000-000000000001', 'exit',  3.0510, 101.4510, '2026-07-15 14:05:00+08')
ON CONFLICT (id) DO NOTHING;
