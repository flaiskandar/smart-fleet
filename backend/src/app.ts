import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { config } from './config.js';
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import vehicleRoutes from './routes/vehicles.js';
import generatorRoutes from './routes/generators.js';
import jobRoutes from './routes/jobs.js';
import fuelRoutes from './routes/fuel.js';
import geofenceRoutes from './routes/geofences.js';
import podRoutes from './routes/pod.js';
import syncRoutes from './routes/sync.js';
import webhookRoutes from './routes/webhooks.js';
import clientRoutes from './routes/clients.js';
import employeeRoutes from './routes/employees.js';
import notificationRoutes from './routes/notifications.js';
import availabilityRoutes from './routes/availability.js';
import assetTraceabilityRoutes from './routes/assetTraceability.js';
import quoteRoutes from './routes/quotes.js';
import searchRoutes from './routes/search.js';
import auditRoutes from './routes/audit.js';
import assistantRoutes from './routes/assistant.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true, credentials: true });

  await app.register(jwt, { secret: config.jwtSecret });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Express Powerr Smart Fleet API',
        description: 'REST API for fleet tracking, fuel management, job dispatch, and ERP integration',
        version: '1.0.0',
      },
      servers: [{ url: `http://localhost:${config.port}` }],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  await app.register(authPlugin);

  await app.register(authRoutes, { prefix: '/v1/auth' });
  await app.register(vehicleRoutes, { prefix: '/v1' });
  await app.register(generatorRoutes, { prefix: '/v1' });
  await app.register(jobRoutes, { prefix: '/v1' });
  await app.register(fuelRoutes, { prefix: '/v1' });
  await app.register(geofenceRoutes, { prefix: '/v1' });
  await app.register(podRoutes, { prefix: '/v1' });
  await app.register(syncRoutes, { prefix: '/v1' });
  await app.register(webhookRoutes, { prefix: '/v1' });
  await app.register(clientRoutes, { prefix: '/v1' });
  await app.register(employeeRoutes, { prefix: '/v1' });
  await app.register(notificationRoutes, { prefix: '/v1' });
  await app.register(availabilityRoutes, { prefix: '/v1' });
  await app.register(assetTraceabilityRoutes, { prefix: '/v1' });
  await app.register(quoteRoutes, { prefix: '/v1' });
  await app.register(searchRoutes, { prefix: '/v1' });
  await app.register(auditRoutes, { prefix: '/v1' });
  await app.register(assistantRoutes, { prefix: '/v1' });

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  app.get('/', async (request, reply) => {
    const hostHeader = request.headers.host || `localhost:${config.port}`;
    const hostname = hostHeader.includes('[')
      ? hostHeader.substring(0, hostHeader.indexOf(']') + 1)
      : hostHeader.split(':')[0];
    return reply.redirect(`http://${hostname}:5173/`, 302);
  });

  return app;

  return app;
}
