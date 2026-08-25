import { useState, useEffect, useMemo } from 'react';
import {
  Link2, Unlink, Wrench, Plus, Pencil, CheckCircle2, AlertTriangle,
  CalendarClock, Clock3, X, Search, PackageOpen,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import { assetTraceability as assetApi, vehicles as vehiclesApi, generators as generatorsApi, hasRole } from '../api/client';

interface Binding { id: string; vehicle_id: string; generator_id: string; paired_at: string; unpaired_at?: string; plate_no?: string; generator_serial?: string; vehicle_make_model?: string; generator_brand_model?: string; vehicle_type: string; fuel_type: string; power_kva?: number; voltage_rating?: string; driver_name?: string; notes?: string; }

interface MaintEvent {
  id: string; asset_type: 'generator' | 'vehicle'; asset_id: string;
  event_type: string; title?: string; description?: string;
  started_at?: string; completed_at?: string;
  performed_by_contractor?: string; performed_by_user?: string;
  cost_myr?: number; parts_replaced?: string; meter_reading?: number;
  next_due_at?: string; status: string;
}

const emptyForm = (): MaintForm => ({
  asset_type: 'generator', asset_id: '', event_type: 'scheduled', title: '',
  description: '', started_at: '', status: 'pending', cost_myr: '',
  performed_by_contractor: '', parts_replaced: '', meter_reading: '', next_due_at: '',
});

interface MaintForm {
  asset_type: 'generator' | 'vehicle'; asset_id: string; event_type: string; title: string;
  description: string; started_at: string; status: string; cost_myr: string;
  performed_by_contractor: string; parts_replaced: string; meter_reading: string; next_due_at: string;
}

const canEdit = () => hasRole('super_admin', 'dispatcher');

export default function Assets() {
  const [activeTab, setActiveTab] = useState<'bindings' | 'maintenance'>('bindings');
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [maintenance, setMaintenance] = useState<MaintEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // modals
  const [showPair, setShowPair] = useState(false);
  const [pairVehicle, setPairVehicle] = useState('');
  const [pairGenerator, setPairGenerator] = useState('');
  const [pairNotes, setPairNotes] = useState('');
  const [unpairTarget, setUnpairTarget] = useState<Binding | null>(null);

  const [maintModal, setMaintModal] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MaintForm>(emptyForm());
  const [completingId, setCompletingId] = useState<string | null>(null);

  // filters
  const [bindingSearch, setBindingSearch] = useState('');
  const [maintSearch, setMaintSearch] = useState('');
  const [maintStatusFilter, setMaintStatusFilter] = useState('all');

  const [vehicleList, setVehicleList] = useState<any[]>([]);
  const [generatorList, setGeneratorList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [bRes, mRes, vRes, gRes] = await Promise.all([
      assetApi.bindings.current().catch(() => ({ bindings: [] })),
      assetApi.maintenance.list().catch(() => ({ events: [] })),
      vehiclesApi.list().catch(() => ({ vehicles: [] })),
      generatorsApi.list().catch(() => ({ generators: [] })),
    ]);
    setBindings(bRes.bindings || []);
    setMaintenance(mRes.events || []);
    setVehicleList(vRes.vehicles || []);
    setGeneratorList(gRes.generators || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ---- helpers ----
  const formatDate = (s?: string) => s ? new Date(s).toLocaleString('en-MY', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  const fmtDateOnly = (s?: string) => s ? new Date(s).toLocaleDateString('en-MY', { dateStyle: 'medium' }) : '—';

  const toLocalInput = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
  };

  const daysUntil = (iso?: string) => {
    if (!iso) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.ceil((new Date(iso).setHours(0, 0, 0, 0) - today.getTime()) / 86400000);
  };

  const dueStats = useMemo(() => {
    let overdue = 0, week = 0, month = 0;
    for (const m of maintenance) {
      const d = daysUntil(m.next_due_at);
      if (d === null) continue;
      if (d < 0) overdue++;
      else if (d <= 7) week++;
      else if (d <= 30) month++;
    }
    return { overdue, week, month };
  }, [maintenance]);

  const totalSpend = useMemo(
    () => maintenance.reduce((sum, m) => sum + (Number(m.cost_myr) || 0), 0),
    [maintenance]
  );

  const assetLabel = (m: MaintEvent) => {
    if (m.asset_type === 'generator') {
      const g = generatorList.find(x => x.id === m.asset_id);
      return g ? `${g.serial_no} — ${g.brand} ${g.model}` : m.asset_id.slice(0, 13) + '…';
    }
    const v = vehicleList.find(x => x.id === m.asset_id);
    return v ? `${v.plate_no} — ${v.make_model}` : m.asset_id.slice(0, 13) + '…';
  };

  const nextDueBadge = (iso?: string) => {
    if (!iso) return <span className="text-xs text-gray-300">—</span>;
    const d = daysUntil(iso)!;
    if (d < 0) return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
        <AlertTriangle className="w-3 h-3" /> Overdue {Math.abs(d)}d
      </span>
    );
    if (d <= 7) return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock3 className="w-3 h-3" /> {d === 0 ? 'Today' : `${d}d left`}
      </span>
    );
    if (d <= 30) return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <CalendarClock className="w-3 h-3" /> {d}d
      </span>
    );
    return <span className="text-xs text-gray-500">{fmtDateOnly(iso)}</span>;
  };

  // ---- actions ----
  const fail = (err: any) => setError(err?.message || 'Something went wrong');

  const handlePair = async () => {
    if (!pairVehicle || !pairGenerator) { setError('Please select both a vehicle and a generator'); return; }
    setSubmitting(true); setError('');
    try {
      await assetApi.bindings.create({ vehicle_id: pairVehicle, generator_id: pairGenerator, notes: pairNotes });
      setShowPair(false); setPairVehicle(''); setPairGenerator(''); setPairNotes('');
      fetchAll();
    } catch (err: any) { fail(err); } finally { setSubmitting(false); }
  };

  const handleUnpair = async () => {
    if (!unpairTarget) return;
    setSubmitting(true); setError('');
    try { await assetApi.bindings.unpair(unpairTarget.id); setUnpairTarget(null); fetchAll(); }
    catch (err: any) { fail(err); } finally { setSubmitting(false); }
  };

  const openCreate = () => { setForm(emptyForm()); setEditingId(null); setMaintModal('create'); };

  const openEdit = (m: MaintEvent) => {
    setForm({
      asset_type: m.asset_type,
      asset_id: m.asset_id,
      event_type: m.event_type || 'scheduled',
      title: m.title || '',
      description: m.description || '',
      started_at: toLocalInput(m.started_at),
      status: m.status || 'pending',
      cost_myr: m.cost_myr != null ? String(m.cost_myr) : '',
      performed_by_contractor: m.performed_by_contractor || '',
      parts_replaced: (() => {
        try { const p = JSON.parse(m.parts_replaced as any); return Array.isArray(p) ? p.join(', ') : ''; } catch { return typeof m.parts_replaced === 'string' && !m.parts_replaced.startsWith('[') ? m.parts_replaced : ''; }
      })(),
      meter_reading: m.meter_reading != null ? String(m.meter_reading) : '',
      next_due_at: m.next_due_at ? m.next_due_at.slice(0, 10) : '',
    });
    setEditingId(m.id);
    setMaintModal('edit');
  };

  const buildPayload = () => ({
    asset_type: form.asset_type,
    asset_id: form.asset_id,
    event_type: form.event_type,
    title: form.title || 'Maintenance',
    description: form.description || undefined,
    started_at: form.started_at ? new Date(form.started_at).toISOString() : new Date().toISOString(),
    status: form.status,
    cost_myr: form.cost_myr === '' ? null : Number(form.cost_myr),
    performed_by_contractor: form.performed_by_contractor || undefined,
    parts_replaced: form.parts_replaced ? form.parts_replaced.split(',').map(s => s.trim()).filter(Boolean) : [],
    meter_reading: form.meter_reading === '' ? null : Number(form.meter_reading),
    next_due_at: form.next_due_at ? new Date(form.next_due_at + 'T09:00').toISOString() : null,
  });

  const handleSaveMaintenance = async () => {
    if (!form.asset_id) { setError('Please select an asset'); return; }
    if (!form.title.trim()) { setError('Please enter a title'); return; }
    setSubmitting(true); setError('');
    try {
      if (maintModal === 'edit' && editingId) await assetApi.maintenance.update(editingId, buildPayload());
      else await assetApi.maintenance.create(buildPayload());
      setMaintModal('closed'); fetchAll();
    } catch (err: any) { fail(err); } finally { setSubmitting(false); }
  };

  const quickComplete = async (m: MaintEvent) => {
    setCompletingId(m.id); setError('');
    try {
      await assetApi.maintenance.update(m.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      fetchAll();
    } catch (err: any) { fail(err); } finally { setCompletingId(null); }
  };

  // ---- filtered lists ----
  const filteredBindings = useMemo(() => {
    const q = bindingSearch.toLowerCase();
    if (!q) return bindings;
    return bindings.filter(b =>
      [b.plate_no, b.vehicle_make_model, b.generator_serial, b.generator_brand_model, b.driver_name]
        .some(v => (v || '').toLowerCase().includes(q))
    );
  }, [bindings, bindingSearch]);

  const filteredMaintenance = useMemo(() => {
    let list = maintenance;
    if (maintStatusFilter !== 'all') list = list.filter(m => m.status === maintStatusFilter);
    const q = maintSearch.toLowerCase();
    if (q) list = list.filter(m =>
      [m.title, m.description, m.event_type, assetLabel(m)].some(v => (v || '').toLowerCase().includes(q))
    );
    return list;
  }, [maintenance, maintSearch, maintStatusFilter, vehicleList, generatorList]);

  const inputCls = 'input-field';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="space-y-5">
      <PageHeader
        icon={PackageOpen}
        title="Asset Management"
        subtitle="Vehicle–generator pairings & maintenance traceability"
        actions={canEdit() && (
          <>
            <button onClick={() => setShowPair(true)} className="btn-secondary inline-flex items-center gap-1.5">
              <Link2 className="w-4 h-4" /> Pair
            </button>
            <button onClick={openCreate} className="btn-primary inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Maintenance
            </button>
          </>
        )}
      />

      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</span>
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {([
            { key: 'bindings' as const, label: 'Pairings', count: bindings.length },
            { key: 'maintenance' as const, label: 'Maintenance', count: maintenance.length },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* ================= PAIRINGS TAB ================= */}
      {activeTab === 'bindings' && (
        <div className="card overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              value={bindingSearch}
              onChange={e => setBindingSearch(e.target.value)}
              placeholder="Search plate, model, serial, driver…"
              className="flex-1 text-sm outline-none"
            />
          </div>
          {loading ? (
            <div className="p-10 flex justify-center"><LoadingSpinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Vehicle', 'Plate #', 'Generator', 'Type / Fuel', 'Driver', 'Paired', 'Status', ''].map(h => (
                      <th key={h} className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredBindings.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-400">No active pairings</td></tr>
                  ) : filteredBindings.map(b => (
                    <tr key={b.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="p-3 font-medium text-gray-800">{b.vehicle_make_model || '—'}</td>
                      <td className="p-3 font-mono font-bold text-indigo-700">{b.plate_no || '—'}</td>
                      <td className="p-3 font-mono text-sm text-indigo-700">{b.generator_serial || '—'}</td>
                      <td className="p-3 text-sm text-gray-600">{b.vehicle_type}{b.power_kva ? ` · ${b.power_kva} kVA` : ''}</td>
                      <td className="p-3 text-gray-600">{b.driver_name || '—'}</td>
                      <td className="p-3 text-xs text-gray-500">{formatDate(b.paired_at)}</td>
                      <td className="p-3"><span className="badge badge-success">Active</span></td>
                      <td className="p-3 text-right">
                        {canEdit() && (
                          <button
                            onClick={() => setUnpairTarget(b)}
                            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                          >
                            <Unlink className="w-3.5 h-3.5" /> Unpair
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= MAINTENANCE TAB ================= */}
      {activeTab === 'maintenance' && (
        <>
          {/* PM summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">Overdue</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{dueStats.overdue}</p>
              <p className="text-xs text-gray-400">past due date</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-amber-600">
                <Clock3 className="w-4 h-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">Due ≤ 7 days</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{dueStats.week}</p>
              <p className="text-xs text-gray-400">this week</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-indigo-600">
                <CalendarClock className="w-4 h-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">Due ≤ 30 days</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{dueStats.month}</p>
              <p className="text-xs text-gray-400">upcoming</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <Wrench className="w-4 h-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">Total Spend</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">RM{totalSpend.toLocaleString('en-MY', { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-gray-400">{maintenance.length} events logged</p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-3 border-b border-gray-100 flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  value={maintSearch}
                  onChange={e => setMaintSearch(e.target.value)}
                  placeholder="Search asset, title, event…"
                  className="flex-1 text-sm outline-none"
                />
              </div>
              <select
                value={maintStatusFilter}
                onChange={e => setMaintStatusFilter(e.target.value)}
                className="input-field w-auto text-sm py-1.5"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            {loading ? (
              <div className="p-10 flex justify-center"><LoadingSpinner /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Asset', 'Event', 'Details', 'Scheduled', 'Completed', 'Cost', 'Next Due', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredMaintenance.length === 0 ? (
                      <tr><td colSpan={9} className="p-8 text-center text-gray-400">No maintenance events</td></tr>
                    ) : filteredMaintenance.map(m => {
                      const done = m.status === 'completed';
                      return (
                        <tr key={m.id} className="hover:bg-indigo-50/40 transition-colors">
                          <td className="p-3">
                            <span className="capitalize text-xs font-semibold text-gray-700">{m.asset_type}</span>
                            <div className="text-[11px] text-gray-400 max-w-[180px] truncate">{assetLabel(m)}</div>
                          </td>
                          <td className="p-3 capitalize text-sm text-gray-700">{(m.event_type || '').replace('_', ' ')}</td>
                          <td className="p-3 max-w-[200px]">
                            <div className="text-sm text-gray-800 truncate">{m.title || '—'}</div>
                            {m.description && <div className="text-[11px] text-gray-400 truncate">{m.description}</div>}
                            {m.parts_replaced && m.parts_replaced !== '[]' && (
                              <div className="text-[11px] text-indigo-500 truncate">Parts: {String(m.parts_replaced).replace(/[[\]"]/g, '')}</div>
                            )}
                          </td>
                          <td className="p-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(m.started_at)}</td>
                          <td className="p-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(m.completed_at)}</td>
                          <td className="p-3 text-sm text-gray-700 whitespace-nowrap">{m.cost_myr != null ? `RM${Number(m.cost_myr).toLocaleString()}` : '—'}</td>
                          <td className="p-3 whitespace-nowrap">{nextDueBadge(m.next_due_at)}</td>
                          <td className="p-3"><StatusBadge status={done ? 'completed' : m.status} /></td>
                          <td className="p-3">
                            {canEdit() && (
                              <div className="flex items-center gap-1">
                                {!done && (
                                  <button
                                    onClick={() => quickComplete(m)}
                                    disabled={completingId === m.id}
                                    title="Mark complete"
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => openEdit(m)}
                                  title="Edit"
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ================= PAIR MODAL ================= */}
      {showPair && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={() => setShowPair(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Link2 className="w-5 h-5 text-indigo-600" />Pair Vehicle & Generator</h2>
              <button onClick={() => setShowPair(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Vehicle *</label>
                <select value={pairVehicle} onChange={e => setPairVehicle(e.target.value)} className={inputCls}>
                  <option value="">Select vehicle</option>
                  {vehicleList.filter(v => v.status === 'active').map(v => (
                    <option key={v.id} value={v.id}>{v.plate_no} — {v.make_model}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Generator *</label>
                <select value={pairGenerator} onChange={e => setPairGenerator(e.target.value)} className={inputCls}>
                  <option value="">Select generator</option>
                  {generatorList.filter(g => g.status === 'available').map(g => (
                    <option key={g.id} value={g.id}>{g.serial_no} — {g.brand} {g.model}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <input value={pairNotes} onChange={e => setPairNotes(e.target.value)} className={inputCls} placeholder="Optional notes" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowPair(false)} className="btn-secondary">Cancel</button>
                <button onClick={handlePair} disabled={submitting} className="btn-primary">{submitting ? 'Saving…' : 'Pair'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= UNPAIR CONFIRM ================= */}
      {unpairTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={() => setUnpairTarget(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2"><Unlink className="w-5 h-5 text-red-500" />Unpair assets?</h3>
            <p className="text-sm text-gray-600 mb-1">
              This will detach <strong>{unpairTarget.generator_serial}</strong> from <strong>{unpairTarget.plate_no}</strong>.
            </p>
            <p className="text-xs text-gray-400 mb-4">The generator will become available for other jobs.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setUnpairTarget(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleUnpair} disabled={submitting} className="btn-danger">{submitting ? 'Unpairing…' : 'Unpair'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MAINTENANCE MODAL (create/edit) ================= */}
      {maintModal !== 'closed' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={() => setMaintModal('closed')}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-xl border border-gray-100 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-600" />
                {maintModal === 'edit' ? 'Edit Maintenance Event' : 'Add Maintenance Event'}
              </h2>
              <button onClick={() => setMaintModal('closed')} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Asset Type *</label>
                  <select
                    value={form.asset_type}
                    onChange={e => setForm({ ...form, asset_type: e.target.value as any, asset_id: '' })}
                    className={inputCls}
                    disabled={maintModal === 'edit'}
                  >
                    <option value="generator">Generator</option>
                    <option value="vehicle">Vehicle</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Asset *</label>
                  <select value={form.asset_id} onChange={e => setForm({ ...form, asset_id: e.target.value })} className={inputCls} disabled={maintModal === 'edit'}>
                    <option value="">Select asset</option>
                    {form.asset_type === 'generator'
                      ? generatorList.map(g => <option key={g.id} value={g.id}>{g.serial_no} — {g.brand} {g.model}</option>)
                      : vehicleList.map(v => <option key={v.id} value={v.id}>{v.plate_no} — {v.make_model}</option>)
                    }
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Event Type *</label>
                  <select value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })} className={inputCls}>
                    <option value="scheduled">Scheduled service</option>
                    <option value="corrective">Corrective repair</option>
                    <option value="inspection">Inspection</option>
                    <option value="overhaul">Overhaul</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Title *</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="e.g. Oil change, Brake inspection" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className={inputCls} placeholder="Details about the work…" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Start</label>
                  <input type="datetime-local" value={form.started_at} onChange={e => setForm({ ...form, started_at: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputCls}>
                    <option value="pending">Pending</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Cost (MYR)</label>
                  <input type="number" step="0.01" min="0" value={form.cost_myr} onChange={e => setForm({ ...form, cost_myr: e.target.value })} className={inputCls} placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Contractor</label>
                  <input value={form.performed_by_contractor} onChange={e => setForm({ ...form, performed_by_contractor: e.target.value })} className={inputCls} placeholder="External workshop name" />
                </div>
                <div>
                  <label className={labelCls}>Meter Reading</label>
                  <input type="number" min="0" value={form.meter_reading} onChange={e => setForm({ ...form, meter_reading: e.target.value })} className={inputCls} placeholder="Hours or km at service" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Parts Replaced</label>
                  <input value={form.parts_replaced} onChange={e => setForm({ ...form, parts_replaced: e.target.value })} className={inputCls} placeholder="Oil filter, Air filter (comma separated)" />
                </div>
                <div>
                  <label className={labelCls}>Next Service Due</label>
                  <input type="date" value={form.next_due_at} onChange={e => setForm({ ...form, next_due_at: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setMaintModal('closed')} className="btn-secondary">Cancel</button>
                <button onClick={handleSaveMaintenance} disabled={submitting} className="btn-primary">
                  {submitting ? 'Saving…' : maintModal === 'edit' ? 'Save Changes' : 'Add Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
