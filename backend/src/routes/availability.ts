import { FastifyInstance } from 'fastify';
import { query } from '../lib/db.js';

export default async function availabilityRoutes(app: FastifyInstance) {
  app.get('/availability/sales', { preHandler: [app.authenticate] }, async () => {
    // Available generators (status = available)
    const generatorsResult = await query(
      `SELECT g.id, g.serial_no, g.brand, g.model, g.voltage_rating, g.power_kva, g.fuel_type, g.ble_beacon_id,
              v.plate_no AS mounted_on_vehicle
       FROM generators g
       LEFT JOIN vehicles v ON v.id = g.current_vehicle_id
       WHERE g.status = 'available'
       ORDER BY g.power_kva DESC, g.brand, g.model`
    );

    // Available vehicles (status = active, not on active job)
    const vehiclesResult = await query(
      `SELECT v.id, v.plate_no, v.vehicle_type, v.make_model, v.year, v.can_bus_supported, v.tank_capacity_l
       FROM vehicles v
       WHERE v.status = 'active'
         AND v.id NOT IN (
           SELECT vehicle_id FROM trip_jobs 
           WHERE vehicle_id IS NOT NULL AND status IN ('dispatched', 'en_route', 'on_site')
         )
       ORDER BY v.vehicle_type, v.plate_no`
    );

    // Upcoming returns (jobs ending within 7 days)
    const upcomingResult = await query(
      `SELECT tj.id, tj.job_number, tj.status, tj.dispatched_at, tj.completed_at,
              tj.vehicle_id, tj.generator_id,
              v.plate_no, g.serial_no, g.power_kva, g.brand, g.model,
              c.name AS client_name, cs.name AS site_name
       FROM trip_jobs tj
       LEFT JOIN vehicles v ON v.id = tj.vehicle_id
       LEFT JOIN generators g ON g.id = tj.generator_id
       LEFT JOIN clients c ON c.id = tj.client_id
       LEFT JOIN client_sites cs ON cs.id = tj.site_id
       WHERE tj.status IN ('dispatched', 'en_route', 'on_site')
         AND tj.vehicle_id IS NOT NULL
       ORDER BY tj.dispatched_at ASC
       LIMIT 20`
    );

    // Generator summary by kVA
    const genSummary = generatorsResult.rows.reduce((acc: any, g: any) => {
      const key = `${g.brand} ${g.model} (${g.power_kva}kVA)`;
      if (!acc[key]) acc[key] = { brand: g.brand, model: g.model, power_kva: g.power_kva, count: 0, items: [] };
      acc[key].count++;
      acc[key].items.push({ serial: g.serial_no, mounted_on: g.mounted_on_vehicle });
      return acc;
    }, {});

    // Vehicle summary by type
    const vehSummary = vehiclesResult.rows.reduce((acc: any, v: any) => {
      if (!acc[v.vehicle_type]) acc[v.vehicle_type] = { type: v.vehicle_type, count: 0, items: [] };
      acc[v.vehicle_type].count++;
      acc[v.vehicle_type].items.push({ plate: v.plate_no, model: v.make_model, year: v.year });
      return acc;
    }, {});

    // Total asset counts
    const totalVehiclesRes = await query(`SELECT COUNT(*) AS cnt FROM vehicles WHERE status != 'retired'`);
    const totalGeneratorsRes = await query(`SELECT COUNT(*) AS cnt FROM generators WHERE status != 'retired'`);
    const totalVehicles = totalVehiclesRes.rows[0]?.cnt || 0;
    const totalGenerators = totalGeneratorsRes.rows[0]?.cnt || 0;
    const totalAssets = totalVehicles + totalGenerators;

    const deployedRes = await query(
      `SELECT COUNT(*) AS cnt FROM generators WHERE status = 'deployed'
       UNION ALL
       SELECT COUNT(*) FROM vehicles WHERE id IN (SELECT vehicle_id FROM trip_jobs WHERE status IN ('dispatched','en_route','on_site') AND vehicle_id IS NOT NULL)`
    );
    const deployedCount = deployedRes.rows.reduce((s: number, r: any) => s + (r.cnt || 0), 0);

    const maintenanceRes = await query(
      `SELECT COUNT(*) AS cnt FROM generators WHERE status = 'maintenance'
       UNION ALL
       SELECT COUNT(*) FROM vehicles WHERE status = 'maintenance'`
    );
    const maintenanceCount = maintenanceRes.rows.reduce((s: number, r: any) => s + (r.cnt || 0), 0);

    // Revenue stats
    const revenueResult = await query(
      `SELECT
         COALESCE(SUM(revenue_amount), 0) AS total_revenue,
         COALESCE(SUM(CASE WHEN invoice_status = 'paid' THEN revenue_amount ELSE 0 END), 0) AS collected_revenue,
         COALESCE(SUM(CASE WHEN invoice_status = 'pending' THEN revenue_amount ELSE 0 END), 0) AS pending_revenue,
         COALESCE(SUM(CASE WHEN invoice_status = 'overdue' THEN revenue_amount ELSE 0 END), 0) AS overdue_revenue,
         COUNT(*) AS total_jobs,
         COALESCE(ROUND(AVG(revenue_amount), 2), 0) AS avg_job_value
       FROM trip_jobs WHERE revenue_amount IS NOT NULL AND revenue_amount > 0`
    );

    // Revenue by month (last 12 months)
    const revenueByMonth = await query(
      `SELECT strftime('%Y-%m', completed_at) AS month,
              COALESCE(SUM(revenue_amount), 0) AS revenue,
              COUNT(*) AS job_count
       FROM trip_jobs
       WHERE revenue_amount IS NOT NULL AND revenue_amount > 0
         AND completed_at IS NOT NULL
         AND completed_at >= date('now', '-12 months')
       GROUP BY strftime('%Y-%m', completed_at)
       ORDER BY month ASC`
    );

    // Revenue by client
    const revenueByClient = await query(
      `SELECT c.name AS client_name, c.short_code AS client_code,
              COALESCE(SUM(tj.revenue_amount), 0) AS revenue,
              COUNT(tj.id) AS job_count
       FROM trip_jobs tj
       LEFT JOIN clients c ON c.id = tj.client_id
       WHERE tj.revenue_amount IS NOT NULL AND tj.revenue_amount > 0
       GROUP BY tj.client_id
       ORDER BY revenue DESC`
    );

    // Revenue by job type
    const revenueByJobType = await query(
      `SELECT job_type,
              COALESCE(SUM(revenue_amount), 0) AS revenue,
              COUNT(*) AS job_count
       FROM trip_jobs
       WHERE revenue_amount IS NOT NULL AND revenue_amount > 0
       GROUP BY job_type
       ORDER BY revenue DESC`
    );

    // Invoice status breakdown
    const invoiceStatus = await query(
      `SELECT invoice_status,
              COALESCE(SUM(revenue_amount), 0) AS revenue,
              COUNT(*) AS job_count
       FROM trip_jobs
       WHERE revenue_amount IS NOT NULL AND revenue_amount > 0 AND invoice_status IS NOT NULL
       GROUP BY invoice_status
       ORDER BY job_count DESC`
    );

    // Recent jobs with revenue
    const recentJobs = await query(
      `SELECT tj.job_number, tj.status, tj.job_type, tj.revenue_amount, tj.invoice_number, tj.invoice_status,
              tj.completed_at, tj.dispatched_at,
              c.name AS client_name, g.serial_no AS generator_serial, v.plate_no
       FROM trip_jobs tj
       LEFT JOIN clients c ON c.id = tj.client_id
       LEFT JOIN generators g ON g.id = tj.generator_id
       LEFT JOIN vehicles v ON v.id = tj.vehicle_id
       WHERE tj.revenue_amount IS NOT NULL AND tj.revenue_amount > 0
       ORDER BY tj.completed_at DESC
       LIMIT 10`
    );

    return {
      generators: {
        available: generatorsResult.rows.length,
        bySpec: Object.values(genSummary),
        details: generatorsResult.rows,
      },
      vehicles: {
        available: vehiclesResult.rows.length,
        byType: Object.values(vehSummary),
        details: vehiclesResult.rows,
      },
      upcomingReturns: upcomingResult.rows,

      // Revenue stats
      total_assets: totalAssets,
      total_vehicles: totalVehicles,
      total_generators: totalGenerators,
      available_assets: generatorsResult.rows.length + vehiclesResult.rows.length,
      deployed_assets: deployedCount,
      maintenance_assets: maintenanceCount,
      total_active_assets: totalAssets,
      available_rate: totalAssets > 0 ? Math.round(((generatorsResult.rows.length + vehiclesResult.rows.length) / totalAssets) * 100) : 0,

      // Revenue data
      revenue: {
        total: revenueResult.rows[0]?.total_revenue || 0,
        collected: revenueResult.rows[0]?.collected_revenue || 0,
        pending: revenueResult.rows[0]?.pending_revenue || 0,
        overdue: revenueResult.rows[0]?.overdue_revenue || 0,
        total_jobs: revenueResult.rows[0]?.total_jobs || 0,
        avg_job_value: revenueResult.rows[0]?.avg_job_value || 0,
      },
      revenue_by_month: revenueByMonth.rows,
      revenue_by_client: revenueByClient.rows,
      revenue_by_job_type: revenueByJobType.rows,
      invoice_status: invoiceStatus.rows,
      recent_jobs: recentJobs.rows,
    };
  });

  app.get('/availability/calendar', { preHandler: [app.authenticate] }, async (request) => {
    const { from, to } = request.query as { from?: string; to?: string };
    const startDate = from || new Date().toISOString().split('T')[0];
    const endDate = to || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    // All jobs in date range with their assigned assets
    const jobsResult = await query(
      `SELECT tj.id, tj.job_number, tj.status, tj.job_type, tj.dispatched_at, tj.site_arrival_at, tj.completed_at,
              tj.sla_minutes, tj.vehicle_id, tj.generator_id, tj.driver_id, tj.chargeman_id,
              v.plate_no, v.vehicle_type,
              g.serial_no, g.brand, g.model, g.power_kva,
              c.name AS client_name, c.short_code AS client_code,
              cs.name AS site_name, cs.address AS site_address
       FROM trip_jobs tj
       LEFT JOIN vehicles v ON v.id = tj.vehicle_id
       LEFT JOIN generators g ON g.id = tj.generator_id
       LEFT JOIN clients c ON c.id = tj.client_id
       LEFT JOIN client_sites cs ON cs.id = tj.site_id
       WHERE (tj.dispatched_at >= $1 OR tj.created_at >= $1)
         AND (tj.dispatched_at <= $2 OR tj.created_at <= $2)
       ORDER BY COALESCE(tj.dispatched_at, tj.created_at) ASC`,
      [startDate, startDate, endDate, endDate]
    );

    // Group by asset for timeline view
    const genTimeline: Record<string, any[]> = {};
    const vehTimeline: Record<string, any[]> = {};

    for (const job of jobsResult.rows) {
      if (job.generator_id) {
        if (!genTimeline[job.generator_id]) genTimeline[job.generator_id] = [];
        genTimeline[job.generator_id].push(job);
      }
      if (job.vehicle_id) {
        if (!vehTimeline[job.vehicle_id]) vehTimeline[job.vehicle_id] = [];
        vehTimeline[job.vehicle_id].push(job);
      }
    }

    // Get all generators with their timelines
    const allGenerators = await query(
      `SELECT g.id, g.serial_no, g.brand, g.model, g.power_kva, g.status
       FROM generators g
       ORDER BY g.power_kva DESC, g.brand, g.model`
    );

    // Get all vehicles with their timelines
    const allVehicles = await query(
      `SELECT v.id, v.plate_no, v.vehicle_type, v.make_model, v.status
       FROM vehicles v
       ORDER BY v.vehicle_type, v.plate_no`
    );

    return {
      dateRange: { from: startDate, to: endDate },
      generators: allGenerators.rows.map((g: any) => ({
        ...g,
        timeline: genTimeline[g.id] || [],
      })),
      vehicles: allVehicles.rows.map((v: any) => ({
        ...v,
        timeline: vehTimeline[v.id] || [],
      })),
    };
  });

  app.get('/dashboard/report', { preHandler: [app.authenticate] }, async (request, reply) => {
    const vehiclesResult = await query(`SELECT id, plate_no, vehicle_type, make_model, status FROM vehicles ORDER BY plate_no`);
    const generatorsResult = await query(`SELECT id, serial_no, brand, model, power_kva, status FROM generators ORDER BY serial_no`);
    const jobsResult = await query(
      `SELECT tj.job_number, tj.job_type, tj.status, tj.sla_minutes, tj.dispatched_at, tj.completed_at,
              tj.revenue_amount, tj.revenue_currency, tj.invoice_status,
              c.name AS client_name, v.plate_no, g.serial_no AS generator_serial
       FROM trip_jobs tj
       LEFT JOIN clients c ON c.id = tj.client_id
       LEFT JOIN vehicles v ON v.id = tj.vehicle_id
       LEFT JOIN generators g ON g.id = tj.generator_id
       ORDER BY tj.created_at DESC`
    );
    const clientsResult = await query(`SELECT id, name, short_code FROM clients ORDER BY name`);
    const quotesResult = await query(`SELECT quote_number, client_name, total_amount, status, created_at FROM quotes ORDER BY created_at DESC`);

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const sections = [];

    // Vehicles section
    sections.push('VEHICLES');
    sections.push('Plate No,Type,Make/Model,Status');
    for (const v of vehiclesResult.rows) {
      sections.push([v.plate_no, v.vehicle_type, v.make_model, v.status].map(escapeCsv).join(','));
    }
    sections.push('');

    // Generators section
    sections.push('GENERATORS');
    sections.push('Serial No,Brand,Model,Power (kVA),Status');
    for (const g of generatorsResult.rows) {
      sections.push([g.serial_no, g.brand, g.model, g.power_kva, g.status].map(escapeCsv).join(','));
    }
    sections.push('');

    // Clients section
    sections.push('CLIENTS');
    sections.push('Name,Code');
    for (const c of clientsResult.rows) {
      sections.push([c.name, c.short_code].map(escapeCsv).join(','));
    }
    sections.push('');

    // Jobs section
    sections.push('JOBS');
    sections.push('Job Number,Type,Status,Client,Vehicle,Generator,SLA (min),Dispatched,Completed,Revenue,Currency,Invoice Status');
    for (const j of jobsResult.rows) {
      sections.push([
        j.job_number, j.job_type, j.status, j.client_name, j.plate_no, j.generator_serial,
        j.sla_minutes, j.dispatched_at, j.completed_at, j.revenue_amount, j.revenue_currency, j.invoice_status
      ].map(escapeCsv).join(','));
    }
    sections.push('');

    // Quotes section
    sections.push('QUOTES');
    sections.push('Quote Number,Client,Total Amount,Status,Created At');
    for (const q of quotesResult.rows) {
      sections.push([q.quote_number, q.client_name, q.total_amount, q.status, q.created_at].map(escapeCsv).join(','));
    }

    const csv = sections.join('\n');
    const filename = `dashboard_report_${new Date().toISOString().split('T')[0]}.csv`;
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.send(csv);
  });
}