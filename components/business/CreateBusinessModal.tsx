'use client'

import { useState } from 'react'
import { X, Loader2, Building2 } from 'lucide-react'
import { createBusiness } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { BusinessCategory } from '@/lib/types'

interface Props {
  onClose: () => void
  onCreated: () => void
}

const categories: { value: BusinessCategory; bn: string; emoji: string }[] = [
  { value: 'retail',       bn: 'খুচরা ব্যবসা',  emoji: '🛒' },
  { value: 'wholesale',    bn: 'পাইকারি ব্যবসা', emoji: '📦' },
  { value: 'restaurant',   bn: 'রেস্তোরাঁ',      emoji: '🍽️' },
  { value: 'pharmacy',     bn: 'ফার্মেসি',       emoji: '💊' },
  { value: 'construction', bn: 'নির্মাণ',        emoji: '🏗️' },
  { value: 'fishfarm',     bn: 'মৎস্য খামার',    emoji: '🐟' },
  { value: 'other',        bn: 'অন্যান্য',       emoji: '🏢' },
]

export function CreateBusinessModal({ onClose, onCreated }: Props) {
  const { user } = useAppStore()
  const [name, setName]         = useState('')
  const [category, setCategory] = useState<BusinessCategory>('retail')
  const [phone, setPhone]       = useState('')
  const [address, setAddress]   = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error('ব্যবসার নাম দাও')
      return
    }
    if (!user) return
    setLoading(true)
    try {
      await createBusiness(
        { name: name.trim(), category, phone, address, ownerId: user.uid },
        user.uid,
        user.displayName ?? user.email ?? 'Owner',
      )
      toast.success('ব্যবসা তৈরি হয়েছে!')
      onCreated()
    } catch {
      toast.error('সমস্যা হয়েছে, আবার চেষ্টা করো')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-blue-600" />
            <h2 className="font-bold text-lg">নতুন ব্যবসা যোগ করো</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              ব্যবসার নাম <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: রহিম স্টোর"
              className="input-field"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2">
              ব্যবসার ধরন <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    'flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all',
                    category === cat.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-200',
                  )}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.bn}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1.5">ফোন নম্বর</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="input-field"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium mb-1.5">ঠিকানা</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="দোকানের ঠিকানা"
              className="input-field"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="flex-1 btn-secondary py-2.5">
            বাতিল
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            তৈরি করো
          </button>
        </div>
      </div>
    </div>
  )
}
