import { useEffect, useState } from 'react';
import { geofences } from '../api/client';

export default function Geofences() {
  const [geoList, setGeoList] = useState<any[]>([]);
  const [slaReports, setSlaReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([geofences.list(), geofences.slaReports()])
      .then(([g, s]) => { setGeoList(g.geofences); setSlaReports(s.sla_reports); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Geofences & SLA</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Geofences</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Latitude</th>
                <th className="text-left p-3">Longitude</th>
                <th className="text-left p-3">Radius (m)</th>
              </tr>
            </thead>
            <tbody>
              {geoList.map((g) => (
                <tr key={g.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{g.name}</td>
                  <td className="p-3 capitalize">{g.geofence_type?.replace('_', ' ')}</td>
                  <td className="p-3 font-mono text-xs">{g.latitude}</td>
                  <td className="p-3 font-mono text-xs">{g.longitude}</td>
                  <td className="p-3">{g.radius_m}</td>
                </tr>
              ))}
              {geoList.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-gray-400">No geofences configured</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-semibold text-gray-700 mb-3">SLA Compliance</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3">Client</th>
                <th className="text-left p-3">Total Jobs</th>
                <th className="text-left p-3">On Time</th>
                <th className="text-left p-3">Compliance</th>
                <th className="text-left p-3">Avg Response</th>
              </tr>
            </thead>
            <tbody>
              {slaReports.map((r) => (
                <tr key={r.client_id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{r.client_name}</td>
                  <td className="p-3">{r.total_jobs}</td>
                  <td className="p-3">{r.within_sla}</td>
                  <td className="p-3">
                    <span className={`font-medium ${r.total_jobs > 0 && r.within_sla / r.total_jobs >= 0.9 ? 'text-green-600' : 'text-red-600'}`}>
                      {r.total_jobs > 0 ? `${Math.round(r.within_sla / r.total_jobs * 100)}%` : 'N/A'}
                    </span>
                  </td>
                  <td className="p-3">{r.avg_response_min} min</td>
                </tr>
              ))}
              {slaReports.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-gray-400">No SLA data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
