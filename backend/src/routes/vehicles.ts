import { FastifyInstance } from 'fastify';
import { query } from '../lib/db.js';
import { timeBucket } from '../lib/sql-helpers.js';
import { v4 as uuid } from 'uuid';

export default async function vehicleRoutes(app: FastifyInstance) {
  app.get('/vehicles/locations', { preHandler: [app.authenticate] }, async () => {
    const result = await query(
      `SELECT v.id, v.plate_no, v.vehicle_type, v.make_model, v.status,
              t.gps_lat, t.gps_lon, t.speed_kmh, t.fuel_level_pct, t.ignition_on, t.recorded_at,
              e.name AS driver_name,
              tj.job_number, tj.status AS job_status
       FROM vehicles v
       LEFT JOIN (
         SELECT vehicle_id, gps_lat, gps_lon, speed_kmh, fuel_level_pct, ignition_on, recorded_at,
                ROW_NUMBER() OVER (PARTITION BY vehicle_id ORDER BY recorded_at DESC) AS rn
         FROM vehicle_telemetry
       ) t ON t.vehicle_id = v.id AND t.rn = 1
       LEFT JOIN trip_jobs tj ON tj.vehicle_id = v.id AND tj.status IN ('dispatched','en_route','on_site')
       LEFT JOIN employees e ON e.id = tj.driver_id
       ORDER BY v.plate_no`
    );
    return { locations: result.rows };
  });

  app.get('/vehicles', { preHandler: [app.authenticate] }, async (request) => {
    const { type, status } = request.query as { type?: string; status?: string };
    let sql = 'SELECT * FROM vehicles WHERE 1=1';
    const params: any[] = [];
    if (type) { sql += ' AND vehicle_type = $' + (params.length + 1); params.push(type); }
    if (status) { sql += ' AND status = $' + (params.length + 1); params.push(status); }
    sql += ' ORDER BY plate_no';
    const result = await query(sql, params);
    return { vehicles: result.rows };
  });

  app.get('/vehicles/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await query('SELECT * FROM vehicles WHERE id = $1', [id]);
    if (result.rows.length === 0) return reply.status(404).send({ error: 'Vehicle not found' });
    return result.rows[0];
  });

  app.get('/vehicles/:id/telemetry', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const { from, to } = request.query as { from?: string; to?: string };
    if (from && to) {
      const result = await query(
        `SELECT id, vehicle_id, gps_lat, gps_lon, speed_kmh, fuel_level_pct, ignition_on, recorded_at
         FROM vehicle_telemetry
         WHERE vehicle_id = $1 AND recorded_at BETWEEN $2 AND $3
         ORDER BY recorded_at`,
        [id, from, to]
      );
      return { telemetry: result.rows };
    }
    const result = await query(
      `SELECT id, vehicle_id, gps_lat, gps_lon, speed_kmh, fuel_level_pct, ignition_on, recorded_at
       FROM vehicle_telemetry
       WHERE vehicle_id = $1
       ORDER BY recorded_at`,
      [id]
    );
    return { telemetry: result.rows };
  });

  app.post('/vehicles', { preHandler: [app.authenticate, app.authorize('super_admin', 'fleet_manager')] }, async (request, reply) => {
    const data = request.body as any;
    const id = uuid();
    const result = await query(
      `INSERT INTO vehicles (id, plate_no, vehicle_type, make_model, year, can_bus_supported, tank_capacity_l)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, data.plate_no, data.vehicle_type, data.make_model, data.year, data.can_bus_supported ?? true, data.tank_capacity_l]
    );
    return reply.status(201).send(result.rows[0]);
  });

  app.patch('/vehicles/:id', { preHandler: [app.authenticate, app.authorize('super_admin', 'fleet_manager')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;
    for (const key of ['plate_no', 'vehicle_type', 'make_model', 'year', 'status', 'can_bus_supported', 'tank_capacity_l']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        params.push(data[key]);
      }
    }
    if (fields.length === 0) return reply.status(400).send({ error: 'No fields to update' });
    fields.push(`updated_at = NOW()`);
    params.push(id);
    const result = await query(
      `UPDATE vehicles SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return reply.status(404).send({ error: 'Vehicle not found' });
    return result.rows[0];
  });

  app.delete('/vehicles/:id', { preHandler: [app.authenticate, app.authorize('super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const activeJobs = await query(
      "SELECT COUNT(*) as count FROM trip_jobs WHERE vehicle_id = $1 AND status IN ('dispatched','en_route','on_site')",
      [id]
    );
    if (parseInt(activeJobs.rows[0].count) > 0) {
      return reply.status(400).send({ error: 'Cannot delete vehicle with active jobs' });
    }
    await query('DELETE FROM vehicle_telemetry WHERE vehicle_id = $1', [id]);
    await query('DELETE FROM vehicle_components WHERE vehicle_id = $1', [id]);
    await query('DELETE FROM trip_jobs WHERE vehicle_id = $1', [id]);
    await query('DELETE FROM ble_bindings WHERE vehicle_id = $1', [id]);
    const result = await query('DELETE FROM vehicles WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return reply.status(404).send({ error: 'Vehicle not found' });
    return { message: 'Vehicle deleted' };
  });
}
