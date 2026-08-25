import { FastifyInstance } from 'fastify';
import { query } from '../lib/db.js';

export default async function searchRoutes(app: FastifyInstance) {
  app.get('/search', { preHandler: [app.authenticate] }, async (request) => {
    const { q, type } = request.query as { q?: string; type?: string };
    if (!q || q.trim().length < 2) return { results: [] };

    const term = `%${q.trim()}%`;
    const results: any[] = [];

    const searchVehicles = !type || type === 'vehicles';
    const searchGenerators = !type || type === 'generators';
    const searchJobs = !type || type === 'jobs';
    const searchClients = !type || type === 'clients';
    const searchQuotes = !type || type === 'quotes';

    if (searchVehicles) {
      const r = await query(
        `SELECT id, plate_no AS title, vehicle_type AS subtitle, status, 'vehicles' AS entity_type
         FROM vehicles WHERE plate_no ILIKE $1 OR make_model ILIKE $1 LIMIT 10`, [term]
      );
      results.push(...r.rows);
    }
    if (searchGenerators) {
      const r = await query(
        `SELECT id, serial_no AS title, brand || ' ' || model AS subtitle, status, 'generators' AS entity_type
         FROM generators WHERE serial_no ILIKE $1 OR brand ILIKE $1 OR model ILIKE $1 LIMIT 10`, [term]
      );
      results.push(...r.rows);
    }
    if (searchJobs) {
      const r = await query(
        `SELECT id, job_number AS title, job_type AS subtitle, status, 'jobs' AS entity_type
         FROM trip_jobs WHERE job_number ILIKE $1 OR job_type ILIKE $1 OR site_address ILIKE $1 LIMIT 10`, [term]
      );
      results.push(...r.rows);
    }
    if (searchClients) {
      const r = await query(
        `SELECT id, name AS title, contact_person AS subtitle,
                CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END AS status, 'clients' AS entity_type
         FROM clients WHERE name ILIKE $1 OR contact_person ILIKE $1 OR email ILIKE $1 LIMIT 10`, [term]
      );
      results.push(...r.rows);
    }
    if (searchQuotes) {
      const r = await query(
        `SELECT id, quote_number AS title, client_name AS subtitle, status, 'quotes' AS entity_type
         FROM quotes WHERE quote_number ILIKE $1 OR client_name ILIKE $1 LIMIT 10`, [term]
      );
      results.push(...r.rows);
    }

    return { results };
  });
}
