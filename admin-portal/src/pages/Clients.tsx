import { useEffect, useState } from 'react';
import { clients as clientsApi, hasRole } from '../api/client';

interface Client { id: string; name: string; short_code: string; tin: string; sst_reg_no: string; is_active: number; site_count: number; }
interface Site { id: string; name: string; address: string; latitude: number; longitude: number; geofence_radius_m: number; is_active: number; }

export default function Clients() {
  const [list, setList] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [sitesLoading, setSitesLoading] = useState(false);

  const [showClientForm, setShowClientForm] = useState(false);
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  const [clientForm, setClientForm] = useState({ name: '', short_code: '', tin: '', sst_reg_no: '' });
  const [siteForm, setSiteForm] = useState({ name: '', address: '', latitude: 0, longitude: 0, geofence_radius_m: 150 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const inputCls = 'w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none';

  const fetchList = () => {
    setLoading(true);
    clientsApi.list().then((res) => setList(res.clients)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchList(); }, []);

  const loadSites = (client: Client) => {
    setSelectedClient(client);
    setSitesLoading(true);
    clientsApi.sites(client.id).then((res) => setSites(res.sites)).catch(console.error).finally(() => setSitesLoading(false));
  };

  const handleCreateClient = async () => {
    if (!clientForm.name) { setError('Client name is required'); return; }
    setSubmitting(true);
    try {
      if (editingClient) {
        await clientsApi.update(editingClient.id, clientForm);
      } else {
        await clientsApi.create(clientForm);
      }
      setShowClientForm(false);
      setEditingClient(null);
      setClientForm({ name: '', short_code: '', tin: '', sst_reg_no: '' });
      fetchList();
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleCreateSite = async () => {
    if (!selectedClient || !siteForm.name) { setError('Site name is required'); return; }
    setSubmitting(true);
    try {
      if (editingSite) {
        await clientsApi.updateSite(selectedClient.id, editingSite.id, siteForm);
      } else {
        await clientsApi.createSite(selectedClient.id, siteForm);
      }
      setShowSiteForm(false);
      setEditingSite(null);
      setSiteForm({ name: '', address: '', latitude: 0, longitude: 0, geofence_radius_m: 150 });
      loadSites(selectedClient);
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!selectedClient || !confirm('Delete this site?')) return;
    try {
      await clientsApi.deleteSite(selectedClient.id, siteId);
      loadSites(selectedClient);
    } catch (err: any) { setError(err.message); }
  };

  const openEditClient = (c: Client) => {
    setEditingClient(c);
    setClientForm({ name: c.name, short_code: c.short_code || '', tin: c.tin || '', sst_reg_no: c.sst_reg_no || '' });
    setShowClientForm(true);
  };

  const openEditSite = (s: Site) => {
    setEditingSite(s);
    setSiteForm({ name: s.name, address: s.address || '', latitude: s.latitude || 0, longitude: s.longitude || 0, geofence_radius_m: s.geofence_radius_m || 150 });
    setShowSiteForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Clients & Locations</h1>
        {hasRole('super_admin') && (
          <button
            onClick={() => { setEditingClient(null); setClientForm({ name: '', short_code: '', tin: '', sst_reg_no: '' }); setShowClientForm(true); }}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700"
          >
            + Add Client
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border p-4">
          <h2 className="font-semibold text-gray-700 mb-3">Client List</h2>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : (
            <div className="space-y-2">
              {list.map((c) => (
                <div
                  key={c.id}
                  onClick={() => loadSites(c)}
                  className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                    selectedClient?.id === c.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.short_code || '-'} &middot; {c.site_count} site(s)</p>
                    </div>
                    {hasRole('super_admin') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditClient(c); }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {list.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No clients yet</p>}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-4">
          {selectedClient ? (
            <>
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold text-gray-700">{selectedClient.name} &mdash; Sites</h2>
                {hasRole('super_admin') && (
                  <button
                    onClick={() => { setEditingSite(null); setSiteForm({ name: '', address: '', latitude: 0, longitude: 0, geofence_radius_m: 150 }); setShowSiteForm(true); }}
                    className="px-3 py-1 bg-brand-600 text-white rounded-lg text-xs hover:bg-brand-700"
                  >
                    + Add Site
                  </button>
                )}
              </div>
              {sitesLoading ? (
                <p className="text-gray-400 text-sm">Loading sites...</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Address</th>
                      <th className="text-left p-3">Coords</th>
                      <th className="text-left p-3">Radius (m)</th>
                      {hasRole('super_admin') && <th className="text-left p-3">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sites.map((s) => (
                      <tr key={s.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 font-medium">{s.name}</td>
                        <td className="p-3 text-gray-600">{s.address || '-'}</td>
                        <td className="p-3 font-mono text-xs">{s.latitude}, {s.longitude}</td>
                        <td className="p-3">{s.geofence_radius_m}</td>
                        {hasRole('super_admin') && (
                          <td className="p-3 space-x-2">
                            <button onClick={() => openEditSite(s)} className="text-xs text-blue-600 hover:text-blue-800">Edit</button>
                            <button onClick={() => handleDeleteSite(s.id)} className="text-xs text-red-600 hover:text-red-800">Delete</button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {sites.length === 0 && (
                      <tr><td colSpan={5} className="p-6 text-center text-gray-400">No sites registered</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <p className="text-gray-400 text-sm text-center py-12">Select a client to view their sites</p>
          )}
        </div>
      </div>

      {showClientForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} className={inputCls} placeholder="e.g. Tenaga Nasional Berhad" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Short Code</label>
                  <input value={clientForm.short_code} onChange={(e) => setClientForm({ ...clientForm, short_code: e.target.value })} className={inputCls} placeholder="e.g. TNB" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TIN</label>
                  <input value={clientForm.tin} onChange={(e) => setClientForm({ ...clientForm, tin: e.target.value })} className={inputCls} placeholder="e.g. C1234567890" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SST Reg No</label>
                <input value={clientForm.sst_reg_no} onChange={(e) => setClientForm({ ...clientForm, sst_reg_no: e.target.value })} className={inputCls} placeholder="e.g. SST-0012345" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => { setShowClientForm(false); setEditingClient(null); }} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreateClient} disabled={submitting} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">
                {submitting ? 'Saving...' : editingClient ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSiteForm && selectedClient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editingSite ? 'Edit Site' : `Add Site to ${selectedClient.name}`}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Name *</label>
                <input value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })} className={inputCls} placeholder="e.g. TNB Paka Power Plant" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input value={siteForm.address} onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })} className={inputCls} placeholder="e.g. Paka, Terengganu" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                  <input type="number" step="any" value={siteForm.latitude} onChange={(e) => setSiteForm({ ...siteForm, latitude: Number(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                  <input type="number" step="any" value={siteForm.longitude} onChange={(e) => setSiteForm({ ...siteForm, longitude: Number(e.target.value) })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Geofence Radius (m)</label>
                <input type="number" value={siteForm.geofence_radius_m} onChange={(e) => setSiteForm({ ...siteForm, geofence_radius_m: Number(e.target.value) })} className={inputCls} min={50} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => { setShowSiteForm(false); setEditingSite(null); }} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreateSite} disabled={submitting} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">
                {submitting ? 'Saving...' : editingSite ? 'Update' : 'Add Site'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
