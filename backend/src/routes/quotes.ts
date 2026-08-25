import { FastifyInstance } from 'fastify';
import { query } from '../lib/db.js';
import { v4 as uuid } from 'uuid';

export default async function quoteRoutes(app: FastifyInstance) {
  app.get('/quotes', { preHandler: [app.authenticate] }, async (request) => {
    const { status, client_id } = request.query as { status?: string; client_id?: string };
    let sql = 'SELECT q.*, c.name AS client_name FROM quotes q LEFT JOIN clients c ON c.id = q.client_id WHERE 1=1';
    const params: any[] = [];
    if (status) { sql += ' AND q.status = $' + (params.length + 1); params.push(status); }
    if (client_id) { sql += ' AND q.client_id = $' + (params.length + 1); params.push(client_id); }
    sql += ' ORDER BY q.created_at DESC';
    const result = await query(sql, params);
    return { quotes: result.rows };
  });

  app.get('/quotes/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await query('SELECT q.*, c.name AS client_name FROM quotes q LEFT JOIN clients c ON c.id = q.client_id WHERE q.id = $1', [id]);
    if (result.rows.length === 0) return reply.status(404).send({ error: 'Quote not found' });
    return result.rows[0];
  });

  app.post('/quotes', { preHandler: [app.authenticate] }, async (request, reply) => {
    const data = request.body as any;
    const user = (request as any).user;
    const id = uuid();
    const quoteNumber = `QT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
    const total = (data.duration_months || 1) * (data.rate_per_month || 0);
    const result = await query(
      `INSERT INTO quotes (id, quote_number, client_id, client_name, vehicle_id, vehicle_desc, generator_id, generator_desc, job_type, duration_months, rate_per_month, total_amount, deposit_amount, status, notes, created_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [id, quoteNumber, data.client_id || null, data.client_name || null, data.vehicle_id || null, data.vehicle_desc || null,
       data.generator_id || null, data.generator_desc || null, data.job_type || 'standby_contract',
       data.duration_months || 1, data.rate_per_month || 0, total, total * 0.5,
       data.status || 'draft', data.notes || null, user.id]
    );
    return reply.status(201).send(result.rows[0]);
  });

  app.patch('/quotes/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    const user = (request as any).user;
    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;
    for (const key of ['client_id', 'client_name', 'vehicle_id', 'vehicle_desc', 'generator_id', 'generator_desc', 'job_type', 'duration_months', 'rate_per_month', 'status', 'notes']) {
      if (data[key] !== undefined) { fields.push(`${key} = $${idx++}`); params.push(data[key]); }
    }
    if (data.status !== undefined) {
      fields.push(`status_changed_by = $${idx++}`); params.push(user.id);
      fields.push(`status_changed_at = datetime('now')`);
    }
    if (data.duration_months !== undefined || data.rate_per_month !== undefined) {
      const dur = data.duration_months ?? 0;
      const rate = data.rate_per_month ?? 0;
      if (dur && rate) {
        fields.push(`total_amount = $${idx++}`); params.push(dur * rate);
        fields.push(`deposit_amount = $${idx++}`); params.push(dur * rate * 0.5);
      }
    }
    fields.push(`updated_by_user_id = $${idx++}`); params.push(user.id);
    if (fields.length === 0) return reply.status(400).send({ error: 'No updates' });
    fields.push(`updated_at = datetime('now')`);
    params.push(id);
    const result = await query(`UPDATE quotes SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (result.rows.length === 0) return reply.status(404).send({ error: 'Quote not found' });
    return result.rows[0];
  });

  app.delete('/quotes/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await query('DELETE FROM quotes WHERE id = $1', [id]);
    return { ok: true };
  });
}
