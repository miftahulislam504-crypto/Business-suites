'use client'

import { useState, useEffect, useMemo } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { SupplierForm } from '@/components/suppliers/SupplierForm'
import { getSuppliers, deleteSupplier } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import {
  Plus, Search, Building2, Phone,
  Edit2, Trash2, Loader2, RefreshCw,
  TrendingDown, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Supplier } from '@/lib/types'

export default function SuppliersPage() {
  const { activeBusiness } = useAppStore()
  const [suppliers,  setSuppliers]  = useState<Supplier[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [editItem,   setEditItem]   = useState<Supplier | null>(null)
  const [confirmDel, setConfirmDel] = useState<Supplier | null>(null)

  async function load() {
    if (!activeBusiness) return
    setLoading(true)
    try {
      const list = await getSuppliers(activeBusiness.id)
      setSuppliers(list)
    } catch { toast.error('সাপ্লায়ার লোড হয়নি') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [activeBusiness])

  const filtered = useMemo(() => {
    if (!search.trim()) return suppliers
    const q = search.toLowerCase()
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.company?.toLowerCase().includes(q)
    )
  }, [suppliers, search])

  const stats = useMemo(() => ({
    total:    suppliers.length,
    totalDue: suppliers.reduce((s, x) => s + (x.totalDue ?? 0), 0),
    totalPaid:suppliers.reduce((s, x) => s + (x.totalPaid ?? 0), 0),
  }), [suppliers])

  async function handleDelete(s: Supplier) {
    try {
      await deleteSupplier(s.id)
      toast.success('সাপ্লায়ার মুছে গেছে')
      setConfirmDel(null)
      load()
    } catch { toast.error('সমস্যা হয়েছে') }
  }

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">সাপ্লায়ার</h1>
          <p className="text-sm text-gray-400 mt-0.5">মোট {stats.total}জন</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true) }}
          className="btn-primary flex items-center gap-2 px-4 py-2.5">
          <Plus size={17} />
          <span className="hidden sm:inline">নতুন সাপ্লায়ার</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'মোট সাপ্লায়ার', value: `${stats.total}জন`,                 color: 'text-blue-600'  },
          { label: 'মোট পেমেন্ট',    value: `৳${stats.totalPaid.toLocaleString()}`, color: 'text-green-600' },
          { label: 'মোট বকেয়া',     value: `৳${stats.totalDue.toLocaleString()}`,  color: 'text-red-600'   },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="নাম, ফোন বা কোম্পানি দিয়ে খোঁজো..."
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
          <Building2 size={48} className="mb-3 opacity-30" />
          <p className="font-medium">কোনো সাপ্লায়ার পাওয়া যায়নি</p>
          {!search && (
            <button onClick={() => setShowForm(true)} className="mt-4 btn-primary px-5 py-2.5">
              প্রথম সাপ্লায়ার যোগ করো
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(supplier => (
            <div key={supplier.id} className="card flex items-center gap-3">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center font-bold text-purple-600 shrink-0 text-lg">
                {supplier.name[0]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{supplier.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Phone size={10} />{supplier.phone}
                  </span>
                  {supplier.company && (
                    <span className="text-xs text-gray-400 truncate">{supplier.company}</span>
                  )}
                </div>
              </div>

              {/* Due info */}
              <div className="text-right shrink-0">
                {(supplier.totalDue ?? 0) > 0 ? (
                  <>
                    <p className="text-xs text-gray-400">বকেয়া</p>
                    <p className="font-bold text-red-600 text-sm">৳{(supplier.totalDue ?? 0).toLocaleString()}</p>
                  </>
                ) : (
                  <span className="text-xs text-green-600 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded-full">পরিষ্কার</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1 shrink-0">
                <button onClick={() => { setEditItem(supplier); setShowForm(true) }}
                  className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => setConfirmDel(supplier)}
                  className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950 hover:bg-red-100 text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <SupplierForm
          supplier={editItem}
          onClose={() => { setShowForm(false); setEditItem(null) }}
          onSaved={() => { setShowForm(false); setEditItem(null); load() }}
        />
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-lg mb-2">সাপ্লায়ার মুছবে?</h3>
            <p className="text-gray-500 text-sm mb-5"><strong>{confirmDel.name}</strong> মুছে ফেলা হবে।</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="flex-1 btn-secondary py-2.5">বাতিল</button>
              <button onClick={() => handleDelete(confirmDel)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">
                মুছে ফেলো
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
