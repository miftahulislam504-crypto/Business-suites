'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { TruckIcon, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { Purchase } from '@/lib/types'

interface Props { purchases: Purchase[] }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 p-3 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: ৳{p.value?.toLocaleString()}</p>
      ))}
    </div>
  )
}

export function PurchaseReport({ purchases }: Props) {
  const stats = useMemo(() => ({
    total:   purchases.reduce((s, x) => s + x.grandTotal, 0),
    due:     purchases.reduce((s, x) => s + x.dueAmount,  0),
    paid:    purchases.reduce((s, x) => s + x.paidAmount, 0),
    count:   purchases.length,
  }), [purchases])

  const dailyData = useMemo(() => {
    const map: Record<string, number> = {}
    purchases.forEach(p => {
      const d = p.createdAt instanceof Date ? p.createdAt : new Date((p.createdAt as any).seconds * 1000)
      const key = `${d.getDate()}/${d.getMonth()+1}`
      map[key] = (map[key] ?? 0) + p.grandTotal
    })
    return Object.entries(map).slice(-14).map(([day, total]) => ({ day, total }))
  }, [purchases])

  const topSuppliers = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {}
    purchases.forEach(p => {
      const key = p.supplierName
      if (!map[key]) map[key] = { name: p.supplierName, total: 0, count: 0 }
      map[key].total += p.grandTotal
      map[key].count += 1
    })
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [purchases])

  return (
    <div className="space-y-5">

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'মোট ক্রয়',    value: `৳${stats.total.toLocaleString()}`, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950' },
          { label: 'পরিশোধ',      value: `৳${stats.paid.toLocaleString()}`,  color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950'   },
          { label: 'বকেয়া',       value: `৳${stats.due.toLocaleString()}`,   color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950'       },
          { label: 'মোট ক্রয় সংখ্যা', value: `${stats.count}টি`,           color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950'     },
        ].map(s => (
          <div key={s.label} className="card">
            <p className={`font-bold text-xl ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Daily trend */}
      {dailyData.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-4">দৈনিক ক্রয়</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" name="ক্রয়" fill="#8b5cf6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top suppliers */}
      {topSuppliers.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-4">শীর্ষ সাপ্লায়ার</h3>
          <div className="space-y-3">
            {topSuppliers.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {i+1}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="font-bold text-purple-600 text-sm">৳{s.total.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div className="bg-purple-500 h-1.5 rounded-full"
                      style={{ width: `${(s.total/topSuppliers[0].total)*100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
