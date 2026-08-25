import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { vehicles as vehiclesApi, geofences as geofencesApi } from '../api/client';

const vehicleIcon = (color: string) => L.divIcon({
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
  html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:14px;">🚛</div>`,
});

const COLORS: Record<string, string> = {
  on_job: '#2563eb',
  moving: '#16a34a',
  idle: '#f59e0b',
  off: '#6b7280',
};

function getVehicleStatus(v: any): string {
  if (v.job_number) return 'on_job';
  if (v.speed_kmh > 5) return 'moving';
  if (v.ignition_on) return 'idle';
  return 'off';
}

function statusLabel(s: string) {
  switch (s) {
    case 'on_job': return 'On Job';
    case 'moving': return 'Moving';
    case 'idle': return 'Idle';
    default: return 'Off';
  }
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(([lat, lng]) => L.latLng(lat, lng)));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [positions, map]);
  return null;
}

export default function VehicleMap() {
  const [locations, setLocations] = useState<any[]>([]);
  const [geofenceList, setGeofenceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    try {
      const [locRes, geoRes] = await Promise.all([
        vehiclesApi.locations(),
        geofencesApi.list(),
      ]);
      setLocations(locRes.locations);
      setGeofenceList(geoRes.geofences);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 15000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const withGps = locations.filter((v) => v.gps_lat && v.gps_lon);
  const filtered = filter === 'all'
    ? withGps
    : withGps.filter((v) => getVehicleStatus(v) === filter);

  const positions: [number, number][] = filtered.map((v) => [v.gps_lat, v.gps_lon]);
  const center: [number, number] = positions.length > 0
    ? positions.reduce(([aLat, aLng], [bLat, bLng]) => [aLat + bLat / 2, aLng + bLng / 2], [0, 0])
    : [3.0400, 101.4200];

  const countByStatus = (s: string) => withGps.filter((v) => getVehicleStatus(v) === s).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Live Vehicle Map</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time fleet positions across Malaysia</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">{withGps.length} vehicles online</span>
          <button onClick={fetchData} className="px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded-full text-white text-sm font-semibold transition-colors">🔄 Refresh</button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'on_job', 'moving', 'idle', 'off'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === s
                ? 'bg-brand-700 text-white'
                : 'bg-white border text-gray-600 hover:bg-gray-100'
            }`}
          >
            {s === 'all' ? `All (${withGps.length})` : `${statusLabel(s)} (${countByStatus(s)})`}
            {s !== 'all' && (
              <span className="inline-block w-2 h-2 rounded-full ml-1.5" style={{ background: COLORS[s] }} />
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow border overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">Loading map...</div>
        ) : (
          <MapContainer center={[3.04, 101.42]} zoom={6} style={{ height: '100%', width: '100%' }} zoomControl={true}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filtered.map((v) => {
              const status = getVehicleStatus(v);
              const color = COLORS[status];
              return (
                <Marker
                  key={v.id}
                  position={[v.gps_lat, v.gps_lon]}
                  icon={vehicleIcon(color)}
                >
                  <Popup>
                    <div className="min-w-[200px] space-y-1">
                      <div className="font-bold text-sm">{v.plate_no}</div>
                      <div className="text-xs text-gray-500">{v.make_model} ({v.vehicle_type.replace('_', ' ')})</div>
                      <hr className="my-1" />
                      <div className="text-xs"><span className="font-medium">Status:</span> <span className="font-semibold" style={{ color }}>{statusLabel(status)}</span></div>
                      {v.speed_kmh != null && <div className="text-xs"><span className="font-medium">Speed:</span> {v.speed_kmh} km/h</div>}
                      {v.fuel_level_pct != null && <div className="text-xs"><span className="font-medium">Fuel:</span> {v.fuel_level_pct}%</div>}
                      {v.driver_name && <div className="text-xs"><span className="font-medium">Driver:</span> {v.driver_name}</div>}
                      {v.job_number && <div className="text-xs"><span className="font-medium">Job:</span> {v.job_number} ({v.job_status})</div>}
                      <div className="text-[10px] text-gray-400 mt-1">Updated: {new Date(v.recorded_at).toLocaleTimeString()}</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            {geofenceList.map((g) => (
              <Circle
                key={g.id}
                center={[g.latitude, g.longitude]}
                radius={g.radius_m}
                pathOptions={{
                  color: g.geofence_type === 'depot' ? '#7c3aed' : '#2563eb',
                  fillColor: g.geofence_type === 'depot' ? '#7c3aed' : '#2563eb',
                  fillOpacity: 0.08,
                  weight: 1,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <div className="font-bold">{g.name}</div>
                    <div className="text-gray-500 capitalize">{g.geofence_type.replace('_', ' ')}</div>
                    <div>Radius: {g.radius_m}m</div>
                  </div>
                </Popup>
              </Circle>
            ))}
            {positions.length > 0 && <FitBounds positions={positions} />}
          </MapContainer>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['on_job', 'moving', 'idle', 'off'] as const).map((s) => (
          <div key={s} className="bg-white rounded-lg border p-3 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full" style={{ background: COLORS[s] }} />
            <div>
              <div className="text-lg font-bold text-gray-800">{countByStatus(s)}</div>
              <div className="text-xs text-gray-500">{statusLabel(s)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
