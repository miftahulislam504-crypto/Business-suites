'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Package, AlertTriangle, TrendingDown, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/types'

interface Props { products: Product[] }

export function InventoryReport({ products }: Props) {
  const stats = useMemo(() => ({
    total:      products.length,
    lowStock:   products.filter(p => p.stock <= p.reorderLevel && p.stock > 0).length,
    outStock:   products.filter(p => p.stock === 0).length,
    totalValue: products.reduce((s, p) => s + p.stock * p.purchasePrice, 0),
    totalRetail:products.reduce((s, p) => s + p.stock * p.salePrice, 0),
    potentialProfit: products.reduce((s, p) => s + p.stock * (p.salePrice - p.purchasePrice), 0),
  }), [products])

  // Category breakdown
  const categoryData = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {}
    products.forEach(p => {
      const cat = p.categoryName || 'অশ্রেণীভুক্ত'
      if (!map[cat]) map[cat] = { count: 0, value: 0 }
      map[cat].count += p.stock
      map[cat].value += p.stock * p.purchasePrice
    })
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [products])

  // Low stock items
  const lowStockItems = useMemo(() =>
    products
      .filter(p => p.stock <= p.reorderLevel)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10)
  , [products])

  // Top value products
  const topValueProducts = useMemo(() =>
    products
      .map(p => ({ ...p, totalValue: p.stock * p.purchasePrice }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5)
  , [products])

  const COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ef4444','#ec4899','#14b8a6','#f97316']

  return (
    <div className="space-y-5">

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: 'মোট পণ্য',        value: `${stats.total}টি`,                        color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950'    },
          { label: 'লো স্টক',          value: `${stats.lowStock}টি`,                     color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950' },
          { label: 'স্টক শেষ',         value: `${stats.outStock}টি`,                     color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950'       },
          { label: 'স্টক মূল্য (ক্রয়)', value: `৳${stats.totalValue.toLocaleString()}`,  color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950' },
          { label: 'বিক্রয় মূল্যে',    value: `৳${stats.totalRetail.toLocaleString()}`, color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950'   },
          { label: 'সম্ভাব্য লাভ',      value: `৳${stats.potentialProfit.toLocaleString()}`, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950' },
        ].map(s => (
          <div key={s.label} className="card">
            <p className={`font-bold text-lg leading-tight ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Category chart */}
      {categoryData.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-4">ক্যাটাগরি অনুযায়ী স্টক মূল্য</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: any) => `৳${v.toLocaleString()}`} />
              <Bar dataKey="value" name="মূল্য" radius={[4,4,0,0]}>
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Low stock alert */}
        {lowStockItems.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-orange-500" />
              <h3 className="font-bold">লো স্টক সতর্কতা</h3>
            </div>
            <div className="space-y-2">
              {lowStockItems.map(p => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">রিঅর্ডার: {p.reorderLevel} {p.unit}</p>
                  </div>
                  <span className={cn(
                    'text-xs font-bold px-2 py-0.5 rounded-full ml-2 shrink-0',
                    p.stock === 0
                      ? 'bg-red-100 dark:bg-red-950 text-red-600'
                      : 'bg-orange-100 dark:bg-orange-950 text-orange-600',
                  )}>
                    {p.stock === 0 ? 'শেষ' : `${p.stock} ${p.unit}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top value products */}
        {topValueProducts.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={16} className="text-indigo-500" />
              <h3 className="font-bold">সর্বোচ্চ মূল্যের স্টক</h3>
            </div>
            <div className="space-y-3">
              {topValueProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {i+1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.stock} {p.unit} × ৳{p.purchasePrice}</p>
                  </div>
                  <p className="font-bold text-indigo-600 text-sm shrink-0">
                    ৳{p.totalValue.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
