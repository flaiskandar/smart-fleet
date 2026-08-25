import { useState, useEffect, useRef } from 'react';
import { vehicles as vehiclesApi, API_BASE } from '../api/client';
import { Navigation, Play, Pause, Map as MapIcon, Loader2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';

export default function GPSPlayback() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [trackData, setTrackData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    vehiclesApi.list().then(res => setVehicles(res.vehicles || [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedVehicle) fetchTrack();
  }, [selectedVehicle]);

  const fetchTrack = async () => {
    setLoading(true);
    setPlaying(false);
    setCurrentIndex(0);
    try {
      const res = await fetch(`${API_BASE}/v1/vehicles/${selectedVehicle}/telemetry`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setTrackData((data.telemetry || []).map((t: any) => ({
        speed: t.speed_kmh,
        fuel: t.fuel_level_pct,
        lat: t.gps_lat,
        lon: t.gps_lon,
        recorded_at: t.recorded_at,
      })));
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (playing && trackData.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= trackData.length - 1) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }, 1000 / speed);
      return () => clearInterval(intervalRef.current);
    }
  }, [playing, speed, trackData]);

  const togglePlay = () => {
    if (currentIndex >= trackData.length - 1) setCurrentIndex(0);
    setPlaying(!playing);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        icon={Navigation}
        title="GPS History Playback"
        subtitle="Replay vehicle routes from telemetry data"
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">Vehicle:</label>
          <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm w-full sm:max-w-xs">
            <option value="">Select vehicle...</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_no} — {v.make_model}</option>)}
          </select>
        </div>
      </div>

      {selectedVehicle && trackData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <button onClick={togglePlay} className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-semibold transition-colors text-sm">
                {playing ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Play</>}
              </button>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-600">Speed:</label>
                {[1, 2, 5, 10].map(s => (
                  <button key={s} onClick={() => setSpeed(s)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${speed === s ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s}x</button>
                ))}
              </div>
              <div className="flex-1" />
              <span className="text-xs sm:text-sm text-gray-500">{currentIndex + 1} / {trackData.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div className="bg-cyan-600 h-2 rounded-full transition-all" style={{ width: `${(currentIndex / (trackData.length - 1)) * 100}%` }} />
            </div>
            {trackData[currentIndex] && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 bg-cyan-50 rounded-xl">
                <div>
                  <div className="text-[10px] sm:text-xs text-gray-500">Speed</div>
                  <div className="text-base sm:text-lg font-bold text-cyan-700">{trackData[currentIndex].speed?.toFixed(1) || '—'} km/h</div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-gray-500">Fuel</div>
                  <div className="text-base sm:text-lg font-bold text-cyan-700">{trackData[currentIndex].fuel?.toFixed(1) || '—'}%</div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-gray-500">Latitude</div>
                  <div className="text-base sm:text-lg font-bold text-cyan-700">{trackData[currentIndex].lat?.toFixed(4) || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-gray-500">Longitude</div>
                  <div className="text-base sm:text-lg font-bold text-cyan-700">{trackData[currentIndex].lon?.toFixed(4) || '—'}</div>
                </div>
              </div>
            )}
          </div>
          <div className="max-h-48 sm:max-h-64 overflow-y-auto border-t">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">#</th>
                  <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Time</th>
                  <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Speed</th>
                  <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Fuel</th>
                  <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Lat</th>
                  <th className="text-left p-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">Lon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {trackData.map((t, i) => (
                  <tr key={i} onClick={() => { setCurrentIndex(i); setPlaying(false); }} className={`cursor-pointer transition-colors ${i === currentIndex ? 'bg-cyan-50' : 'hover:bg-indigo-50/40'}`}>
                    <td className="p-2 text-gray-600">{i + 1}</td>
                    <td className="p-2 text-gray-800">{new Date(t.recorded_at).toLocaleString()}</td>
                    <td className="p-2 font-medium text-gray-800">{t.speed?.toFixed(1) || '—'} km/h</td>
                    <td className="p-2 font-medium text-gray-800">{t.fuel?.toFixed(1) || '—'}%</td>
                    <td className="p-2 text-gray-600 font-mono text-xs">{t.lat?.toFixed(4) || '—'}</td>
                    <td className="p-2 text-gray-600 font-mono text-xs">{t.lon?.toFixed(4) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedVehicle && trackData.length === 0 && !loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
          <div className="w-14 h-14 bg-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <MapIcon className="w-7 h-7 text-cyan-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-700">No GPS Data</h3>
          <p className="text-sm text-gray-400 mt-1">No telemetry data found for this vehicle</p>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
          <Loader2 className="w-8 h-8 text-cyan-600 animate-spin mx-auto mb-2" />
          <p className="text-gray-400">Loading GPS data...</p>
        </div>
      )}
    </div>
  );
}
