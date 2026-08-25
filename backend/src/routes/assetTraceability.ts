import { FastifyInstance } from 'fastify';
import { query } from '../lib/db.js';
import { v4 as uuid } from 'uuid';

export default async function assetTraceabilityRoutes(app: FastifyInstance) {
  // ===== ASSET BINDINGS =====
  app.get('/asset-bindings', { preHandler: [app.authenticate] }, async (request) => {
    const { vehicle_id, generator_id, current_only } = request.query as {
      vehicle_id?: string;
      generator_id?: string;
      current_only?: string;
    };

    let sql = `SELECT ab.*, v.plate_no, v.vehicle_type, v.make_model AS vehicle_model,
               g.serial_no AS generator_serial, g.brand, g.model AS generator_model, g.power_kva,
               pu.username AS paired_by_user, uu.username AS unpaired_by_user
               FROM asset_bindings ab
               LEFT JOIN vehicles v ON v.id = ab.vehicle_id
               LEFT JOIN generators g ON g.id = ab.generator_id
               LEFT JOIN users pu ON pu.id = ab.paired_by_user_id
               LEFT JOIN users uu ON uu.id = ab.unpaired_by_user_id
               WHERE 1=1`;
    const params: any[] = [];

    if (vehicle_id) { sql += ' AND ab.vehicle_id = $' + (params.length + 1); params.push(vehicle_id); }
    if (generator_id) { sql += ' AND ab.generator_id = $' + (params.length + 1); params.push(generator_id); }
    if (current_only === 'true') { sql += ' AND ab.is_current = 1'; }
    sql += ' ORDER BY ab.paired_at DESC';

    const result = await query(sql, params);
    return { bindings: result.rows };
  });

  app.get('/asset-bindings/current', { preHandler: [app.authenticate] }, async () => {
    const result = await query(
      `SELECT ab.*, v.plate_no, v.vehicle_type, v.make_model AS vehicle_model,
              g.serial_no AS generator_serial, g.brand, g.model AS generator_model, g.power_kva
       FROM asset_bindings ab
       LEFT JOIN vehicles v ON v.id = ab.vehicle_id
       LEFT JOIN generators g ON g.id = ab.generator_id
       WHERE ab.is_current = 1
       ORDER BY v.plate_no`
    );
    return { bindings: result.rows };
  });

  app.post('/asset-bindings', { preHandler: [app.authenticate, app.authorize('super_admin', 'dispatcher')] }, async (request, reply) => {
    const { vehicle_id, generator_id, notes } = request.body as {
      vehicle_id: string;
      generator_id: string;
      notes?: string;
    };

    // Check if vehicle or generator already has current binding
    const existing = await query(
      `SELECT id FROM asset_bindings WHERE (vehicle_id = $1 OR generator_id = $2) AND is_current = 1`,
      [vehicle_id, generator_id]
    );

    if (existing.rows.length > 0) {
      return reply.status(400).send({
        error: 'Vehicle or generator already has an active binding. Unpair first.',
        existing: existing.rows
      });
    }

    const user = (request as any).user;
    const id = uuid();

    const result = await query(
      `INSERT INTO asset_bindings (id, vehicle_id, generator_id, paired_at, paired_by_user_id, notes, is_current)
       VALUES ($1,$2,$3,datetime('now'),$4,$5,1) RETURNING *`,
      [id, vehicle_id, generator_id, user.id, notes || null]
    );

    // Update generator's current_vehicle_id
    await query(`UPDATE generators SET current_vehicle_id = $1, updated_at = NOW() WHERE id = $2`, [vehicle_id, generator_id]);

    return reply.status(201).send(result.rows[0]);
  });

  app.patch('/asset-bindings/:id/unpair', { preHandler: [app.authenticate, app.authorize('super_admin', 'dispatcher')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    // Get current binding
    const current = await query(`SELECT generator_id FROM asset_bindings WHERE id = $1 AND is_current = 1`, [id]);
    if (current.rows.length === 0) {
      return reply.status(404).send({ error: 'Active binding not found' });
    }

    const generator_id = current.rows[0].generator_id;

    const result = await query(
      `UPDATE asset_bindings SET is_current = 0, unpaired_at = datetime('now'), unpaired_by_user_id = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [user.id, id]
    );

    // Clear generator's current_vehicle_id
    await query(`UPDATE generators SET current_vehicle_id = NULL, updated_at = NOW() WHERE id = $1`, [generator_id]);

    return result.rows[0];
  });

  // ===== GENERATOR COMPONENTS =====
  app.get('/generators/:id/components', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const { status } = request.query as { status?: string };

    let sql = `SELECT gc.*, u.username AS installed_by_user
               FROM generator_components gc
               LEFT JOIN users u ON u.id = gc.installed_by_user_id
               WHERE gc.generator_id = $1`;
    const params: any[] = [id];

    if (status) { sql += ' AND gc.status = $' + (params.length + 1); params.push(status); }
    sql += ' ORDER BY gc.component_type, gc.installed_at DESC';

    const result = await query(sql, params);
    return { components: result.rows };
  });

  app.post('/generators/:id/components', { preHandler: [app.authenticate, app.authorize('super_admin', 'dispatcher')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    const user = (request as any).user;
    const compId = uuid();

    // If installing a new component of same type, mark old one as removed
    if (data.component_type && data.status === 'active') {
      await query(
        `UPDATE generator_components SET status = 'removed', removed_at = datetime('now'), removed_by_user_id = $1, updated_at = NOW()
         WHERE generator_id = $2 AND component_type = $3 AND status = 'active'`,
        [user.id, id, data.component_type]
      );
    }

    const result = await query(
      `INSERT INTO generator_components (id, generator_id, component_type, serial_number, manufacturer, model, installed_at, installed_by_user_id, status, operating_hours_at_install, notes)
       VALUES ($1,$2,$3,$4,$5,$6,datetime('now'),$7,$8,$9,$10) RETURNING *`,
      [compId, id, data.component_type, data.serial_number || null, data.manufacturer || null, data.model || null,
       user.id, data.status || 'active', data.operating_hours_at_install || null, data.notes || null]
    );

    return reply.status(201).send(result.rows[0]);
  });

  app.patch('/components/:id', { preHandler: [app.authenticate, app.authorize('super_admin', 'dispatcher')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    const user = (request as any).user;

    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (const key of ['component_type', 'serial_number', 'manufacturer', 'model', 'status', 'operating_hours_at_install', 'operating_hours_at_removal', 'notes']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        params.push(data[key]);
      }
    }
    if (data.status === 'removed' && !data.removed_at) {
      fields.push(`removed_at = datetime('now')`);
      fields.push(`removed_by_user_id = $${idx++}`);
      params.push(user.id);
    }
    if (fields.length === 0) return reply.status(400).send({ error: 'No fields to update' });

    fields.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query(
      `UPDATE generator_components SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return reply.status(404).send({ error: 'Component not found' });
    return result.rows[0];
  });

  // ===== VEHICLE COMPONENTS =====
  app.get('/vehicles/:id/components', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const { status } = request.query as { status?: string };

    let sql = `SELECT vc.*, u.username AS installed_by_user
               FROM vehicle_components vc
               LEFT JOIN users u ON u.id = vc.installed_by_user_id
               WHERE vc.vehicle_id = $1`;
    const params: any[] = [id];

    if (status) { sql += ' AND vc.status = $' + (params.length + 1); params.push(status); }
    sql += ' ORDER BY vc.component_type, vc.installed_at DESC';

    const result = await query(sql, params);
    return { components: result.rows };
  });

  app.post('/vehicles/:id/components', { preHandler: [app.authenticate, app.authorize('super_admin', 'dispatcher')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    const user = (request as any).user;
    const compId = uuid();

    if (data.component_type && data.status === 'active') {
      await query(
        `UPDATE vehicle_components SET status = 'removed', removed_at = datetime('now'), removed_by_user_id = $1, updated_at = NOW()
         WHERE vehicle_id = $2 AND component_type = $3 AND status = 'active'`,
        [user.id, id, data.component_type]
      );
    }

    const result = await query(
      `INSERT INTO vehicle_components (id, vehicle_id, component_type, serial_number, manufacturer, model, installed_at, installed_by_user_id, status, mileage_at_install, notes)
       VALUES ($1,$2,$3,$4,$5,$6,datetime('now'),$7,$8,$9,$10) RETURNING *`,
      [compId, id, data.component_type, data.serial_number || null, data.manufacturer || null, data.model || null,
       user.id, data.status || 'active', data.mileage_at_install || null, data.notes || null]
    );

    return reply.status(201).send(result.rows[0]);
  });

  app.patch('/vehicle-components/:id', { preHandler: [app.authenticate, app.authorize('super_admin', 'dispatcher')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    const user = (request as any).user;

    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (const key of ['component_type', 'serial_number', 'manufacturer', 'model', 'status', 'mileage_at_install', 'mileage_at_removal', 'notes']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        params.push(data[key]);
      }
    }
    if (data.status === 'removed' && !data.removed_at) {
      fields.push(`removed_at = datetime('now')`);
      fields.push(`removed_by_user_id = $${idx++}`);
      params.push(user.id);
    }
    if (fields.length === 0) return reply.status(400).send({ error: 'No fields to update' });

    fields.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query(
      `UPDATE vehicle_components SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return reply.status(404).send({ error: 'Component not found' });
    return result.rows[0];
  });

  // ===== MAINTENANCE EVENTS =====
  app.get('/maintenance', { preHandler: [app.authenticate] }, async (request) => {
    const { asset_type, asset_id, event_type, status, from, to, limit } = request.query as {
      asset_type?: string; asset_id?: string; event_type?: string; status?: string; from?: string; to?: string; limit?: string;
    };

    let sql = `SELECT me.*, u.username AS performed_by_user
               FROM maintenance_events me
               LEFT JOIN users u ON u.id = me.performed_by_user_id
               WHERE 1=1`;
    const params: any[] = [];

    if (asset_type) { sql += ' AND me.asset_type = $' + (params.length + 1); params.push(asset_type); }
    if (asset_id) { sql += ' AND me.asset_id = $' + (params.length + 1); params.push(asset_id); }
    if (event_type) { sql += ' AND me.event_type = $' + (params.length + 1); params.push(event_type); }
    if (status) { sql += ' AND me.status = $' + (params.length + 1); params.push(status); }
    if (from) { sql += ' AND me.started_at >= $' + (params.length + 1); params.push(from); }
    if (to) { sql += ' AND me.started_at <= $' + (params.length + 1); params.push(to); }
    sql += ' ORDER BY me.started_at DESC';
    if (limit) { sql += ' LIMIT ' + parseInt(limit); }

    const result = await query(sql, params);
    return { events: result.rows };
  });

  app.post('/maintenance', { preHandler: [app.authenticate, app.authorize('super_admin', 'dispatcher')] }, async (request, reply) => {
    const data = request.body as any;
    const user = (request as any).user;
    const id = uuid();

    const result = await query(
      `INSERT INTO maintenance_events (id, asset_type, asset_id, event_type, title, description, started_at, completed_at, performed_by_user_id, performed_by_contractor, cost_myr, parts_replaced, meter_reading, next_due_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [id, data.asset_type, data.asset_id, data.event_type, data.title, data.description || null,
       data.started_at || new Date().toISOString(), data.completed_at || null,
       user.id, data.performed_by_contractor || null, data.cost_myr || null,
       JSON.stringify(data.parts_replaced || []), data.meter_reading || null,
       data.next_due_at || null, data.status || 'planned']
    );

    return reply.status(201).send(result.rows[0]);
  });

  app.patch('/maintenance/:id', { preHandler: [app.authenticate, app.authorize('super_admin', 'dispatcher')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;

    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (const key of ['event_type', 'title', 'description', 'started_at', 'completed_at', 'performed_by_contractor', 'cost_myr', 'parts_replaced', 'meter_reading', 'next_due_at', 'status']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        params.push(key === 'parts_replaced' ? JSON.stringify(data[key]) : data[key]);
      }
    }
    if (fields.length === 0) return reply.status(400).send({ error: 'No fields to update' });

    params.push(id);

    const result = await query(
      `UPDATE maintenance_events SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return reply.status(404).send({ error: 'Maintenance event not found' });
    return result.rows[0];
  });

  // ===== OPERATING HOURS / ODOMETER =====
  app.get('/generators/:id/hours', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const result = await query(
      `SELECT ghl.*
       FROM generator_hour_logs ghl
       WHERE ghl.generator_id = $1
       ORDER BY ghl.recorded_at DESC LIMIT 100`,
      [id]
    );
    return { hours: result.rows };
  });

  app.post('/generators/:id/hours', { preHandler: [app.authenticate, app.authorize('super_admin', 'dispatcher')] }, async (request, reply) => {
    const { id: genId } = request.params as { id: string };
    const { operating_hours, source, notes } = request.body as { operating_hours: number; source?: string; notes?: string };
    const user = (request as any).user;
    const logId = uuid();

    const result = await query(
      `INSERT INTO generator_hour_logs (id, generator_id, operating_hours, recorded_at, recorded_by_user_id, source, notes)
       VALUES ($1,$2,$3,datetime('now'),$4,$5,$6) RETURNING *`,
      [logId, genId, operating_hours, user.id, source || 'manual', notes || null]
    );

    return reply.status(201).send(result.rows[0]);
  });

  app.get('/vehicles/:id/odometer', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const result = await query(
      `SELECT vol.*, u.username AS recorded_by_user
       FROM vehicle_odometer_logs vol
       LEFT JOIN users u ON u.id = vol.recorded_by_user_id
       WHERE vol.vehicle_id = $1
       ORDER BY vol.recorded_at DESC LIMIT 100`,
      [id]
    );
    return { logs: result.rows };
  });

  app.post('/vehicles/:id/odometer', { preHandler: [app.authenticate, app.authorize('super_admin', 'dispatcher')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { odometer_km, source, notes } = request.body as { odometer_km: number; source?: string; notes?: string };
    const user = (request as any).user;
    const logId = uuid();

    const result = await query(
      `INSERT INTO vehicle_odometer_logs (id, vehicle_id, odometer_km, recorded_at, recorded_by_user_id, source, notes)
       VALUES ($1,$2,$3,datetime('now'),$4,$5,$6) RETURNING *`,
      [logId, id, odometer_km, user.id, source || 'manual', notes || null]
    );

    return reply.status(201).send(result.rows[0]);
  });

  app.get('/maintenance/schedule', { preHandler: [app.authenticate] }, async () => {
    const hoursThreshold = 500;
    const daysThreshold = 90;

    const generatorsDue = await query(
      `SELECT g.id, g.serial_no, g.brand, g.model, g.status, COALESCE(SUM(gh.hours_run), 0) as total_hours,
              MAX(gh.recorded_at) as last_hours_record,
              (SELECT COUNT(*) FROM maintenance_events me WHERE me.asset_type = 'generator' AND me.asset_id = g.id AND me.status IN ('pending','scheduled')) as pending_maintenance
       FROM generators g
       LEFT JOIN generator_hours gh ON gh.generator_id = g.id
       WHERE g.status != 'retired'
       GROUP BY g.id
       HAVING total_hours > $1 OR last_hours_record IS NULL OR last_hours_record < datetime('now', '-${daysThreshold} days')
       ORDER BY total_hours DESC`,
      [hoursThreshold]
    );

    const vehiclesDue = await query(
      `SELECT v.id, v.plate_no, v.make_model, v.status,
              (SELECT MAX(odometer_km) FROM vehicle_odometer_logs WHERE vehicle_id = v.id) as last_odometer,
              (SELECT recorded_at FROM vehicle_odometer_logs WHERE vehicle_id = v.id ORDER BY recorded_at DESC LIMIT 1) as last_odometer_date,
              (SELECT COUNT(*) FROM maintenance_events me WHERE me.asset_type = 'vehicle' AND me.asset_id = v.id AND me.status IN ('pending','scheduled')) as pending_maintenance
       FROM vehicles v
       WHERE v.status != 'removed'
       HAVING last_odometer_date IS NULL OR last_odometer_date < datetime('now', '-${daysThreshold} days')
       ORDER BY last_odometer DESC`
    );

    return {
      generators: generatorsDue.rows.map((g: any) => ({
        ...g,
        reason: g.total_hours >= hoursThreshold ? `Hours exceeded ${hoursThreshold}h (${Math.round(g.total_hours)}h)` : 'No recent hours record',
      })),
      vehicles: vehiclesDue.rows.map((v: any) => ({
        ...v,
        reason: v.last_odometer_date ? `Last odometer record > ${daysThreshold} days ago` : 'No odometer record',
      })),
    };
  });
}