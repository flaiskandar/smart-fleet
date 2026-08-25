import { useEffect, useState } from 'react';
import { syncApi, hasRole } from '../api/client';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';

export default function Sync() {
  const [queue, setQueue] = useState<any>({ pending: {}, records: {} });
  const [errors, setErrors] = useState<any>({ fuel_logs: [], delivery_orders: [] });
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    Promise.all([syncApi.queue(), syncApi.errors(), syncApi.logs()])
      .then(([q, e, l]) => { setQueue(q); setErrors(e); setLogs(l.sync_logs); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleRetry = async (id: string, table: string) => {
    try {
      await syncApi.retry(id, table);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Retry failed');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>;

  const totalPending = Object.values(queue.pending).reduce((a: any, b: any) => a + b, 0);

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</span>
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-800">ERP Sync</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700">
          <p className="text-sm">Pending Fuel Logs</p>
          <p className="text-3xl font-bold">{queue.pending.fuel_logs || 0}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700">
          <p className="text-sm">Pending DOs</p>
          <p className="text-3xl font-bold">{queue.pending.delivery_orders || 0}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <p className="text-sm">Fuel Log Errors</p>
          <p className="text-3xl font-bold">{errors.fuel_logs?.length || 0}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <p className="text-sm">DO Errors</p>
          <p className="text-3xl font-bold">{errors.delivery_orders?.length || 0}</p>
        </div>
      </div>

      {errors.fuel_logs?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Failed Fuel Logs</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">ID</th>
                <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Litres</th>
                <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Error</th>
                <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {errors.fuel_logs.map((e: any) => (
                <tr key={e.id} className="border-t hover:bg-indigo-50/40 transition-colors">
                  <td className="p-3 font-mono text-xs">{e.id.substring(0, 8)}...</td>
                  <td className="p-3">{e.litres}</td>
                  <td className="p-3 text-red-600 text-xs">{e.error_message}</td>
                  <td className="p-3">
                    {hasRole('super_admin', 'finance') && (
                      <button
                        onClick={() => handleRetry(e.id, 'staging_fuel_logs')}
                        className="btn-primary inline-flex items-center gap-1.5 !px-3 !py-1.5 text-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h2 className="font-semibold text-gray-700 mb-3">Sync Job History</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Table</th>
              <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Processed</th>
              <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Success</th>
              <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Errors</th>
              <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Started</th>
              <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t hover:bg-indigo-50/40 transition-colors">
                <td className="p-3 font-mono text-xs">{l.table_name}</td>
                <td className="p-3">{l.records_processed}</td>
                <td className="p-3 text-green-600">{l.records_success}</td>
                <td className="p-3 text-red-600">{l.records_error}</td>
                <td className="p-3 text-xs">{new Date(l.started_at).toLocaleString()}</td>
                <td className="p-3">
                  <span className={l.status === 'completed' ? 'badge-success' : 'badge-warning'}>{l.status}</span>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-gray-400">No sync history</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
