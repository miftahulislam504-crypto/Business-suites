'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, TrendingDown, TrendingUp, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAppStore } from '@/store/useAppStore'
import { getCustomers, getSuppliers } from '@/lib/firestore'

export function DuesSummary() {
  const { language, activeBusiness } = useAppStore()
  const [receivable, setReceivable] = useState(0)
  const [payable, setPayable]       = useState(0)
  const [topList, setTopList]       = useState<any[]>([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (!activeBusiness) { setLoading(false); return }

    Promise.all([
      getCustomers(activeBusiness.id),
      getSuppliers(activeBusiness.id),
    ]).then(([customers, suppliers]) => {
      const totalRec = customers.reduce((s, c) => s + (c.totalDue ?? 0), 0)
      const totalPay = suppliers.reduce((s, s2) => s + (s2.totalDue ?? 0), 0)
      setReceivable(totalRec)
      setPayable(totalPay)

      const custDues = customers
        .filter(c => (c.totalDue ?? 0) > 0)
        .map(c => ({ id: c.id, name: c.name, amount: c.totalDue ?? 0, type: 'receivable' }))
      const suppDues = suppliers
        .filter(s => (s.totalDue ?? 0) > 0)
        .map(s => ({ id: s.id, name: s.name, amount: s.totalDue ?? 0, type: 'payable' }))

      const merged = [...custDues, ...suppDues]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 4)
      setTopList(merged)
    }).finally(() => setLoading(false))
  }, [activeBusiness])

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

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950 border border-green-100 dark:border-green-900">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={13} className="text-green-600" />
            <span className="text-xs text-green-600 font-medium">
              {language === 'bn' ? 'পাওনা (কাস্টমার)' : 'Receivable'}
            </span>
          </div>
          <p className="text-lg font-bold text-green-700 dark:text-green-400">
            ৳{receivable.toLocaleString()}
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
            ৳{payable.toLocaleString()}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={18} className="animate-spin text-gray-400" />
        </div>
      ) : topList.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          {language === 'bn' ? 'কোনো বকেয়া নেই' : 'No dues'}
        </p>
      ) : (
        <div className="space-y-2">
          {topList.map((due) => (
            <div key={due.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{due.name}</p>
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
      )}
    </div>
  )
}
