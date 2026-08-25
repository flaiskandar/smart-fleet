import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Fleet from './pages/Fleet';
import VehicleMap from './pages/VehicleMap';
import Generators from './pages/Generators';
import Dispatch from './pages/Dispatch';
import Assets from './pages/Assets';
import Sales from './pages/Sales';
import Fuel from './pages/Fuel';
import Geofences from './pages/Geofences';
import Sync from './pages/Sync';
import Clients from './pages/Clients';
import DriverCalendar from './pages/DriverCalendar';
import GPSPlayback from './pages/GPSPlayback';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/fleet" element={<Fleet />} />
        <Route path="/fleet/map" element={<VehicleMap />} />
        <Route path="/generators" element={<Generators />} />
        <Route path="/dispatch" element={<Dispatch />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/fuel" element={<Fuel />} />
        <Route path="/geofences" element={<Geofences />} />
        <Route path="/sync" element={<Sync />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/driver-calendar" element={<DriverCalendar />} />
        <Route path="/gps-playback" element={<GPSPlayback />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
