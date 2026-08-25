import { FastifyInstance } from 'fastify';
import { query } from '../lib/db.js';

export default async function podRoutes(app: FastifyInstance) {
  app.post('/jobs/:id/pod', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    const user = request.user as any;

    const job = await query('SELECT id FROM trip_jobs WHERE id = $1', [id]);
    if (job.rows.length === 0) return reply.status(404).send({ error: 'Job not found' });

    const result = await query(
      `INSERT INTO pod_records (trip_job_id, signature_data, photo_urls, notes, submitted_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, data.signature_data, JSON.stringify(data.photo_urls || []), data.notes, user.userId]
    );

    await query(
      `UPDATE trip_jobs SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status NOT IN ('completed', 'cancelled')`,
      [id]
    );

    return reply.status(201).send(result.rows[0]);
  });
}
