'use client'

import { useState } from 'react'
import { X, Loader2, Wallet, MessageCircle } from 'lucide-react'
import { collectDuePayment } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Customer, PaymentMethod } from '@/lib/types'

interface Props {
  customer: Customer
  onClose:  () => void
  onSaved:  () => void
}

const methods: { value: PaymentMethod; label: string; color: string }[] = [
  { value: 'cash',  label: 'নগদ',   color: 'bg-green-500'  },
  { value: 'bank',  label: 'ব্যাংক', color: 'bg-blue-500'   },
  { value: 'bkash', label: 'bKash', color: 'bg-pink-500'   },
  { value: 'nagad', label: 'Nagad', color: 'bg-orange-500' },
]

export function CollectDueModal({ customer, onClose, onSaved }: Props) {
  const { activeBusiness, user } = useAppStore()
  const [amount,  setAmount]  = useState(customer.totalDue)
  const [method,  setMethod]  = useState<PaymentMethod>('cash')
  const [note,    setNote]    = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (amount <= 0)              { toast.error('পরিমাণ দাও');               return }
    if (amount > customer.totalDue) { toast.error('বাকির চেয়ে বেশি নয়');   return }
    if (!activeBusiness || !user) return
    setLoading(true)
    try {
      await collectDuePayment({
        businessId:   activeBusiness.id,
        customerId:   customer.id,
        customerName: customer.name,
        amount,
        note:         note.trim(),
        method,
        createdBy:    user.uid,
        createdAt:    new Date(),
      })
      toast.success(`৳${amount.toLocaleString()} কালেকশন হয়েছে`)
      onSaved()
    } catch {
      toast.error('সমস্যা হয়েছে')
    } finally {
      setLoading(false)
    }
  }

  function handleWhatsAppReminder() {
    const msg = `আসালামু আলাইকুম ${customer.name} ভাই,\n\nআপনার কাছে আমাদের *৳${customer.totalDue.toLocaleString()}* পাওনা আছে। অনুগ্রহ করে যত দ্রুত সম্ভব পরিশোধ করুন।\n\nধন্যবাদ।`
    const url = `https://wa.me/88${customer.phone}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  const remaining = customer.totalDue - amount

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl">

        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="font-bold">পাওনা কালেকশন</h2>
            <p className="text-sm text-gray-500">{customer.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Total due */}
          <div className="p-3 bg-red-50 dark:bg-red-950 rounded-xl flex items-center justify-between">
            <span className="text-sm text-red-600 font-medium">মোট বাকি</span>
            <span className="font-bold text-lg text-red-600">৳{customer.totalDue.toLocaleString()}</span>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-1.5">কালেকশন পরিমাণ (৳)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(Math.min(customer.totalDue, Math.max(0, +e.target.value)))}
              className="input-field text-2xl font-bold text-center"
              max={customer.totalDue}
              min={1}
            />
            {/* Quick amounts */}
            <div className="flex gap-2 mt-2">
              {[customer.totalDue, Math.round(customer.totalDue / 2), Math.round(customer.totalDue / 4)].map((amt, i) => (
                <button key={i} onClick={() => setAmount(amt)}
                  className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 transition-colors">
                  {i === 0 ? 'সম্পূর্ণ' : i === 1 ? 'অর্ধেক' : 'এক চতুর্থাংশ'}
                </button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium mb-2">পেমেন্ট পদ্ধতি</label>
            <div className="grid grid-cols-4 gap-2">
              {methods.map(m => (
                <button key={m.value} onClick={() => setMethod(m.value)}
                  className={cn(
                    'py-2 rounded-lg text-xs font-medium transition-all',
                    method === m.value ? `${m.color} text-white` : 'bg-gray-100 dark:bg-gray-800 text-gray-600',
                  )}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Remaining after */}
          {amount > 0 && (
            <div className={cn(
              'flex justify-between items-center px-3 py-2 rounded-lg text-sm font-bold',
              remaining > 0
                ? 'bg-orange-50 dark:bg-orange-950 text-orange-600'
                : 'bg-green-50 dark:bg-green-950 text-green-600',
            )}>
              <span>কালেকশনের পর বাকি থাকবে</span>
              <span>৳{remaining.toLocaleString()}</span>
            </div>
          )}

          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="নোট (ঐচ্ছিক)" className="input-field text-sm py-2" />

          {/* WhatsApp reminder */}
          <button onClick={handleWhatsAppReminder}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-50 dark:bg-green-950 text-green-600 text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900 transition-colors">
            <MessageCircle size={15} />
            WhatsApp রিমাইন্ডার পাঠাও
          </button>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="flex-1 btn-secondary py-3">বাতিল</button>
          <button onClick={handleSubmit} disabled={loading || amount <= 0}
            className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            <Wallet size={15} />
            কালেকশন করো
          </button>
        </div>
      </div>
    </div>
  )
}
