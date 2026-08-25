import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReceiptText, RefreshCw, BarChart3, TrendingUp, Wallet, BadgeCheck, Clock3,
  CalendarPlus, CalendarDays, StickyNote, MessageSquare, CheckCircle2, Rocket,
  Wrench, Boxes, Truck, Zap, Link2, Siren, ClipboardList, ChevronLeft,
  ChevronRight, X, Trash2, AlertTriangle,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { availability as availabilityApi, api, jobs as jobsApi, clients as clientsApi, vehicles as vehiclesApi, generators as generatorsApi, assetTraceability, quotes as quotesApi, hasRole } from '../api/client';

type Tab = 'overview' | 'revenue' | 'calendar' | 'notes' | 'quote' | 'book';

interface QuickNote { id: string; text: string; created_at: string; }

export default function Sales() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showQuote, setShowQuote] = useState(false);
  const [quoteVehicle, setQuoteVehicle] = useState('');
  const [quoteGenerator, setQuoteGenerator] = useState('');
  const [quoteHours, setQuoteHours] = useState(0);
  const [quoteRate, setQuoteRate] = useState(0);
  const [copyText, setCopyText] = useState('');
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calJobs, setCalJobs] = useState<any[]>([]);
  const [dayJobs, setDayJobs] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [clientList, setClientList] = useState<any[]>([]);
  const [siteList, setSiteList] = useState<any[]>([]);
  const [vehicleList, setVehicleList] = useState<any[]>([]);
  const [generatorList, setGeneratorList] = useState<any[]>([]);
  const [bindings, setBindings] = useState<any[]>([]);
  const [bookForm, setBookForm] = useState({
    client_id: '', site_id: '', asset_type: 'paired' as 'vehicle' | 'generator' | 'paired',
    vehicle_id: '', generator_id: '', job_type: 'standby_contract',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    revenue_amount: '', invoice_number: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [savedQuotes, setSavedQuotes] = useState<any[]>([]);
  const [quoteStatusFilter, setQuoteStatusFilter] = useState('');

  const fmt = (n: number) => 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-MY', { month: 'short', year: 'numeric' }) : '-';
  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white';

  const invoiceColor: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    sent: 'bg-blue-100 text-blue-700 border border-blue-200',
    pending: 'bg-amber-100 text-amber-700 border border-amber-200',
    overdue: 'bg-red-100 text-red-700 border border-red-200',
  };

  const fetchStats = () => {
    setLoading(true);
    availabilityApi.sales().then((res: any) => setStats(res)).catch(console.error).finally(() => setLoading(false));
  };

  const fetchBookings = () => {
    jobsApi.list().then((r: any) => setBookings(r.jobs || []) as any).catch(() => {});
  };

  const fetchQuotes = () => {
    quotesApi.list().then((r: any) => setSavedQuotes(r.quotes || []) as any).catch(() => {});
  };

  const fetchCalJobs = useCallback(() => {
    const first = new Date(calYear, calMonth, 1);
    const last = new Date(calYear, calMonth + 1, 0);
    availabilityApi.calendar(first.toISOString().split('T')[0], last.toISOString().split('T')[0])
      .then((res: any) => {
        const gens = (res.generators || []).flatMap((g: any) => (g.timeline || []).map((t: any) => ({ ...t, asset_type: 'generator', serial_no: g.serial_no, brand: g.brand, model: g.model })));
        const vehs = (res.vehicles || []).flatMap((v: any) => (v.timeline || []).map((t: any) => ({ ...t, asset_type: 'vehicle', plate_no: v.plate_no, vehicle_type: v.vehicle_type })));
        setCalJobs([...gens, ...vehs]);
      }).catch(() => setCalJobs([]));
  }, [calMonth, calYear]);

  const fetchDayJobs = useCallback((date: string) => {
    setSelectedDay(date);
    const next = new Date(new Date(date).getTime() + 86400000).toISOString().split('T')[0];
    availabilityApi.calendar(date, next)
      .then((res: any) => {
        const gens = (res.generators || []).map((g: any) => ({ ...g, asset_type: 'generator' }));
        const vehs = (res.vehicles || []).map((v: any) => ({ ...v, asset_type: 'vehicle' }));
        setDayJobs([...gens, ...vehs]);
      }).catch(() => setDayJobs([]));
  }, []);

  const fetchNotes = useCallback(() => {
    api<any>('/v1/quick-notes').then(r => setNotes(r.notes || []) as any).catch(() => setNotes([
      { id: '1', text: 'Petronas Kerteh extension request - 3 months', created_at: new Date(Date.now() - 172800000).toISOString() },
      { id: '2', text: 'TNB KLCC standby contract renewal due Aug', created_at: new Date(Date.now() - 86400000).toISOString() },
      { id: '3', text: 'SESB Shah Alam requested quote for 2nd generator', created_at: new Date().toISOString() },
    ] as any));
  }, []);

  const saveNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    const note: QuickNote = { id: String(Date.now()), text: newNote.trim(), created_at: new Date().toISOString() };
    setNotes(prev => [note, ...prev]);
    setNewNote('');
    try { await api('/v1/quick-notes', { method: 'POST', body: JSON.stringify({ text: note.text }) }); } catch { /* ok */ }
    setSavingNote(false);
  };

  const deleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    try { await api(`/v1/quick-notes/${id}`, { method: 'DELETE' }); } catch { /* ok */ }
  };

  useEffect(() => { fetchStats(); fetchNotes(); }, []);
  useEffect(() => { fetchCalJobs(); }, [fetchCalJobs]);
  useEffect(() => { if (selectedDay) fetchDayJobs(selectedDay); }, [selectedDay]);

  useEffect(() => {
    if (activeTab === 'book') {
      Promise.all([
        clientsApi.list().then((r: any) => setClientList(r.clients || [])),
        vehiclesApi.list().then((r: any) => setVehicleList(r.vehicles || [])),
        generatorsApi.list().then((r: any) => setGeneratorList(r.generators || [])),
        assetTraceability.bindings.current().then((r: any) => setBindings(r.bindings || []) as any).catch(() => {}),
      ]).catch(console.error);
      fetchBookings();
    }
    if (activeTab === 'quote') {
      fetchQuotes();
    }
  }, [activeTab]);

  useEffect(() => {
    if (bookForm.client_id) {
      api<{ sites: any[] }>('/v1/clients/' + bookForm.client_id + '/sites').then(r => setSiteList(r.sites || []) as any).catch(() => setSiteList([]));
    } else {
      setSiteList([]);
    }
  }, [bookForm.client_id]);

  const filteredSites = useMemo(() => {
    if (!bookForm.client_id) return siteList;
    return siteList.filter((s: any) => s.client_id === bookForm.client_id);
  }, [bookForm.client_id, siteList]);

  const availableVehicles = useMemo(() => vehicleList.filter((v: any) => v.status === 'active'), [vehicleList]);
  const availableGenerators = useMemo(() => generatorList.filter((g: any) => g.status === 'available'), [generatorList]);
  const pairedGenerators = useMemo(() => {
    const genIds = new Set(bindings.map((b: any) => b.generator_id));
    return availableGenerators.filter((g: any) => genIds.has(g.id));
  }, [availableGenerators, bindings]);

  const handleBook = async () => {
    if (!bookForm.client_id || !bookForm.site_id) { setError('Select client and site'); return; }
    if (bookForm.asset_type === 'vehicle' && !bookForm.vehicle_id) { setError('Select a vehicle'); return; }
    if (bookForm.asset_type === 'generator' && !bookForm.generator_id) { setError('Select a generator'); return; }
    if (bookForm.asset_type === 'paired' && (!bookForm.vehicle_id || !bookForm.generator_id)) { setError('Select a vehicle and generator'); return; }
    const durationDays = Math.max(1, Math.ceil((new Date(bookForm.end_date).getTime() - new Date(bookForm.start_date).getTime()) / 86400000));
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await jobsApi.create({
        client_id: bookForm.client_id, site_id: bookForm.site_id,
        site_address: filteredSites.find((s: any) => s.id === bookForm.site_id)?.address || '',
        job_type: bookForm.job_type, sla_minutes: durationDays * 24 * 60,
        vehicle_id: bookForm.asset_type !== 'generator' ? bookForm.vehicle_id : undefined,
        generator_id: bookForm.asset_type !== 'vehicle' ? bookForm.generator_id : undefined,
        revenue_amount: bookForm.revenue_amount ? parseFloat(bookForm.revenue_amount) : 0,
        invoice_number: bookForm.invoice_number || undefined,
        notes: bookForm.notes || `Booked by sales: ${bookForm.start_date} to ${bookForm.end_date} (${durationDays} days)`,
      });
      setBookForm({ client_id: '', site_id: '', asset_type: 'paired', vehicle_id: '', generator_id: '', job_type: 'standby_contract', start_date: new Date().toISOString().split('T')[0], end_date: new Date(Date.now() + 604800000).toISOString().split('T')[0], revenue_amount: '', invoice_number: '', notes: '' });
      setSuccess('Booking created!');
      fetchStats();
      fetchBookings();
    } catch (err: any) { setError(err?.message || 'Failed to create booking'); }
    finally { setSubmitting(false); }
  };

  const calDays = useMemo(() => {
    const first = new Date(calYear, calMonth, 1);
    const last = new Date(calYear, calMonth + 1, 0);
    const days: (number | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(d);
    return days;
  }, [calMonth, calYear]);

  const jobsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    calJobs.forEach(j => {
      const key = (j.dispatched_at || j.created_at || '').slice(0, 10);
      if (key) { if (!map[key]) map[key] = []; map[key].push(j); }
    });
    return map;
  }, [calJobs]);

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };
  const goToToday = () => { setCalMonth(new Date().getMonth()); setCalYear(new Date().getFullYear()); setSelectedDay(new Date().toISOString().split('T')[0]); };
  const monthLabel = new Date(calYear, calMonth).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().toISOString().split('T')[0];
  const maxRevenue = Math.max(...(stats?.revenue_by_month || []).map((r: any) => r.revenue), 1);

  const kpiGrid = [
    { label: 'Available', value: stats?.available_assets || 0, accent: 'text-emerald-600', icon: CheckCircle2 },
    { label: 'Deployed', value: stats?.deployed_assets || 0, accent: 'text-blue-600', icon: Rocket },
    { label: 'Maintenance', value: stats?.maintenance_assets || 0, accent: 'text-amber-600', icon: Wrench },
    { label: 'Total Active', value: stats?.total_active_assets || 0, accent: 'text-indigo-600', icon: Boxes },
  ];

  const revenueKpis = stats?.revenue ? [
    { label: 'Total Revenue', value: fmt(stats.revenue.total), accent: 'text-emerald-600', icon: Wallet },
    { label: 'Collected', value: fmt(stats.revenue.collected), accent: 'text-blue-600', icon: BadgeCheck },
    { label: 'Pending', value: fmt(stats.revenue.pending), accent: 'text-amber-600', icon: Clock3 },
    { label: 'Avg Job Value', value: fmt(stats.revenue.avg_job_value), accent: 'text-indigo-600', icon: BarChart3 },
  ] : [];

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-emerald-100 text-emerald-700', dispatched: 'bg-blue-100 text-blue-700',
      en_route: 'bg-yellow-100 text-yellow-700', on_site: 'bg-purple-100 text-purple-700',
      cancelled: 'bg-red-100 text-red-700', interrupted: 'bg-red-200 text-red-800',
    };
    return colors[s] || 'bg-gray-100 text-gray-700';
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); setCopyText(text); setTimeout(() => setCopyText(''), 2000); };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ReceiptText}
        title="Sales Dashboard"
        subtitle="Revenue, calendar, notes & quick quoting"
        actions={
          <button onClick={fetchStats} className="btn-secondary inline-flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        }
      />

      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</span>
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" />{success}</span>
          <button onClick={() => setSuccess('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {([
            { key: 'overview' as Tab, label: 'Overview', icon: BarChart3 },
            { key: 'revenue' as Tab, label: 'Revenue', icon: TrendingUp },
            { key: 'book' as Tab, label: 'Book Asset', icon: CalendarPlus },
            { key: 'calendar' as Tab, label: 'Calendar', icon: CalendarDays },
            { key: 'notes' as Tab, label: 'Notes', icon: StickyNote },
            { key: 'quote' as Tab, label: 'Quote', icon: MessageSquare },
          ]).map(tab => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); if (tab.key === 'calendar') fetchCalJobs(); }} className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === tab.key ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-5">
          {loading ? <div className="p-10 text-center text-gray-400">Loading...</div> : stats ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiGrid.map((kpi, i) => (
                  <div key={i} className="card p-4">
                    <div className={`flex items-center gap-2 ${kpi.accent}`}>
                      <kpi.icon className="w-4 h-4" />
                      <p className="text-xs font-semibold uppercase tracking-wide">{kpi.label}</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="card p-4">
                  <div className="flex items-center gap-2 text-sky-600"><Truck className="w-4 h-4" /><p className="text-xs font-semibold uppercase tracking-wide">Total Vehicles</p></div>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.total_vehicles || '-'}</p>
                </div>
                <div className="card p-4">
                  <div className="flex items-center gap-2 text-amber-600"><Zap className="w-4 h-4" /><p className="text-xs font-semibold uppercase tracking-wide">Total Generators</p></div>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.total_generators || '-'}</p>
                </div>
                <div className="card p-4 col-span-2 md:col-span-1">
                  <div className="flex items-center gap-2 text-emerald-600"><TrendingUp className="w-4 h-4" /><p className="text-xs font-semibold uppercase tracking-wide">Availability Rate</p></div>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.available_rate || 0}%</p>
                </div>
              </div>
              <div className="card p-5">
                <h3 className="font-bold text-gray-800 mb-3">Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => setActiveTab('book')} className="btn-primary inline-flex items-center gap-1.5"><CalendarPlus className="w-4 h-4" /> Book Asset</button>
                  <button onClick={() => setActiveTab('calendar')} className="btn-secondary inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> View Calendar</button>
                  <button onClick={() => setActiveTab('notes')} className="btn-secondary inline-flex items-center gap-1.5"><StickyNote className="w-4 h-4" /> Add Note</button>
                </div>
              </div>
            </>
          ) : <div className="p-10 text-center text-gray-400">No stats available</div>}
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="space-y-5">
          {loading ? <div className="p-10 text-center text-gray-400">Loading...</div> : stats?.revenue ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {revenueKpis.map((kpi, i) => (
                  <div key={i} className="card p-4">
                    <div className={`flex items-center gap-2 ${kpi.accent}`}>
                      <kpi.icon className="w-4 h-4" />
                      <p className="text-xs font-semibold uppercase tracking-wide">{kpi.label}</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="cardp-5">
                  <h3 className="font-bold text-gray-800 mb-4">Revenue by Month</h3>
                  <div className="space-y-3">
                    {(stats.revenue_by_month || []).map((m: any) => (
                      <div key={m.month} className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-500 w-20 shrink-0">{fmtDate(m.month + '-01')}</span>
                        <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden">
                          <div className="h-full bg-[#4f46e5] rounded-lg" style={{ width: `${Math.max((m.revenue / maxRevenue) * 100, 8)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-900 w-28 text-right shrink-0">{fmt(m.revenue)}</span>
                        <span className="text-xs text-gray-400 w-12 text-right shrink-0">{m.job_count} jobs</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="cardp-5">
                  <h3 className="font-bold text-gray-800 mb-4">Revenue by Client</h3>
                  <div className="space-y-2">
                    {(stats.revenue_by_client || []).map((c: any) => (
                      <div key={c.client_name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-indigo-50/40 transition-colors">
                        <div><div className="font-semibold text-gray-800 text-sm">{c.client_name}</div><div className="text-xs text-gray-500">{c.job_count} jobs</div></div>
                        <span className="font-bold text-brand-700 text-sm">{fmt(c.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="cardp-5">
                  <h3 className="font-bold text-gray-800 mb-4">Revenue by Job Type</h3>
                  <div className="space-y-2">
                    {(stats.revenue_by_job_type || []).map((j: any) => (
                      <div key={j.job_type} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2">{j.job_type === 'emergency' ? <Siren className="w-4 h-4 text-red-500" /> : j.job_type === 'standby_contract' ? <ClipboardList className="w-4 h-4 text-blue-500" /> : <Wrench className="w-4 h-4 text-amber-500" />}<span className="font-semibold text-gray-800 text-sm capitalize">{j.job_type?.replace('_', ' ')}</span></div>
                        <div className="text-right"><span className="font-bold text-brand-700 text-sm">{fmt(j.revenue)}</span><div className="text-xs text-gray-400">{j.job_count} jobs</div></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="cardp-5">
                  <h3 className="font-bold text-gray-800 mb-4">Invoice Status</h3>
                  <div className="space-y-2">
                    {(stats.invoice_status || []).map((inv: any) => (
                      <div key={inv.invoice_status} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${invoiceColor[inv.invoice_status] || 'bg-gray-100 text-gray-600'}`}>{inv.invoice_status?.toUpperCase()}</span><span className="text-sm text-gray-600">{inv.job_count} invoices</span></div>
                        <span className="font-bold text-gray-800 text-sm">{fmt(inv.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="cardp-5">
                <h3 className="font-bold text-gray-800 mb-4">Recent Jobs with Revenue</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr className="border-b border-gray-100">
                      <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Job</th>
                      <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Client</th>
                      <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Type</th>
                      <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Invoice</th>
                      <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Status</th>
                      <th className="text-right p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Revenue</th>
                    </tr></thead>
                    <tbody>
                      {(stats.recent_jobs || []).map((j: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-indigo-50/40 transition-colors">
                          <td className="p-3"><div className="font-semibold text-gray-800">{j.job_number}</div><div className="text-xs text-gray-400">{j.plate_no || j.generator_serial || '-'}</div></td>
                          <td className="p-3 text-gray-600">{j.client_name || '-'}</td>
                          <td className="p-3"><span className="text-xs capitalize text-gray-600">{j.job_type?.replace('_', ' ')}</span></td>
                          <td className="p-3"><span className="text-xs font-mono text-gray-600">{j.invoice_number || '-'}</span></td>
                          <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${invoiceColor[j.invoice_status] || 'bg-gray-100 text-gray-500'}`}>{j.invoice_status || 'pending'}</span></td>
                          <td className="p-3 text-right font-bold text-brand-700">{fmt(j.revenue_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : <div className="p-10 text-center text-gray-400">No revenue data</div>}
        </div>
      )}

      {activeTab === 'book' && (
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900">Book a Vehicle or Generator</h2>
            <p className="text-indigo-700 mt-1 text-sm">Schedule an asset for a client</p>
          </div>

          <div className="cardp-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Client *</label>
                <select value={bookForm.client_id} onChange={e => setBookForm(f => ({ ...f, client_id: e.target.value, site_id: '' }))} className={inputCls}>
                  <option value="">Select client</option>
                  {clientList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Site *</label>
                <select value={bookForm.site_id} onChange={e => setBookForm(f => ({ ...f, site_id: e.target.value }))} className={inputCls} disabled={!bookForm.client_id}>
                  <option value="">{bookForm.client_id ? 'Select site' : 'Select client first'}</option>
                  {filteredSites.map((s: any) => <option key={s.id} value={s.id}>{s.name} - {s.address}</option>)}
                </select>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">What to book *</label>
              <div className="flex gap-3">
                {([
                  { key: 'paired' as const, label: 'Vehicle + Generator', icon: Link2 },
                  { key: 'vehicle' as const, label: 'Vehicle Only', icon: Truck },
                  { key: 'generator' as const, label: 'Generator Only', icon: Zap },
                ]).map(opt => (
                  <button key={opt.key} type="button" onClick={() => setBookForm(f => ({ ...f, asset_type: opt.key, vehicle_id: '', generator_id: '' }))} className={`flex-1 p-3 rounded-xl border-2 text-left transition-all ${bookForm.asset_type === opt.key ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                    <div className={`mb-1 ${bookForm.asset_type === opt.key ? 'text-brand-600' : 'text-gray-400'}`}><opt.icon className="w-5 h-5" /></div>
                    <div className="text-sm font-bold text-gray-800">{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {(bookForm.asset_type === 'vehicle' || bookForm.asset_type === 'paired') && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Vehicle *</label>
                <select value={bookForm.vehicle_id} onChange={e => {
                  const vid = e.target.value;
                  setBookForm(f => {
                    const next: any = { ...f, vehicle_id: vid };
                    if (f.asset_type === 'paired') {
                      const b = bindings.find((x: any) => x.vehicle_id === vid);
                      if (b) next.generator_id = b.generator_id;
                    }
                    return next;
                  });
                }} className={inputCls}>
                  <option value="">Select vehicle</option>
                  {availableVehicles.map((v: any) => <option key={v.id} value={v.id}>{v.plate_no} - {v.make_model}</option>)}
                </select>
                {bookForm.asset_type === 'paired' && bookForm.vehicle_id && <p className="text-xs text-blue-600 mt-1">Auto-selects paired generator if available</p>}
              </div>
            )}

            {(bookForm.asset_type === 'generator' || bookForm.asset_type === 'paired') && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Generator *</label>
                <select value={bookForm.generator_id} onChange={e => setBookForm(f => ({ ...f, generator_id: e.target.value }))} className={inputCls}>
                  <option value="">Select generator</option>
                  {(bookForm.asset_type === 'paired' ? pairedGenerators : availableGenerators).map((g: any) => (
                    <option key={g.id} value={g.id}>{g.serial_no} - {g.brand} {g.model} ({g.power_kva}kVA)</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Job Type *</label>
                <select value={bookForm.job_type} onChange={e => setBookForm(f => ({ ...f, job_type: e.target.value }))} className={inputCls}>
                  <option value="standby_contract">Standby Contract</option>
                  <option value="planned_shutdown">Planned Shutdown</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Start Date *</label><input type="date" value={bookForm.start_date} onChange={e => setBookForm(f => ({ ...f, start_date: e.target.value }))} className={inputCls} /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">End Date *</label><input type="date" value={bookForm.end_date} onChange={e => setBookForm(f => ({ ...f, end_date: e.target.value }))} className={inputCls} /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Revenue (RM)</label><input type="number" value={bookForm.revenue_amount} onChange={e => setBookForm(f => ({ ...f, revenue_amount: e.target.value }))} className={inputCls} placeholder="0.00" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Invoice Number</label><input type="text" value={bookForm.invoice_number} onChange={e => setBookForm(f => ({ ...f, invoice_number: e.target.value }))} className={inputCls} placeholder="INV-2026-XXX" /></div>
            </div>

            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label><textarea value={bookForm.notes} onChange={e => setBookForm(f => ({ ...f, notes: e.target.value }))} className={inputCls + ' h-20 resize-none'} placeholder="Additional notes..." /></div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Client</span><span className="font-semibold">{clientList.find((c: any) => c.id === bookForm.client_id)?.name || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Site</span><span className="font-semibold">{siteList.find((s: any) => s.id === bookForm.site_id)?.name || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-semibold capitalize">{bookForm.asset_type === 'paired' ? 'Vehicle + Generator' : bookForm.asset_type}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="font-semibold">{Math.max(1, Math.ceil((new Date(bookForm.end_date).getTime() - new Date(bookForm.start_date).getTime()) / 86400000))} days</span></div>
              {bookForm.asset_type !== 'generator' && <div className="flex justify-between"><span className="text-gray-500">Vehicle</span><span className="font-semibold">{vehicleList.find((v: any) => v.id === bookForm.vehicle_id)?.plate_no || '-'}</span></div>}
              {bookForm.asset_type !== 'vehicle' && <div className="flex justify-between"><span className="text-gray-500">Generator</span><span className="font-semibold">{generatorList.find((g: any) => g.id === bookForm.generator_id)?.serial_no || '-'}</span></div>}
              {bookForm.revenue_amount && <div className="flex justify-between font-bold"><span>Revenue</span><span className="text-brand-700">RM {parseFloat(bookForm.revenue_amount || '0').toLocaleString()}</span></div>}
            </div>

            <button onClick={handleBook} disabled={submitting} className="w-full px-6 py-3 btn-primary">
              {submitting ? 'Creating...' : 'Create Booking'}
            </button>
          </div>

          <div className="cardp-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">My Bookings</h3>
              <button onClick={fetchBookings} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
            </div>
            {bookings.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">No bookings yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr className="border-b border-gray-100">
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Job</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Client</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Type</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Assets</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Status</th>
                    <th className="text-right p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Revenue</th>
                  </tr></thead>
                  <tbody>
                    {bookings.map((b: any) => (
                      <tr key={b.id} className="border-b border-gray-50 hover:bg-indigo-50/40 transition-colors">
                        <td className="p-3"><div className="font-semibold text-gray-800">{b.job_number}</div><div className="text-xs text-gray-400">{b.created_at ? new Date(b.created_at).toLocaleDateString('en-MY') : '-'}</div></td>
                        <td className="p-3 text-gray-600">{b.client_name || '-'}</td>
                        <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${b.job_type === 'emergency' ? 'bg-red-100 text-red-700' : b.job_type === 'standby_contract' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{b.job_type?.replace('_', ' ')}</span></td>
                        <td className="p-3"><div className="text-xs text-gray-600">{b.plate_no || '-'}</div><div className="text-xs text-gray-400">{b.generator_serial || '-'}</div></td>
                        <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${statusBadge(b.status)}`}>{b.status}</span></td>
                        <td className="p-3 text-right font-bold text-brand-700">{b.revenue_amount ? fmt(b.revenue_amount) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600"><ChevronLeft className="w-4 h-4" /></button>
                <h3 className="font-bold text-gray-800 text-lg min-w-[180px] text-center">{monthLabel}</h3>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600"><ChevronRight className="w-4 h-4" /></button>
                <button onClick={goToToday} className="ml-2 px-3 py-1.5 text-xs font-semibold bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100 transition-colors">Today</button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Emergency</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" /> Standby</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Planned</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>)}
              {calDays.map((day, idx) => {
                if (day === null) return <div key={`p${idx}`} />;
                const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dj = jobsByDate[ds] || [];
                const isT = ds === today;
                const isS = ds === selectedDay;
                return (
                  <div key={ds} onClick={() => fetchDayJobs(ds)} className={`min-h-[72px] p-1.5 rounded-xl border cursor-pointer transition-all ${isS ? 'border-brand-500 bg-brand-50 shadow-sm ring-2 ring-brand-200' : isT ? 'border-brand-300 bg-blue-50/50' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}>
                    <div className={`text-xs font-bold mb-1 ${isT ? 'text-brand-600' : 'text-gray-700'}`}>{day}</div>
                    <div className="space-y-0.5">
                      {dj.slice(0, 3).map((j: any, ji: number) => (
                        <div key={ji} className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${j.job_type === 'emergency' ? 'bg-red-100 text-red-700' : j.job_type === 'standby_contract' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{j.job_number || j.serial_no || j.plate_no || ''}</div>
                      ))}
                      {dj.length > 3 && <div className="text-[10px] text-gray-400 text-center">+{dj.length - 3}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="cardp-5">
            <h3 className="font-bold text-gray-800 mb-3">{selectedDay || 'Select a day'}</h3>
            {!selectedDay ? <div className="text-center py-10 text-gray-400 text-sm">Click a day to view jobs</div> : dayJobs.length === 0 ? <div className="text-center py-10 text-gray-400 text-sm">No jobs on this day</div> : (
              <div className="space-y-2">
                {dayJobs.map((j: any) => (
                  <div key={j.id || j.job_number} className="p-3 bg-gray-50 rounded-xl hover:bg-indigo-50/40 transition-colors">
                    <div className="flex items-center gap-2 mb-1">{j.asset_type === 'generator' ? <Zap className="w-4 h-4 text-amber-500" /> : <Truck className="w-4 h-4 text-sky-500" />}<span className="font-bold text-gray-800 text-sm">{j.job_number || j.serial_no || j.plate_no}</span></div>
                    <div className="text-xs text-gray-500">{j.job_type?.replace('_', ' ')}</div>
                    <div className="text-xs text-gray-500">{j.driver_name || j.driver_id || '-'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="cardp-5">
            <h3 className="font-bold text-gray-800 mb-3">Quick Notes</h3>
            <div className="flex gap-2">
              <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveNote()} placeholder="Type a note and press Enter..." className={inputCls} disabled={savingNote} />
              <button onClick={saveNote} disabled={savingNote || !newNote.trim()} className="btn-primary whitespace-nowrap">
                {savingNote ? 'Saving...' : '+ Add'}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {notes.length === 0 ? <div className="cardp-10 text-center text-gray-400">No notes yet</div> : notes.map((n) => (
              <div key={n.id} className="cardp-4 flex items-start justify-between gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <StickyNote className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                  <div className="min-w-0"><p className="text-sm text-gray-800 break-words">{n.text}</p><p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('en-MY')}</p></div>
                </div>
                <button onClick={() => deleteNote(n.id)} className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'quote' && (
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900">Quick Quote</h2>
            <p className="text-indigo-700 mt-1 text-sm">Generate quotes and manage saved quotes</p>
          </div>

          <div className="cardp-6 space-y-5">
            <h3 className="font-bold text-gray-800">New Quote</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Vehicle</label>
                <select value={quoteVehicle} onChange={e => setQuoteVehicle(e.target.value)} className={inputCls}>
                  <option value="">Select vehicle</option>
                  {availableVehicles.map((v: any) => <option key={v.id} value={v.plate_no}>{v.plate_no} - {v.make_model}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Generator</label>
                <select value={quoteGenerator} onChange={e => setQuoteGenerator(e.target.value)} className={inputCls}>
                  <option value="">Select generator</option>
                  {availableGenerators.map((g: any) => <option key={g.id} value={g.serial_no}>{g.serial_no} - {g.brand} {g.model}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Duration (months)</label><input type="number" value={quoteHours} onChange={e => setQuoteHours(Number(e.target.value))} className={inputCls} min={0} /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Rate (RM/month)</label><input type="number" value={quoteRate} onChange={e => setQuoteRate(Number(e.target.value))} className={inputCls} min={0} /></div>
            </div>
            <div className="bg-gray-50 rounded-xl p-5 space-y-3 border border-gray-100">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Vehicle</span><span className="font-mono font-semibold">{quoteVehicle || '-'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Generator</span><span className="font-mono font-semibold">{quoteGenerator || '-'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Duration</span><span className="font-semibold">{quoteHours} month(s)</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Rate</span><span className="font-semibold">RM {quoteRate}/month</span></div>
              <hr className="border-gray-200" />
              <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-semibold">RM {(quoteHours * quoteRate).toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">SST (8%)</span><span className="font-semibold">RM {((quoteHours * quoteRate) * 0.08).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              <hr className="border-gray-200" />
              <div className="flex justify-between font-bold text-lg"><span>Total (incl. SST)</span><span className="text-brand-700">RM {((quoteHours * quoteRate) * 1.08).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Deposit (50%)</span><span className="text-brand-600 font-semibold">RM {((quoteHours * quoteRate) * 1.08 * 0.5).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { copyToClipboard(`Express Powerr Quick Quote\n\nVehicle: ${quoteVehicle || '-'}\nGenerator: ${quoteGenerator || '-'}\nDuration: ${quoteHours} month(s)\nRate: RM ${quoteRate}/month\n\nSubtotal: RM ${(quoteHours * quoteRate).toLocaleString()}\nSST (8%): RM ${((quoteHours * quoteRate) * 0.08).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nTotal (incl. SST): RM ${((quoteHours * quoteRate) * 1.08).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nDeposit (50%): RM ${((quoteHours * quoteRate) * 1.08 * 0.5).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n*Terms: Deposit payable on signing. Monthly invoices due within 14 days.*`); }} className="flex-1 btn-secondary">
                {copyText ? 'Copied!' : 'Copy Quote Text'}
              </button>
              <button onClick={async () => {
                if (!quoteVehicle && !quoteGenerator) { setError('Select at least a vehicle or generator'); return; }
                setError('');
                setSuccess('');
                try {
                  await quotesApi.create({ vehicle_desc: quoteVehicle, generator_desc: quoteGenerator, duration_months: quoteHours, rate_per_month: quoteRate, job_type: 'standby_contract', notes: 'Created from Quick Quote' });
                  fetchQuotes();
                  setSuccess('Quote saved!');
                } catch (err: any) { setError(err?.message || 'Failed to save quote'); }
              }} className="btn-primary">Save Quote</button>
            </div>
          </div>

          <div className="cardp-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Saved Quotes ({savedQuotes.length})</h3>
              <div className="flex items-center gap-3">
                <select value={quoteStatusFilter} onChange={e => setQuoteStatusFilter(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none bg-white">
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                </select>
                <button onClick={fetchQuotes} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
              </div>
            </div>
            {savedQuotes.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">No saved quotes yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr className="border-b border-gray-100">
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Quote</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Client</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Assets</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Duration</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Status</th>
                    <th className="text-right p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Total</th>
                    <th className="text-right p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Actions</th>
                  </tr></thead>
                  <tbody>
                    {savedQuotes.filter((q: any) => !quoteStatusFilter || q.status === quoteStatusFilter).map((q: any) => (
                      <tr key={q.id} className="border-b border-gray-50 hover:bg-indigo-50/40 transition-colors">
                        <td className="p-3"><div className="font-semibold text-gray-800">{q.quote_number}</div><div className="text-xs text-gray-400">{q.created_at ? new Date(q.created_at).toLocaleDateString('en-MY') : '-'}</div></td>
                        <td className="p-3 text-gray-600">{q.client_name || '-'}</td>
                        <td className="p-3"><div className="text-xs text-gray-600">{q.vehicle_desc || '-'}</div><div className="text-xs text-gray-400">{q.generator_desc || '-'}</div></td>
                        <td className="p-3 text-gray-600">{q.duration_months} month(s)</td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${q.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : q.status === 'sent' ? 'bg-blue-100 text-blue-700' : q.status === 'rejected' ? 'bg-red-100 text-red-700' : q.status === 'expired' ? 'bg-gray-200 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>{q.status}</span>
                            {q.status_changed_by && <div className="text-[10px] text-gray-400">by {q.status_changed_by?.slice(0, 8)} {q.status_changed_at ? new Date(q.status_changed_at).toLocaleDateString('en-MY') : ''}</div>}
                          </div>
                        </td>
                        <td className="p-3 text-right font-bold text-brand-700">RM {Number(q.total_amount || 0).toLocaleString()}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(q.status === 'draft' || q.status === 'sent') && hasRole('super_admin', 'dispatcher', 'finance') && (
                              <>
                                <button onClick={async () => { try { setError(''); if (!confirm(`Accept ${q.quote_number}?`)) return; await quotesApi.update(q.id, { status: 'accepted' }); fetchQuotes(); } catch (e: any) { setError(e?.message || 'Failed to accept quote'); } }} className="px-2 py-1 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors">Accept</button>
                                <button onClick={async () => { try { setError(''); if (!confirm(`Reject ${q.quote_number}?`)) return; await quotesApi.update(q.id, { status: 'rejected' }); fetchQuotes(); } catch (e: any) { setError(e?.message || 'Failed to reject quote'); } }} className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">Reject</button>
                              </>
                            )}
                            {q.status === 'draft' && (
                              <button onClick={async () => { try { setError(''); await quotesApi.update(q.id, { status: 'sent' }); fetchQuotes(); } catch (e: any) { setError(e?.message || 'Failed to send quote'); } }} className="px-2 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">Send</button>
                            )}
                            <button onClick={() => { copyToClipboard(`Express Powerr Quote ${q.quote_number}\n\nClient: ${q.client_name || 'N/A'}\nVehicle: ${q.vehicle_desc || '-'}\nGenerator: ${q.generator_desc || '-'}\nDuration: ${q.duration_months} month(s)\nRate: RM ${q.rate_per_month}/month\n\nSubtotal: RM ${(Number(q.rate_per_month || 0) * Number(q.duration_months || 0)).toLocaleString()}\nSST (8%): RM ${(Number(q.total_amount || 0) - Number(q.rate_per_month || 0) * Number(q.duration_months || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nTotal (incl. SST): RM ${Number(q.total_amount).toLocaleString()}\nDeposit (50%): RM ${Number(q.deposit_amount).toLocaleString()}\n\n*Terms: Deposit payable on signing. Monthly invoices due within 14 days.*`); }} className="px-2 py-1 text-xs font-bold text-[#4f46e5] hover:text-[#4338ca] rounded-lg hover:bg-[#eef2ff] transition-colors">Copy</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
