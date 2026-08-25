import fs from 'fs';
const seedPath = 'C:\\Users\\LENOVO\\Downloads\\express_power\\backend\\database\\seeds\\seed.sqlite.sql';

const moreSeed = `
INSERT OR IGNORE INTO generators (id, serial_no, brand, model, power_kva, voltage_rating, fuel_type, ble_beacon_id, status) VALUES
('g0000001-0000-0000-0000-000000000001', 'GEN-001', 'Caterpillar', 'C15 ACERT', 500, '380V/220V', 'diesel', 'BLE-GEN-001', 'available'),
('g0000002-0000-0000-0000-000000000002', 'GEN-002', 'Cummins', 'QSK60-G7', 450, '380V/220V', 'diesel', 'BLE-GEN-002', 'available'),
('g0000003-0000-0000-0000-000000000003', 'GEN-003', 'Komatsu', 'S6D125-HD', 350, '380V/220V', 'diesel', 'BLE-GEN-003', 'available'),
('g0000004-0000-0000-0000-000000000004', 'GEN-004', 'Perkins', '2806C-E1C', 280, '380V/220V', 'diesel', 'BLE-GEN-004', 'available'),
('g0000005-0000-0000-0000-000000000005', 'GEN-005', 'Caterpillar', 'C9 ACERT', 250, '380V/220V', 'diesel', 'BLE-GEN-005', 'deployed'),
('g0000006-0000-0000-0000-000000000006', 'GEN-006', 'Cummins', 'QSL9-G7', 220, '380V/220V', 'diesel', 'BLE-GEN-006', 'available'),
('g0000007-0000-0000-0000-000000000007', 'GEN-007', 'Doosan', 'DG2700-D', 180, '380V/220V', 'diesel', 'BLE-GEN-007', 'available'),
('g0000008-0000-0000-0000-000000000008', 'GEN-008', 'Kubota', 'GK2000-E3', 150, '380V/220V', 'diesel', 'BLE-GEN-008', 'available'),
('g0000009-0000-0000-0000-000000000009', 'GEN-009', 'Yanmar', 'L70H', 50, '380V/220V', 'diesel', 'BLE-GEN-009', 'maintenance'),
('g0000010-0000-0000-0000-000000000010', 'GEN-010', 'Honda', 'EG3400CXS', 30, '220V', 'petrol', 'BLE-GEN-010', 'available'),
('g0000011-0000-0000-0000-000000000011', 'GEN-011', 'Daihatsu', 'FC-3000', 30, '220V', 'petrol', 'BLE-GEN-011', 'available');

INSERT OR IGNORE INTO fuel_logs (id, vehicle_id, litres, cost, location, odometer_km, anomaly_type, recorded_at) VALUES
('f0000001-0000-0000-0000-000000000001', 'v0000001-0000-0000-0000-000000000001', 85, 340, 'Port Klang Depot', 12450, NULL, datetime('now')),
('f0000002-0000-0000-0000-000000000002', 'v0000002-0000-0000-0000-000000000002', 92, 368, 'Shah Alam Fuel Station', 8730, 'high_volume', datetime('now')),
('f0000003-0000-0000-0000-000000000003', 'v0000003-0000-0000-0000-000000000003', 60, 240, 'Klang Valley Depot', 15200, NULL, datetime('now'));

INSERT OR IGNORE INTO geofences (id, name, latitude, longitude, radius_meters, client_id) VALUES
('gf0000001-0000-0000-0000-000000000001', 'Port Klang Zone', 3.0017, 101.3922, 5000, 'c0000001-0000-0000-0000-000000000001'),
('gf0000002-0000-0000-0000-000000000002', 'Shah Alam Zone', 3.0083, 101.5289, 5000, 'c0000002-0000-0000-0000-000000000002'),
('gf0000003-0000-0000-0000-000000000003', 'KLCC Zone', 3.1500, 101.7100, 3000, 'c0000003-0000-0000-0000-000000000003');

INSERT OR IGNORE INTO trip_jobs (id, job_number, client_id, site_id, site_address, job_type, status, vehicle_id, generator_id, driver_id, sla_minutes, priority, notes, created_at) VALUES
('j0000001-0000-0000-0000-000000000001', 'JOB-2026-001', 'c0000001-0000-0000-0000-000000000001', 'cs000001-0000-0000-0000-000000000001', 'Jalan Pelabuhan Utara, Port Klang', 'emergency', 'dispatched', 'v0000001-0000-0000-0000-000000000001', 'g0000005-0000-0000-0000-000000000005', 'u0000002-0000-0000-0000-000000000002', 120, 'critical', 'Urgent power outage at Port Klang Power Station', datetime('now', '-2 days')),
('j0000002-0000-0000-0000-000000000002', 'JOB-2026-002', 'c0000002-0000-0000-0000-000000000002', 'cs000002-0000-0000-0000-000000000002', 'Jalan Bukit Kemuning, Shah Alam', 'standby_contract', 'completed', 'v0000002-0000-0000-0000-000000000002', 'g0000006-0000-0000-0000-000000000006', 'u0000002-0000-0000-0000-000000000002', 240, 'normal', 'Standby contract for Shah Alam Substations', datetime('now', '-5 days')),
('j0000003-0000-0000-0000-000000000003', 'JOB-2026-003', 'c0000003-0000-0000-0000-000000000003', 'cs000003-0000-0000-0000-000000000003', 'Jalan Tun Razak, Kuala Lumpur', 'planned_shutdown', 'pending', NULL, 'g0000003-0000-0000-0000-000000000003', NULL, 180, 'high', 'Planned maintenance shutdown - TNB HQ', datetime('now', '-1 day')),
('j0000004-0000-0000-0000-000000000004', 'JOB-2026-004', 'c0000004-0000-0000-0000-000000000004', 'cs000004-0000-0000-0000-000000000004', 'Kerteh Industrial Area, Terengganu', 'emergency', 'en_route', 'v0000003-0000-0000-0000-000000000003', 'g0000007-0000-0000-0000-000000000007', 'u0000002-0000-0000-0000-000000000002', 60, 'critical', 'Emergency power at Petronas Refinery - dispatch en route', datetime('now', '-1 hour'));
`;

fs.appendFileSync(seedPath, moreSeed);
console.log('Seed data extended');