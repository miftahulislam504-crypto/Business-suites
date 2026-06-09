'use client'

import { useState } from 'react'
import { X, Loader2, Wallet, CheckCircle2 } from 'lucide-react'
import { addPayrollRecord } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Employee, PaymentMethod } from '@/lib/types'

interface Props {
  employee: Employee
  onClose:  () => void
  onSaved:  () => void
}

const months = [
  'জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন',
  'জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর',
]

const payMethods: { value: PaymentMethod; label: string; color: string }[] = [
  { value: 'cash',  label: 'নগদ',   color: 'bg-green-500' },
  { value: 'bank',  label: 'ব্যাংক', color: 'bg-blue-500'  },
  { value: 'bkash', label: 'bKash', color: 'bg-pink-500'  },
  { value: 'nagad', label: 'Nagad', color: 'bg-orange-500'},
]

export function PayrollModal({ employee, onClose, onSaved }: Props) {
  const { activeBusiness, user } = useAppStore()
  const now = new Date()

  const [month,         setMonth]         = useState(now.getMonth() + 1)
  const [year,          setYear]          = useState(now.getFullYear())
  const [bonus,         setBonus]         = useState(0)
  const [deductions,    setDeductions]    = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [note,          setNote]          = useState('')
  const [loading,       setLoading]       = useState(false)
  const [success,       setSuccess]       = useState(false)

  const netSalary = employee.baseSalary + employee.allowances + bonus - deductions

  async function handleSubmit() {
    if (!activeBusiness || !user) return
    setLoading(true)
    try {
      await addPayrollRecord({
        businessId:    activeBusiness.id,
        employeeId:    employee.id,
        employeeName:  employee.name,
        designation:   employee.designation,
        month,
        year,
        baseSalary:    employee.baseSalary,
        allowances:    employee.allowances,
        bonus,
        deductions,
        netSalary,
        paymentMethod,
        paidAt:        new Date(),
        note:          note.trim(),
        createdBy:     user.uid,
        createdAt:     new Date(),
      })
      setSuccess(true)
      setTimeout(() => { onSaved() }, 1500)
    } catch { toast.error('সমস্যা হয়েছে') }
    finally  { setLoading(false) }
  }

  if (success) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center shadow-2xl">
        <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
        <p className="font-bold text-lg">বেতন প্রদান সম্পন্ন!</p>
        <p className="text-gray-500 text-sm mt-1">{employee.name} — ৳{netSalary.toLocaleString()}</p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl">

        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="font-bold">বেতন প্রদান</h2>
            <p className="text-sm text-gray-500">{employee.name} • {employee.designation}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Month/Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">মাস</label>
              <select value={month} onChange={e => setMonth(+e.target.value)} className="input-field">
                {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">বছর</label>
              <select value={year} onChange={e => setYear(+e.target.value)} className="input-field">
                {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Salary breakdown */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">মূল বেতন</span>
              <span className="font-medium">৳{employee.baseSalary.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ভাতা</span>
              <span className="font-medium">৳{employee.allowances.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">বোনাস</span>
              <input type="number" value={bonus} onChange={e => setBonus(+e.target.value)}
                className="w-28 px-2 py-1 text-right text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-medium text-green-600"
                min={0} placeholder="0" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">কর্তন</span>
              <input type="number" value={deductions} onChange={e => setDeductions(+e.target.value)}
                className="w-28 px-2 py-1 text-right text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-medium text-red-500"
                min={0} placeholder="0" />
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200 dark:border-gray-700">
              <span>নিট বেতন</span>
              <span className="text-blue-600">৳{netSalary.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium mb-2">পেমেন্ট পদ্ধতি</label>
            <div className="grid grid-cols-4 gap-2">
              {payMethods.map(m => (
                <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                  className={cn(
                    'py-2 rounded-lg text-xs font-medium transition-all',
                    paymentMethod === m.value ? `${m.color} text-white` : 'bg-gray-100 dark:bg-gray-800 text-gray-600',
                  )}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="নোট (ঐচ্ছিক)" className="input-field text-sm py-2" />
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="flex-1 btn-secondary py-3">বাতিল</button>
          <button onClick={handleSubmit} disabled={loading || netSalary <= 0}
            className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            <Wallet size={15} />
            বেতন দাও
          </button>
        </div>
      </div>
    </div>
  )
}
