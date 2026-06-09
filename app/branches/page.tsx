'use client'

import { useState, useEffect, useMemo } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { BranchForm } from '@/components/branches/BranchForm'
import { getBranches, deleteBranch, getSales, getPurchases } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import {
  Plus, GitBranch, Phone, MapPin,
  Edit2, Trash2, Loader2, RefreshCw,
  Star, Users, ShoppingCart, TruckIcon,
  BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Branch } from '@/lib/types'

export default function BranchesPage() {
  const { activeBusiness } = useAppStore()
  const [branches,   setBranches]   = useState<Branch[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [editItem,   setEditItem]   = useState<Branch | null>(null)
  const [confirmDel, setConfirmDel] = useState<Branch | null>(null)

  async function load() {
    if (!activeBusiness) return
    setLoading(true)
    try {
      const list = await getBranches(activeBusiness.id)
      // If no branches exist, show setup prompt
      setBranches(list)
    } catch { toast.error('শাখা লোড হয়নি') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [activeBusiness])

  async function handleDelete(b: Branch) {
    if (b.isMain) { toast.error('প্রধান শাখা মুছা যাবে না'); return }
    try {
      await deleteBranch(b.id)
      toast.success('শাখা মুছে গেছে')
      setConfirmDel(null)
      load()
    } catch { toast.error('সমস্যা হয়েছে') }
  }

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">মাল্টি ব্র্যাঞ্চ</h1>
          <p className="text-sm text-gray-400 mt-0.5">মোট {branches.length}টি শাখা</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors">
          <Plus size={17} />
          <span className="hidden sm:inline">নতুন শাখা</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-teal-600" />
        </div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <GitBranch size={48} className="mb-3 opacity-30" />
          <p className="font-medium mb-1">কোনো শাখা নেই</p>
          <p className="text-sm text-center max-w-xs mb-4">
            মাল্টি ব্র্যাঞ্চ সিস্টেম ব্যবহার করতে প্রথমে একটি শাখা তৈরি করো।
            প্রতিটি শাখার আলাদা বিক্রয়, ক্রয় ও ইনভেন্টরি ট্র্যাক করা যাবে।
          </p>
          <button onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium">
            প্রথম শাখা তৈরি করো
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map(branch => (
            <div key={branch.id} className={cn(
              'card border-2 transition-all',
              branch.isMain
                ? 'border-teal-200 dark:border-teal-800'
                : 'border-transparent hover:border-teal-100 dark:hover:border-teal-900',
            )}>
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    branch.isMain
                      ? 'bg-teal-600 text-white'
                      : 'bg-teal-50 dark:bg-teal-950 text-teal-600',
                  )}>
                    <GitBranch size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{branch.name}</p>
                    {branch.isMain && (
                      <span className="flex items-center gap-0.5 text-xs text-teal-600 font-medium">
                        <Star size={10} /> প্রধান শাখা
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditItem(branch); setShowForm(true) }}
                    className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-600">
                    <Edit2 size={13} />
                  </button>
                  {!branch.isMain && (
                    <button onClick={() => setConfirmDel(branch)}
                      className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950 hover:bg-red-100 text-red-500">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5 mb-3">
                {branch.managerName && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users size={11} /> {branch.managerName}
                  </div>
                )}
                {branch.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Phone size={11} /> {branch.phone}
                  </div>
                )}
                {branch.address && (
                  <div className="flex items-start gap-1.5 text-xs text-gray-500">
                    <MapPin size={11} className="mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{branch.address}</span>
                  </div>
                )}
              </div>

              {/* Stats placeholder */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                {[
                  { label: 'বিক্রয়',  icon: <ShoppingCart size={11} />, value: '—' },
                  { label: 'ক্রয়',    icon: <TruckIcon size={11} />,    value: '—' },
                  { label: 'রিপোর্ট', icon: <BarChart2 size={11} />,    value: '—' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="flex items-center justify-center gap-0.5 text-gray-400 mb-0.5">
                      {s.icon}
                      <span className="text-xs">{s.label}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-500">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      {branches.length > 0 && (
        <div className="mt-6 p-4 bg-teal-50 dark:bg-teal-950 rounded-xl border border-teal-100 dark:border-teal-900">
          <h3 className="font-semibold text-teal-700 dark:text-teal-300 mb-1 text-sm">মাল্টি ব্র্যাঞ্চ কীভাবে কাজ করে?</h3>
          <ul className="text-xs text-teal-600 dark:text-teal-400 space-y-1 list-disc pl-4">
            <li>প্রতিটি শাখায় আলাদা বিক্রয় ও ক্রয় রেকর্ড থাকবে</li>
            <li>শাখা ভিত্তিক রিপোর্ট তৈরি করা যাবে (Phase 11-এ)</li>
            <li>প্রতিটি শাখার স্টক আলাদাভাবে ট্র্যাক হবে</li>
            <li>সব শাখার সম্মিলিত রিপোর্টও দেখা যাবে</li>
          </ul>
        </div>
      )}

      {showForm && (
        <BranchForm
          branch={editItem}
          onClose={() => { setShowForm(false); setEditItem(null) }}
          onSaved={() => { setShowForm(false); setEditItem(null); load() }}
        />
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-lg mb-2">শাখা মুছবে?</h3>
            <p className="text-gray-500 text-sm mb-5">
              <strong>{confirmDel.name}</strong> মুছে ফেলা হবে।
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
