import { useState, useEffect, type ReactNode } from 'react';
import {
  Truck, Construction, Package, Van, Car,
  Fuel, Cog, Zap, Cpu, Fan, Droplet, Droplets, Thermometer,
  Plug, Wind, Battery, Snowflake, Wrench, Map, RefreshCw, Plus,
  Link2, AlertTriangle, X, Pencil, CheckCircle2, XCircle,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { vehicles as vehiclesApi, assetTraceability } from '../api/client';
import VehicleMap from './VehicleMap';
import { hasRole } from '../api/client';

type Tab = 'vehicles' | 'map' | 'components';

const COMPONENT_TYPES = [
  'engine', 'transmission', 'alternator', 'ecu', 'turbo', 'injector',
  'radiator', 'starter_motor', 'fuel_pump', 'oil_pump', 'water_pump',
  'air_compressor', 'battery', 'exhaust_system', 'cooling_system',
];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  removed: 'bg-red-100 text-red-700 border border-red-200',
  maintenance: 'bg-amber-100 text-amber-700 border border-amber-200',
};

export default function Fleet() {
  const [activeTab, setActiveTab] = useState<Tab>('vehicles');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [components, setComponents] = useState<any[]>([]);
  const [componentsLoading, setComponentsLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editComponent, setEditComponent] = useState<any>(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showEditVehicle, setShowEditVehicle] = useState<any>(null);
  const [vehicleForm, setVehicleForm] = useState({
    plate_no: '',
    vehicle_type: 'prime_mover',
    make_model: '',
    year: '',
    can_bus_supported: true,
    tank_capacity_l: '',
    status: '',
  });
  const [form, setForm] = useState({
    component_type: 'engine',
    serial_number: '',
    manufacturer: '',
    model: '',
    mileage_at_install: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchVehicles(); }, []);

  useEffect(() => {
    if (activeTab === 'components' && selectedVehicle) {
      fetchComponents();
    }
  }, [activeTab, selectedVehicle]);

  const fetchVehicles = async () => {
    try {
      const res = await vehiclesApi.list();
      setVehicles(res.vehicles || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchComponents = async () => {
    if (!selectedVehicle) return;
    setComponentsLoading(true);
    try {
      const res = await assetTraceability.components.vehicle.list(selectedVehicle);
      setComponents(res.components || []);
    } catch (e) { console.error(e); }
    finally { setComponentsLoading(false); }
  };

  const handleAdd = async () => {
    if (!selectedVehicle) { setError('Select a vehicle first'); return; }
    setSubmitting(true); setError('');
    try {
      await assetTraceability.components.vehicle.create(selectedVehicle, {
        component_type: form.component_type,
        serial_number: form.serial_number || undefined,
        manufacturer: form.manufacturer || undefined,
        model: form.model || undefined,
        mileage_at_install: form.mileage_at_install ? Number(form.mileage_at_install) : undefined,
        notes: form.notes || undefined,
      });
      setShowAddModal(false);
      resetForm();
      fetchComponents();
    } catch (e: any) { setError(e?.message || 'Something went wrong'); }
    finally { setSubmitting(false); }
  };

  const handleEdit = async () => {
    if (!editComponent) return;
    setSubmitting(true);
    try {
      await assetTraceability.components.vehicle.update(editComponent.id, {
        status: form.component_type,
        serial_number: form.serial_number || undefined,
        manufacturer: form.manufacturer || undefined,
        model: form.model || undefined,
        notes: form.notes || undefined,
      });
      setShowEditModal(false);
      setEditComponent(null);
      resetForm();
      fetchComponents();
    } catch (e: any) { setError(e?.message || 'Something went wrong'); }
    finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setForm({ component_type: 'engine', serial_number: '', manufacturer: '', model: '', mileage_at_install: '', notes: '' });
  };

  const resetVehicleForm = () => {
    setVehicleForm({ plate_no: '', vehicle_type: 'prime_mover', make_model: '', year: '', can_bus_supported: true, tank_capacity_l: '', status: '' });
  };

  const handleAddVehicle = async () => {
    if (!vehicleForm.plate_no || !vehicleForm.make_model) { setError('Plate number and Make/Model are required'); return; }
    setSubmitting(true); setError('');
    try {
      await vehiclesApi.create({
        plate_no: vehicleForm.plate_no,
        vehicle_type: vehicleForm.vehicle_type,
        make_model: vehicleForm.make_model,
        year: vehicleForm.year ? Number(vehicleForm.year) : null,
        can_bus_supported: vehicleForm.can_bus_supported,
        tank_capacity_l: vehicleForm.tank_capacity_l ? Number(vehicleForm.tank_capacity_l) : null,
      });
      setShowAddVehicle(false);
      resetVehicleForm();
      fetchVehicles();
    } catch (e: any) { setError(e?.message || 'Something went wrong'); }
    finally { setSubmitting(false); }
  };

  const handleEditVehicle = async () => {
    if (!showEditVehicle) return;
    setSubmitting(true); setError('');
    try {
      await vehiclesApi.update(showEditVehicle.id, {
        plate_no: vehicleForm.plate_no,
        vehicle_type: vehicleForm.vehicle_type,
        make_model: vehicleForm.make_model,
        year: vehicleForm.year ? Number(vehicleForm.year) : null,
        can_bus_supported: vehicleForm.can_bus_supported,
        tank_capacity_l: vehicleForm.tank_capacity_l ? Number(vehicleForm.tank_capacity_l) : null,
        status: vehicleForm.status || showEditVehicle.status,
      });
      setShowEditVehicle(null);
      resetVehicleForm();
      fetchVehicles();
    } catch (e: any) { setError(e?.message || 'Something went wrong'); }
    finally { setSubmitting(false); }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<any>(null);

  const handleDeleteVehicle = async () => {
    if (!showDeleteConfirm) return;
    setSubmitting(true); setError('');
    try {
      await vehiclesApi.delete(showDeleteConfirm.id);
      setShowDeleteConfirm(null);
      fetchVehicles();
    } catch (e: any) { setError(e?.message || 'Something went wrong'); }
    finally { setSubmitting(false); }
  };

  const openEdit = (c: any) => {
    setEditComponent(c);
    setForm({
      component_type: c.component_type || 'engine',
      serial_number: c.serial_number || '',
      manufacturer: c.manufacturer || '',
      model: c.model || '',
      mileage_at_install: c.mileage_at_install?.toString() || '',
      notes: c.notes || '',
    });
    setShowEditModal(true);
  };

  const formatDate = (s?: string) => s ? new Date(s).toLocaleString('en-MY', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  const statusBadge = (s: string) => STATUS_COLORS[s] || 'bg-gray-100 text-gray-600 border border-gray-200';

  const typeIcon = (t: string) => ({
    prime_mover: <Truck className="w-3.5 h-3.5" />, crane_truck: <Construction className="w-3.5 h-3.5" />, low_loader: <Package className="w-3.5 h-3.5" />, service_van: <Van className="w-3.5 h-3.5" />,
  }[t] || <Car className="w-3.5 h-3.5" />);

  const typeColor = (t: string) => ({
    prime_mover: 'bg-blue-50 text-blue-700',
    crane_truck: 'bg-purple-50 text-purple-700',
    low_loader: 'bg-teal-50 text-teal-700',
    service_van: 'bg-green-50 text-green-700',
  }[t] || 'bg-gray-50 text-gray-700');

  const componentTypeIcon = (t: string) => ({
    engine: <Fuel className="w-3.5 h-3.5" />, transmission: <Cog className="w-3.5 h-3.5" />, alternator: <Zap className="w-3.5 h-3.5" />, ecu: <Cpu className="w-3.5 h-3.5" />, turbo: <Fan className="w-3.5 h-3.5" />,
    injector: <Droplet className="w-3.5 h-3.5" />, radiator: <Thermometer className="w-3.5 h-3.5" />, starter_motor: <Plug className="w-3.5 h-3.5" />, fuel_pump: <Fuel className="w-3.5 h-3.5" />,
    oil_pump: <Droplets className="w-3.5 h-3.5" />, water_pump: <Droplets className="w-3.5 h-3.5" />, air_compressor: <Wind className="w-3.5 h-3.5" />, battery: <Battery className="w-3.5 h-3.5" />,
    exhaust_system: <Wind className="w-3.5 h-3.5" />, cooling_system: <Snowflake className="w-3.5 h-3.5" />,
  }[t] || <Wrench className="w-3.5 h-3.5" />);

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white';

  const tabItems: { key: Tab; label: string; icon: ReactNode; count?: number }[] = [
    { key: 'vehicles', label: 'Vehicles', icon: <Truck className="w-4 h-4" />, count: vehicles.length },
    { key: 'map', label: 'Live Map', icon: <Map className="w-4 h-4" /> },
    { key: 'components', label: 'Components', icon: <Wrench className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        icon={Truck}
        title="Fleet Management"
        subtitle="Vehicles, live tracking & component lifecycle"
        actions={
          <>
            <button onClick={fetchVehicles} className="btn-secondary inline-flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            {hasRole('super_admin', 'fleet_manager') && (
              <button onClick={() => { resetVehicleForm(); setShowAddVehicle(true); }} className="btn-primary inline-flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add Vehicle
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
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"><Link2 className="w-3.5 h-3.5" /> {vehicles.filter((v: any) => v.status === 'active').length} Active</span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"><AlertTriangle className="w-3.5 h-3.5" /> {vehicles.filter((v: any) => v.status === 'maintenance').length} Maintenance</span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"><Package className="w-3.5 h-3.5" /> {vehicles.filter((v: any) => v.vehicle_type === 'prime_mover').length} Prime Movers</span>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {tabItems.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all ${activeTab === tab.key ? 'bg-brand-50 text-brand-700 border-b-2 border-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              {tab.icon} {tab.label} {tab.count !== undefined && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.key ? 'bg-brand-200 text-brand-800' : 'bg-gray-100 text-gray-500'}`}>{tab.count}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Vehicles Tab */}
      {activeTab === 'vehicles' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center gap-2 text-gray-400"><LoadingSpinner /><span className="text-sm">Loading vehicles...</span></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Plate</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Type</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Make / Model</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Year</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">CAN Bus</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Tank (L)</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {vehicles.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-400">No vehicles found</td></tr>
                  ) : vehicles.map((v: any) => (
                    <tr key={v.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="p-3 font-mono text-brand-700 font-bold">{v.plate_no}</td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 ${typeColor(v.vehicle_type)}`}>{typeIcon(v.vehicle_type)} {v.vehicle_type?.replace('_', ' ')}</span></td>
                      <td className="p-3 font-medium text-gray-800">{v.make_model}</td>
                      <td className="p-3 text-gray-600">{v.year || '—'}</td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 ${v.can_bus_supported ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{v.can_bus_supported ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}{v.can_bus_supported ? 'Yes' : 'No'}</span></td>
                      <td className="p-3 text-gray-600 font-medium">{v.tank_capacity_l || '—'}</td>
                      <td className="p-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusBadge(v.status)}`}>{v.status}</span></td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button onClick={() => { setSelectedVehicle(v.id); setActiveTab('components'); }} className="px-3 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">Components</button>
                          {hasRole('super_admin', 'fleet_manager') && (
                            <>
                              <button onClick={() => { setVehicleForm({ plate_no: v.plate_no, vehicle_type: v.vehicle_type, make_model: v.make_model, year: v.year?.toString() || '', can_bus_supported: v.can_bus_supported, tank_capacity_l: v.tank_capacity_l?.toString() || '', status: v.status }); setShowEditVehicle(v); }} className="px-3 py-1 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">Edit</button>
                              <button onClick={() => setShowDeleteConfirm(v)} className="px-3 py-1 text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">Delete</button>
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

      {/* Map Tab */}
      {activeTab === 'map' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: '600px' }}>
          <VehicleMap />
        </div>
      )}

      {/* Components Tab */}
      {activeTab === 'components' && (
        <div className="space-y-4">
          {/* Vehicle Selector */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Select Vehicle:</label>
              <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} className={`${inputCls} sm:max-w-xs`}>
                <option value="">Choose vehicle...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.plate_no} — {v.make_model}</option>
                ))}
              </select>
              {selectedVehicle && hasRole('super_admin', 'fleet_manager') && (
                <button onClick={() => { resetForm(); setShowAddModal(true); }} className="btn-primary">+ Add Component</button>
              )}
            </div>
          </div>

          {/* Components List */}
          {selectedVehicle && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {componentsLoading ? (
                <div className="p-10 flex flex-col items-center justify-center gap-2 text-gray-400"><LoadingSpinner /><span className="text-sm">Loading components...</span></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Type</th>
                        <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Serial Number</th>
                        <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Manufacturer</th>
                        <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Model</th>
                        <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Installed</th>
                        <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Removed</th>
                        <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Status</th>
                        <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {components.length === 0 ? (
                        <tr><td colSpan={8} className="p-8 text-center text-gray-400">No components found for this vehicle</td></tr>
                      ) : components.map((c: any) => (
                        <tr key={c.id} className="hover:bg-indigo-50/40 transition-colors">
                          <td className="p-3"><span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 inline-flex items-center gap-1">{componentTypeIcon(c.component_type)} {c.component_type?.replace('_', ' ')}</span></td>
                          <td className="p-3 font-mono text-xs text-gray-700">{c.serial_number || '—'}</td>
                          <td className="p-3 text-gray-700">{c.manufacturer || '—'}</td>
                          <td className="p-3 text-gray-700">{c.model || '—'}</td>
                          <td className="p-3 text-xs text-gray-500">{formatDate(c.installed_at)}</td>
                          <td className="p-3 text-xs text-gray-500">{formatDate(c.removed_at)}</td>
                          <td className="p-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusBadge(c.status)}`}>{c.status}</span></td>
                          <td className="p-3">
                            {c.status === 'active' && hasRole('super_admin', 'fleet_manager') && (
                              <button onClick={() => openEdit(c)} className="px-3 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">Edit</button>
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

          {!selectedVehicle && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Wrench className="w-7 h-7 text-indigo-400" /></div>
              <h3 className="text-lg font-bold text-gray-700">Vehicle Component Tracking</h3>
              <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">Select a vehicle above to view and manage its components</p>
            </div>
          )}
        </div>
      )}

      {/* Add Component Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Wrench className="w-5 h-5 text-indigo-600" />Add Component</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Component Type *</label>
                <select value={form.component_type} onChange={e => setForm(f => ({...f, component_type: e.target.value}))} className={inputCls}>
                  {COMPONENT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Serial Number</label>
                  <input type="text" value={form.serial_number} onChange={e => setForm(f => ({...f, serial_number: e.target.value}))} className={inputCls} placeholder="e.g. ENG-12345" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mileage at Install</label>
                  <input type="number" value={form.mileage_at_install} onChange={e => setForm(f => ({...f, mileage_at_install: e.target.value}))} className={inputCls} placeholder="km" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Manufacturer</label>
                  <input type="text" value={form.manufacturer} onChange={e => setForm(f => ({...f, manufacturer: e.target.value}))} className={inputCls} placeholder="e.g. Cummins" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Model</label>
                  <input type="text" value={form.model} onChange={e => setForm(f => ({...f, model: e.target.value}))} className={inputCls} placeholder="e.g. QSX15" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} className={inputCls} placeholder="Optional notes" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleAdd} disabled={submitting} className="btn-primary">{submitting ? 'Adding...' : 'Add Component'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Component Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={() => { setShowEditModal(false); setEditComponent(null); }}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Pencil className="w-5 h-5 text-indigo-600" />Edit Component</h2>
              <button onClick={() => { setShowEditModal(false); setEditComponent(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select value={form.component_type} onChange={e => setForm(f => ({...f, component_type: e.target.value}))} className={inputCls}>
                  <option value="active">Active</option>
                  <option value="removed">Removed</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Serial Number</label>
                  <input type="text" value={form.serial_number} onChange={e => setForm(f => ({...f, serial_number: e.target.value}))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mileage at Install</label>
                  <input type="number" value={form.mileage_at_install} onChange={e => setForm(f => ({...f, mileage_at_install: e.target.value}))} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Manufacturer</label>
                  <input type="text" value={form.manufacturer} onChange={e => setForm(f => ({...f, manufacturer: e.target.value}))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Model</label>
                  <input type="text" value={form.model} onChange={e => setForm(f => ({...f, model: e.target.value}))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} className={inputCls} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setShowEditModal(false); setEditComponent(null); }} className="btn-secondary">Cancel</button>
                <button onClick={handleEdit} disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddVehicle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={() => setShowAddVehicle(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Truck className="w-5 h-5 text-indigo-600" />Add New Vehicle</h2>
              <button onClick={() => setShowAddVehicle(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Plate Number *</label>
                  <input type="text" value={vehicleForm.plate_no} onChange={e => setVehicleForm(f => ({...f, plate_no: e.target.value}))} className={inputCls} placeholder="e.g. B 1234 ABC" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vehicle Type *</label>
                  <select value={vehicleForm.vehicle_type} onChange={e => setVehicleForm(f => ({...f, vehicle_type: e.target.value}))} className={inputCls}>
                    <option value="prime_mover">🚛 Prime Mover</option>
                    <option value="crane_truck">🏗️ Crane Truck</option>
                    <option value="low_loader">📦 Low Loader</option>
                    <option value="service_van">✈️ Service Van</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Make / Model *</label>
                <input type="text" value={vehicleForm.make_model} onChange={e => setVehicleForm(f => ({...f, make_model: e.target.value}))} className={inputCls} placeholder="e.g. Scania P440 6x2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Year</label>
                  <input type="number" value={vehicleForm.year} onChange={e => setVehicleForm(f => ({...f, year: e.target.value}))} className={inputCls} placeholder="e.g. 2024" min="1990" max="2030" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tank Capacity (L)</label>
                  <input type="number" value={vehicleForm.tank_capacity_l} onChange={e => setVehicleForm(f => ({...f, tank_capacity_l: e.target.value}))} className={inputCls} placeholder="e.g. 400" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">CAN Bus Supported</label>
                <button type="button" onClick={() => setVehicleForm(f => ({...f, can_bus_supported: !f.can_bus_supported}))} className={`relative w-12 h-6 rounded-full transition-colors ${vehicleForm.can_bus_supported ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${vehicleForm.can_bus_supported ? 'translate-x-6' : ''}`} />
                </button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowAddVehicle(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleAddVehicle} disabled={submitting} className="btn-primary">{submitting ? 'Adding...' : '+ Add Vehicle'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {showEditVehicle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={() => setShowEditVehicle(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Pencil className="w-5 h-5 text-indigo-600" />Edit Vehicle</h2>
              <button onClick={() => setShowEditVehicle(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Plate Number *</label>
                  <input type="text" value={vehicleForm.plate_no} onChange={e => setVehicleForm(f => ({...f, plate_no: e.target.value}))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vehicle Type *</label>
                  <select value={vehicleForm.vehicle_type} onChange={e => setVehicleForm(f => ({...f, vehicle_type: e.target.value}))} className={inputCls}>
                    <option value="prime_mover">🚛 Prime Mover</option>
                    <option value="crane_truck">🏗️ Crane Truck</option>
                    <option value="low_loader">📦 Low Loader</option>
                    <option value="service_van">✈️ Service Van</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Make / Model *</label>
                <input type="text" value={vehicleForm.make_model} onChange={e => setVehicleForm(f => ({...f, make_model: e.target.value}))} className={inputCls} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Year</label>
                  <input type="number" value={vehicleForm.year} onChange={e => setVehicleForm(f => ({...f, year: e.target.value}))} className={inputCls} min="1990" max="2030" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tank Capacity (L)</label>
                  <input type="number" value={vehicleForm.tank_capacity_l} onChange={e => setVehicleForm(f => ({...f, tank_capacity_l: e.target.value}))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <select value={vehicleForm.status} onChange={e => setVehicleForm(f => ({...f, status: e.target.value}))} className={inputCls}>
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="removed">Removed</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">CAN Bus Supported</label>
                <button type="button" onClick={() => setVehicleForm(f => ({...f, can_bus_supported: !f.can_bus_supported}))} className={`relative w-12 h-6 rounded-full transition-colors ${vehicleForm.can_bus_supported ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${vehicleForm.can_bus_supported ? 'translate-x-6' : ''}`} />
                </button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowEditVehicle(null)} className="btn-secondary">Cancel</button>
                <button onClick={handleEditVehicle} disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Save Changes'}</button>
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
              <h2 className="text-lg font-bold text-gray-800">Delete Vehicle</h2>
              <p className="text-sm text-gray-500 mt-2">Are you sure you want to delete <strong>{showDeleteConfirm.plate_no}</strong>?</p>
              <p className="text-xs text-red-500 mt-1">This will also remove all telemetry, components, and job history.</p>
              <div className="flex justify-center gap-3 mt-6">
                <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary">Cancel</button>
                <button onClick={handleDeleteVehicle} disabled={submitting} className="btn-danger">{submitting ? 'Deleting...' : 'Delete'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}