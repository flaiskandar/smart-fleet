import { FastifyInstance } from 'fastify';
import { query } from '../lib/db.js';

export default async function employeeRoutes(app: FastifyInstance) {
  app.get('/employees', { preHandler: [app.authenticate] }, async (request) => {
    const { role } = request.query as { role?: string };
    let sql = 'SELECT * FROM employees WHERE 1=1';
    const params: any[] = [];
    if (role) { sql += ' AND role = $1'; params.push(role); }
    sql += ' ORDER BY name';
    const result = await query(sql, params);
    return { employees: result.rows };
  });
}
