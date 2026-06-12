'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useAppStore } from '@/store/useAppStore'
import { getSales } from '@/lib/firestore'
import { Loader2 } from 'lucide-react'

const DAYS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি']
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-3 text-xs">
      <p className="font-semibold mb-2 text-gray-700 dark:text-gray-200">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: ৳{p.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export function SalesChart() {
  const { language, activeBusiness } = useAppStore()
  const [data, setData]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBusiness) { setLoading(false); return }

    getSales(activeBusiness.id, 200).then(sales => {
      // Build last 7 days map
      const map: Record<string, { sales: number; profit: number }> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toDateString()
        map[key] = { sales: 0, profit: 0 }
      }

      sales.forEach(s => {
        const d = (s.createdAt as any)?.toDate ? (s.createdAt as any).toDate() : new Date(s.createdAt)
        const key = d.toDateString()
        if (map[key] !== undefined) {
          map[key].sales  += s.grandTotal ?? 0
          const cost = s.items?.reduce((a: number, i: any) => a + (i.purchasePrice ?? 0) * (i.qty ?? 0), 0) ?? 0
          map[key].profit += (s.grandTotal ?? 0) - cost
        }
      })

      const result = Object.entries(map).map(([dateStr, val], idx) => {
        const d   = new Date(dateStr)
        const day = language === 'bn' ? DAYS_BN[d.getDay()] : DAYS_EN[d.getDay()]
        return { day, ...val }
      })
      setData(result)
    }).finally(() => setLoading(false))
  }, [activeBusiness, language])

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

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="profit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
            <Area type="monotone" dataKey="sales"  name={language === 'bn' ? 'বিক্রয়' : 'Sales'}
              stroke="#3b82f6" strokeWidth={2} fill="url(#sales)" />
            <Area type="monotone" dataKey="profit" name={language === 'bn' ? 'লাভ' : 'Profit'}
              stroke="#22c55e" strokeWidth={2} fill="url(#profit)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
