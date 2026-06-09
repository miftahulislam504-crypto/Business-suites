'use client'

import { useState } from 'react'
import { X, Loader2, Receipt } from 'lucide-react'
import { addExpense } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { PaymentMethod } from '@/lib/types'

interface Props {
  onClose:  () => void
  onSaved:  () => void
}

const categories = [
  'বেতন ও মজুরি', 'ভাড়া', 'বিদ্যুৎ বিল', 'পানির বিল',
  'ইন্টারনেট', 'পরিবহন', 'মেরামত', 'অফিস সরঞ্জাম',
  'বিজ্ঞাপন', 'ব্যাংক চার্জ', 'বিবিধ ব্যয়',
]

const methods: { value: PaymentMethod; label: string }[] = [
  { value: 'cash',  label: 'নগদ'   },
  { value: 'bank',  label: 'ব্যাংক' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
]

export function ExpenseForm({ onClose, onSaved }: Props) {
  const { activeBusiness, user } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    category:    categories[0],
    description: '',
    amount:      0,
    date:        new Date().toISOString().split('T')[0],
    paymentMethod: 'cash' as PaymentMethod,
    reference:   '',
    customCat:   '',
    isCustomCat: false,
  })

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    const cat = form.isCustomCat ? form.customCat.trim() : form.category
    if (!cat)            { toast.error('ক্যাটাগরি বেছে নাও');  return }
    if (form.amount <= 0){ toast.error('পরিমাণ দাও');          return }
    if (!activeBusiness || !user) return

    setLoading(true)
    try {
      await addExpense({
        businessId:    activeBusiness.id,
        category:      cat,
        description:   form.description.trim(),
        amount:        form.amount,
        date:          new Date(form.date),
        paymentMethod: form.paymentMethod,
        reference:     form.reference.trim(),
        createdBy:     user.uid,
        createdAt:     new Date(),
      })
      toast.success('ব্যয় যোগ হয়েছে')
      onSaved()
    } catch {
      toast.error('সমস্যা হয়েছে')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-red-500" />
            <h2 className="font-bold text-lg">নতুন ব্যয় যোগ</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2">ক্যাটাগরি *</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {categories.map(cat => (
                <button key={cat}
                  onClick={() => set('category', cat) || set('isCustomCat', false)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    !form.isCustomCat && form.category === cat
                      ? 'bg-red-500 text-white border-red-500'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-red-300',
                  )}>
                  {cat}
                </button>
              ))}
              <button
                onClick={() => set('isCustomCat', true)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  form.isCustomCat
                    ? 'bg-red-500 text-white border-red-500'
                    : 'border-dashed border-gray-300 dark:border-gray-600 text-gray-500',
                )}>
                + অন্যান্য
              </button>
            </div>
            {form.isCustomCat && (
              <input value={form.customCat} onChange={e => set('customCat', e.target.value)}
                placeholder="ব্যয়ের ধরন লিখুন" className="input-field" />
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">বিবরণ</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="ব্যয়ের বিস্তারিত" className="input-field" />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-1.5">পরিমাণ (৳) *</label>
            <input type="number" value={form.amount}
              onChange={e => set('amount', +e.target.value)}
              placeholder="0" className="input-field text-xl font-bold" min={1} />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1.5">তারিখ</label>
            <input type="date" value={form.date}
              onChange={e => set('date', e.target.value)}
              className="input-field" />
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium mb-2">পেমেন্ট পদ্ধতি</label>
            <div className="grid grid-cols-4 gap-2">
              {methods.map(m => (
                <button key={m.value} onClick={() => set('paymentMethod', m.value)}
                  className={cn(
                    'py-2 rounded-lg text-sm font-medium transition-all border',
                    form.paymentMethod === m.value
                      ? 'bg-red-500 text-white border-red-500'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600',
                  )}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium mb-1.5">রেফারেন্স (ঐচ্ছিক)</label>
            <input value={form.reference} onChange={e => set('reference', e.target.value)}
              placeholder="রসিদ নম্বর বা অন্যান্য" className="input-field" />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button onClick={onClose} className="flex-1 btn-secondary py-3">বাতিল</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
            {loading && <Loader2 size={16} className="animate-spin" />}
            ব্যয় যোগ করো
          </button>
        </div>
      </div>
    </div>
  )
}
