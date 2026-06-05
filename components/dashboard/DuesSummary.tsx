'use client'

import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useAppStore } from '@/store/useAppStore'

// Placeholder — Phase 7 (Customer & Due) এর পর real data
const topDues = [
  { id: '1', name: 'করিম ট্রেডার্স',   amount: 15000, days: 12, type: 'receivable' },
  { id: '2', name: 'রহিম এন্টারপ্রাইজ', amount: 8500,  days: 5,  type: 'receivable' },
  { id: '3', name: 'ABC সাপ্লায়ার',    amount: 22000, days: 20, type: 'payable'    },
  { id: '4', name: 'XYZ ডিলার',         amount: 11000, days: 8,  type: 'payable'    },
]

export function DuesSummary() {
  const { language } = useAppStore()

  const totalReceivable = topDues.filter(d => d.type === 'receivable').reduce((s, d) => s + d.amount, 0)
  const totalPayable    = topDues.filter(d => d.type === 'payable').reduce((s, d) => s + d.amount, 0)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-800 dark:text-gray-100">
          {language === 'bn' ? 'পাওনা / বকেয়া' : 'Dues Summary'}
        </h2>
        <Link href="/customers" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
          {language === 'bn' ? 'সব দেখো' : 'View All'} <ArrowRight size={11} />
        </Link>
      </div>

      {/* Summary boxes */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950 border border-green-100 dark:border-green-900">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={13} className="text-green-600" />
            <span className="text-xs text-green-600 font-medium">
              {language === 'bn' ? 'পাওনা (কাস্টমার)' : 'Receivable'}
            </span>
          </div>
          <p className="text-lg font-bold text-green-700 dark:text-green-400">
            ৳{totalReceivable.toLocaleString()}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown size={13} className="text-red-500" />
            <span className="text-xs text-red-500 font-medium">
              {language === 'bn' ? 'বকেয়া (সাপ্লায়ার)' : 'Payable'}
            </span>
          </div>
          <p className="text-lg font-bold text-red-600 dark:text-red-400">
            ৳{totalPayable.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Top dues list */}
      <div className="space-y-2">
        {topDues.map((due) => (
          <div key={due.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{due.name}</p>
              <p className="text-xs text-gray-400">{due.days} দিন আগে</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-bold ${due.type === 'receivable' ? 'text-green-600' : 'text-red-500'}`}>
                ৳{due.amount.toLocaleString()}
              </p>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                due.type === 'receivable'
                  ? 'bg-green-50 dark:bg-green-950 text-green-600'
                  : 'bg-red-50 dark:bg-red-950 text-red-500'
              }`}>
                {due.type === 'receivable'
                  ? (language === 'bn' ? 'পাবো' : 'Due In')
                  : (language === 'bn' ? 'দেবো' : 'Due Out')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
