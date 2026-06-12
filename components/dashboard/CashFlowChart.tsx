'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { useAppStore } from '@/store/useAppStore'
import { getSales, getExpenses } from '@/lib/firestore'
import { Loader2 } from 'lucide-react'

const MONTHS_BN = ['জান','ফেব','মার্চ','এপ্রি','মে','জুন','জুলাই','আগ','সেপ','অক্টো','নভে','ডিসে']
const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-3 text-xs">
      <p className="font-semibold mb-1.5 text-gray-700 dark:text-gray-200">{label}</p>
      <p className="text-blue-500 font-medium">আয়: ৳{payload[0]?.value?.toLocaleString()}</p>
      <p className="text-red-400 font-medium">ব্যয়: ৳{payload[1]?.value?.toLocaleString()}</p>
    </div>
  )
}

export function CashFlowChart() {
  const { language, activeBusiness } = useAppStore()
  const [data, setData]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBusiness) { setLoading(false); return }

    Promise.all([
      getSales(activeBusiness.id, 500),
      getExpenses(activeBusiness.id, 500),
    ]).then(([sales, expenses]) => {
      // Build last 6 months
      const now = new Date()
      const map: Record<string, { inflow: number; outflow: number; label: string }> = {}
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        map[key] = {
          inflow:  0,
          outflow: 0,
          label:   language === 'bn' ? MONTHS_BN[d.getMonth()] : MONTHS_EN[d.getMonth()],
        }
      }

      sales.forEach(s => {
        const d = (s.createdAt as any)?.toDate ? (s.createdAt as any).toDate() : new Date(s.createdAt)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (map[key]) map[key].inflow += s.grandTotal ?? 0
      })

      expenses.forEach(e => {
        const d = (e.createdAt as any)?.toDate ? (e.createdAt as any).toDate() : new Date(e.createdAt)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (map[key]) map[key].outflow += e.amount ?? 0
      })

      setData(Object.values(map).map(v => ({
        month: v.label, inflow: v.inflow, outflow: v.outflow,
      })))
    }).finally(() => setLoading(false))
  }, [activeBusiness, language])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-800 dark:text-gray-100">
          {language === 'bn' ? 'ক্যাশ ফ্লো' : 'Cash Flow'}
        </h2>
        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
          {language === 'bn' ? 'গত ৬ মাস' : 'Last 6 Months'}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="inflow"  fill="#3b82f6" radius={[4,4,0,0]} />
            <Bar dataKey="outflow" fill="#f87171" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
