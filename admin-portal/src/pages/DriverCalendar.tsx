import { useState, useEffect } from 'react';
import { employees as employeesApi } from '../api/client';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';

export default function DriverCalendar() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    employeesApi.list('driver').then(res => setDrivers(res.employees || [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedDriver) fetchEvents();
  }, [selectedDriver, currentMonth]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const from = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
      const to = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString();
      const res = await fetch(`/v1/jobs?from=${from}&to=${to}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setEvents((data.jobs || []).filter((j: any) => j.driver_id === selectedDriver));
    } catch { }
    finally { setLoading(false); }
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.dispatched_at?.startsWith(dateStr) || e.site_arrival_at?.startsWith(dateStr) || e.completed_at?.startsWith(dateStr));
  };

  const statusColor = (s: string) => ({
    pending: 'bg-gray-100 text-gray-700',
    dispatched: 'bg-blue-100 text-blue-700',
    en_route: 'bg-amber-100 text-amber-700',
    on_site: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    interrupted: 'bg-red-200 text-red-800',
  }[s] || 'bg-gray-100 text-gray-700');

  const jobTypeBadge = (t: string) => ({
    emergency: 'bg-red-500',
    planned_shutdown: 'bg-amber-400',
    standby_contract: 'bg-blue-500',
  }[t] || 'bg-gray-300');

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        icon={CalendarDays}
        title="Driver Availability Calendar"
        subtitle="View driver assignments and availability"
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">Driver:</label>
          <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm w-full sm:max-w-xs">
            <option value="">Select driver...</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {selectedDriver && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
            <button onClick={prevMonth} className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <h2 className="text-sm sm:text-lg font-bold text-gray-800">{currentMonth.toLocaleString('en-MY', { month: 'long', year: 'numeric' })}</h2>
            <button onClick={nextMonth} className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-100">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="bg-gray-50 p-1 sm:p-2 text-center text-[10px] sm:text-xs font-semibold text-gray-600">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="bg-white p-1 sm:p-2 min-h-[50px] sm:min-h-[80px]" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              return (
                <div key={day} className="bg-white p-1 sm:p-2 min-h-[50px] sm:min-h-[80px]">
                  <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">{day}</div>
                  {dayEvents.map((e: any) => (
                    <div key={e.id} className={`px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium mb-0.5 truncate ${statusColor(e.status)}`} title={`${e.job_number} - ${e.job_type?.replace('_', ' ')} (${e.status})`}>
                      <span className={`hidden sm:inline-block w-1.5 h-1.5 rounded-full align-middle mr-1 ${jobTypeBadge(e.job_type)}`} />
                      {e.job_number?.replace('JOB-DRC-', '#')}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!selectedDriver && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="w-7 h-7 text-indigo-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-700">Select a Driver</h3>
          <p className="text-sm text-gray-400 mt-1">Choose a driver above to view their calendar</p>
        </div>
      )}
    </div>
  );
}
