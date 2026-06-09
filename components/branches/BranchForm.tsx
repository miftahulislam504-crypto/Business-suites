'use client'

import { useState } from 'react'
import { X, Loader2, GitBranch } from 'lucide-react'
import { addBranch, updateBranch } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import toast from 'react-hot-toast'
import type { Branch } from '@/lib/types'

interface Props {
  branch?: Branch | null
  onClose: () => void
  onSaved: () => void
}

export function BranchForm({ branch, onClose, onSaved }: Props) {
  const { activeBusiness } = useAppStore()
  const isEdit = !!branch
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name:        branch?.name        ?? '',
    address:     branch?.address     ?? '',
    phone:       branch?.phone       ?? '',
    managerName: branch?.managerName ?? '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error('শাখার নাম দাও'); return }
    if (!activeBusiness)   return
    setLoading(true)
    try {
      if (isEdit && branch) {
        await updateBranch(branch.id, form)
        toast.success('শাখা আপডেট হয়েছে')
      } else {
        await addBranch({
          ...form,
          businessId: activeBusiness.id,
          isActive:   true,
          isMain:     false,
        })
        toast.success('নতুন শাখা যোগ হয়েছে')
      }
      onSaved()
    } catch { toast.error('সমস্যা হয়েছে') }
    finally  { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl">

        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-teal-600" />
            <h2 className="font-bold text-lg">{isEdit ? 'শাখা সম্পাদনা' : 'নতুন শাখা'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">শাখার নাম *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="যেমন: মিরপুর শাখা" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">ম্যানেজারের নাম</label>
            <input value={form.managerName} onChange={e => set('managerName', e.target.value)}
              placeholder="শাখা ম্যানেজার" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">ফোন</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="শাখার ফোন নম্বর" className="input-field" type="tel" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">ঠিকানা</label>
            <textarea value={form.address} onChange={e => set('address', e.target.value)}
              placeholder="শাখার ঠিকানা" rows={2} className="input-field resize-none" />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="flex-1 btn-secondary py-3">বাতিল</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {isEdit ? 'আপডেট করো' : 'শাখা তৈরি করো'}
          </button>
        </div>
      </div>
    </div>
  )
}
