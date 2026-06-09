'use client'

import { useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, ShoppingCart, Users, Package } from 'lucide-react'
import type { Sale } from '@/lib/types'

interface Props { sales: Sale[] }

const COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-3 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: ৳{p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export function SalesReport({ sales }: Props) {
  const stats = useMemo(() => {
    const total   = sales.reduce((s, x) => s + x.grandTotal, 0)
    const profit  = sales.reduce((s, x) => s + x.items.reduce((si, i) => si + (i.salePrice - i.purchasePrice) * i.quantity, 0), 0)
    const due     = sales.reduce((s, x) => s + x.dueAmount, 0)
    const avgOrder= sales.length > 0 ? total / sales.length : 0
    return { total, profit, due, avgOrder, count: sales.length }
  }, [sales])

  // Daily sales trend
  const dailyData = useMemo(() => {
    const map: Record<string, { sales: number; profit: number }> = {}
    sales.forEach(s => {
      const d = s.createdAt instanceof Date
        ? s.createdAt
        : new Date((s.createdAt as any).seconds * 1000)
      const key = `${d.getDate()}/${d.getMonth()+1}`
      if (!map[key]) map[key] = { sales: 0, profit: 0 }
      map[key].sales  += s.grandTotal
      map[key].profit += s.items.reduce((si, i) => si + (i.salePrice - i.purchasePrice) * i.quantity, 0)
    })
    return Object.entries(map).slice(-14).map(([day, v]) => ({ day, ...v }))
  }, [sales])

  // Payment method breakdown
  const paymentData = useMemo(() => {
    const map: Record<string, number> = {}
    sales.forEach(s => { map[s.paymentMethod] = (map[s.paymentMethod] ?? 0) + s.grandTotal })
    const labels: Record<string, string> = {
      cash: 'নগদ', bank: 'ব্যাংক', bkash: 'bKash', nagad: 'Nagad', credit: 'বাকি',
    }
    return Object.entries(map).map(([k, v]) => ({ name: labels[k] ?? k, value: v }))
  }, [sales])

  // Top products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {}
    sales.forEach(s => s.items.forEach(i => {
      if (!map[i.productId]) map[i.productId] = { name: i.productName, qty: 0, revenue: 0 }
      map[i.productId].qty     += i.quantity
      map[i.productId].revenue += i.total
    }))
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }, [sales])

  // Status breakdown
  const statusData = useMemo(() => ({
    paid:    sales.filter(s => s.status === 'paid').length,
    partial: sales.filter(s => s.status === 'partial').length,
    due:     sales.filter(s => s.status === 'due').length,
  }), [sales])

  return (
    <div className="space-y-5">

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'মোট বিক্রয়',   value: `৳${stats.total.toLocaleString()}`,    color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950',   icon: <TrendingUp size={16} />   },
          { label: 'মোট লাভ',       value: `৳${stats.profit.toLocaleString()}`,   color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950', icon: <ShoppingCart size={16} /> },
          { label: 'মোট বাকি',      value: `৳${stats.due.toLocaleString()}`,      color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950',     icon: <Users size={16} />        },
          { label: 'গড় অর্ডার',    value: `৳${Math.round(stats.avgOrder).toLocaleString()}`, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950', icon: <Package size={16} /> },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${s.bg} ${s.color}`}>{s.icon}</div>
            <div>
              <p className={`font-bold text-lg leading-tight ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Daily trend */}
      {dailyData.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-4 text-gray-800 dark:text-gray-100">দৈনিক বিক্রয় ও লাভ</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="sales"  name="বিক্রয়" stroke="#3b82f6" strokeWidth={2} fill="url(#gSales)" />
              <Area type="monotone" dataKey="profit" name="লাভ"    stroke="#22c55e" strokeWidth={2} fill="url(#gProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Payment breakdown */}
        {paymentData.length > 0 && (
          <div className="card">
            <h3 className="font-bold mb-4 text-gray-800 dark:text-gray-100">পেমেন্ট পদ্ধতি</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `৳${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Status breakdown */}
        <div className="card">
          <h3 className="font-bold mb-4 text-gray-800 dark:text-gray-100">পেমেন্ট স্ট্যাটাস</h3>
          <div className="space-y-3">
            {[
              { label: 'সম্পূর্ণ পরিশোধ', count: statusData.paid,    color: 'bg-green-500' },
              { label: 'আংশিক পরিশোধ',   count: statusData.partial, color: 'bg-orange-500'},
              { label: 'বাকি',            count: statusData.due,     color: 'bg-red-500'   },
            ].map(s => (
              <div key={s.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{s.label}</span>
                  <span className="font-semibold">{s.count}টি ({stats.count > 0 ? ((s.count/stats.count)*100).toFixed(0) : 0}%)</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div className={`${s.color} h-2 rounded-full`} style={{ width: `${stats.count > 0 ? (s.count/stats.count)*100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top products */}
      {topProducts.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-4 text-gray-800 dark:text-gray-100">সেরা বিক্রিত পণ্য (টপ ৫)</h3>
          <div className="space-y-2">
            {topProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.qty} পিস বিক্রি</p>
                </div>
                <p className="font-bold text-blue-600 text-sm shrink-0">৳{p.revenue.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
