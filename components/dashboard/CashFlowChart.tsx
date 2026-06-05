'use client'

import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { useAppStore } from '@/store/useAppStore'

const data = [
  { month: 'জান',  inflow: 85000,  outflow: 62000 },
  { month: 'ফেব',  inflow: 92000,  outflow: 71000 },
  { month: 'মার্চ', inflow: 78000,  outflow: 58000 },
  { month: 'এপ্রি', inflow: 105000, outflow: 79000 },
  { month: 'মে',   inflow: 118000, outflow: 88000 },
  { month: 'জুন',  inflow: 98000,  outflow: 72000 },
]

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
  const { language } = useAppStore()

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
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barSize={14}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="inflow"  fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="outflow" fill="#f87171" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
