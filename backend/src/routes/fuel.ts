import { FastifyInstance } from 'fastify';
import { query } from '../lib/db.js';

export default async function fuelRoutes(app: FastifyInstance) {
  app.post('/fuel/logs', { preHandler: [app.authenticate] }, async (request, reply) => {
    const data = request.body as any;
    const result = await query(
      `INSERT INTO fuel_logs (vehicle_id, trip_job_id, litres, cost, location, odometer_km, probe_reading_pct, gps_lat, gps_lon,
        card_transaction_ref, card_provider, recorded_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [data.vehicle_id, data.trip_job_id, data.litres, data.cost, data.location,
       data.odometer_km, data.probe_reading_pct, data.gps_lat, data.gps_lon,
       data.card_transaction_ref, data.card_provider,
       data.recorded_at || new Date().toISOString()]
    );
    return reply.status(201).send(result.rows[0]);
  });

  app.get('/fuel/logs', { preHandler: [app.authenticate] }, async (request) => {
    const { vehicle_id, from, to } = request.query as { vehicle_id?: string; from?: string; to?: string };
    let sql = `SELECT fl.*, v.plate_no FROM fuel_logs fl
               JOIN vehicles v ON fl.vehicle_id = v.id WHERE 1=1`;
    const params: any[] = [];
    if (vehicle_id) { sql += ' AND fl.vehicle_id = $' + (params.length + 1); params.push(vehicle_id); }
    if (from) { sql += ' AND fl.recorded_at >= $' + (params.length + 1); params.push(from); }
    if (to) { sql += ' AND fl.recorded_at <= $' + (params.length + 1); params.push(to); }
    sql += ' ORDER BY fl.recorded_at DESC LIMIT 200';
    const result = await query(sql, params);
    return { fuel_logs: result.rows };
  });

  app.get('/fuel/anomalies', { preHandler: [app.authenticate] }, async () => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const res = await query(
      `SELECT fl.*, v.plate_no, v.vehicle_type FROM fuel_logs fl
       JOIN vehicles v ON fl.vehicle_id = v.id
       WHERE fl.recorded_at > $1
       ORDER BY v.id, fl.recorded_at ASC`,
      [since]
    );
    const BASELINE: Record<string, number> = { lorry: 28, truck: 30, van: 14, 'panel van': 14, pickup: 12 };
    const byVehicle = new Map<string, any[]>();
    for (const row of res.rows) {
      const arr = byVehicle.get(row.vehicle_id) || [];
      arr.push(row);
      byVehicle.set(row.vehicle_id, arr);
    }
    const out: any[] = [];
    for (const logs of byVehicle.values()) {
      let prev: any = null;
      for (const cur of logs) {
        const push = (anomaly_type: string, severity: string, detail: string) =>
          out.push({ id: `${cur.id}:${anomaly_type}`, fuel_log_id: cur.id, vehicle_id: cur.vehicle_id,
            plate_no: cur.plate_no, recorded_at: cur.recorded_at, litres: cur.litres, cost: cur.cost,
            odometer_km: cur.odometer_km, anomaly_type, severity, detail });
        if (cur.litres > 100)
          push('high_volume', 'medium', `Fill of ${cur.litres}L exceeds a typical tank transaction (>100L).`);
        else if (cur.litres > 0 && cur.litres < 5)
          push('low_volume', 'low', `Only ${cur.litres}L recorded — check for partial fill or card skimming.`);
        if (prev) {
          if (cur.odometer_km != null && prev.odometer_km != null) {
            if (cur.odometer_km < prev.odometer_km) {
              push('odometer_rollback', 'high',
                `Odometer went backwards ${(prev.odometer_km - cur.odometer_km).toFixed(0)} km (${prev.odometer_km.toLocaleString()} → ${cur.odometer_km.toLocaleString()} km). Possible tampering.`);
            } else {
              const km = cur.odometer_km - prev.odometer_km;
              const baseline = BASELINE[String(cur.vehicle_type || '').toLowerCase()] ?? 22;
              const expected = (km / 100) * baseline;
              const excess = cur.litres - expected;
              if (km >= 10 && expected > 0 && excess > 10 && excess / expected > 0.3)
                push('excess_consumption', 'high',
                  `${cur.litres}L over only ${km.toFixed(0)} km — expected ~${expected.toFixed(0)}L at ${baseline}L/100km. +${excess.toFixed(0)}L unaccounted for.`);
            }
          } else if (cur.probe_reading_pct != null && prev.probe_reading_pct != null) {
            const drop = prev.probe_reading_pct - cur.probe_reading_pct;
            if (drop > 15 && cur.litres < 20)
              push('possible_drain', 'high',
                `Tank level dropped ${drop.toFixed(0)} pts (${prev.probe_reading_pct}% → ${cur.probe_reading_pct}%) but only ${cur.litres}L was purchased.`);
          }
        }
        prev = cur;
      }
    }
    const sevRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const ts = (s: any) => new Date(String(s).replace(' ', 'T')).getTime() || 0;
    out.sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || ts(b.recorded_at) - ts(a.recorded_at));
    return { anomalies: out };
  });

  app.post('/fuel/card/import', { preHandler: [app.authenticate, app.authorize('super_admin', 'finance')] }, async (request, reply) => {
    const { entries } = request.body as { entries: Array<{
      vehicle_id: string; litres: number; card_ref: string; card_provider: string;
      gps_lat?: number; gps_lon?: number; recorded_at?: string;
    }> };
    if (!entries || !Array.isArray(entries)) {
      return reply.status(400).send({ error: 'entries array required' });
    }
    const imported: any[] = [];
    for (const entry of entries) {
      const result = await query(
        `INSERT INTO fuel_logs (vehicle_id, litres, card_transaction_ref, card_provider, gps_lat, gps_lon, recorded_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [entry.vehicle_id, entry.litres, entry.card_ref, entry.card_provider,
         entry.gps_lat, entry.gps_lon, entry.recorded_at || new Date().toISOString()]
      );
      imported.push(result.rows[0]);
    }
    return reply.status(201).send({ imported: imported.length, records: imported });
  });
}
