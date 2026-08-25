import { useEffect, useState, useRef } from 'react';
import { fuel, vehicles as vehiclesApi, hasRole } from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, CartesianGrid } from 'recharts';
import { AlertTriangle, X, Upload, CheckCircle2 } from 'lucide-react';

interface FuelEntry {
  vehicle_id: string;
  litres: number;
  card_ref: string;
  card_provider: string;
  recorded_at: string;
}

export default function Fuel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showImport, setShowImport] = useState(false);
  const [vehicleList, setVehicleList] = useState<any[]>([]);
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null);
  const [csvMode, setCsvMode] = useState(false);
  const [csvText, setCsvText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([fuel.logs(), fuel.anomalies()])
      .then(([l, a]) => { setLogs(l.fuel_logs); setAnomalies(a.anomalies); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (showImport) {
      vehiclesApi.list().then((res) => setVehicleList(res.vehicles)).catch(console.error);
      setEntries([]);
      setImportResult(null);
      setCsvText('');
      setCsvMode(false);
    }
  }, [showImport]);

  const chartData = logs.slice(0, 20).reverse().map((l) => ({
    time: new Date(l.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    litres: l.litres,
    plate: l.plate_no,
  }));

  const providerData = Object.entries(
    logs.reduce((acc: Record<string, number>, l) => {
      const provider = l.card_provider || 'Unknown';
      acc[provider] = (acc[provider] || 0) + l.litres;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }));

  const PIE_COLORS = ['#1a3c6e', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

  const vehicleConsumption = Object.entries(
    logs.reduce((acc: Record<string, { litres: number; count: number }>, l) => {
      const plate = l.plate_no || 'Unknown';
      acc[plate] = { litres: (acc[plate]?.litres || 0) + l.litres, count: (acc[plate]?.count || 0) + 1 };
      return acc;
    }, {})
  ).map(([plate, data]) => ({ plate, total_litres: Math.round(data.litres), refuels: data.count }))
    .sort((a, b) => b.total_litres - a.total_litres).slice(0, 10);

  const addRow = () => {
    setEntries([...entries, {
      vehicle_id: '', litres: 0, card_ref: '', card_provider: 'Petronas',
      recorded_at: new Date().toISOString().slice(0, 16),
    }]);
  };

  const updateEntry = (idx: number, field: keyof FuelEntry, value: any) => {
    setEntries(entries.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const removeEntry = (idx: number) => {
    setEntries(entries.filter((_, i) => i !== idx));
  };

  const parseCsv = (text: string) => {
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length < 2) { setError('CSV needs a header row + at least one data row'); return; }
    const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
    const plateIdx = header.findIndex((h) => h.includes('plate'));
    const litresIdx = header.findIndex((h) => h.includes('litre'));
    const refIdx = header.findIndex((h) => h.includes('ref') || h.includes('transaction'));
    const providerIdx = header.findIndex((h) => h.includes('provider') || h.includes('card'));
    const dateIdx = header.findIndex((h) => h.includes('date') || h.includes('time'));

    if (plateIdx === -1 || litresIdx === -1) {
      setError('CSV must have at least "plate" and "litres" columns');
      return;
    }

    const parsed: FuelEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      const plate = cols[plateIdx]?.replace(/"/g, '');
      const litres = parseFloat(cols[litresIdx]);
      if (!plate || isNaN(litres)) continue;

      const vehicle = vehicleList.find((v) => v.plate_no === plate);
      parsed.push({
        vehicle_id: vehicle?.id || '',
        litres,
        card_ref: refIdx >= 0 ? cols[refIdx]?.replace(/"/g, '') || '' : '',
        card_provider: providerIdx >= 0 ? cols[providerIdx]?.replace(/"/g, '') || 'Petronas' : 'Petronas',
        recorded_at: dateIdx >= 0 ? cols[dateIdx]?.replace(/"/g, '') || new Date().toISOString() : new Date().toISOString(),
      });
    }
    setEntries(parsed);
    setCsvMode(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCsv(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    const valid = entries.filter((e) => e.vehicle_id && e.litres > 0);
    if (valid.length === 0) { setError('Add at least one valid entry (vehicle + litres)'); return; }
    setImporting(true);
    try {
      const result = await fuel.importCard(valid);
      setImportResult(result);
      fetchData();
    } catch (err: any) { setError(err?.message || 'Import failed'); }
    finally { setImporting(false); }
  };

  const inputCls = 'w-full px-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</span>
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Fuel Management</h1>
        {hasRole('super_admin', 'finance') && (
          <button onClick={() => setShowImport(true)} className="btn-primary inline-flex items-center gap-1.5 self-start">
            <Upload className="w-4 h-4" /> Import Fuel Card
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Recent Fuel Events</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="litres" fill="#1a3c6e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">No fuel data yet</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Fuel by Provider</h2>
          {providerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={providerData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {providerData.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `${v}L`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">No data</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Top Vehicles by Consumption</h2>
          {vehicleConsumption.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={vehicleConsumption} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="plate" tick={{ fontSize: 10 }} width={80} />
                <Tooltip formatter={(v: any) => `${v}L`} />
                <Bar dataKey="total_litres" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">No data</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Anomalies &amp; Alerts</h2>
          {anomalies.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">No anomalies detected</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {anomalies.map((a) => {
                const sev = a.severity === 'high' ? 'bg-red-100 text-red-700'
                  : a.severity === 'medium' ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600';
                const label = ({ possible_drain: 'Possible drain', excess_consumption: 'Excess consumption',
                  odometer_rollback: 'Odometer rollback', high_volume: 'High volume', low_volume: 'Low volume' } as Record<string, string>)[a.anomaly_type] || a.anomaly_type;
                return (
                  <div key={a.id} className="border rounded-lg p-3 text-sm hover:bg-red-50/30 transition-colors">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-mono font-medium">{a.plate_no}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${sev}`}>{label}</span>
                    </div>
                    <p className="text-gray-600 text-xs mt-1 leading-relaxed">{a.detail}</p>
                    <div className="flex justify-between items-center mt-1.5">
                      <span className="text-gray-400 text-xs">{new Date(a.recorded_at).toLocaleString()}</span>
                      <span className="font-mono text-gray-500 text-xs">{a.litres}L{a.cost ? ` · RM${Number(a.cost).toFixed(0)}` : ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h2 className="font-semibold text-gray-700 mb-3">Fuel Log</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Vehicle</th>
              <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Litres</th>
              <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Provider</th>
              <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Card Ref</th>
              <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Probe %</th>
              <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t hover:bg-indigo-50/40 transition-colors">
                <td className="p-3 font-mono">{l.plate_no}</td>
                <td className="p-3 font-medium">{l.litres}</td>
                <td className="p-3">{l.card_provider || '-'}</td>
                <td className="p-3 font-mono text-xs">{l.card_transaction_ref || '-'}</td>
                <td className="p-3">{l.probe_reading_pct != null ? `${l.probe_reading_pct}%` : '-'}</td>
                <td className="p-3 text-xs">{new Date(l.recorded_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Import Fuel Card Transactions</h2>

            {importResult ? (
              <div className="text-center py-8">
                <div className="flex justify-center mb-3"><CheckCircle2 className="w-12 h-12 text-green-600" /></div>
                <p className="text-lg font-semibold text-green-700">{importResult.imported} transactions imported</p>
                <button onClick={() => setShowImport(false)} className="btn-primary mt-4">Done</button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  <button onClick={() => setCsvMode(!csvMode)} className={csvMode ? 'btn-primary' : 'btn-secondary'}>
                    {csvMode ? 'Manual Entry' : 'Paste CSV'}
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="btn-secondary">
                    Upload CSV File
                  </button>
                  <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
                  <button onClick={addRow} className="btn-secondary">
                    + Add Row
                  </button>
                  <span className="text-xs text-gray-400 self-center ml-2">{entries.length} entries</span>
                </div>

                {csvMode ? (
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs text-gray-500 mb-2">Columns: plate, litres, card_ref, provider, date (plate & litres required)</p>
                    <textarea
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      className="w-full h-48 px-3 py-2 border rounded-lg text-sm font-mono"
                      placeholder={"plate,litres,card_ref,provider,date\nWXX 1234,85.5,PETRONAS-001,Petronas,2026-07-24 08:30\nWXX 5678,120.0,SHELL-002,Shell,2026-07-24 09:15"}
                    />
                    <button onClick={() => parseCsv(csvText)} className="btn-primary mt-2">
                      Parse CSV
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider w-48">Vehicle *</th>
                          <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider w-20">Litres *</th>
                          <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Card Ref</th>
                          <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider w-32">Provider</th>
                          <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider w-40">Date/Time</th>
                          <th className="p-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((e, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-1.5">
                              <select value={e.vehicle_id} onChange={(ev) => updateEntry(idx, 'vehicle_id', ev.target.value)} className={inputCls}>
                                <option value="">Select vehicle</option>
                                {vehicleList.map((v) => (
                                  <option key={v.id} value={v.id}>{v.plate_no} — {v.make_model}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-1.5">
                              <input type="number" value={e.litres || ''} onChange={(ev) => updateEntry(idx, 'litres', Number(ev.target.value))} className={inputCls} min={0} step={0.1} />
                            </td>
                            <td className="p-1.5">
                              <input value={e.card_ref} onChange={(ev) => updateEntry(idx, 'card_ref', ev.target.value)} className={inputCls} placeholder="Ref #" />
                            </td>
                            <td className="p-1.5">
                              <select value={e.card_provider} onChange={(ev) => updateEntry(idx, 'card_provider', ev.target.value)} className={inputCls}>
                                <option>Petronas</option>
                                <option>Shell</option>
                                <option>Caltex</option>
                                <option>BHPetrol</option>
                                <option>Misc</option>
                              </select>
                            </td>
                            <td className="p-1.5">
                              <input type="datetime-local" value={e.recorded_at?.slice(0, 16) || ''} onChange={(ev) => updateEntry(idx, 'recorded_at', new Date(ev.target.value).toISOString())} className={inputCls} />
                            </td>
                            <td className="p-1.5 text-center">
                              <button onClick={() => removeEntry(idx)} className="text-red-400 hover:text-red-600 text-lg">&times;</button>
                            </td>
                          </tr>
                        ))}
                        {entries.length === 0 && (
                          <tr><td colSpan={6} className="p-6 text-center text-gray-400">No entries. Click "+ Add Row" or "Paste CSV" to begin.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <button onClick={() => setShowImport(false)} className="btn-secondary">Cancel</button>
                  <button onClick={handleImport} disabled={importing || entries.length === 0} className="btn-primary">
                    {importing ? 'Importing...' : `Import ${entries.filter((e) => e.vehicle_id && e.litres > 0).length} Entries`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
