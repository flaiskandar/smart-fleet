import { FastifyInstance } from 'fastify';
import { query } from '../lib/db.js';

export default async function auditRoutes(app: FastifyInstance) {
  app.get('/audit-log', { preHandler: [app.authenticate] }, async (request) => {
    const { entity_type, entity_id, user_id, from, to, limit } = request.query as {
      entity_type?: string; entity_id?: string; user_id?: string;
      from?: string; to?: string; limit?: string;
    };
    let sql = `SELECT a.*, u.username FROM audit_log a LEFT JOIN users u ON a.user_id = u.id WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;
    if (entity_type) { sql += ` AND a.entity_type = $${idx++}`; params.push(entity_type); }
    if (entity_id) { sql += ` AND a.entity_id = $${idx++}`; params.push(entity_id); }
    if (user_id) { sql += ` AND a.user_id = $${idx++}`; params.push(user_id); }
    if (from) { sql += ` AND a.created_at >= $${idx++}`; params.push(from); }
    if (to) { sql += ` AND a.created_at <= $${idx++}`; params.push(to); }
    sql += ` ORDER BY a.created_at DESC LIMIT $${idx}`;
    params.push(parseInt(limit || '100'));

    const result = await query(sql, params);
    return { audit_log: result.rows };
  });
}
