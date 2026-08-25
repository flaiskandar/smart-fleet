import { FastifyInstance } from 'fastify';
import { query } from '../lib/db.js';
import { v4 as uuid } from 'uuid';
import { createNotification } from './notifications.js';

export default async function jobRoutes(app: FastifyInstance) {
  app.post('/jobs', { preHandler: [app.authenticate, app.authorize('super_admin', 'dispatcher')] }, async (request, reply) => {
    const data = request.body as any;
    const jobNumber = `JOB-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
    const result = await query(
      `INSERT INTO trip_jobs (id, job_number, client_id, site_id, site_address, job_type, sla_minutes, vehicle_id, generator_id, notes, revenue_amount, revenue_currency, invoice_number, invoice_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [uuid(), jobNumber, data.client_id, data.site_id, data.site_address, data.job_type, data.sla_minutes,
       data.vehicle_id || null, data.generator_id || null, data.notes || null,
       data.revenue_amount || 0, data.revenue_currency || 'MYR', data.invoice_number || null, 'pending']
    );
    return reply.status(201).send(result.rows[0]);
  });

  app.get('/jobs', { preHandler: [app.authenticate] }, async (request) => {
    const { status, client_id, from, to } = request.query as {
      status?: string; client_id?: string; from?: string; to?: string;
    };
    let sql = `SELECT tj.*, c.name AS client_name, v.plate_no, g.serial_no AS generator_serial,
               d.name AS driver_name, ch.name AS chargeman_name
               FROM trip_jobs tj
               LEFT JOIN clients c ON tj.client_id = c.id
               LEFT JOIN vehicles v ON tj.vehicle_id = v.id
               LEFT JOIN generators g ON tj.generator_id = g.id
               LEFT JOIN employees d ON tj.driver_id = d.id
               LEFT JOIN employees ch ON tj.chargeman_id = ch.id
               WHERE 1=1`;
    const params: any[] = [];
    if (status) { sql += ' AND tj.status = $' + (params.length + 1); params.push(status); }
    if (client_id) { sql += ' AND tj.client_id = $' + (params.length + 1); params.push(client_id); }
    if (from) { sql += ' AND tj.created_at >= $' + (params.length + 1); params.push(from); }
    if (to) { sql += ' AND tj.created_at <= $' + (params.length + 1); params.push(to); }
    sql += ' ORDER BY tj.created_at DESC LIMIT 100';
    const result = await query(sql, params);
    return { jobs: result.rows };
  });

  app.get('/jobs/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await query(
      `SELECT tj.*, c.name AS client_name, cs.name AS site_name, cs.address AS site_address,
              v.plate_no, g.serial_no AS generator_serial, g.brand, g.model,
              d.name AS driver_name, d.phone AS driver_phone,
              ch.name AS chargeman_name, ch.phone AS chargeman_phone
       FROM trip_jobs tj
       LEFT JOIN clients c ON tj.client_id = c.id
       LEFT JOIN client_sites cs ON tj.site_id = cs.id
       LEFT JOIN vehicles v ON tj.vehicle_id = v.id
       LEFT JOIN generators g ON tj.generator_id = g.id
       LEFT JOIN employees d ON tj.driver_id = d.id
       LEFT JOIN employees ch ON tj.chargeman_id = ch.id
       WHERE tj.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return reply.status(404).send({ error: 'Job not found' });
    return result.rows[0];
  });

  app.patch('/jobs/:id/assign', { preHandler: [app.authenticate, app.authorize('super_admin', 'dispatcher')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;
    for (const key of ['vehicle_id', 'generator_id', 'driver_id', 'chargeman_id', 'revenue_amount', 'revenue_currency', 'invoice_number', 'invoice_status']) {
      if (data[key] !== undefined && data[key] !== null) {
        fields.push(`${key} = $${idx++}`);
        params.push(data[key]);
      }
    }
    if (fields.length === 0) return reply.status(400).send({ error: 'No updates provided' });
    fields.push(`updated_at = NOW()`);
    params.push(id);
    const result = await query(
      `UPDATE trip_jobs SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return reply.status(404).send({ error: 'Job not found' });
    return result.rows[0];
  });

  app.post('/jobs/:id/dispatch', { preHandler: [app.authenticate, app.authorize('super_admin', 'dispatcher')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await query(
      `UPDATE trip_jobs SET status = 'dispatched', dispatched_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'pending' RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return reply.status(400).send({ error: 'Job not found or already dispatched' });

    const job = result.rows[0];
    const dispatchedBy = (request as any).user.username;

    // Get client name for notification
    const clientResult = await query(`SELECT name FROM clients WHERE id = $1`, [job.client_id]);
    const clientName = clientResult.rows[0]?.name || 'Unknown Client';

    // Notify all admin and dispatcher users
    const usersResult = await query(
      `SELECT id FROM users WHERE role IN ('super_admin', 'dispatcher')`
    );
    for (const u of usersResult.rows) {
      await createNotification(
        u.id,
        `Job Dispatched: ${job.job_number}`,
        `${dispatchedBy} dispatched ${job.job_number} to ${clientName} (${job.site_address || 'No address'}). Type: ${job.job_type?.replace('_', ' ')}.`,
        'job_dispatch',
        'trip_jobs',
        job.id
      );
    }

    return result.rows[0];
  });

  app.post('/jobs/:id/interrupt', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason: string };
    if (!reason) return reply.status(400).send({ error: 'Interruption reason is required' });

    // First check if job exists
    const existing = await query(`SELECT id, status FROM trip_jobs WHERE id = $1`, [id]);
    if (existing.rows.length === 0) return reply.status(404).send({ error: 'Job not found' });

    const job = existing.rows[0];
    if (job.status === 'completed' || job.status === 'cancelled' || job.status === 'interrupted') {
      return reply.status(400).send({ error: `Job is already ${job.status}` });
    }

    const result = await query(
      `UPDATE trip_jobs SET status = 'interrupted', interrupted_reason = $1, interrupted_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [reason, id]
    );

    const updatedJob = result.rows[0];
    const reportedBy = (request as any).user.username;

    const clientResult = await query(`SELECT name FROM clients WHERE id = $1`, [updatedJob.client_id]);
    const clientName = clientResult.rows[0]?.name || 'Unknown Client';

    const usersResult = await query(
      `SELECT id FROM users WHERE role IN ('super_admin', 'dispatcher')`
    );
    for (const u of usersResult.rows) {
      await createNotification(
        u.id,
        `Job Interrupted: ${updatedJob.job_number}`,
        `${reportedBy} reported interruption for ${updatedJob.job_number} (${clientName}). Reason: ${reason}`,
        'job_interrupt',
        'trip_jobs',
        updatedJob.id
      );
    }

    return result.rows[0];
  });

  app.post('/jobs/:id/complete', { preHandler: [app.authenticate, app.authorize('super_admin', 'dispatcher')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await query(
      `UPDATE trip_jobs SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status IN ('dispatched', 'en_route', 'on_site') RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return reply.status(400).send({ error: 'Job not found or cannot be completed' });

    const job = result.rows[0];
    const completedBy = (request as any).user.username;

    const clientResult = await query(`SELECT name FROM clients WHERE id = $1`, [job.client_id]);
    const clientName = clientResult.rows[0]?.name || 'Unknown Client';

    const usersResult = await query(`SELECT id FROM users WHERE role IN ('super_admin', 'dispatcher')`);
    for (const u of usersResult.rows) {
      await createNotification(
        u.id,
        `Job Completed: ${job.job_number}`,
        `${completedBy} marked ${job.job_number} as completed at ${clientName}.`,
        'job_complete',
        'trip_jobs',
        job.id
      );
    }

    return result.rows[0];
  });

  app.get('/jobs/report/completed', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    let sql = `SELECT tj.job_number, tj.job_type, tj.status, tj.sla_minutes,
                      tj.dispatched_at, tj.site_arrival_at, tj.completed_at,
                      tj.revenue_amount, tj.revenue_currency, tj.invoice_number, tj.invoice_status,
                      c.name AS client_name, c.short_code AS client_code,
                      cs.name AS site_name, cs.address AS site_address,
                      v.plate_no, v.vehicle_type, v.make_model,
                      g.serial_no AS generator_serial, g.brand AS generator_brand, g.model AS generator_model, g.power_kva,
                      d.name AS driver_name, ch.name AS chargeman_name
               FROM trip_jobs tj
               LEFT JOIN clients c ON tj.client_id = c.id
               LEFT JOIN client_sites cs ON tj.site_id = cs.id
               LEFT JOIN vehicles v ON tj.vehicle_id = v.id
               LEFT JOIN generators g ON tj.generator_id = g.id
               LEFT JOIN employees d ON tj.driver_id = d.id
               LEFT JOIN employees ch ON tj.chargeman_id = ch.id
               WHERE tj.status = 'completed'`;
    const params: any[] = [];
    if (from) { sql += ` AND tj.completed_at >= $${params.length + 1}`; params.push(from); }
    if (to) { sql += ` AND tj.completed_at <= $${params.length + 1}`; params.push(to); }
    sql += ' ORDER BY tj.completed_at DESC';

    const result = await query(sql, params);

    const headers = [
      'Job Number', 'Type', 'Status', 'SLA (min)',
      'Dispatched At', 'Site Arrival', 'Completed At',
      'Revenue', 'Currency', 'Invoice #', 'Invoice Status',
      'Client', 'Client Code', 'Site', 'Site Address',
      'Vehicle Plate', 'Vehicle Type', 'Vehicle Model',
      'Generator Serial', 'Generator Brand', 'Generator Model', 'Generator KVA',
      'Driver', 'Chargeman'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = result.rows.map((r: any) => [
      r.job_number, r.job_type, r.status, r.sla_minutes,
      r.dispatched_at, r.site_arrival_at, r.completed_at,
      r.revenue_amount, r.revenue_currency, r.invoice_number, r.invoice_status,
      r.client_name, r.client_code, r.site_name, r.site_address,
      r.plate_no, r.vehicle_type, r.make_model,
      r.generator_serial, r.generator_brand, r.generator_model, r.power_kva,
      r.driver_name, r.chargeman_name
    ].map(escapeCsv).join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    const filename = `completed_jobs_report_${new Date().toISOString().split('T')[0]}.csv`;
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.send(csv);
  });

  app.post('/jobs/bulk-status', { preHandler: [app.authenticate, app.authorize('super_admin', 'dispatcher')] }, async (request) => {
    const { job_ids, status } = request.body as { job_ids: string[]; status: string };
    if (!job_ids?.length || !status) return { error: 'job_ids and status required' };
    const validStatuses = ['pending', 'dispatched', 'en_route', 'on_site', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) return { error: 'Invalid status' };
    for (const id of job_ids) {
      const updates: string[] = [`status = '${status}'`];
      if (status === 'dispatched') updates.push("dispatched_at = datetime('now')");
      if (status === 'completed') updates.push("completed_at = datetime('now')");
      await query(`UPDATE trip_jobs SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = $1`, [id]);
    }
    return { updated: job_ids.length };
  });

  app.post('/jobs/:id/photos', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await query('SELECT id FROM trip_jobs WHERE id = $1', [id]);
    if (existing.rows.length === 0) return reply.status(404).send({ error: 'Job not found' });

    const { photos } = request.body as { photos: { filename: string; mime_type: string; data: string }[] };
    if (!photos?.length) return reply.status(400).send({ error: 'No photos provided' });

    const fs = await import('fs');
    const pathMod = await import('path');
    const crypto = await import('crypto');
    const uploadDir = pathMod.join(process.cwd(), 'uploads', 'jobs', id);

    try {
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const saved: any[] = [];
      for (const photo of photos) {
        const ext = pathMod.extname(photo.filename) || '.jpg';
        const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
        const filePath = pathMod.join(uploadDir, filename);
        const buffer = Buffer.from(photo.data, 'base64');
        fs.writeFileSync(filePath, buffer);

        const photoId = crypto.randomUUID();
        await query(
          `INSERT INTO job_photos (id, job_id, filename, original_name, mime_type, size_bytes) VALUES ($1,$2,$3,$4,$5,$6)`,
          [photoId, id, filename, photo.filename, photo.mime_type || 'image/jpeg', buffer.length]
        );
        saved.push({ id: photoId, filename, original_name: photo.filename });
      }
      return { photos: saved };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  app.get('/jobs/:id/photos', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const result = await query('SELECT * FROM job_photos WHERE job_id = $1 ORDER BY created_at DESC', [id]);
    return { photos: result.rows };
  });
}
