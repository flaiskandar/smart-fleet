import { FastifyInstance } from 'fastify';
import { query } from '../lib/db.js';
import { v4 as uuid } from 'uuid';

export default async function clientRoutes(app: FastifyInstance) {
  app.get('/clients', { preHandler: [app.authenticate] }, async () => {
    const result = await query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM client_sites cs WHERE cs.client_id = c.id) AS site_count
       FROM clients c ORDER BY c.name`
    );
    return { clients: result.rows };
  });

  app.get('/clients/:id/sites', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const result = await query(
      `SELECT * FROM client_sites WHERE client_id = $1 ORDER BY name`, [id]
    );
    return { sites: result.rows };
  });

  app.post('/clients', { preHandler: [app.authenticate, app.authorize('super_admin')] }, async (request, reply) => {
    const data = request.body as any;
    if (!data.name) return reply.status(400).send({ error: 'Client name is required' });
    const id = uuid();
    await query(
      `INSERT INTO clients (id, name, short_code, tin, sst_reg_no)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, data.name, data.short_code || null, data.tin || null, data.sst_reg_no || null]
    );
    const result = await query(`SELECT * FROM clients WHERE id = $1`, [id]);
    return reply.status(201).send(result.rows[0]);
  });

  app.patch('/clients/:id', { preHandler: [app.authenticate, app.authorize('super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;
    for (const key of ['name', 'short_code', 'tin', 'sst_reg_no', 'is_active']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        params.push(data[key]);
      }
    }
    if (fields.length === 0) return reply.status(400).send({ error: 'No fields to update' });
    params.push(id);
    const result = await query(
      `UPDATE clients SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, params
    );
    if (result.rows.length === 0) return reply.status(404).send({ error: 'Client not found' });
    return result.rows[0];
  });

  app.post('/clients/:id/sites', { preHandler: [app.authenticate, app.authorize('super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    if (!data.name) return reply.status(400).send({ error: 'Site name is required' });
    const siteId = uuid();
    await query(
      `INSERT INTO client_sites (id, client_id, name, address, latitude, longitude, geofence_radius_m)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [siteId, id, data.name, data.address || null, data.latitude || null, data.longitude || null, data.geofence_radius_m || 150]
    );
    const result = await query(`SELECT * FROM client_sites WHERE id = $1`, [siteId]);
    return reply.status(201).send(result.rows[0]);
  });

  app.patch('/clients/:clientId/sites/:siteId', { preHandler: [app.authenticate, app.authorize('super_admin')] }, async (request, reply) => {
    const { clientId, siteId } = request.params as { clientId: string; siteId: string };
    const data = request.body as any;
    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;
    for (const key of ['name', 'address', 'latitude', 'longitude', 'geofence_radius_m', 'is_active']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        params.push(data[key]);
      }
    }
    if (fields.length === 0) return reply.status(400).send({ error: 'No fields to update' });
    params.push(siteId, clientId);
    const result = await query(
      `UPDATE client_sites SET ${fields.join(', ')} WHERE id = $${idx} AND client_id = $${idx + 1} RETURNING *`, params
    );
    if (result.rows.length === 0) return reply.status(404).send({ error: 'Site not found' });
    return result.rows[0];
  });

  app.delete('/clients/:clientId/sites/:siteId', { preHandler: [app.authenticate, app.authorize('super_admin')] }, async (request, reply) => {
    const { clientId, siteId } = request.params as { clientId: string; siteId: string };
    const result = await query(
      `DELETE FROM client_sites WHERE id = $1 AND client_id = $2 RETURNING id`, [siteId, clientId]
    );
    if (result.rows.length === 0) return reply.status(404).send({ error: 'Site not found' });
    return { deleted: true };
  });
}
