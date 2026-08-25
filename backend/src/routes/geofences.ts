import { FastifyInstance } from 'fastify';
import { query, getDbType } from '../lib/db.js';
import { epochDiff } from '../lib/sql-helpers.js';

export default async function geofenceRoutes(app: FastifyInstance) {
  app.post('/geofences', { preHandler: [app.authenticate, app.authorize('super_admin', 'fleet_manager')] }, async (request, reply) => {
    const data = request.body as any;
    const result = await query(
      `INSERT INTO geofences (name, geofence_type, latitude, longitude, radius_m, client_site_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [data.name, data.geofence_type || 'client_site', data.latitude, data.longitude,
       data.radius_m || 100, data.client_site_id]
    );
    return reply.status(201).send(result.rows[0]);
  });

  app.get('/geofences', { preHandler: [app.authenticate] }, async () => {
    const result = await query('SELECT * FROM geofences WHERE is_active = true ORDER BY name');
    return { geofences: result.rows };
  });

  app.get('/geofences/:id/events', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const { from, to } = request.query as { from?: string; to?: string };
    let sql = `SELECT ge.*, v.plate_no
               FROM geofence_events ge
               JOIN vehicles v ON ge.vehicle_id = v.id
               WHERE ge.geofence_id = $1`;
    const params: any[] = [id];
    if (from) { sql += ' AND ge.event_at >= $' + (params.length + 1); params.push(from); }
    if (to) { sql += ' AND ge.event_at <= $' + (params.length + 1); params.push(to); }
    sql += ' ORDER BY ge.event_at DESC LIMIT 200';
    const result = await query(sql, params);
    return { events: result.rows };
  });

  app.get('/sla/reports', { preHandler: [app.authenticate] }, async (request) => {
    const { client_id } = request.query as { client_id?: string };
    const diffMin = epochDiff('tj.site_arrival_at', 'tj.dispatched_at');
    let sql: string;
    if (getDbType() === 'sqlite') {
      sql = `SELECT tj.client_id, c.name AS client_name,
                    COUNT(*) AS total_jobs,
                    COUNT(CASE WHEN tj.site_arrival_at IS NOT NULL
                      AND (${diffMin}) / 60.0 <= tj.sla_minutes THEN 1 END) AS within_sla,
                    ROUND(AVG(${diffMin} / 60.0), 1) AS avg_response_min
             FROM trip_jobs tj
             JOIN clients c ON tj.client_id = c.id
             WHERE tj.dispatched_at IS NOT NULL AND tj.site_arrival_at IS NOT NULL`;
    } else {
      sql = `SELECT tj.client_id, c.name AS client_name,
                    COUNT(*) AS total_jobs,
                    COUNT(*) FILTER (WHERE tj.site_arrival_at IS NOT NULL
                      AND ${diffMin}/60 <= tj.sla_minutes) AS within_sla,
                    ROUND(AVG(${diffMin}/60)::numeric, 1) AS avg_response_min
             FROM trip_jobs tj
             JOIN clients c ON tj.client_id = c.id
             WHERE tj.dispatched_at IS NOT NULL AND tj.site_arrival_at IS NOT NULL`;
    }
    const params: any[] = [];
    if (client_id) { sql += ' AND tj.client_id = $' + (params.length + 1); params.push(client_id); }
    sql += ' GROUP BY tj.client_id, c.name';
    const result = await query(sql, params);
    return { sla_reports: result.rows };
  });
}
