'use client'

import { ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useAppStore } from '@/store/useAppStore'
import { formatCurrency } from '@/lib/utils'

// Placeholder — Phase 5 (Sales) এর পর real data আসবে
const transactions = [
  { id: '1', type: 'sale',     name: 'করিম ট্রেডার্স',  amount: 5500,  time: '১০ মিনিট আগে', paid: true  },
  { id: '2', type: 'purchase', name: 'ABC সাপ্লায়ার',   amount: 12000, time: '৩০ মিনিট আগে', paid: false },
  { id: '3', type: 'sale',     name: 'রহিম স্টোর',       amount: 3200,  time: '১ ঘণ্টা আগে',  paid: true  },
  { id: '4', type: 'sale',     name: 'নগদ বিক্রয়',      amount: 1800,  time: '২ ঘণ্টা আগে',  paid: true  },
  { id: '5', type: 'purchase', name: 'XYZ ডিলার',        amount: 8500,  time: '৩ ঘণ্টা আগে',  paid: false },
]

export function RecentTransactions() {
  const { language } = useAppStore()

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-800 dark:text-gray-100">
          {language === 'bn' ? 'সাম্প্রতিক লেনদেন' : 'Recent Transactions'}
        </h2>
        <Link
          href="/reports"
          className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
        >
          {language === 'bn' ? 'সব দেখো' : 'View All'}
          <ArrowRight size={11} />
        </Link>
      </div>

      <div className="space-y-2">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
            {/* Icon */}
            <div className={`p-1.5 rounded-lg shrink-0 ${
              tx.type === 'sale'
                ? 'bg-green-50 dark:bg-green-950 text-green-600'
                : 'bg-red-50 dark:bg-red-950 text-red-500'
            }`}>
              {tx.type === 'sale'
                ? <ArrowUpRight size={14} />
                : <ArrowDownRight size={14} />}
            </div>

            {/* Name + time */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                {tx.name}
              </p>
              <p className="text-xs text-gray-400">{tx.time}</p>
            </div>

            {/* Amount + status */}
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold ${
                tx.type === 'sale' ? 'text-green-600' : 'text-red-500'
              }`}>
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
    </div>
  )
}
