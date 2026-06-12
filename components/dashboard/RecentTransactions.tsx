'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, ArrowDownRight, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAppStore } from '@/store/useAppStore'
import { getSales, getPurchases } from '@/lib/firestore'

interface TxItem {
  id: string
  type: 'sale' | 'purchase'
  name: string
  amount: number
  time: string
  paid: boolean
}

function timeAgo(date: any, lang: string): string {
  const d = (date as any)?.toDate ? date.toDate() : new Date(date)
  const diff = Math.floor((Date.now() - d.getTime()) / 60000)
  if (lang === 'bn') {
    if (diff < 1)  return 'এইমাত্র'
    if (diff < 60) return `${diff} মিনিট আগে`
    if (diff < 1440) return `${Math.floor(diff/60)} ঘণ্টা আগে`
    return `${Math.floor(diff/1440)} দিন আগে`
  }
  if (diff < 1)  return 'just now'
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff/60)}h ago`
  return `${Math.floor(diff/1440)}d ago`
}

export function RecentTransactions() {
  const { language, activeBusiness } = useAppStore()
  const [items, setItems]   = useState<TxItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBusiness) { setLoading(false); return }

    Promise.all([
      getSales(activeBusiness.id, 5),
      getPurchases(activeBusiness.id, 5),
    ]).then(([sales, purchases]) => {
      const saleTx: TxItem[] = sales.map(s => ({
        id:     s.id,
        type:   'sale',
        name:   s.customerName || (language === 'bn' ? 'নগদ বিক্রয়' : 'Cash Sale'),
        amount: s.grandTotal ?? 0,
        time:   timeAgo(s.createdAt, language),
        paid:   (s.dueAmount ?? 0) === 0,
      }))
      const purTx: TxItem[] = purchases.map(p => ({
        id:     p.id,
        type:   'purchase',
        name:   p.supplierName || (language === 'bn' ? 'অজানা সাপ্লায়ার' : 'Unknown Supplier'),
        amount: p.grandTotal ?? 0,
        time:   timeAgo(p.createdAt, language),
        paid:   (p.dueAmount ?? 0) === 0,
      }))
      const merged = [...saleTx, ...purTx]
        .sort((a, b) => 0) // already desc from firestore
        .slice(0, 6)
      setItems(merged)
    }).finally(() => setLoading(false))
  }, [activeBusiness])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-800 dark:text-gray-100">
          {language === 'bn' ? 'সাম্প্রতিক লেনদেন' : 'Recent Transactions'}
        </h2>
        <Link href="/reports" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
          {language === 'bn' ? 'সব দেখো' : 'View All'} <ArrowRight size={11} />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          {language === 'bn' ? 'কোনো লেনদেন নেই' : 'No transactions yet'}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
              <div className={`p-1.5 rounded-lg shrink-0 ${
                tx.type === 'sale'
                  ? 'bg-green-50 dark:bg-green-950 text-green-600'
                  : 'bg-red-50 dark:bg-red-950 text-red-500'
              }`}>
                {tx.type === 'sale' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{tx.name}</p>
                <p className="text-xs text-gray-400">{tx.time}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold ${tx.type === 'sale' ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.type === 'sale' ? '+' : '-'}৳{tx.amount.toLocaleString()}
                </p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  tx.paid
                    ? 'bg-green-50 dark:bg-green-950 text-green-600'
                    : 'bg-orange-50 dark:bg-orange-950 text-orange-600'
                }`}>
                  {tx.paid
                    ? (language === 'bn' ? 'পরিশোধ' : 'Paid')
                    : (language === 'bn' ? 'বাকি'   : 'Due')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
