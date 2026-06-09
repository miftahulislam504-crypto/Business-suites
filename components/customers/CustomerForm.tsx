'use client'

import { useState } from 'react'
import { X, Loader2, User } from 'lucide-react'
import { addCustomer, updateCustomer } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import toast from 'react-hot-toast'
import type { Customer } from '@/lib/types'

interface Props {
  customer?: Customer | null
  onClose:   () => void
  onSaved:   () => void
}

export function CustomerForm({ customer, onClose, onSaved }: Props) {
  const { activeBusiness } = useAppStore()
  const isEdit = !!customer
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name:    customer?.name    ?? '',
    phone:   customer?.phone   ?? '',
    email:   customer?.email   ?? '',
    address: customer?.address ?? '',
    nid:     customer?.nid     ?? '',
    note:    customer?.note    ?? '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    if (!form.name.trim())  { toast.error('কাস্টমারের নাম দাও'); return }
    if (!form.phone.trim()) { toast.error('ফোন নম্বর দাও');       return }
    if (!activeBusiness)    return
    setLoading(true)
    try {
      if (isEdit && customer) {
        await updateCustomer(customer.id, form)
        toast.success('কাস্টমার আপডেট হয়েছে')
      } else {
        await addCustomer({
          ...form,
          businessId:    activeBusiness.id,
          totalDue:      0,
          totalPaid:     0,
          totalPurchase: 0,
          riskScore:     0,
          isActive:      true,
        })
        toast.success('কাস্টমার যোগ হয়েছে')
      }
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
            <User size={18} className="text-blue-600" />
            <h2 className="font-bold text-lg">{isEdit ? 'কাস্টমার সম্পাদনা' : 'নতুন কাস্টমার'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">নাম *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="কাস্টমারের নাম" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">ফোন *</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="01XXXXXXXXX" className="input-field" type="tel" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">ইমেইল</label>
            <input value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="email@example.com" className="input-field" type="email" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">NID নম্বর</label>
            <input value={form.nid} onChange={e => set('nid', e.target.value)}
              placeholder="জাতীয় পরিচয়পত্র নম্বর" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">ঠিকানা</label>
            <input value={form.address} onChange={e => set('address', e.target.value)}
              placeholder="কাস্টমারের ঠিকানা" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">নোট</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)}
              placeholder="অতিরিক্ত তথ্য..." rows={2} className="input-field resize-none" />
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
