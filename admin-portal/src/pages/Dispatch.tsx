import { useEffect, useState } from 'react';
import {
  Route, Plus, Download, ClipboardList, Clock3, Rocket, Link2, X,
  PauseCircle, Zap, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { jobs as jobsApi, clients as clientsApi, vehicles as vehiclesApi, generators as generatorsApi, employees as employeesApi, hasRole, assetTraceability, getToken, API_BASE } from '../api/client';

interface Client { id: string; name: string; }
interface Site { id: string; name: string; address: string; }
interface Vehicle { id: string; plate_no: string; vehicle_type: string; make_model: string; }
interface Generator { id: string; serial_no: string; brand: string; model: string; status: string; }
interface Employee { id: string; name: string; role: string; }
interface Binding { id?: string; vehicle_id: string; generator_id: string; plate_no: string; generator_serial: string; power_kva?: number; }

export default function Dispatch() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vehicleList, setVehicleList] = useState<Vehicle[]>([]);
  const [generatorList, setGeneratorList] = useState<Generator[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ client_id: '', site_id: '', site_address: '', job_type: 'emergency', sla_minutes: 60, notes: '', vehicle_id: '', generator_id: '' });
  const [clientList, setClientList] = useState<Client[]>([]);
  const [siteList, setSiteList] = useState<Site[]>([]);
  const [bindingHints, setBindingHints] = useState<Record<string, string>>({});
  const [revBindingHints, setRevBindingHints] = useState<Record<string, string>>({});
  const [pairings, setPairings] = useState<Binding[]>([]);
  const [createPairing, setCreatePairing] = useState('');
  const [assignPairing, setAssignPairing] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [assignJobId, setAssignJobId] = useState('');
  const [assignForm, setAssignForm] = useState({ vehicle_id: '', generator_id: '', driver_id: '', chargeman_id: '' });
  const [driverList, setDriverList] = useState<Employee[]>([]);
  const [chargemanList, setChargemanList] = useState<Employee[]>([]);
  const [showInterrupt, setShowInterrupt] = useState(false);
  const [interruptJobId, setInterruptJobId] = useState('');
  const [interruptReason, setInterruptReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBindings = async () => {
    try {
      const res = await assetTraceability.bindings.current();
      const current = res.bindings || [];
      setPairings(current);
      const hints: Record<string, string> = {};
      current.forEach(b => { hints[b.vehicle_id] = b.generator_id; });
      setBindingHints(hints);
      const rev: Record<string, string> = {};
      current.forEach(b => { rev[b.generator_id] = b.vehicle_id; });
      setRevBindingHints(rev);
    } catch { /* no bindings data */ }
  };

  const fetchJobs = () => {
    setLoading(true);
    jobsApi.list(statusFilter ? { status: statusFilter } : undefined)
      .then((res) => setList(res.jobs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchJobs(); }, [statusFilter]);

  useEffect(() => {
    if (showCreate) {
      fetchBindings();
      Promise.all([clientsApi.list(), vehiclesApi.list(), generatorsApi.list(), employeesApi.list('driver'), employeesApi.list('chargeman')])
        .then(([c, v, g, d, ch]) => { setClientList(c.clients); setVehicleList(v.vehicles); setGeneratorList(g.generators); setDriverList(d.employees); setChargemanList(ch.employees); })
        .catch(console.error);
    }
  }, [showCreate]);

  useEffect(() => {
    if (form.client_id) {
      clientsApi.sites(form.client_id).then((res: any) => setSiteList(res.sites)).catch(console.error);
    } else { setSiteList([]); }
  }, [form.client_id]);

  useEffect(() => {
    if (showAssign) {
      fetchBindings();
      Promise.all([vehiclesApi.list(), generatorsApi.list(), employeesApi.list('driver'), employeesApi.list('chargeman')])
        .then(([v, g, d, ch]) => { setVehicleList(v.vehicles); setGeneratorList(g.generators); setDriverList(d.employees); setChargemanList(ch.employees); })
        .catch(console.error);
      const job = list.find(j => j.id === assignJobId);
      if (job) {
        setAssignForm({ vehicle_id: job.vehicle_id || '', generator_id: job.generator_id || '', driver_id: job.driver_id || '', chargeman_id: job.chargeman_id || '' });
        assetTraceability.bindings.current()
          .then((res: any) => {
            const match = (res.bindings || []).find((b: any) => b.vehicle_id === job.vehicle_id && b.generator_id === job.generator_id);
            setAssignPairing(match ? `${match.vehicle_id}|${match.generator_id}` : '');
          })
          .catch(() => {});
      }
    } else {
      setAssignPairing('');
    }
  }, [showAssign, assignJobId]);

  const pairingValue = (p: Binding) => `${p.vehicle_id}|${p.generator_id}`;

  const applyPairing = (val: string, target: 'create' | 'assign') => {
    const [vid, gid] = val ? val.split('|') : ['', ''];
    if (target === 'create') {
      setCreatePairing(val);
      setForm(f => ({ ...f, vehicle_id: vid, generator_id: gid }));
    } else {
      setAssignPairing(val);
      setAssignForm(f => ({ ...f, vehicle_id: vid, generator_id: gid }));
    }
  };

  const statusBadge = (s: string) => ({
    pending: 'bg-gray-200 text-gray-700',
    dispatched: 'bg-blue-100 text-blue-700 border border-blue-200',
    en_route: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    on_site: 'bg-purple-100 text-purple-700 border border-purple-200',
    completed: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    cancelled: 'bg-red-100 text-red-700 border border-red-200',
    interrupted: 'bg-red-200 text-red-800 border border-red-300',
  }[s] || 'bg-gray-100 text-gray-600');

  const jobTypeColor = (t: string) => ({
    emergency: 'bg-red-100 text-red-700',
    planned_shutdown: 'bg-amber-100 text-amber-700',
    standby_contract: 'bg-blue-100 text-blue-700',
  }[t] || 'bg-gray-100 text-gray-600');

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white';

  const pairedGenForVehicle = (vid: string) => {
    const genId = bindingHints[vid];
    if (genId) {
      const gen = generatorList.find((g: any) => g.id === genId);
      if (gen && gen.status === 'available') return genId;
    }
    return '';
  };

  const pairedVehForGen = (gid: string) => revBindingHints[gid] || '';

  const handleDispatch = async (id: string) => {
    try { await jobsApi.dispatch(id); fetchJobs(); } catch (err: any) { setError(err?.message || 'Failed to dispatch job'); }
  };

  const handleAssign = async () => {
    setSubmitting(true);
    setError('');
    try {
      await jobsApi.assign(assignJobId, {
        vehicle_id: assignForm.vehicle_id || undefined,
        generator_id: assignForm.generator_id || undefined,
        driver_id: assignForm.driver_id || undefined,
        chargeman_id: assignForm.chargeman_id || undefined,
      });
      setShowAssign(false);
      fetchJobs();
    } catch (err: any) { setError(err?.message || 'Failed to assign resources'); }
    finally { setSubmitting(false); }
  };

  const handleComplete = async (id: string) => {
    if (!confirm('Mark job as completed?')) return;
    setSubmitting(true);
    setError('');
    try { await jobsApi.complete(id); fetchJobs(); } catch (err: any) { setError(err?.message || 'Failed to complete job'); }
    finally { setSubmitting(false); }
  };

  const handleCreate = async () => {
    if (!form.client_id || !form.site_id) { setError('Select client and site'); return; }
    const site = siteList.find(s => s.id === form.site_id);
    setSubmitting(true);
    try {
      await jobsApi.create({
        client_id: form.client_id, site_id: form.site_id,
        site_address: site?.address || '', job_type: form.job_type,
        sla_minutes: form.sla_minutes, vehicle_id: form.vehicle_id || undefined,
        generator_id: form.generator_id || undefined, notes: form.notes,
      });
      setShowCreate(false);
      setForm({ client_id: '', site_id: '', site_address: '', job_type: 'emergency', sla_minutes: 60, notes: '', vehicle_id: '', generator_id: '' });
      fetchJobs();
    } catch (err: any) { setError(err?.message || 'Failed to create job'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Route}
        title="Dispatch"
        subtitle="Create jobs, assign assets & track deployments"
        actions={
          <>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto text-sm py-1.5">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="dispatched">Dispatched</option>
              <option value="en_route">En Route</option>
              <option value="on_site">On Site</option>
              <option value="completed">Completed</option>
              <option value="interrupted">Interrupted</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {hasRole('super_admin', 'dispatcher') && (
              <button onClick={() => setShowCreate(true)} className="btn-primary inline-flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> New Job
              </button>
            )}
            <button onClick={async () => {
              try {
                const res = await fetch(`${API_BASE}/v1/jobs/report/completed`, {
                  headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `completed_jobs_report_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
              } catch (e) { console.error('Report download failed', e); }
            }} className="btn-secondary inline-flex items-center gap-1.5">
              <Download className="w-4 h-4" /> Download Report
            </button>
          </>
        }
      />

      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</span>
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 -mt-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
          <ClipboardList className="w-3.5 h-3.5" /> {list.length} Jobs
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock3 className="w-3.5 h-3.5" /> {list.filter((j: any) => j.status === 'pending').length} Pending
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Rocket className="w-3.5 h-3.5" /> {list.filter((j: any) => ['dispatched','en_route','on_site'].includes(j.status)).length} Active
        </span>
      </div>

       <div className="card overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center"><LoadingSpinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Job #</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Client</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Type</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Vehicle</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Driver</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Dispatched</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {list.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-400">No jobs found</td></tr>
                  ) : list.map((j: any) => (
                    <tr key={j.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="p-3 font-mono text-xs text-brand-700 font-bold">{j.job_number}</td>
                      <td className="p-3 font-medium text-gray-800">{j.client_name || '-'}</td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${jobTypeColor(j.job_type)}`}>{j.job_type?.replace('_', ' ')}</span></td>
                      <td className="p-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusBadge(j.status)}`}>{j.status}</span></td>
                      <td className="p-3 font-mono text-xs">{j.plate_no || '-'}</td>
                      <td className="p-3 text-gray-600">{j.driver_name || '-'}</td>
                      <td className="p-3 text-xs text-gray-500">{j.dispatched_at ? new Date(j.dispatched_at).toLocaleString('en-MY', { dateStyle: 'short' }) : '—'}</td>
                      <td className="p-3">
                        {j.status === 'pending' && hasRole('super_admin', 'dispatcher') && (
                          <div className="flex gap-1">
                            <button onClick={() => { setAssignJobId(j.id); setShowAssign(true); }} className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition-colors shadow-sm">Assign</button>
                            <button onClick={() => handleDispatch(j.id)} className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors">Dispatch</button>
                          </div>
                        )}
                        {['dispatched','en_route','on_site'].includes(j.status) && hasRole('super_admin', 'dispatcher') && (
                          <div className="flex gap-1">
                            <button onClick={() => { setInterruptJobId(j.id); setShowInterrupt(true); setInterruptReason(''); }} className="px-2 py-1 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors">Interrupt</button>
                            <button onClick={() => handleComplete(j.id)} className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors">Complete</button>
                          </div>
                        )}
                        {j.status === 'completed' && <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Done</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
             </div>
           )}
         </div>

       {/* Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={() => setShowAssign(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Link2 className="w-5 h-5 text-indigo-600" />Assign Resources to Job</h2>
              <button onClick={() => setShowAssign(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Paired Unit (from Asset Management)</label>
                <select value={assignPairing} onChange={e => applyPairing(e.target.value, 'assign')} className={inputCls}>
                  <option value="">Custom selection</option>
                  {pairings.map(p => (
                    <option key={p.id || p.vehicle_id} value={pairingValue(p)}>
                      {p.plate_no} + {p.generator_serial}{p.power_kva ? ` (${p.power_kva} kVA)` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Vehicle</label><select value={assignForm.vehicle_id} onChange={e => setAssignForm(f => ({...f, vehicle_id: e.target.value}))} className={inputCls} disabled={!!assignPairing}><option value="">None</option>{vehicleList.map(v => <option key={v.id} value={v.id}>{v.plate_no} — {v.make_model}</option>)}</select></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Generator</label><select value={assignForm.generator_id} onChange={e => setAssignForm(f => ({...f, generator_id: e.target.value}))} className={inputCls} disabled={!!assignPairing}><option value="">None</option>{generatorList.filter((g: any) => g.status === 'available').map(g => <option key={g.id} value={g.id}>{g.serial_no} — {g.brand} {g.model}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Driver</label><select value={assignForm.driver_id} onChange={e => setAssignForm(f => ({...f, driver_id: e.target.value}))} className={inputCls}><option value="">None</option>{driverList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Chargeman</label><select value={assignForm.chargeman_id} onChange={e => setAssignForm(f => ({...f, chargeman_id: e.target.value}))} className={inputCls}><option value="">None</option>{chargemanList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowAssign(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleAssign} disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Assign'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interrupt Modal */}
      {showInterrupt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={() => setShowInterrupt(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2"><PauseCircle className="w-5 h-5 text-red-500" />Interrupt Job?</h3>
            <p className="text-sm text-gray-600 mb-4">Provide a reason for interrupting this job deployment.</p>
            <textarea value={interruptReason} onChange={e => setInterruptReason(e.target.value)} rows={3} className={inputCls} placeholder="Reason for interruption..." />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setShowInterrupt(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={async () => {
                if (!interruptReason.trim()) { setError('Provide a reason'); return; }
                setSubmitting(true);
                setError('');
                try { await jobsApi.interrupt(interruptJobId, interruptReason); setShowInterrupt(false); fetchJobs(); } catch (err: any) { setError(err?.message || 'Failed to interrupt job'); }
                finally { setSubmitting(false); }
              }} disabled={submitting} className="btn-danger">{submitting ? 'Interrupting...' : 'Interrupt'}</button>
            </div>
          </div>
        </div>
        )}

       {/* Quick Create Modal */}
       {showCreate && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={() => setShowCreate(false)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Zap className="w-5 h-5 text-indigo-600" />New Job</h2>
               <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
             </div>
             <div className="space-y-3">
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1">Client *</label>
                 <select value={form.client_id} onChange={e => { setForm(f => ({...f, client_id: e.target.value, site_id: ''})); }} className={inputCls}>
                   <option value="">Select client</option>
                   {clientList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
               </div>
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1">Site *</label>
                 <select value={form.site_id} onChange={e => { const s = siteList.find(x => x.id === e.target.value); setForm(f => ({...f, site_id: e.target.value, site_address: s?.address || ''})); }} className={inputCls} disabled={!form.client_id}>
                   <option value="">Select site</option>
                   {siteList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1">Job Type *</label>
                   <select value={form.job_type} onChange={e => setForm(f => ({...f, job_type: e.target.value}))} className={inputCls}>
                      <option value="emergency">Emergency</option>
                      <option value="planned_shutdown">Planned Shutdown</option>
                      <option value="standby_contract">Standby Contract</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1">SLA (min)</label>
                   <input type="number" value={form.sla_minutes} onChange={e => setForm(f => ({...f, sla_minutes: Number(e.target.value)}))} className={inputCls} min={0} />
                 </div>
               </div>
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1">Paired Unit (from Asset Management)</label>
                 <select value={createPairing} onChange={e => applyPairing(e.target.value, 'create')} className={inputCls}>
                   <option value="">Custom selection</option>
                   {pairings.map(p => (
                     <option key={p.id || p.vehicle_id} value={pairingValue(p)}>
                       {p.plate_no} + {p.generator_serial}{p.power_kva ? ` (${p.power_kva} kVA)` : ''}
                     </option>
                   ))}
                 </select>
                 {pairings.length === 0 && (
                   <p className="text-xs text-gray-400 mt-1">No active pairings — pair a vehicle & generator in Asset Management first.</p>
                 )}
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1">Vehicle</label>
                   <select value={form.vehicle_id} onChange={e => setForm(f => ({...f, vehicle_id: e.target.value}))} className={inputCls} disabled={!!createPairing}>
                     <option value="">Auto / None</option>
                     {vehicleList.map(v => <option key={v.id} value={v.id}>{v.plate_no} — {v.make_model}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1">Generator</label>
                   <select value={form.generator_id} onChange={e => setForm(f => ({...f, generator_id: e.target.value}))} className={inputCls} disabled={!!createPairing}>
                     <option value="">Auto / None</option>
                     {generatorList.filter((g: any) => g.status === 'available').map(g => <option key={g.id} value={g.id}>{g.serial_no} — {g.brand} {g.model}</option>)}
                   </select>
                 </div>
               </div>
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                 <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} className={inputCls} placeholder="Optional notes" />
               </div>
               <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                 <button onClick={handleCreate} disabled={submitting} className="btn-primary">{submitting ? 'Creating...' : 'Create Job'}</button>
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }