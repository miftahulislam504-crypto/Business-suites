'use client'

import { useState, useEffect, useMemo } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { getAuditLogs } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import {
  Shield, Search, RefreshCw, Loader2,
  ShoppingCart, TruckIcon, Package, Users,
  Building2, UserCog, Wallet, LogIn,
  AlertTriangle, Edit3, Trash2, Plus,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { AuditLog, AuditAction } from '@/lib/types'

const actionConfig: Record<AuditAction, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  create:       { label: 'তৈরি',     color: 'text-green-700',  bg: 'bg-green-100 dark:bg-green-950',  icon: <Plus size={12} />       },
  update:       { label: 'আপডেট',    color: 'text-blue-700',   bg: 'bg-blue-100 dark:bg-blue-950',    icon: <Edit3 size={12} />      },
  delete:       { label: 'মুছো',     color: 'text-red-700',    bg: 'bg-red-100 dark:bg-red-950',      icon: <Trash2 size={12} />     },
  sale:         { label: 'বিক্রয়',   color: 'text-blue-700',   bg: 'bg-blue-100 dark:bg-blue-950',    icon: <ShoppingCart size={12} />},
  purchase:     { label: 'ক্রয়',     color: 'text-purple-700', bg: 'bg-purple-100 dark:bg-purple-950',icon: <TruckIcon size={12} />  },
  payment:      { label: 'পেমেন্ট',  color: 'text-green-700',  bg: 'bg-green-100 dark:bg-green-950',  icon: <Wallet size={12} />     },
  login:        { label: 'লগইন',     color: 'text-gray-700',   bg: 'bg-gray-100 dark:bg-gray-800',    icon: <LogIn size={12} />      },
  logout:       { label: 'লগআউট',    color: 'text-gray-700',   bg: 'bg-gray-100 dark:bg-gray-800',    icon: <LogIn size={12} />      },
  stock_adjust: { label: 'স্টক',     color: 'text-orange-700', bg: 'bg-orange-100 dark:bg-orange-950',icon: <Package size={12} />    },
}

const moduleIcons: Record<string, React.ReactNode> = {
  'বিক্রয়':    <ShoppingCart size={14} />,
  'ক্রয়':      <TruckIcon size={14} />,
  'ইনভেন্টরি': <Package size={14} />,
  'কাস্টমার':  <Users size={14} />,
  'সাপ্লায়ার': <Building2 size={14} />,
  'কর্মচারী':  <UserCog size={14} />,
  'পেমেন্ট':   <Wallet size={14} />,
  'স্টক':      <Package size={14} />,
}

const allModules = ['সব', 'বিক্রয়', 'ক্রয়', 'ইনভেন্টরি', 'কাস্টমার', 'সাপ্লায়ার', 'কর্মচারী', 'পেমেন্ট', 'স্টক']

function timeAgo(date: any): string {
  const d   = date instanceof Date ? date : new Date(date.seconds * 1000)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60)   return `${diff} সেকেন্ড আগে`
  if (diff < 3600) return `${Math.floor(diff/60)} মিনিট আগে`
  if (diff < 86400)return `${Math.floor(diff/3600)} ঘণ্টা আগে`
  return `${Math.floor(diff/86400)} দিন আগে`
}

export default function AuditPage() {
  const { activeBusiness } = useAppStore()
  const [logs,      setLogs]      = useState<AuditLog[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [module,    setModule]    = useState('সব')
  const [expanded,  setExpanded]  = useState<string | null>(null)

  async function load() {
    if (!activeBusiness) return
    setLoading(true)
    try {
      const list = await getAuditLogs(activeBusiness.id, 200)
      setLogs(list)
    } catch { toast.error('অডিট লগ লোড হয়নি') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [activeBusiness])

  const filtered = useMemo(() => {
    let list = logs
    if (module !== 'সব') list = list.filter(l => l.module === module)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(l =>
        l.description.toLowerCase().includes(q) ||
        l.userName.toLowerCase().includes(q) ||
        l.module.toLowerCase().includes(q)
      )
    }
    return list
  }, [logs, module, search])

  // Stats
  const stats = useMemo(() => ({
    total:   logs.length,
    today:   logs.filter(l => {
      const d = l.createdAt instanceof Date ? l.createdAt : new Date((l.createdAt as any).seconds * 1000)
      return new Date().toDateString() === d.toDateString()
    }).length,
    users:   [...new Set(logs.map(l => l.userId))].length,
    deletes: logs.filter(l => l.action === 'delete').length,
  }), [logs])

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield size={22} className="text-indigo-600" />
            অডিট লগ
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">কে কখন কী করেছে</p>
        </div>
        <button onClick={load}
          className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
          <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'মোট কার্যক্রম',  value: stats.total,   color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950'  },
          { label: 'আজকের কার্যক্রম', value: stats.today,   color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950'      },
          { label: 'সক্রিয় ব্যবহারকারী',value: stats.users, color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950'    },
          { label: 'ডিলিট কার্যক্রম',  value: stats.deletes,color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950'        },
        ].map(s => (
          <div key={s.label} className="card">
            <p className={`font-bold text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="বিবরণ বা ব্যবহারকারী দিয়ে খোঁজো..."
            className="input-field pl-9" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {allModules.map(m => (
            <button key={m} onClick={() => setModule(m)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium border whitespace-nowrap transition-all',
                module === m
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300',
              )}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Log list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <Shield size={48} className="mb-3 opacity-30" />
          <p>কোনো লগ পাওয়া যায়নি</p>
          <p className="text-sm mt-1">ব্যবসার কার্যক্রম হলে এখানে দেখাবে</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => {
            const action = actionConfig[log.action] ?? actionConfig.update
            const isExpanded = expanded === log.id
            const hasDetails = log.before || log.after

            return (
              <div key={log.id}
                className={cn(
                  'card border transition-all',
                  isExpanded ? 'border-indigo-200 dark:border-indigo-800' : 'border-transparent',
                )}>
                <div
                  className={cn('flex items-center gap-3', hasDetails && 'cursor-pointer')}
                  onClick={() => hasDetails && setExpanded(isExpanded ? null : log.id)}
                >
                  {/* Module icon */}
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 shrink-0">
                    {moduleIcons[log.module] ?? <Shield size={14} />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        'inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full',
                        action.color, action.bg,
                      )}>
                        {action.icon} {action.label}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">{log.module}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 line-clamp-1">
                      {log.description}
                    </p>
                  </div>

                  {/* Right */}
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{log.userName}</p>
                    <p className="text-xs text-gray-400">{timeAgo(log.createdAt)}</p>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && hasDetails && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {log.before && (
                      <div>
                        <p className="text-xs font-semibold text-red-600 mb-1.5">আগে ছিল:</p>
                        <pre className="text-xs bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 p-2 rounded-lg overflow-auto max-h-32">
                          {JSON.stringify(log.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.after && (
                      <div>
                        <p className="text-xs font-semibold text-green-600 mb-1.5">পরে হয়েছে:</p>
                        <pre className="text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 p-2 rounded-lg overflow-auto max-h-32">
                          {JSON.stringify(log.after, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </MainLayout>
  )
}
