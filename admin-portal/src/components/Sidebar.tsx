import { NavLink } from 'react-router-dom';
import { hasRole, getUser } from '../api/client';
import {
  LayoutDashboard, Truck, Zap, ClipboardList, Link2, Briefcase, Fuel,
  Building2, Calendar, Map, RefreshCw, X, Shield, ChevronRight,
} from 'lucide-react';

const allLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: [] as string[] },
  { to: '/fleet', label: 'Fleet', icon: Truck, roles: [] as string[] },
  { to: '/generators', label: 'Generators', icon: Zap, roles: [] as string[] },
  { to: '/dispatch', label: 'Dispatch', icon: ClipboardList, roles: [] as string[] },
  { to: '/assets', label: 'Assets', icon: Link2, roles: ['super_admin', 'fleet_manager'] as string[] },
  { to: '/sales', label: 'Sales', icon: Briefcase, roles: ['super_admin', 'dispatcher', 'finance'] as string[] },
  { to: '/fuel', label: 'Fuel', icon: Fuel, roles: [] as string[] },
  { to: '/clients', label: 'Clients', icon: Building2, roles: ['super_admin'] as string[] },
  { to: '/driver-calendar', label: 'Calendar', icon: Calendar, roles: ['super_admin', 'dispatcher'] as string[] },
  { to: '/gps-playback', label: 'GPS Playback', icon: Map, roles: ['super_admin', 'dispatcher', 'fleet_manager'] as string[] },
  { to: '/sync', label: 'ERP Sync', icon: RefreshCw, roles: [] as string[] },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const links = allLinks.filter((l) => l.roles.length === 0 || hasRole(...l.roles));
  const user = getUser();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64
          bg-[#1e1b4b]
          text-white flex flex-col
          transition-transform duration-300 ease-out
          lg:static lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Express Powerr" className="w-11 h-11 object-contain" />
              <div>
                <h1 className="text-base font-bold tracking-tight">Express Powerr</h1>
                <p className="text-[11px] text-white/50 mt-0.5">Smart Fleet v1.0</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#4f46e5] text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`} />
                    <span className="flex-1">{l.label}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/40" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-white/10">
          {user && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate capitalize">
                  {user.role.replace('super_', '').replace('_', ' ')}
                </p>
                <p className="text-[11px] text-white/40 truncate">Klang Depot</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
