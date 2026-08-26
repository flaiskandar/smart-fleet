declare const __BACKEND_URL__: string;

const DEV_API = '';
const PROD_FALLBACK = __BACKEND_URL__ || 'https://noble-zope-abraham-workstation.trycloudflare.com';
export const API_BASE = import.meta.env.DEV ? DEV_API : PROD_FALLBACK;
const BASE = API_BASE;

let token: string | null = localStorage.getItem('token');

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}

export function getToken() {
  return token;
}

interface User {
  id: string;
  username: string;
  role: 'super_admin' | 'dispatcher' | 'finance' | 'viewer';
}

export function getUser(): User | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasRole(...roles: string[]): boolean {
  const user = getUser();
  return user !== null && roles.includes(user.role);
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    setToken(null);
    window.location.href = `${import.meta.env.BASE_URL}login`;
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }

  return res.json();
}

export const auth = {
  login: (username: string, password: string) =>
    api<{ token: string; user: any }>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () => api<any>('/v1/auth/me'),
};

export const vehicles = {
  list: (params?: { type?: string; status?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return api<{ vehicles: any[] }>(`/v1/vehicles${q ? '?' + q : ''}`);
  },
  get: (id: string) => api<any>(`/v1/vehicles/${id}`),
  create: (data: any) =>
    api('/v1/vehicles', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    api(`/v1/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    api(`/v1/vehicles/${id}`, { method: 'DELETE' }),
  telemetry: (id: string, params?: { from?: string; to?: string; interval?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return api<{ telemetry: any[] }>(`/v1/vehicles/${id}/telemetry${q ? '?' + q : ''}`);
  },
  locations: () => api<{ locations: any[] }>('/v1/vehicles/locations'),
};

export const generators = {
  list: (status?: string) => {
    const q = status ? `?status=${status}` : '';
    return api<{ generators: any[] }>(`/v1/generators${q}`);
  },
  get: (id: string) => api<any>(`/v1/generators/${id}`),
  create: (data: any) =>
    api('/v1/generators', { method: 'POST', body: JSON.stringify(data) }),
  updateBeacon: (id: string, beacon_id: string) =>
    api(`/v1/generators/${id}/beacon`, { method: 'PUT', body: JSON.stringify({ beacon_id }) }),
  currentBindings: () => api<{ bindings: any[] }>('/v1/bindings/current'),
};

export const jobs = {
  list: (params?: { status?: string; client_id?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return api<{ jobs: any[] }>(`/v1/jobs${q ? '?' + q : ''}`);
  },
  get: (id: string) => api<any>(`/v1/jobs/${id}`),
  create: (data: any) =>
    api('/v1/jobs', { method: 'POST', body: JSON.stringify(data) }),
  assign: (id: string, data: any) =>
    api(`/v1/jobs/${id}/assign`, { method: 'PATCH', body: JSON.stringify(data) }),
  dispatch: (id: string) =>
    api(`/v1/jobs/${id}/dispatch`, { method: 'POST', body: '{}' }),
  interrupt: (id: string, reason: string) =>
    api(`/v1/jobs/${id}/interrupt`, { method: 'POST', body: JSON.stringify({ reason }) }),
  complete: (id: string) =>
    api(`/v1/jobs/${id}/complete`, { method: 'POST', body: '{}' }),
  submitPod: (id: string, data: any) =>
    api(`/v1/jobs/${id}/pod`, { method: 'POST', body: JSON.stringify(data) }),
  updateRevenue: (id: string, data: { revenue_amount?: number; revenue_currency?: string; invoice_number?: string; invoice_status?: string }) =>
    api(`/v1/jobs/${id}/assign`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export const fuel = {
  logs: (params?: { vehicle_id?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return api<{ fuel_logs: any[] }>(`/v1/fuel/logs${q ? '?' + q : ''}`);
  },
  anomalies: () => api<{ anomalies: any[] }>('/v1/fuel/anomalies'),
  importCard: (entries: any[]) =>
    api('/v1/fuel/card/import', { method: 'POST', body: JSON.stringify({ entries }) }),
};

export const geofences = {
  list: () => api<{ geofences: any[] }>('/v1/geofences'),
  events: (id: string, params?: { from?: string; to?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return api<{ events: any[] }>(`/v1/geofences/${id}/events${q ? '?' + q : ''}`);
  },
  slaReports: (client_id?: string) => {
    const q = client_id ? `?client_id=${client_id}` : '';
    return api<{ sla_reports: any[] }>(`/v1/sla/reports${q}`);
  },
};

export const syncApi = {
  queue: () => api<{ pending: any; records: any }>('/v1/sync/staging-queue'),
  errors: () => api<{ fuel_logs: any[]; delivery_orders: any[] }>('/v1/sync/errors'),
  logs: () => api<{ sync_logs: any[] }>('/v1/sync/logs'),
  retry: (id: string, table: string) =>
    api(`/v1/sync/retry/${id}?table=${table}`, { method: 'POST' }),
};

export const clients = {
  list: () => api<{ clients: any[] }>('/v1/clients'),
  create: (data: any) =>
    api('/v1/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    api(`/v1/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  sites: (clientId: string) => api<{ sites: any[] }>(`/v1/clients/${clientId}/sites`),
  createSite: (clientId: string, data: any) =>
    api(`/v1/clients/${clientId}/sites`, { method: 'POST', body: JSON.stringify(data) }),
  updateSite: (clientId: string, siteId: string, data: any) =>
    api(`/v1/clients/${clientId}/sites/${siteId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSite: (clientId: string, siteId: string) =>
    api(`/v1/clients/${clientId}/sites/${siteId}`, { method: 'DELETE' }),
};

export const employees = {
  list: (role?: string) => {
    const q = role ? `?role=${role}` : '';
    return api<{ employees: any[] }>(`/v1/employees${q}`);
  },
};

export const notifications = {
  list: () => api<{ notifications: any[] }>('/v1/notifications'),
  unreadCount: () => api<{ count: number }>('/v1/notifications/unread-count'),
  markRead: (ids: string[]) =>
    api('/v1/notifications/mark-read', { method: 'POST', body: JSON.stringify({ ids }) }),
  markAllRead: () =>
    api('/v1/notifications/mark-all-read', { method: 'POST' }),
};

export const availability = {
  sales: () => api<{
    generators: { available: number; bySpec: any[]; details: any[] };
    vehicles: { available: number; byType: any[]; details: any[] };
    upcomingReturns: any[];
  }>('/v1/availability/sales'),
  calendar: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return api<{
      dateRange: { from: string; to: string };
      generators: any[];
      vehicles: any[];
    }>(`/v1/availability/calendar${params.toString() ? '?' + params.toString() : ''}`);
  },
};

export const assetTraceability = {
  bindings: {
    list: (params?: { vehicle_id?: string; generator_id?: string; current_only?: boolean }) => {
      const q = new URLSearchParams(params as any).toString();
      return api<{ bindings: any[] }>(`/v1/asset-bindings${q ? '?' + q : ''}`);
    },
    current: () => api<{ bindings: any[] }>('/v1/asset-bindings/current'),
    create: (data: { vehicle_id: string; generator_id: string; notes?: string }) =>
      api('/v1/asset-bindings', { method: 'POST', body: JSON.stringify(data) }),
    unpair: (id: string) => api(`/v1/asset-bindings/${id}/unpair`, { method: 'PATCH' }),
  },
  components: {
    generator: {
      list: (generatorId: string, status?: string) => {
        const q = status ? `?status=${status}` : '';
        return api<{ components: any[] }>(`/v1/generators/${generatorId}/components${q}`);
      },
      create: (generatorId: string, data: any) =>
        api(`/v1/generators/${generatorId}/components`, { method: 'POST', body: JSON.stringify(data) }),
      update: (componentId: string, data: any) =>
        api(`/v1/components/${componentId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    },
    vehicle: {
      list: (vehicleId: string, status?: string) => {
        const q = status ? `?status=${status}` : '';
        return api<{ components: any[] }>(`/v1/vehicles/${vehicleId}/components${q}`);
      },
      create: (vehicleId: string, data: any) =>
        api(`/v1/vehicles/${vehicleId}/components`, { method: 'POST', body: JSON.stringify(data) }),
      update: (componentId: string, data: any) =>
        api(`/v1/vehicle-components/${componentId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    },
  },
  maintenance: {
    list: (params?: { asset_type?: string; asset_id?: string; event_type?: string; status?: string; from?: string; to?: string; limit?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return api<{ events: any[] }>(`/v1/maintenance${q ? '?' + q : ''}`);
    },
    create: (data: any) =>
      api('/v1/maintenance', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      api(`/v1/maintenance/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  hours: {
    generator: {
      list: (generatorId: string) => api<{ logs: any[] }>(`/v1/generators/${generatorId}/hours`),
      create: (generatorId: string, data: { operating_hours: number; source?: string; notes?: string }) =>
        api(`/v1/generators/${generatorId}/hours`, { method: 'POST', body: JSON.stringify(data) }),
    },
    vehicle: {
      list: (vehicleId: string) => api<{ logs: any[] }>(`/v1/vehicles/${vehicleId}/odometer`),
      create: (vehicleId: string, data: { odometer_km: number; source?: string; notes?: string }) =>
        api(`/v1/vehicles/${vehicleId}/odometer`, { method: 'POST', body: JSON.stringify(data) }),
    },
  },
};

export const quotes = {
  list: (params?: { status?: string; client_id?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return api<{ quotes: any[] }>(`/v1/quotes${q ? '?' + q : ''}`);
  },
  get: (id: string) => api<any>(`/v1/quotes/${id}`),
  create: (data: any) => api('/v1/quotes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => api(`/v1/quotes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => api(`/v1/quotes/${id}`, { method: 'DELETE' }),
};