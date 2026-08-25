import { FastifyInstance } from 'fastify';
import { query } from '../lib/db.js';
import { v4 as uuid } from 'uuid';

export default async function generatorRoutes(app: FastifyInstance) {
  app.get('/generators', { preHandler: [app.authenticate] }, async (request) => {
    const { status } = request.query as { status?: string };
    let sql = `SELECT g.*, v.plate_no AS current_vehicle_plate
               FROM generators g LEFT JOIN vehicles v ON g.current_vehicle_id = v.id WHERE 1=1`;
    const params: any[] = [];
    if (status) { sql += ' AND g.status = $' + (params.length + 1); params.push(status); }
    sql += ' ORDER BY g.serial_no';
    const result = await query(sql, params);
    return { generators: result.rows };
  });

  app.get('/generators/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await query(
      `SELECT g.*, v.plate_no AS current_vehicle_plate
       FROM generators g LEFT JOIN vehicles v ON g.current_vehicle_id = v.id WHERE g.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return reply.status(404).send({ error: 'Generator not found' });
    return result.rows[0];
  });

  app.post('/generators', { preHandler: [app.authenticate, app.authorize('super_admin')] }, async (request, reply) => {
    const data = request.body as any;
    if (!data.serial_no) return reply.status(400).send({ error: 'Serial number is required' });
    const id = uuid();
    const result = await query(
      `INSERT INTO generators (id, serial_no, brand, model, voltage_rating, power_kva, fuel_type, ble_beacon_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, data.serial_no, data.brand || null, data.model || null, data.voltage_rating || null,
       data.power_kva || null, data.fuel_type || 'diesel', data.ble_beacon_id || null, data.status || 'available']
    );
    return reply.status(201).send(result.rows[0]);
  });

  app.put('/generators/:id/beacon', { preHandler: [app.authenticate, app.authorize('super_admin', 'fleet_manager')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { beacon_id } = request.body as { beacon_id: string };
    const result = await query(
      'UPDATE generators SET ble_beacon_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [beacon_id, id]
    );
    if (result.rows.length === 0) return reply.status(404).send({ error: 'Generator not found' });
    return result.rows[0];
  });

  app.patch('/generators/:id', { preHandler: [app.authenticate, app.authorize('super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;
    for (const key of ['serial_no', 'brand', 'model', 'voltage_rating', 'power_kva', 'fuel_type', 'ble_beacon_id', 'status', 'current_vehicle_id']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        params.push(data[key]);
      }
    }
    if (fields.length === 0) return reply.status(400).send({ error: 'No fields to update' });
    fields.push('updated_at = NOW()');
    params.push(id);
    const result = await query(`UPDATE generators SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (result.rows.length === 0) return reply.status(404).send({ error: 'Generator not found' });
    return result.rows[0];
  });

  app.delete('/generators/:id', { preHandler: [app.authenticate, app.authorize('super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const activeBindings = await query(
      'SELECT COUNT(*) as count FROM ble_bindings WHERE generator_id = $1 AND is_current = true',
      [id]
    );
    if (parseInt(activeBindings.rows[0].count) > 0) {
      return reply.status(400).send({ error: 'Cannot delete generator with active vehicle binding' });
    }
    await query('DELETE FROM generator_components WHERE generator_id = $1', [id]);
    await query('DELETE FROM generator_hours WHERE generator_id = $1', [id]);
    await query('DELETE FROM ble_bindings WHERE generator_id = $1', [id]);
    const result = await query('DELETE FROM generators WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return reply.status(404).send({ error: 'Generator not found' });
    return { message: 'Generator deleted' };
  });

  app.get('/bindings/current', { preHandler: [app.authenticate] }, async () => {
    const result = await query(
      `SELECT bb.*, v.plate_no, g.serial_no AS generator_serial, g.ble_beacon_id
       FROM ble_bindings bb
       JOIN vehicles v ON bb.vehicle_id = v.id
       JOIN generators g ON bb.generator_id = g.id
       WHERE bb.is_current = true`
    );
    return { bindings: result.rows };
  });
}
