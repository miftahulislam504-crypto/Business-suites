'use client'

import { useState } from 'react'
import { X, Loader2, UserCog } from 'lucide-react'
import { addEmployee, updateEmployee } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Employee, SalaryType } from '@/lib/types'

interface Props {
  employee?: Employee | null
  onClose:   () => void
  onSaved:   () => void
}

const salaryTypes: { value: SalaryType; label: string }[] = [
  { value: 'monthly', label: 'মাসিক' },
  { value: 'daily',   label: 'দৈনিক' },
  { value: 'hourly',  label: 'ঘণ্টাভিত্তিক' },
]

const departments = ['বিক্রয়', 'ক্রয়', 'হিসাব', 'গুদাম', 'ডেলিভারি', 'আইটি', 'প্রশাসন', 'অন্যান্য']

export function EmployeeForm({ employee, onClose, onSaved }: Props) {
  const { activeBusiness } = useAppStore()
  const isEdit = !!employee
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name:         employee?.name         ?? '',
    phone:        employee?.phone        ?? '',
    email:        employee?.email        ?? '',
    nid:          employee?.nid          ?? '',
    address:      employee?.address      ?? '',
    designation:  employee?.designation  ?? '',
    department:   employee?.department   ?? '',
    joiningDate:  employee?.joiningDate
      ? new Date(employee.joiningDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    salaryType:   employee?.salaryType   ?? 'monthly' as SalaryType,
    baseSalary:   employee?.baseSalary   ?? 0,
    allowances:   employee?.allowances   ?? 0,
    bankAccount:  employee?.bankAccount  ?? '',
    bkashNumber:  employee?.bkashNumber  ?? '',
    note:         employee?.note         ?? '',
  })

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    if (!form.name.trim())        { toast.error('নাম দাও');         return }
    if (!form.phone.trim())       { toast.error('ফোন দাও');         return }
    if (!form.designation.trim()) { toast.error('পদবি দাও');        return }
    if (form.baseSalary <= 0)     { toast.error('বেতন দাও');        return }
    if (!activeBusiness)          return

    setLoading(true)
    try {
      const payload = {
        ...form,
        joiningDate: new Date(form.joiningDate),
        businessId:  activeBusiness.id,
        status:      'active' as const,
      }
      if (isEdit && employee) {
        await updateEmployee(employee.id, payload)
        toast.success('কর্মচারী আপডেট হয়েছে')
      } else {
        await addEmployee(payload)
        toast.success('কর্মচারী যোগ হয়েছে')
      }
      onSaved()
    } catch { toast.error('সমস্যা হয়েছে') }
    finally  { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">

        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <UserCog size={18} className="text-blue-600" />
            <h2 className="font-bold text-lg">{isEdit ? 'কর্মচারী সম্পাদনা' : 'নতুন কর্মচারী'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">পুরো নাম *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="কর্মচারীর নাম" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">ফোন *</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="01XXXXXXXXX" className="input-field" type="tel" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">NID</label>
              <input value={form.nid} onChange={e => set('nid', e.target.value)}
                placeholder="NID নম্বর" className="input-field" />
            </div>
          </div>

          {/* Job info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">পদবি *</label>
              <input value={form.designation} onChange={e => set('designation', e.target.value)}
                placeholder="Manager, Salesman..." className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">বিভাগ</label>
              <select value={form.department} onChange={e => set('department', e.target.value)}
                className="input-field">
                <option value="">বেছে নাও</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">যোগদানের তারিখ</label>
            <input type="date" value={form.joiningDate} onChange={e => set('joiningDate', e.target.value)}
              className="input-field" />
          </div>

          {/* Salary */}
          <div>
            <label className="block text-sm font-medium mb-2">বেতনের ধরন *</label>
            <div className="grid grid-cols-3 gap-2">
              {salaryTypes.map(t => (
                <button key={t.value} onClick={() => set('salaryType', t.value)}
                  className={cn(
                    'py-2 rounded-lg text-sm font-medium border transition-all',
                    form.salaryType === t.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600',
                  )}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                মূল বেতন (৳) *
              </label>
              <input type="number" value={form.baseSalary}
                onChange={e => set('baseSalary', +e.target.value)}
                placeholder="0" className="input-field" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">ভাতা (৳)</label>
              <input type="number" value={form.allowances}
                onChange={e => set('allowances', +e.target.value)}
                placeholder="0" className="input-field" min={0} />
            </div>
          </div>

          {/* Total salary preview */}
          {form.baseSalary > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-xl flex justify-between text-sm font-medium text-blue-700 dark:text-blue-300">
              <span>মোট বেতন ({salaryTypes.find(t => t.value === form.salaryType)?.label})</span>
              <span>৳{(form.baseSalary + form.allowances).toLocaleString()}</span>
            </div>
          )}

          {/* Payment info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">ব্যাংক অ্যাকাউন্ট</label>
              <input value={form.bankAccount} onChange={e => set('bankAccount', e.target.value)}
                placeholder="অ্যাকাউন্ট নম্বর" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">bKash নম্বর</label>
              <input value={form.bkashNumber} onChange={e => set('bkashNumber', e.target.value)}
                placeholder="01XXXXXXXXX" className="input-field" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">ঠিকানা</label>
            <input value={form.address} onChange={e => set('address', e.target.value)}
              placeholder="বাড়ির ঠিকানা" className="input-field" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">নোট</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)}
              rows={2} placeholder="অতিরিক্ত তথ্য..." className="input-field resize-none" />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button onClick={onClose} className="flex-1 btn-secondary py-3">বাতিল</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {isEdit ? 'আপডেট করো' : 'যোগ করো'}
          </button>
        </div>
      </div>
    </div>
  )
}
