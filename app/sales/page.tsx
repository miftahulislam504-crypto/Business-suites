'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'
import { getSales } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import {
  Plus, Search, RefreshCw, ShoppingCart,
  CheckCircle2, Clock, AlertCircle, Loader2,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Sale } from '@/lib/types'

const statusConfig = {
  paid:    { label: 'পরিশোধ',  color: 'text-green-600 bg-green-50 dark:bg-green-950',  icon: <CheckCircle2 size={12} /> },
  partial: { label: 'আংশিক',   color: 'text-orange-600 bg-orange-50 dark:bg-orange-950', icon: <Clock size={12} />       },
  due:     { label: 'বাকি',     color: 'text-red-600 bg-red-50 dark:bg-red-950',         icon: <AlertCircle size={12} /> },
}

export default function SalesPage() {
  const { activeBusiness } = useAppStore()
  const [sales,   setSales]   = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  async function load() {
    if (!activeBusiness) return
    setLoading(true)
    try {
      const list = await getSales(activeBusiness.id)
      setSales(list)
    } catch {
      toast.error('বিক্রয় লোড হয়নি')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [activeBusiness])

  const filtered = useMemo(() => {
    if (!search.trim()) return sales
    const q = search.toLowerCase()
    return sales.filter(s =>
      s.customerName.toLowerCase().includes(q) ||
      s.invoiceNo.toLowerCase().includes(q) ||
      s.customerPhone?.includes(q)
    )
  }, [sales, search])

  // Summary stats
  const stats = useMemo(() => ({
    total:   sales.reduce((s, x) => s + x.grandTotal, 0),
    paid:    sales.filter(x => x.status === 'paid').length,
    due:     sales.reduce((s, x) => s + x.dueAmount, 0),
    count:   sales.length,
  }), [sales])

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">বিক্রয় তালিকা</h1>
          <p className="text-sm text-gray-400 mt-0.5">মোট {stats.count}টি ট্রানজেকশন</p>
        </div>
        <Link href="/sales/new" className="btn-primary flex items-center gap-2 px-4 py-2.5">
          <Plus size={17} />
          <span className="hidden sm:inline">নতুন বিক্রয়</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">মোট বিক্রয়</p>
          <p className="font-bold text-blue-600">৳{stats.total.toLocaleString()}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">পরিশোধ</p>
          <p className="font-bold text-green-600">{stats.paid}টি</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">মোট বাকি</p>
          <p className="font-bold text-red-600">৳{stats.due.toLocaleString()}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ইনভয়েস নম্বর বা কাস্টমার দিয়ে খোঁজো..."
            className="input-field pl-9" />
        </div>
        <button onClick={load} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
          <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <ShoppingCart size={48} className="mb-3 opacity-30" />
          <p className="font-medium">কোনো বিক্রয় পাওয়া যায়নি</p>
          <Link href="/sales/new" className="mt-4 btn-primary px-5 py-2.5">
            প্রথম বিক্রয় করো
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(sale => {
            const st = statusConfig[sale.status]
            return (
              <div key={sale.id} className="card flex items-center gap-3 hover:shadow-md transition-all cursor-pointer">
                {/* Left */}
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
                  <ShoppingCart size={18} className="text-blue-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{sale.customerName}</p>
                    <span className={cn('flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium', st.color)}>
                      {st.icon} {st.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{sale.invoiceNo} • {sale.items.length}টি পণ্য</p>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <p className="font-bold text-blue-600">৳{sale.grandTotal.toLocaleString()}</p>
                  {sale.dueAmount > 0 && (
                    <p className="text-xs text-red-500">বাকি ৳{sale.dueAmount.toLocaleString()}</p>
                  )}
                </div>

                <ChevronRight size={16} className="text-gray-400 shrink-0" />
              </div>
            )
          })}
        </div>
      )}
    </MainLayout>
  )
}
