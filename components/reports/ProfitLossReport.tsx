'use client'

import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, Scale, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Sale, Expense } from '@/lib/types'

interface Props {
  sales:    Sale[]
  expenses: Expense[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 p-3 text-xs">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: ৳{p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export function ProfitLossReport({ sales, expenses }: Props) {

  const totalRevenue  = useMemo(() => sales.reduce((s, x) => s + x.grandTotal, 0), [sales])
  const totalCOGS     = useMemo(() => sales.reduce((s, x) =>
    s + x.items.reduce((si, i) => si + i.purchasePrice * i.quantity, 0), 0), [sales])
  const grossProfit   = totalRevenue - totalCOGS
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])
  const netProfit     = grossProfit - totalExpenses
  const grossMargin   = totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(1) : '0'
  const netMargin     = totalRevenue > 0 ? (netProfit   / totalRevenue * 100).toFixed(1) : '0'

  // Monthly P&L
  const monthlyData = useMemo(() => {
    const map: Record<string, { revenue: number; cogs: number; expenses: number }> = {}

    sales.forEach(s => {
      const d   = s.createdAt instanceof Date ? s.createdAt : new Date((s.createdAt as any).seconds * 1000)
      const key = `${d.getMonth()+1}/${d.getFullYear().toString().slice(-2)}`
      if (!map[key]) map[key] = { revenue: 0, cogs: 0, expenses: 0 }
      map[key].revenue += s.grandTotal
      map[key].cogs    += s.items.reduce((si, i) => si + i.purchasePrice * i.quantity, 0)
    })

    expenses.forEach(e => {
      const d   = e.date instanceof Date ? e.date : new Date((e.date as any).seconds * 1000)
      const key = `${d.getMonth()+1}/${d.getFullYear().toString().slice(-2)}`
      if (!map[key]) map[key] = { revenue: 0, cogs: 0, expenses: 0 }
      map[key].expenses += e.amount
    })

    return Object.entries(map).slice(-6).map(([month, v]) => ({
      month,
      revenue:    v.revenue,
      grossProfit: v.revenue - v.cogs,
      netProfit:  v.revenue - v.cogs - v.expenses,
    }))
  }, [sales, expenses])

  // Expense breakdown
  const expenseBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    expenses.forEach(e => { map[e.category] = (map[e.category] ?? 0) + e.amount })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [expenses])

  const rows = [
    { label: 'মোট রাজস্ব (Revenue)',     value: totalRevenue,  indent: false, bold: true,  color: 'text-blue-600'    },
    { label: 'বিক্রয়কৃত পণ্যের ব্যয় (COGS)', value: -totalCOGS, indent: true,  bold: false, color: 'text-red-500'     },
    { label: 'মোট লাভ (Gross Profit)',   value: grossProfit,   indent: false, bold: true,  color: grossProfit >= 0 ? 'text-green-600' : 'text-red-600' },
    { label: 'পরিচালন ব্যয় (OpEx)',      value: -totalExpenses,indent: true,  bold: false, color: 'text-orange-600'  },
    { label: 'নিট মুনাফা (Net Profit)',  value: netProfit,     indent: false, bold: true,  color: netProfit >= 0 ? 'text-emerald-600' : 'text-red-600' },
  ]

  return (
    <div className="space-y-5">

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'মোট রাজস্ব',   value: `৳${totalRevenue.toLocaleString()}`,  change: null,          color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-950'     },
          { label: 'মোট লাভ',      value: `৳${grossProfit.toLocaleString()}`,   change: `${grossMargin}%`, color: 'text-green-600',   bg: 'bg-green-50 dark:bg-green-950'   },
          { label: 'পরিচালন ব্যয়', value: `৳${totalExpenses.toLocaleString()}`, change: null,          color: 'text-orange-600',  bg: 'bg-orange-50 dark:bg-orange-950' },
          { label: 'নিট মুনাফা',   value: `৳${Math.abs(netProfit).toLocaleString()}`, change: `${netMargin}%`, color: netProfit >= 0 ? 'text-emerald-600' : 'text-red-600', bg: netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-red-50 dark:bg-red-950' },
        ].map(s => (
          <div key={s.label} className="card">
            <div className="flex items-start justify-between">
              <p className={`font-bold text-lg leading-tight ${s.color}`}>
                {netProfit < 0 && s.label === 'নিট মুনাফা' ? '-' : ''}{s.value}
              </p>
              {s.change && (
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                  {s.change}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* P&L Statement */}
      <div className="card">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Scale size={16} className="text-indigo-600" />
          আয়-ব্যয় বিবরণী (Income Statement)
        </h3>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className={cn(
              'flex justify-between items-center py-2',
              i < rows.length - 1 && 'border-b border-gray-50 dark:border-gray-800',
              row.bold && i > 0 && 'border-t border-gray-200 dark:border-gray-700 pt-3 mt-1',
            )}>
              <span className={cn(
                'text-sm',
                row.indent ? 'pl-4 text-gray-500 dark:text-gray-400' : 'font-semibold text-gray-800 dark:text-gray-200',
              )}>
                {row.label}
              </span>
              <span className={cn('font-semibold text-sm', row.color, row.bold && 'text-base font-bold')}>
                {row.value < 0 ? '-' : ''}৳{Math.abs(row.value).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* Net profit visual */}
        <div className={cn(
          'mt-4 p-4 rounded-xl text-center',
          netProfit >= 0
            ? 'bg-green-50 dark:bg-green-950'
            : 'bg-red-50 dark:bg-red-950',
        )}>
          <div className="flex items-center justify-center gap-2 mb-1">
            {netProfit >= 0
              ? <ArrowUpRight size={20} className="text-green-600" />
              : <ArrowDownRight size={20} className="text-red-600" />}
            <p className={cn('text-2xl font-bold', netProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
              ৳{Math.abs(netProfit).toLocaleString()}
            </p>
          </div>
          <p className="text-sm text-gray-500">
            {netProfit >= 0 ? `নিট মুনাফা — মার্জিন ${netMargin}%` : `নিট ক্ষতি — ${netMargin}%`}
          </p>
        </div>
      </div>

      {/* Monthly trend */}
      {monthlyData.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-4">মাসিক লাভ-ক্ষতির প্রবণতা</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue"    name="রাজস্ব"    stroke="#3b82f6" strokeWidth={2} fill="url(#gRev)" />
              <Area type="monotone" dataKey="grossProfit" name="মোট লাভ"  stroke="#f59e0b" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="netProfit"  name="নিট মুনাফা" stroke="#22c55e" strokeWidth={2} fill="url(#gNet)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expense breakdown */}
      {expenseBreakdown.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-4">ব্যয়ের বিভাজন</h3>
          <div className="space-y-2">
            {expenseBreakdown.map(([cat, amt]) => {
              const pct = (amt / totalExpenses * 100).toFixed(0)
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{cat}</span>
                    <span className="font-semibold text-orange-600">৳{amt.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
