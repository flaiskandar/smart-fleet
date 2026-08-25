import { useEffect, useState } from 'react';
import { vehicles, generators, jobs, fuel, geofences, getToken, API_BASE } from '../api/client';
import { Truck, Zap, ClipboardList, Download, AlertTriangle, TrendingUp } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const ANOMALY_LABELS: Record<string, string> = {
  possible_drain: 'Possible drain',
  excess_consumption: 'Excess consumption',
  odometer_rollback: 'Odometer rollback',
  high_volume: 'High volume',
  low_volume: 'Low volume',
};

export default function Dashboard() {
  const [data, setData] = useState<any>({ vehicles: [], generators: [], jobs: [], anomalies: [], slaReports: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([vehicles.list(), generators.list(), jobs.list(), fuel.anomalies(), geofences.slaReports()])
      .then(([v, g, j, a, s]) => setData({ vehicles: v.vehicles, generators: g.generators, jobs: j.jobs, anomalies: a.anomalies, slaReports: s.sla_reports }))
      .catch((e) => setError(e?.message || 'Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  const activeVehicles = data.vehicles.filter((v: any) => v.status === 'active').length;
  const pendingJobs = data.jobs.filter((j: any) => j.status === 'pending').length;
  const activeJobs = data.jobs.filter((j: any) => ['dispatched', 'en_route', 'on_site'].includes(j.status)).length;
  const totalGenerators = data.generators.length;
  const deployedGenerators = data.generators.filter((g: any) => ['deployed', 'on_site', 'in_use'].includes(g.status)).length;
  const fuelAlerts = data.anomalies.length;
  const slaCompliant = data.slaReports.reduce((acc: number, r: any) => acc + r.within_sla, 0);
  const slaTotal = data.slaReports.reduce((acc: number, r: any) => acc + r.total_jobs, 0);
  const slaRate = slaTotal > 0 ? Math.round((slaCompliant / slaTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title="Dashboard"
        subtitle="Express Powerr — Smart Fleet Management"
        actions={
          <button
            onClick={async () => {
              try {
                const res = await fetch(`${API_BASE}/v1/dashboard/report`, {
                  headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                if (!res.ok) throw new Error('Download failed');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dashboard_report_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
              } catch (e: any) { setError(e?.message || 'Report download failed'); }
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Truck} label="Active Vehicles" value={activeVehicles} subtitle={`${data.vehicles.length} total`} color="blue" />
        <StatCard icon={Zap} label="Generator Fleet" value={totalGenerators} subtitle={`${deployedGenerators} deployed`} color="amber" />
        <StatCard icon={ClipboardList} label="Active Jobs" value={activeJobs} subtitle={`${pendingJobs} pending`} color="emerald" />
        <StatCard icon={TrendingUp} label="SLA Compliance" value={`${slaRate}%`} subtitle={`${slaCompliant}/${slaTotal} jobs`} color={slaRate >= 90 ? 'emerald' : 'red'} />
      </div>

      {/* Content cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SLA Compliance */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <h2 className="font-semibold text-gray-900">SLA Compliance</h2>
            </div>
            <StatusBadge status={slaRate >= 90 ? 'active' : 'warning'} />
          </div>
          {data.slaReports.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No SLA data yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-3 font-semibold">Client</th>
                    <th className="pb-3 font-semibold">Jobs</th>
                    <th className="pb-3 font-semibold">Within SLA</th>
                    <th className="pb-3 font-semibold">Avg Response</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slaReports.map((r: any) => (
                    <tr key={r.client_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="py-3 font-medium text-gray-900">{r.client_name}</td>
                      <td className="py-3 text-gray-600">{r.total_jobs}</td>
                      <td className="py-3">
                        <StatusBadge status={r.within_sla / r.total_jobs >= 0.9 ? 'active' : 'failed'} />
                      </td>
                      <td className="py-3 text-gray-600">{r.avg_response_min} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Fuel Anomalies */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <h2 className="font-semibold text-gray-900">Fuel Anomalies</h2>
            </div>
            <StatusBadge status={fuelAlerts > 0 ? 'warning' : 'active'} />
          </div>
          {data.anomalies.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No anomalies detected</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {data.anomalies.slice(0, 5).map((a: any) => {
                const sev = a.severity === 'high' ? 'bg-red-100 text-red-700'
                  : a.severity === 'medium' ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600';
                return (
                  <div key={a.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Truck className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="font-mono font-medium text-sm text-gray-900">{a.plate_no}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${sev}`}>
                        {ANOMALY_LABELS[a.anomaly_type] || a.anomaly_type}
                      </span>
                    </div>
                    {a.detail && <p className="text-xs text-gray-500 mt-1 leading-relaxed truncate">{a.detail}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#eef2ff] flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-[#4f46e5]" />
            </div>
            <h2 className="font-semibold text-gray-900">Recent Jobs</h2>
          </div>
          <span className="text-xs text-gray-400">Last 5</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-3 font-semibold">Job #</th>
                <th className="pb-3 font-semibold">Client</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Vehicle</th>
              </tr>
            </thead>
            <tbody>
              {data.jobs.slice(0, 5).map((j: any) => (
                <tr key={j.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="py-3 font-mono text-xs font-semibold text-[#4f46e5]">{j.job_number}</td>
                  <td className="py-3 font-medium text-gray-900">{j.client_name || '-'}</td>
                  <td className="py-3 capitalize text-gray-600">{j.job_type?.replace('_', ' ')}</td>
                  <td className="py-3"><StatusBadge status={j.status} /></td>
                  <td className="py-3 font-mono text-xs text-gray-600">{j.plate_no || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
