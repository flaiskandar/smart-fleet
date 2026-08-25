import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setToken, API_BASE } from '../api/client';
import { Zap, Loader2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, remember_me: rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#312e81] relative overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-[#4338ca] rounded-full opacity-30 blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#4f46e5] rounded-full opacity-20 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-8">
            <img src="/logo.png" alt="Express Powerr" className="w-14 h-14 object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Express Powerr</h1>
              <p className="text-sm text-white/50">Smart Fleet Management</p>
            </div>
          </div>

          <div className="space-y-6 max-w-md">
            <h2 className="text-3xl font-bold text-white leading-tight">
              Intelligent fleet tracking,
              <br />simplified.
            </h2>
            <p className="text-white/60 leading-relaxed">
              Monitor vehicles, generators, and dispatch operations in real-time.
              Optimize fuel usage, ensure SLA compliance, and manage your assets from one dashboard.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              {[
                { value: '8', label: 'Vehicles' },
                { value: '11', label: 'Generators' },
                { value: '30', label: 'Active Jobs' },
                { value: '24/7', label: 'Monitoring' },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 rounded-xl p-4 border border-white/10">
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-white/40 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src="/logo.png" alt="Express Powerr" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Express Powerr</h1>
              <p className="text-xs text-gray-400">Smart Fleet Management</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
            <p className="text-sm text-gray-500 mt-1">Enter your credentials to access the dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Demo: <span className="font-medium text-gray-500">admin</span> / <span className="font-medium text-gray-500">dispatcher</span> / <span className="font-medium text-gray-500">finance</span>
              <br />
              Password: <span className="font-medium text-gray-500">password123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
