import { FastifyInstance } from 'fastify';
import { query } from '../lib/db.js';
import { verifyPassword, hashPassword } from '../lib/auth.js';

export default async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const { username, password, remember_me } = request.body as { username: string; password: string; remember_me?: boolean };

    if (!username || !password) {
      return reply.status(400).send({ error: 'Username and password required' });
    }

    const result = await query(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1 AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const expiresIn = remember_me ? '30d' : '24h';
    const token = app.jwt.sign({
      userId: user.id,
      username: user.username,
      role: user.role,
    }, { expiresIn });

    return { token, user: { id: user.id, username: user.username, role: user.role } };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const payload = request.user as any;
    const result = await query(
      `SELECT u.id, u.username, u.role, e.name as employee_name, e.role as employee_role
       FROM users u LEFT JOIN employees e ON u.employee_id = e.id
       WHERE u.id = $1`,
      [payload.userId]
    );
    return result.rows[0] || payload;
  });

  app.post('/change-password', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any;
    const { current_password, new_password } = request.body as { current_password: string; new_password: string };

    if (!current_password || !new_password) {
      return reply.status(400).send({ error: 'Current and new password required' });
    }

    if (new_password.length < 6) {
      return reply.status(400).send({ error: 'New password must be at least 6 characters' });
    }

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [payload.userId]);
    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const valid = await verifyPassword(current_password, result.rows[0].password_hash);
    if (!valid) {
      return reply.status(401).send({ error: 'Current password is incorrect' });
    }

    const newHash = await hashPassword(new_password);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, payload.userId]);

    return { message: 'Password changed successfully' };
  });
}
