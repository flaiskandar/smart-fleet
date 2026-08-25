-- Fuel anomaly demo scenarios (pairs with seed.sqlite.sql vehicles)
-- v6 = B 1111 PQR: excess_consumption (90L over 50km) + possible_drain (74% -> 48%, only 8L)
-- v2 = B 5678 DEF: high_volume (130L fill)

INSERT OR IGNORE INTO fuel_logs (id, vehicle_id, litres, cost, location, odometer_km, probe_reading_pct, card_provider, card_transaction_ref, recorded_at) VALUES
('fl0000019-0000-0000-0000-000000000019','v0000006-0000-0000-0000-000000000006',40,152,'Shell Klang',122000,75,NULL,NULL,'2026-08-19 09:00:00'),
('fl0000020-0000-0000-0000-000000000020','v0000006-0000-0000-0000-000000000006',90,342,'Petron Shah Alam',122050,74,NULL,NULL,'2026-08-22 15:30:00'),
('fl0000021-0000-0000-0000-000000000021','v0000006-0000-0000-0000-000000000006',8,31,'Caltex KL',NULL,48,NULL,NULL,'2026-08-23 08:15:00'),
('fl0000022-0000-0000-0000-000000000022','v0000002-0000-0000-0000-000000000002',130,494,'Petron Port Dickson',98400,NULL,'Petron Fleet','PCX-88123','2026-08-20 11:45:00');
