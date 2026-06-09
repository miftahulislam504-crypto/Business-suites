'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'
import { getPurchases } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import {
  Plus, Search, TruckIcon,
  CheckCircle2, Clock, AlertCircle,
  Loader2, RefreshCw, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Purchase } from '@/lib/types'

const statusConfig = {
  paid:    { label: 'পরিশোধ',  color: 'text-green-600 bg-green-50 dark:bg-green-950',    icon: <CheckCircle2 size={12} /> },
  partial: { label: 'আংশিক',   color: 'text-orange-600 bg-orange-50 dark:bg-orange-950', icon: <Clock size={12} />        },
  due:     { label: 'বকেয়া',   color: 'text-red-600 bg-red-50 dark:bg-red-950',           icon: <AlertCircle size={12} />  },
}

export default function PurchasePage() {
  const { activeBusiness }  = useAppStore()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')

  async function load() {
    if (!activeBusiness) return
    setLoading(true)
    try {
      const list = await getPurchases(activeBusiness.id)
      setPurchases(list)
    } catch { toast.error('ক্রয় তালিকা লোড হয়নি') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [activeBusiness])

  const filtered = useMemo(() => {
    if (!search.trim()) return purchases
    const q = search.toLowerCase()
    return purchases.filter(p =>
      p.supplierName.toLowerCase().includes(q) ||
      p.invoiceNo.toLowerCase().includes(q)
    )
  }, [purchases, search])

  const stats = useMemo(() => ({
    total:    purchases.reduce((s, x) => s + x.grandTotal, 0),
    due:      purchases.reduce((s, x) => s + x.dueAmount,  0),
    count:    purchases.length,
  }), [purchases])

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ক্রয় তালিকা</h1>
          <p className="text-sm text-gray-400 mt-0.5">মোট {stats.count}টি ক্রয়</p>
        </div>
        <Link href="/purchase/new" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors">
          <Plus size={17} />
          <span className="hidden sm:inline">নতুন ক্রয়</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">মোট ক্রয়</p>
          <p className="font-bold text-purple-600">৳{stats.total.toLocaleString()}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">মোট ক্রয় সংখ্যা</p>
          <p className="font-bold text-blue-600">{stats.count}টি</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">মোট বকেয়া</p>
          <p className="font-bold text-red-600">৳{stats.due.toLocaleString()}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="সাপ্লায়ার বা ক্রয় নম্বর খোঁজো..."
            className="input-field pl-9" />
        </div>
        <button onClick={load} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
          <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-purple-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <TruckIcon size={48} className="mb-3 opacity-30" />
          <p className="font-medium">কোনো ক্রয় পাওয়া যায়নি</p>
          <Link href="/purchase/new" className="mt-4 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium">
            প্রথম ক্রয় করো
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(purchase => {
            const st = statusConfig[purchase.status]
            return (
              <div key={purchase.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center shrink-0">
                  <TruckIcon size={18} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{purchase.supplierName}</p>
                    <span className={cn('flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0', st.color)}>
                      {st.icon} {st.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{purchase.invoiceNo} • {purchase.items.length}টি পণ্য</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-purple-600">৳{purchase.grandTotal.toLocaleString()}</p>
                  {purchase.dueAmount > 0 && (
                    <p className="text-xs text-red-500">বকেয়া ৳{purchase.dueAmount.toLocaleString()}</p>
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
