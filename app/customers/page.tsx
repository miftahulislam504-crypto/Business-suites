'use client'

import { useState, useEffect, useMemo } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { CustomerForm } from '@/components/customers/CustomerForm'
import { CollectDueModal } from '@/components/customers/CollectDueModal'
import { CustomerLedger } from '@/components/customers/CustomerLedger'
import { RiskBadge } from '@/components/customers/RiskBadge'
import { getCustomers, deleteCustomer } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import {
  Plus, Search, Users, Phone,
  Edit2, Trash2, Loader2, RefreshCw,
  Wallet, FileText, TrendingUp,
  AlertTriangle, MessageCircle,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Customer } from '@/lib/types'

type FilterType = 'all' | 'due' | 'high-risk' | 'clear'
type SortType   = 'name' | 'due-high' | 'due-low' | 'risk'

export default function CustomersPage() {
  const { activeBusiness } = useAppStore()
  const [customers,   setCustomers]   = useState<Customer[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filter,      setFilter]      = useState<FilterType>('all')
  const [sort,        setSort]        = useState<SortType>('name')
  const [showForm,    setShowForm]    = useState(false)
  const [editItem,    setEditItem]    = useState<Customer | null>(null)
  const [collectItem, setCollectItem] = useState<Customer | null>(null)
  const [ledgerItem,  setLedgerItem]  = useState<Customer | null>(null)
  const [confirmDel,  setConfirmDel]  = useState<Customer | null>(null)

  async function load() {
    if (!activeBusiness) return
    setLoading(true)
    try {
      const list = await getCustomers(activeBusiness.id)
      setCustomers(list)
    } catch { toast.error('কাস্টমার লোড হয়নি') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [activeBusiness])

  const stats = useMemo(() => ({
    total:     customers.length,
    totalDue:  customers.reduce((s, c) => s + (c.totalDue ?? 0), 0),
    highRisk:  customers.filter(c => c.riskScore > 50).length,
    withDue:   customers.filter(c => (c.totalDue ?? 0) > 0).length,
  }), [customers])

  const filtered = useMemo(() => {
    let list = [...customers]

    // Filter
    if (filter === 'due')       list = list.filter(c => (c.totalDue ?? 0) > 0)
    if (filter === 'high-risk') list = list.filter(c => c.riskScore > 50)
    if (filter === 'clear')     list = list.filter(c => (c.totalDue ?? 0) === 0)

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.address?.toLowerCase().includes(q)
      )
    }

    // Sort
    if (sort === 'due-high') list.sort((a, b) => (b.totalDue ?? 0) - (a.totalDue ?? 0))
    if (sort === 'due-low')  list.sort((a, b) => (a.totalDue ?? 0) - (b.totalDue ?? 0))
    if (sort === 'risk')     list.sort((a, b) => b.riskScore - a.riskScore)
    if (sort === 'name')     list.sort((a, b) => a.name.localeCompare(b.name))

    return list
  }, [customers, filter, search, sort])

  async function handleDelete(c: Customer) {
    try {
      await deleteCustomer(c.id)
      toast.success('কাস্টমার মুছে গেছে')
      setConfirmDel(null)
      load()
    } catch { toast.error('সমস্যা হয়েছে') }
  }

  function handleWhatsAppAll() {
    const dueCustomers = customers.filter(c => (c.totalDue ?? 0) > 0)
    if (dueCustomers.length === 0) { toast.error('কোনো বাকি নেই'); return }
    const first = dueCustomers[0]
    const msg   = `আসালামু আলাইকুম ${first.name} ভাই,\n\nআপনার কাছে *৳${first.totalDue.toLocaleString()}* বাকি আছে। অনুগ্রহ করে পরিশোধ করুন।`
    window.open(`https://wa.me/88${first.phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">কাস্টমার</h1>
          <p className="text-sm text-gray-400 mt-0.5">মোট {stats.total}জন</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleWhatsAppAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-950 text-green-600 text-sm font-medium hover:bg-green-100 transition-colors">
            <MessageCircle size={15} />
            <span className="hidden sm:inline">বাল্ক রিমাইন্ডার</span>
          </button>
          <button onClick={() => { setEditItem(null); setShowForm(true) }}
            className="btn-primary flex items-center gap-2 px-4 py-2.5">
            <Plus size={17} />
            <span className="hidden sm:inline">নতুন কাস্টমার</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'মোট কাস্টমার',  value: `${stats.total}জন`,                     color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950',   icon: <Users size={16} />         },
          { label: 'মোট পাওনা',     value: `৳${stats.totalDue.toLocaleString()}`,   color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950',     icon: <Wallet size={16} />        },
          { label: 'বাকি আছে',      value: `${stats.withDue}জন`,                    color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950', icon: <TrendingUp size={16} />    },
          { label: 'উচ্চ ঝুঁকি',   value: `${stats.highRisk}জন`,                   color: 'text-red-700',    bg: 'bg-red-50 dark:bg-red-950',     icon: <AlertTriangle size={16} /> },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-3">
            <div className={cn('p-2 rounded-lg shrink-0', s.bg, s.color)}>{s.icon}</div>
            <div className="min-w-0">
              <p className={cn('font-bold text-lg leading-tight', s.color)}>{s.value}</p>
              <p className="text-xs text-gray-500 truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="নাম বা ফোন দিয়ে খোঁজো..."
            className="input-field pl-9" />
        </div>

        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all',       label: 'সব'         },
            { key: 'due',       label: '💰 বাকি'    },
            { key: 'high-risk', label: '⚠ ঝুঁকি'  },
            { key: 'clear',     label: '✓ পরিষ্কার' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as FilterType)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium border transition-all whitespace-nowrap',
                filter === f.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400',
              )}>
              {f.label}
            </button>
          ))}

          {/* Sort */}
          <select value={sort} onChange={e => setSort(e.target.value as SortType)}
            className="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400">
            <option value="name">নাম অনুযায়ী</option>
            <option value="due-high">বেশি বাকি আগে</option>
            <option value="due-low">কম বাকি আগে</option>
            <option value="risk">ঝুঁকি অনুযায়ী</option>
          </select>

          <button onClick={load} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Users size={48} className="mb-3 opacity-30" />
          <p className="font-medium">কোনো কাস্টমার পাওয়া যায়নি</p>
          {!search && filter === 'all' && (
            <button onClick={() => setShowForm(true)} className="mt-4 btn-primary px-5 py-2.5">
              প্রথম কাস্টমার যোগ করো
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(customer => {
            const hasDue = (customer.totalDue ?? 0) > 0
            return (
              <div key={customer.id} className={cn(
                'card border-l-4 transition-all',
                hasDue
                  ? customer.riskScore > 50
                    ? 'border-l-red-500'
                    : 'border-l-orange-400'
                  : 'border-l-green-400',
              )}>
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {customer.name[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{customer.name}</p>
                      <RiskBadge score={customer.riskScore} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Phone size={10} />{customer.phone}
                      </span>
                      {customer.totalPurchase > 0 && (
                        <span className="text-xs text-gray-400">
                          কেনা: ৳{(customer.totalPurchase).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Due amount */}
                  <div className="text-right shrink-0">
                    {hasDue ? (
                      <>
                        <p className="text-xs text-gray-400">বাকি</p>
                        <p className="font-bold text-red-600">৳{(customer.totalDue).toLocaleString()}</p>
                      </>
                    ) : (
                      <span className="text-xs text-green-600 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded-full font-medium">পরিষ্কার ✓</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    {hasDue && (
                      <button onClick={() => setCollectItem(customer)}
                        className="p-1.5 rounded-lg bg-green-50 dark:bg-green-950 hover:bg-green-100 text-green-600 transition-colors"
                        title="পাওনা কালেকশন">
                        <Wallet size={14} />
                      </button>
                    )}
                    <button onClick={() => setLedgerItem(customer)}
                      className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 text-blue-600 transition-colors"
                      title="লেজার দেখো">
                      <FileText size={14} />
                    </button>
                    <button onClick={() => { setEditItem(customer); setShowForm(true) }}
                      className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-600 transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setConfirmDel(customer)}
                      className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950 hover:bg-red-100 text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <CustomerForm
          customer={editItem}
          onClose={() => { setShowForm(false); setEditItem(null) }}
          onSaved={() => { setShowForm(false); setEditItem(null); load() }}
        />
      )}

      {collectItem && (
        <CollectDueModal
          customer={collectItem}
          onClose={() => setCollectItem(null)}
          onSaved={() => { setCollectItem(null); load() }}
        />
      )}

      {ledgerItem && (
        <CustomerLedger
          customer={ledgerItem}
          onClose={() => setLedgerItem(null)}
        />
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-lg mb-2">কাস্টমার মুছবে?</h3>
            <p className="text-gray-500 text-sm mb-5">
              <strong>{confirmDel.name}</strong> মুছে ফেলা হবে।
              {(confirmDel.totalDue ?? 0) > 0 && (
                <span className="text-red-500 block mt-1">⚠ এই কাস্টমারের ৳{confirmDel.totalDue.toLocaleString()} বাকি আছে।</span>
              )}
            </p>
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
