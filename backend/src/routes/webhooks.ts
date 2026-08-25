import { FastifyInstance } from 'fastify';

export default async function webhookRoutes(app: FastifyInstance) {
  app.post('/webhooks/telemetry', async (request, reply) => {
    const data = request.body as any;
    if (!data || !data.vehicle_id) {
      return reply.status(400).send({ error: 'Invalid telemetry payload' });
    }
    // In production: validate HMAC signature, then insert into vehicle_telemetry
    return { received: true, timestamp: new Date().toISOString() };
  });

  app.post('/webhooks/ble-scan', async (request, reply) => {
    const data = request.body as any;
    if (!data || !data.vehicle_id || !data.scans) {
      return reply.status(400).send({ error: 'Invalid BLE scan payload' });
    }
    return { received: true, scans_processed: data.scans.length };
  });

  app.post('/webhooks/fuel-probe', async (request, reply) => {
    const data = request.body as any;
    if (!data || !data.vehicle_id) {
      return reply.status(400).send({ error: 'Invalid fuel probe payload' });
    }
    return { received: true, timestamp: new Date().toISOString() };
  });
}
