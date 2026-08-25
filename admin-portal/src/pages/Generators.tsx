import { useState, useEffect } from 'react';
import {
  Zap, Wrench, Timer, RefreshCw, Plus, Rocket,
  AlertTriangle, X, Pencil, type LucideIcon,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { generators as generatorsApi, assetTraceability, hasRole, API_BASE } from '../api/client';

type Tab = 'list' | 'components' | 'hours';

export default function Generators() {
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [generators, setGenerators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedGen, setSelectedGen] = useState('');
  const [components, setComponents] = useState<any[]>([]);
  const [hours, setHours] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [form, setForm] = useState({
    serial_no: '',
    brand: '',
    model: '',
    power_kva: '',
    voltage_rating: '',
    fuel_type: 'diesel',
    ble_beacon_id: '',
  });
  const [showEdit, setShowEdit] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<any>(null);

  useEffect(() => { fetchGenerators(); }, []);

  useEffect(() => {
    if (activeTab === 'components' && selectedGen) fetchComponents();
    if (activeTab === 'hours' && selectedGen) fetchHours();
  }, [activeTab, selectedGen]);

  const fetchGenerators = async () => {
    try {
      const res = await generatorsApi.list();
      setGenerators(res.generators || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchComponents = async () => {
    if (!selectedGen) return;
    setLoadingData(true);
    try {
      const res = await assetTraceability.components.generator.list(selectedGen);
      setComponents(res.components || []);
    } catch (e) { console.error(e); }
    finally { setLoadingData(false); }
  };

  const fetchHours = async () => {
    if (!selectedGen) return;
    setLoadingData(true);
    try {
      const res = await fetch(`${API_BASE}/v1/generators/${selectedGen}/hours`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setHours(data.hours || []);
    } catch (e) { console.error(e); }
    finally { setLoadingData(false); }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white';

  const resetForm = () => {
    setForm({ serial_no: '', brand: '', model: '', power_kva: '', voltage_rating: '', fuel_type: 'diesel', ble_beacon_id: '' });
  };

  const handleAdd = async () => {
    if (!form.serial_no) { setError('Serial number is required'); return; }
    setSubmitting(true); setError('');
    try {
      await generatorsApi.create({
        serial_no: form.serial_no,
        brand: form.brand || null,
        model: form.model || null,
        power_kva: form.power_kva ? Number(form.power_kva) : null,
        voltage_rating: form.voltage_rating || null,
        fuel_type: form.fuel_type,
        ble_beacon_id: form.ble_beacon_id || null,
      });
      setShowAdd(false);
      resetForm();
      fetchGenerators();
    } catch (e: any) { setError(e?.message || 'Something went wrong'); }
    finally { setSubmitting(false); }
  };

  const handleEdit = async () => {
    if (!showEdit) return;
    setSubmitting(true); setError('');
    try {
      await fetch(`${API_BASE}/v1/generators/${showEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          serial_no: form.serial_no,
          brand: form.brand || null,
          model: form.model || null,
          power_kva: form.power_kva ? Number(form.power_kva) : null,
          voltage_rating: form.voltage_rating || null,
          fuel_type: form.fuel_type,
          ble_beacon_id: form.ble_beacon_id || null,
        }),
      });
      setShowEdit(null);
      resetForm();
      fetchGenerators();
    } catch (e: any) { setError(e?.message || 'Something went wrong'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    setSubmitting(true); setError('');
    try {
      await fetch(`${API_BASE}/v1/generators/${showDeleteConfirm.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      setShowDeleteConfirm(null);
      fetchGenerators();
    } catch (e: any) { setError(e?.message || 'Something went wrong'); }
    finally { setSubmitting(false); }
  };

  const formatDate = (s?: string) => s ? new Date(s).toLocaleString('en-MY', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  const statusBadge = (s: string) => ({
    available: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    deployed: 'bg-blue-100 text-blue-700 border border-blue-200',
    maintenance: 'bg-amber-100 text-amber-700 border border-amber-200',
    retired: 'bg-gray-100 text-gray-600 border border-gray-200',
  }[s] || 'bg-gray-100 text-gray-600 border border-gray-200');

  const statusDot = (s: string) => ({
    available: 'bg-emerald-500',
    deployed: 'bg-blue-500',
    maintenance: 'bg-amber-500',
    retired: 'bg-gray-400',
  }[s] || 'bg-gray-400');

  const tabItems: { key: Tab; label: string; icon: LucideIcon }[] = [
    { key: 'list', label: 'Generators', icon: Zap },
    { key: 'components', label: 'Components', icon: Wrench },
    { key: 'hours', label: 'Hours Log', icon: Timer },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Zap}
        title="Generator Fleet"
        subtitle="Generators, components & operating hours"
        actions={
          <>
            <button onClick={fetchGenerators} className="btn-secondary inline-flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            {hasRole('super_admin', 'fleet_manager') && (
              <button onClick={() => { resetForm(); setShowAdd(true); }} className="btn-primary inline-flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add Generator
              </button>
            )}
          </>
        }
      />

      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</span>
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"><Zap className="w-3.5 h-3.5" /> {generators.filter((g: any) => g.status === 'available').length} Available</span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"><Rocket className="w-3.5 h-3.5" /> {generators.filter((g: any) => g.status === 'deployed').length} Deployed</span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"><Wrench className="w-3.5 h-3.5" /> {generators.filter((g: any) => g.status === 'maintenance').length} Servicing</span>
      </div>

      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {tabItems.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all inline-flex items-center gap-1.5 ${activeTab === tab.key ? 'bg-brand-50 text-brand-700 border-b-2 border-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              <tab.icon className="w-4 h-4 shrink-0" /> {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'list' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center gap-2 text-gray-400"><LoadingSpinner /><span className="text-sm">Loading generators...</span></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Serial #</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Brand / Model</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Power</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Voltage</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Fuel</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">BLE Beacon</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {generators.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-400">No generators found</td></tr>
                  ) : generators.map((g: any) => (
                    <tr key={g.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="p-3 font-mono text-brand-700 font-bold">{g.serial_no}</td>
                      <td className="p-3 font-medium text-gray-800">{g.brand} {g.model}</td>
                      <td className="p-3 font-bold text-amber-700">{g.power_kva}kVA</td>
                      <td className="p-3 text-gray-600">{g.voltage_rating || '—'}</td>
                      <td className="p-3 capitalize text-gray-600">{g.fuel_type || 'diesel'}</td>
                      <td className="p-3 font-mono text-xs">{g.ble_beacon_id || '—'}</td>
                      <td className="p-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusBadge(g.status)} flex items-center gap-1.5 w-fit`}><span className={`w-1.5 h-1.5 rounded-full ${statusDot(g.status)}`} />{g.status}</span></td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {hasRole('super_admin') && (
                            <>
                              <button onClick={() => { setForm({ serial_no: g.serial_no, brand: g.brand || '', model: g.model || '', power_kva: g.power_kva?.toString() || '', voltage_rating: g.voltage_rating || '', fuel_type: g.fuel_type || 'diesel', ble_beacon_id: g.ble_beacon_id || '' }); setShowEdit(g); }} className="px-3 py-1 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">Edit</button>
                              <button onClick={() => setShowDeleteConfirm(g)} className="px-3 py-1 text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">Delete</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'components' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Select Generator:</label>
              <select value={selectedGen} onChange={e => setSelectedGen(e.target.value)} className="w-full sm:max-w-xs px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white">
                <option value="">Choose generator...</option>
                {generators.map(g => (
                  <option key={g.id} value={g.id}>{g.serial_no} — {g.brand} {g.model}</option>
                ))}
              </select>
            </div>
          </div>
          {selectedGen ? (
            loadingData ? (
              <div className="p-10 flex flex-col items-center justify-center gap-2 text-gray-400"><LoadingSpinner /><span className="text-sm">Loading...</span></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Type</th>
                      <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Manufacturer</th>
                      <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Model</th>
                      <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Serial #</th>
                      <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Installed</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {components.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-gray-400">No components found</td></tr>
                    ) : components.map((c: any) => (
                      <tr key={c.id} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="p-3 capitalize font-medium text-gray-800">{c.component_type?.replace('_', ' ')}</td>
                        <td className="p-3 text-gray-600">{c.manufacturer || '—'}</td>
                        <td className="p-3 text-gray-600">{c.model || '—'}</td>
                        <td className="p-3 font-mono text-xs text-brand-700">{c.serial_number || '—'}</td>
                        <td className="p-3 text-xs text-gray-500">{formatDate(c.installed_at)}</td>
                        <td className="p-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusBadge(c.status)}`}>{c.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Wrench className="w-7 h-7 text-indigo-400" /></div>
              <p className="font-semibold text-gray-600">Generator Component Tracking</p>
              <p className="text-sm text-gray-400 mt-1">Alternators, engines, controllers, radiators — install/remove history with hours</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'hours' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Select Generator:</label>
              <select value={selectedGen} onChange={e => setSelectedGen(e.target.value)} className="w-full sm:max-w-xs px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white">
                <option value="">Choose generator...</option>
                {generators.map(g => (
                  <option key={g.id} value={g.id}>{g.serial_no} — {g.brand} {g.model}</option>
                ))}
              </select>
            </div>
          </div>
          {selectedGen ? (
            loadingData ? (
              <div className="p-10 flex flex-col items-center justify-center gap-2 text-gray-400"><LoadingSpinner /><span className="text-sm">Loading...</span></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[400px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Date</th>
                      <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Hours Run</th>
                      <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {hours.length === 0 ? (
                      <tr><td colSpan={3} className="p-8 text-center text-gray-400">No hour logs found</td></tr>
                    ) : hours.map((h: any) => (
                      <tr key={h.id} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="p-3 text-sm text-gray-800">{formatDate(h.recorded_at)}</td>
                        <td className="p-3 font-bold text-amber-700">{h.hours_run || h.operating_hours || '—'} hrs</td>
                        <td className="p-3 text-xs text-gray-500">{h.recorded_by_user || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Timer className="w-7 h-7 text-indigo-400" /></div>
              <p className="font-semibold text-gray-600">Operating Hours Log</p>
              <p className="text-sm text-gray-400 mt-1">Record & view generator running hours for maintenance scheduling</p>
            </div>
          )}
        </div>
      )}

      {/* Add Generator Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Zap className="w-5 h-5 text-indigo-600" />Add New Generator</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Serial Number *</label>
                  <input type="text" value={form.serial_no} onChange={e => setForm(f => ({...f, serial_no: e.target.value}))} className={inputCls} placeholder="e.g. GEN-012" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Brand</label>
                  <input type="text" value={form.brand} onChange={e => setForm(f => ({...f, brand: e.target.value}))} className={inputCls} placeholder="e.g. Caterpillar" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Model</label>
                <input type="text" value={form.model} onChange={e => setForm(f => ({...f, model: e.target.value}))} className={inputCls} placeholder="e.g. C15 ACERT" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Power (kVA)</label>
                  <input type="number" value={form.power_kva} onChange={e => setForm(f => ({...f, power_kva: e.target.value}))} className={inputCls} placeholder="e.g. 500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Voltage</label>
                  <input type="text" value={form.voltage_rating} onChange={e => setForm(f => ({...f, voltage_rating: e.target.value}))} className={inputCls} placeholder="e.g. 415V" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fuel Type</label>
                  <select value={form.fuel_type} onChange={e => setForm(f => ({...f, fuel_type: e.target.value}))} className={inputCls}>
                    <option value="diesel">Diesel</option>
                    <option value="petrol">Petrol</option>
                    <option value="gas">Natural Gas</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">BLE Beacon ID</label>
                <input type="text" value={form.ble_beacon_id} onChange={e => setForm(f => ({...f, ble_beacon_id: e.target.value}))} className={inputCls} placeholder="Optional beacon ID" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleAdd} disabled={submitting} className="btn-primary">{submitting ? 'Adding...' : '+ Add Generator'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Generator Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={() => setShowEdit(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Pencil className="w-5 h-5 text-indigo-600" />Edit Generator</h2>
              <button onClick={() => setShowEdit(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Serial Number *</label>
                  <input type="text" value={form.serial_no} onChange={e => setForm(f => ({...f, serial_no: e.target.value}))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Brand</label>
                  <input type="text" value={form.brand} onChange={e => setForm(f => ({...f, brand: e.target.value}))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Model</label>
                <input type="text" value={form.model} onChange={e => setForm(f => ({...f, model: e.target.value}))} className={inputCls} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Power (kVA)</label>
                  <input type="number" value={form.power_kva} onChange={e => setForm(f => ({...f, power_kva: e.target.value}))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Voltage</label>
                  <input type="text" value={form.voltage_rating} onChange={e => setForm(f => ({...f, voltage_rating: e.target.value}))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fuel Type</label>
                  <select value={form.fuel_type} onChange={e => setForm(f => ({...f, fuel_type: e.target.value}))} className={inputCls}>
                    <option value="diesel">Diesel</option>
                    <option value="petrol">Petrol</option>
                    <option value="gas">Natural Gas</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">BLE Beacon ID</label>
                <input type="text" value={form.ble_beacon_id} onChange={e => setForm(f => ({...f, ble_beacon_id: e.target.value}))} className={inputCls} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowEdit(null)} className="btn-secondary">Cancel</button>
                <button onClick={handleEdit} disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-7 h-7 text-red-500" /></div>
              <h2 className="text-lg font-bold text-gray-800">Delete Generator</h2>
              <p className="text-sm text-gray-500 mt-2">Are you sure you want to delete <strong>{showDeleteConfirm.serial_no}</strong>?</p>
              <p className="text-xs text-red-500 mt-1">This will also remove all components, hours logs, and bindings.</p>
              <div className="flex justify-center gap-3 mt-6">
                <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary">Cancel</button>
                <button onClick={handleDelete} disabled={submitting} className="btn-danger">{submitting ? 'Deleting...' : 'Delete'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}