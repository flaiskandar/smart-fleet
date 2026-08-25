import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (...roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  fastify.decorate('authorize', function (...roles: string[]) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as JwtPayload;
      if (!payload || !roles.includes(payload.role)) {
        reply.status(403).send({ error: 'Forbidden' });
      }
    };
  });
}

export default fp(authPlugin, { name: 'auth-plugin' });
