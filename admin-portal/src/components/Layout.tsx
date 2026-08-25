import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import SearchBar from './SearchBar';
import AssistantChat from './AssistantChat';
import { getToken, setToken, notifications as notifApi } from '../api/client';
import { Bell, LogOut, Menu } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();
  const user = localStorage.getItem('user');
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifList, setNotifList] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  const fetchUnread = () => {
    notifApi.unreadCount().then((res) => setUnreadCount(res.count)).catch(() => {});
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openNotifs = () => {
    setShowNotifs(true);
    notifApi.list().then((res) => setNotifList(res.notifications)).catch(() => {});
  };

  const markAllRead = () => {
    notifApi.markAllRead().then(() => {
      setUnreadCount(0);
      setNotifList((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    }).catch(() => {});
  };

  const markSelected = () => {
    const unread = notifList.filter((n) => !n.is_read).map((n) => n.id);
    if (unread.length === 0) return;
    notifApi.markRead(unread).then(() => {
      setUnreadCount(0);
      setNotifList((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    }).catch(() => {});
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-3 md:px-6 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 max-w-xl min-w-0">
              <SearchBar />
            </div>
          </div>

          <div className="flex items-center gap-1 ml-2">
            {/* Notifications */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => showNotifs ? setShowNotifs(false) : openNotifs()}
                className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-sm text-gray-900">Notifications</h3>
                    <div className="flex gap-2">
                      {unreadCount > 0 && (
                        <button onClick={markSelected} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                          Mark read
                        </button>
                      )}
                      <button onClick={markAllRead} className="text-xs text-gray-400 hover:text-gray-600">
                        Mark all
                      </button>
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-80">
                    {notifList.length === 0 ? (
                      <div className="text-center py-8">
                        <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No notifications</p>
                      </div>
                    ) : (
                      notifList.map((n) => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${
                            !n.is_read ? 'bg-brand-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!n.is_read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                                {n.title}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{n.body}</p>
                            </div>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo(n.created_at)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200 mx-1" />

            {/* Logout */}
            <button
              onClick={() => { setToken(null); localStorage.removeItem('user'); navigate('/login'); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          <Outlet />
        </main>
      </div>

      <AssistantChat />
    </div>
  );
}
