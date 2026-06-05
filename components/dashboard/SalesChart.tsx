'use client'

import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useAppStore } from '@/store/useAppStore'

// Placeholder data — Phase 5 (Sales) এর পর real data আসবে
const data = [
  { day: 'শনি', sales: 12000, profit: 3200, expense: 2100 },
  { day: 'রবি', sales: 8500,  profit: 2100, expense: 1800 },
  { day: 'সোম', sales: 15000, profit: 4100, expense: 2500 },
  { day: 'মঙ্গল', sales: 11000, profit: 2900, expense: 1900 },
  { day: 'বুধ', sales: 18000, profit: 5200, expense: 3100 },
  { day: 'বৃহ', sales: 14000, profit: 3800, expense: 2700 },
  { day: 'শুক্র', sales: 9500,  profit: 2500, expense: 1600 },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-3 text-xs">
      <p className="font-semibold mb-2 text-gray-700 dark:text-gray-200">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: ৳{p.value.toLocaleString('bn-BD')}
        </p>
      ))}
    </div>
  )
}

export function SalesChart() {
  const { language } = useAppStore()

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-800 dark:text-gray-100">
          {language === 'bn' ? 'সাপ্তাহিক বিক্রয় ও লাভ' : 'Weekly Sales & Profit'}
        </h2>
        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
          {language === 'bn' ? 'এই সপ্তাহ' : 'This Week'}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="profit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
          <Area
            type="monotone" dataKey="sales" name={language === 'bn' ? 'বিক্রয়' : 'Sales'}
            stroke="#3b82f6" strokeWidth={2} fill="url(#sales)"
          />
          <Area
            type="monotone" dataKey="profit" name={language === 'bn' ? 'লাভ' : 'Profit'}
            stroke="#22c55e" strokeWidth={2} fill="url(#profit)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
