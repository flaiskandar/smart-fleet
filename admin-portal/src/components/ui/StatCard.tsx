import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  subtitle: string;
  color?: 'blue' | 'amber' | 'emerald' | 'violet' | 'red';
  children?: ReactNode;
}

const colorMap = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  red: { bg: 'bg-red-50', text: 'text-red-600' },
};

export default function StatCard({ icon: Icon, label, value, subtitle, color = 'blue', children }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="card-hover p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        {children}
      </div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1 text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}
