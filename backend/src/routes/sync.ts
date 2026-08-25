import { FastifyInstance } from 'fastify';
import { query } from '../lib/db.js';

export default async function syncRoutes(app: FastifyInstance) {
  app.get('/sync/staging-queue', { preHandler: [app.authenticate] }, async () => {
    const fuel = await query(
      "SELECT * FROM staging_fuel_logs WHERE status = 'pending' ORDER BY created_at"
    );
    const do_records = await query(
      "SELECT * FROM staging_delivery_orders WHERE status = 'pending' ORDER BY created_at"
    );
    const assets = await query(
      "SELECT * FROM staging_asset_updates WHERE status = 'pending' ORDER BY created_at"
    );
    return {
      pending: {
        fuel_logs: fuel.rows.length,
        delivery_orders: do_records.rows.length,
        asset_updates: assets.rows.length,
      },
      records: {
        fuel_logs: fuel.rows,
        delivery_orders: do_records.rows,
        asset_updates: assets.rows,
      },
    };
  });

  app.post('/sync/retry/:id', { preHandler: [app.authenticate, app.authorize('super_admin', 'finance')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { table } = request.query as { table: string };
    const validTables = ['staging_fuel_logs', 'staging_delivery_orders', 'staging_asset_updates', 'staging_mileage'];
    if (!validTables.includes(table)) {
      return reply.status(400).send({ error: `Invalid table. Must be one of: ${validTables.join(', ')}` });
    }
    const result = await query(
      `UPDATE ${table} SET status = 'pending', error_message = NULL WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return reply.status(404).send({ error: 'Record not found' });
    return result.rows[0];
  });

  app.get('/sync/errors', { preHandler: [app.authenticate] }, async () => {
    const fuel = await query(
      "SELECT * FROM staging_fuel_logs WHERE status = 'error' ORDER BY created_at DESC LIMIT 50"
    );
    const do_records = await query(
      "SELECT * FROM staging_delivery_orders WHERE status = 'error' ORDER BY created_at DESC LIMIT 50"
    );
    return {
      fuel_logs: fuel.rows,
      delivery_orders: do_records.rows,
    };
  });

  app.get('/sync/logs', { preHandler: [app.authenticate] }, async () => {
    const result = await query(
      'SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 50'
    );
    return { sync_logs: result.rows };
  });
}
