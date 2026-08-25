import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { query } from '../lib/db.js';
import { config } from '../config.js';

type ChatMessage = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string };

interface ToolSpec {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

const tools: ToolSpec[] = [
  {
    type: 'function',
    function: {
      name: 'get_fleet_summary',
      description: 'Get an overview of the whole fleet: vehicle counts by status, generator counts by status, active jobs, pending jobs, fuel anomalies, and quote pipeline. Use this for general questions like "how are we doing?" or "give me a summary".',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_vehicles',
      description: 'List fleet vehicles with plate number, type, model, status, driver, and odometer. Optionally filter by status: active, maintenance, or retired.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'maintenance', 'retired'], description: 'Optional status filter' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_generators',
      description: 'List generators with serial number, brand, model, kVA rating, and status (available, deployed, maintenance, retired). Optionally filter by status.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['available', 'deployed', 'maintenance', 'retired'], description: 'Optional status filter' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_jobs',
      description: 'List trip/dispatch jobs with job number, client, site, type, status, priority, revenue, driver and SLA info. Optionally filter by status (pending, dispatched, en_route, on_site, completed, cancelled, interrupted). Newest first, max 20.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Optional job status filter' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_fuel_anomalies',
      description: 'List recent fuel anomaly events (possible fuel theft/drainage or data errors) with vehicle, litres, cost, location and when it happened.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_revenue_summary',
      description: 'Get revenue totals from completed jobs, invoice status breakdown, and sales quote pipeline totals by status.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_clients',
      description: 'List clients with company name, contact person, phone and email.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_records',
      description: 'Search across vehicles, generators, jobs and clients by keyword (plate number, serial number, job number, client name, address etc).',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search keyword' },
        },
        required: ['q'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_trip_job',
      description: 'Create a NEW pending dispatch job in the system from collected information. Use when the user provides job details e.g. from a WhatsApp message or phone call. Resolves the client by name automatically. Only create when you have at least a client name AND a site address. IMPORTANT: if the user mentions an emergency/urgent situation pass job_type "emergency"; if they mention a priority level always pass it through exactly as stated. Never omit details the user explicitly gave.',
      parameters: {
        type: 'object',
        properties: {
          client_name: { type: 'string', description: 'Client company name' },
          site_address: { type: 'string', description: 'Site address for the job' },
          job_type: { type: 'string', enum: ['emergency', 'planned_shutdown', 'standby_contract'], description: 'Type of job — REQUIRED if user said emergency/urgent use "emergency", otherwise default "planned_shutdown"' },
          priority: { type: 'string', enum: ['low', 'normal', 'high', 'critical'], description: 'Pass through any priority the user stated (e.g. critical, urgent→high). Default normal.' },
          sla_minutes: { type: 'number', description: 'Only set if user explicitly gives a response-time in minutes' },
          notes: { type: 'string', description: 'Extra notes about the job — include any extra context the user gave' },
        },
        required: ['client_name', 'site_address'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_fuel_entry',
      description: 'Record a fuel fill-up log entry for a vehicle. Use when the user reports fueling info e.g. "WB 1234 took 50 litres at Petron KL for RM180". Resolves the vehicle by plate number.',
      parameters: {
        type: 'object',
        properties: {
          plate_no: { type: 'string', description: 'Vehicle plate number' },
          litres: { type: 'number', description: 'Litres filled' },
          cost: { type: 'number', description: 'Total cost in MYR' },
          location: { type: 'string', description: 'Station or place of fueling' },
          odometer_km: { type: 'number', description: 'Odometer reading if provided' },
        },
        required: ['plate_no', 'litres'],
      },
    },
  },
];

async function executeTool(name: string, args: any): Promise<any> {
  switch (name) {
    case 'get_fleet_summary': {
      const vehicles = await query(`SELECT status, COUNT(*) AS count FROM vehicles GROUP BY status`);
      const gens = await query(`SELECT status, COUNT(*) AS count FROM generators GROUP BY status`);
      const jobs = await query(
        `SELECT SUM(CASE WHEN status IN ('pending','dispatched','en_route','on_site') THEN 1 ELSE 0 END) AS active_jobs,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_jobs,
                COUNT(*) AS total_jobs FROM trip_jobs`
      );
      const anomalies = await query(
        `SELECT COUNT(*) AS count FROM fuel_logs WHERE anomaly_type IS NOT NULL AND recorded_at >= datetime('now', '-7 days')`
      );
      const quotes = await query(`SELECT status, COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS amount FROM quotes GROUP BY status`);
      return {
        vehicles_by_status: Object.fromEntries(vehicles.rows.map(r => [r.status, r.count])),
        generators_by_status: Object.fromEntries(gens.rows.map(r => [r.status, r.count])),
        active_jobs: jobs.rows[0]?.active_jobs ?? 0,
        pending_jobs: jobs.rows[0]?.pending_jobs ?? 0,
        total_jobs: jobs.rows[0]?.total_jobs ?? 0,
        fuel_anomalies_last_7_days: anomalies.rows[0]?.count ?? 0,
        quotes_pipeline: quotes.rows,
      };
    }
    case 'list_vehicles': {
      const status = args?.status;
      const r = await query(
        `SELECT v.plate_no, v.vehicle_type, v.make_model, v.year, v.status, v.driver_name, v.chargeman_name,
                v.current_odometer_km, t.fuel_level_pct
         FROM vehicles v
         LEFT JOIN vehicle_telemetry t ON t.id = (
           SELECT id FROM vehicle_telemetry WHERE vehicle_id = v.id ORDER BY recorded_at DESC LIMIT 1
         )
         ${status ? 'WHERE v.status = $1' : ''}
         ORDER BY v.plate_no`,
        status ? [status] : undefined
      );
      return { count: r.rows.length, vehicles: r.rows };
    }
    case 'list_generators': {
      const status = args?.status;
      const r = await query(
        `SELECT g.serial_no, g.brand, g.model, g.power_kva, g.voltage_rating, g.status, v.plate_no AS on_vehicle
         FROM generators g LEFT JOIN vehicles v ON g.current_vehicle_id = v.id
         ${status ? 'WHERE g.status = $1' : ''}
         ORDER BY g.serial_no`,
        status ? [status] : undefined
      );
      return { count: r.rows.length, generators: r.rows };
    }
    case 'list_jobs': {
      const status = args?.status;
      const r = await query(
        `SELECT tj.job_number, tj.job_type, tj.status, tj.priority, tj.site_address, tj.sla_minutes,
                tj.dispatched_at, tj.site_arrival_at, tj.completed_at, tj.revenue_amount, tj.invoice_status,
                c.name AS client_name, v.plate_no, d.name AS driver_name
         FROM trip_jobs tj
         LEFT JOIN clients c ON tj.client_id = c.id
         LEFT JOIN vehicles v ON tj.vehicle_id = v.id
         LEFT JOIN employees d ON tj.driver_id = d.id
         ${status ? 'WHERE tj.status = $1' : ''}
         ORDER BY tj.created_at DESC LIMIT 20`,
        status ? [status] : undefined
      );
      return { count: r.rows.length, jobs: r.rows };
    }
    case 'get_fuel_anomalies': {
      const r = await query(
        `SELECT f.litres, f.cost, f.location, f.anomaly_type, f.recorded_at, f.probe_reading_pct,
                v.plate_no, v.make_model
         FROM fuel_logs f LEFT JOIN vehicles v ON f.vehicle_id = v.id
         WHERE f.anomaly_type IS NOT NULL
         ORDER BY f.recorded_at DESC LIMIT 15`
      );
      return { count: r.rows.length, anomalies: r.rows };
    }
    case 'get_revenue_summary': {
      const completed = await query(
        `SELECT COUNT(*) AS jobs, COALESCE(SUM(revenue_amount),0) AS total_revenue
         FROM trip_jobs WHERE status = 'completed'`
      );
      const invoices = await query(
        `SELECT invoice_status, COUNT(*) AS count, COALESCE(SUM(revenue_amount),0) AS amount
         FROM trip_jobs WHERE invoice_number IS NOT NULL GROUP BY invoice_status`
      );
      const quotes = await query(
        `SELECT status, COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS amount FROM quotes GROUP BY status`
      );
      return {
        completed_jobs: completed.rows[0],
        invoices_by_status: invoices.rows,
        quotes_by_status: quotes.rows,
      };
    }
    case 'list_clients': {
      const r = await query(
        `SELECT name, contact_person, phone, email, billing_address, is_active FROM clients ORDER BY name`
      );
      return { count: r.rows.length, clients: r.rows };
    }
    case 'search_records': {
      const term = `%${String(args?.q || '').trim()}%`;
      if (!args?.q || String(args.q).trim().length < 2) return { results: [], note: 'Keyword too short' };
      const [v, g, j, c] = await Promise.all([
        query(`SELECT plate_no, make_model, status FROM vehicles WHERE plate_no ILIKE $1 OR make_model ILIKE $1 LIMIT 5`, [term]),
        query(`SELECT serial_no, brand, model, power_kva, status FROM generators WHERE serial_no ILIKE $1 OR brand ILIKE $1 OR model ILIKE $1 LIMIT 5`, [term]),
        query(`SELECT job_number, job_type, status, site_address FROM trip_jobs WHERE job_number ILIKE $1 OR site_address ILIKE $1 OR notes ILIKE $1 LIMIT 5`, [term]),
        query(`SELECT name, contact_person, phone FROM clients WHERE name ILIKE $1 OR contact_person ILIKE $1 LIMIT 5`, [term]),
      ]);
      return { vehicles: v.rows, generators: g.rows, jobs: j.rows, clients: c.rows };
    }
    case 'create_trip_job': {
      const clientName = String(args.client_name || '').trim();
      const siteAddress = String(args.site_address || '').trim();
      if (!clientName || !siteAddress) return { error: 'client_name and site_address are required' };

      const clientRes = await query(
        `SELECT id, name FROM clients WHERE name ILIKE $1 ORDER BY LENGTH(name) ASC LIMIT 1`, [`%${clientName}%`]
      );
      let clientId = clientRes.rows[0]?.id ?? null;
      let clientNote = clientRes.rows[0]
        ? `Matched to existing client "${clientRes.rows[0].name}"`
        : null;

      const jobNumber = `JOB-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
      const jobType = ['emergency', 'planned_shutdown', 'standby_contract'].includes(args.job_type) ? args.job_type : 'planned_shutdown';
      const priority = ['low', 'normal', 'high', 'critical'].includes(args.priority) ? args.priority : 'normal';
      const sla = Number.isFinite(Number(args.sla_minutes)) && Number(args.sla_minutes) > 0 ? Number(args.sla_minutes) : 60;

      const ins = await query(
        `INSERT INTO trip_jobs (id, job_number, client_id, site_address, job_type, status, priority, sla_minutes, notes)
         VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8) RETURNING id, job_number, status`,
        [randomUUID(), jobNumber, clientId, siteAddress, jobType, priority, sla, args.notes || null]
      );
      return {
        created: true,
        job: ins.rows[0],
        note: clientNote || 'No matching client found — job saved without client link. Link it manually in Dispatch.',
      };
    }
    case 'log_fuel_entry': {
      const plate = String(args.plate_no || '').trim().toUpperCase();
      const litres = Number(args.litres);
      if (!plate || !Number.isFinite(litres) || litres <= 0) return { error: 'plate_no and positive litres are required' };

      let vehicle = (
        await query(`SELECT id, plate_no FROM vehicles WHERE REPLACE(UPPER(plate_no),' ','') = $1 LIMIT 1`, [plate.replace(/\s+/g, '')])
      ).rows[0];
      if (!vehicle) {
        vehicle = (
          await query(`SELECT id, plate_no FROM vehicles WHERE UPPER(plate_no) LIKE $1 LIMIT 1`, [`%${plate}%`])
        ).rows[0];
      }
      if (!vehicle) return { error: `No vehicle found with plate "${args.plate_no}". Check the plate number.` };

      const ins = await query(
        `INSERT INTO fuel_logs (id, vehicle_id, litres, cost, location, odometer_km)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [randomUUID(), vehicle.id, litres, Number(args.cost) || null, args.location || null, Number(args.odometer_km) || null]
      );
      return {
        created: true,
        fuel_log_id: ins.rows[0].id,
        vehicle: vehicle.plate_no,
        litres,
        note: 'Fuel entry recorded.',
      };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export default async function assistantRoutes(app: FastifyInstance) {
  app.post('/assistant/chat', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = request.body as { messages: ChatMessage[] };
    const history = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    if (history.length === 0) return reply.status(400).send({ error: 'messages array is required' });

    const systemPrompt: ChatMessage = {
      role: 'system',
      content:
        `You are the Smart Fleet Assistant for Express Powerr Sdn Bhd, a Malaysian company that rents out diesel generators and provides utility support vehicles for TNB/SESB contracts. Today is ${new Date().toISOString().split('T')[0]}.\n\n` +
        `You have two jobs:\n` +
        `1. ANSWER QUESTIONS about live fleet data using your tools (fleet summary, vehicles, generators, jobs, fuel anomalies, revenue, clients, search). Always call tools to get real numbers — never invent data. Amounts are in Malaysian Ringgit (RM).\n` +
        `2. COLLECT DATA into the system: when the user pastes raw text like WhatsApp messages, phone-call notes or fuel receipts, extract the details and use create_trip_job or log_fuel_entry to save records. Before creating anything, confirm missing essentials with the user (job needs client + site address; fuel needs plate number + litres). CRITICAL: carry over EVERY detail the user stated into the tool arguments — if they said emergency, pass job_type "emergency"; if they said critical/urgent, pass that priority. After creating, tell the user what was saved (e.g. the job number).\n\n` +
        `Rules: be concise and practical. Use RM for money. If a tool returns empty data say so plainly. If asked something unrelated to the fleet system, politely redirect. Never delete or modify records — you can only create jobs and fuel entries.`,
    };

    const messages: ChatMessage[] = [systemPrompt, ...history];
    const actions: { tool: string; summary: string }[] = [];

    try {
      for (let i = 0; i < 6; i++) {
        const res = await fetch(`${config.ollamaUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: config.ollamaModel, messages, tools, stream: false }),
          signal: AbortSignal.timeout(180_000),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Ollama error ${res.status}: ${text.slice(0, 200)}`);
        }
        const data: any = await res.json();
        const msg = data.message;

        if (msg.tool_calls && msg.tool_calls.length > 0) {
          messages.push({ role: 'assistant', content: msg.content || '' });
          for (const tc of msg.tool_calls) {
            const fnName = tc.function.name;
            let fnArgs = tc.function.arguments;
            if (typeof fnArgs === 'string') {
              try { fnArgs = JSON.parse(fnArgs); } catch { fnArgs = {}; }
            }
            let result: any;
            try {
              result = await executeTool(fnName, fnArgs);
            } catch (err: any) {
              result = { error: err.message };
            }
            if (result?.error || result?.created === false) {
              console.log(`[assistant] ${fnName} args=${JSON.stringify(fnArgs)} -> ${JSON.stringify(result)}`);
            }
            actions.push({
              tool: fnName,
              summary: summarizeAction(fnName, fnArgs, result),
            });
            messages.push({ role: 'tool', content: JSON.stringify(result).slice(0, 8000) });
          }
          continue;
        }

        return reply.send({ reply: msg.content || '', actions });
      }
      return reply.send({ reply: 'Sorry, I could not finish processing that. Please try rephrasing.', actions });
    } catch (err: any) {
      const hint = err.cause?.code === 'ECONNREFUSED'
        ? 'AI service (Ollama) is not running. Start it with: ollama serve'
        : err.message;
      return reply.status(503).send({ error: hint });
    }
  });

  app.get('/assistant/status', { preHandler: [app.authenticate] }, async () => {
    try {
      const res = await fetch(`${config.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error('bad status');
      const data: any = await res.json();
      const hasModel = (data.models || []).some((m: any) => m.name.startsWith(config.ollamaModel));
      return { available: true, model: config.ollamaModel, modelLoaded: hasModel };
    } catch {
      return { available: false, model: config.ollamaModel, modelLoaded: false };
    }
  });
}

function summarizeAction(fnName: string, args: any, result: any): string {
  switch (fnName) {
    case 'create_trip_job':
      return result.created ? `Created job ${result.job?.job_number}` : `Job creation failed`;
    case 'log_fuel_entry':
      return result.created ? `Logged ${result.litres}L fuel for ${result.vehicle}` : `Fuel logging failed`;
    case 'get_fleet_summary': return 'Queried fleet overview';
    case 'list_vehicles': return `Queried vehicles${args?.status ? ` (${args.status})` : ''}`;
    case 'list_generators': return `Queried generators${args?.status ? ` (${args.status})` : ''}`;
    case 'list_jobs': return `Queried jobs${args?.status ? ` (${args.status})` : ''}`;
    case 'get_fuel_anomalies': return 'Queried fuel anomalies';
    case 'get_revenue_summary': return 'Queried revenue';
    case 'list_clients': return 'Queried clients';
    case 'search_records': return `Searched "${args?.q}"`;
    default: return fnName;
  }
}
