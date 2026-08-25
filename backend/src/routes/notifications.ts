import { FastifyInstance } from 'fastify';
import { query } from '../lib/db.js';
import { v4 as uuid } from 'uuid';

export async function createNotification(userId: string, title: string, body: string, type = 'info', refTable?: string, refId?: string) {
  const id = uuid();
  await query(
    `INSERT INTO notifications (id, user_id, title, body, type, ref_table, ref_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, userId, title, body, type, refTable || null, refId || null]
  );
  return id;
}

export default async function notificationRoutes(app: FastifyInstance) {
  app.get('/notifications', { preHandler: [app.authenticate] }, async (request) => {
    const user = (request as any).user;
    const result = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [user.userId]
    );
    return { notifications: result.rows };
  });

  app.get('/notifications/unread-count', { preHandler: [app.authenticate] }, async (request) => {
    const user = (request as any).user;
    const result = await query(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = 0`,
      [user.userId]
    );
    return { count: result.rows[0]?.count || 0 };
  });

  app.post('/notifications/mark-read', { preHandler: [app.authenticate] }, async (request) => {
    const user = (request as any).user;
    const { ids } = request.body as { ids?: string[] };
    if (ids && ids.length > 0) {
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
      await query(
        `UPDATE notifications SET is_read = 1 WHERE user_id = $${ids.length + 1} AND id IN (${placeholders})`,
        [...ids, user.userId]
      );
    }
    return { ok: true };
  });

  app.post('/notifications/mark-all-read', { preHandler: [app.authenticate] }, async (request) => {
    const user = (request as any).user;
    await query(
      `UPDATE notifications SET is_read = 1 WHERE user_id = $1 AND is_read = 0`,
      [user.userId]
    );
    return { ok: true };
  });
}
