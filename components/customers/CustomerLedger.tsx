'use client'

import { useState, useEffect } from 'react'
import { X, ShoppingCart, Wallet, Loader2, Phone, MapPin } from 'lucide-react'
import { getCustomerSales, getDuePayments } from '@/lib/firestore'
import { RiskBadge } from './RiskBadge'
import { cn } from '@/lib/utils'
import type { Customer, Sale, DuePayment } from '@/lib/types'

interface Props {
  customer: Customer
  onClose:  () => void
}

type Tab = 'overview' | 'sales' | 'payments'

export function CustomerLedger({ customer, onClose }: Props) {
  const [tab,      setTab]      = useState<Tab>('overview')
  const [sales,    setSales]    = useState<Sale[]>([])
  const [payments, setPayments] = useState<DuePayment[]>([])
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [s, p] = await Promise.all([
          getCustomerSales('', customer.name),   // businessId passed separately in real impl
          getDuePayments('', customer.id),
        ])
        setSales(s)
        setPayments(p)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [customer])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'সারসংক্ষেপ'   },
    { key: 'sales',    label: 'ক্রয় ইতিহাস'  },
    { key: 'payments', label: 'পেমেন্ট ইতিহাস' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
              {customer.name[0]}
            </div>
            <div>
              <h2 className="font-bold text-lg">{customer.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Phone size={10} />{customer.phone}
                </span>
                <RiskBadge score={customer.riskScore} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 shrink-0">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                'flex-1 py-3 text-sm font-medium transition-colors',
                tab === t.key
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
              )}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* Overview tab */}
          {tab === 'overview' && (
            <div className="space-y-4">
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'মোট কেনাকাটা',   value: `৳${(customer.totalPurchase ?? 0).toLocaleString()}`, color: 'text-blue-600',  bg: 'bg-blue-50 dark:bg-blue-950'   },
                  { label: 'মোট পরিশোধ',     value: `৳${(customer.totalPaid ?? 0).toLocaleString()}`,     color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950'  },
                  { label: 'বর্তমান বাকি',   value: `৳${(customer.totalDue ?? 0).toLocaleString()}`,      color: 'text-red-600',   bg: 'bg-red-50 dark:bg-red-950'      },
                  { label: 'রিস্ক স্কোর',    value: `${customer.riskScore}%`,                              color: 'text-orange-600',bg: 'bg-orange-50 dark:bg-orange-950'},
                ].map(s => (
                  <div key={s.label} className={cn('p-3 rounded-xl', s.bg)}>
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <p className={cn('font-bold text-lg', s.color)}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Risk explanation */}
              <div className={cn(
                'p-3 rounded-xl text-sm',
                customer.riskScore <= 20 ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300' :
                customer.riskScore <= 50 ? 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300' :
                                            'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300',
              )}>
                <p className="font-semibold mb-1">
                  {customer.riskScore <= 20  ? '✓ নিরাপদ কাস্টমার' :
                   customer.riskScore <= 50  ? '⚠ মাঝারি ঝুঁকি' :
                                               '✗ উচ্চ ঝুঁকি — সতর্ক থাকুন'}
                </p>
                <p className="text-xs opacity-80">
                  {customer.riskScore <= 20
                    ? 'এই কাস্টমার সময়মতো পরিশোধ করেন।'
                    : customer.riskScore <= 50
                    ? 'বাকির পরিমাণ মোট কেনার ৫০% এর বেশি।'
                    : 'বাকির পরিমাণ অনেক বেশি। ক্রেডিট দেওয়া সীমিত করুন।'}
                </p>
              </div>

              {/* Contact info */}
              <div className="card space-y-2">
                {customer.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">{customer.address}</span>
                  </div>
                )}
                {customer.nid && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 text-xs">NID:</span>
                    <span className="text-gray-600 dark:text-gray-400">{customer.nid}</span>
                  </div>
                )}
                {customer.note && (
                  <div className="text-sm text-gray-500 italic">"{customer.note}"</div>
                )}
              </div>
            </div>
          )}

          {/* Sales tab */}
          {tab === 'sales' && (
            loading ? (
              <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-blue-600" /></div>
            ) : sales.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <ShoppingCart size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">কোনো ক্রয় ইতিহাস নেই</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sales.map(sale => (
                  <div key={sale.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <div>
                      <p className="font-medium text-sm">{sale.invoiceNo}</p>
                      <p className="text-xs text-gray-400">{sale.items.length}টি পণ্য</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">৳{sale.grandTotal.toLocaleString()}</p>
                      {sale.dueAmount > 0 && (
                        <p className="text-xs text-red-500">বাকি ৳{sale.dueAmount.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Payments tab */}
          {tab === 'payments' && (
            loading ? (
              <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-blue-600" /></div>
            ) : payments.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Wallet size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">কোনো পেমেন্ট ইতিহাস নেই</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <div>
                      <p className="font-medium text-sm text-green-600">+৳{p.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{p.method} {p.note && `• ${p.note}`}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                      <Wallet size={14} className="text-green-600" />
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
