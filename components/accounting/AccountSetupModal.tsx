'use client'

import { useState } from 'react'
import { Loader2, BookOpen, CheckCircle2 } from 'lucide-react'
import { initDefaultAccounts } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import toast from 'react-hot-toast'

interface Props {
  onDone: () => void
}

const defaultAccounts = [
  { name: 'নগদ (Cash)',         type: 'সম্পদ (Asset)'    },
  { name: 'ব্যাংক (Bank)',       type: 'সম্পদ (Asset)'    },
  { name: 'বিক্রয় আয়',         type: 'আয় (Income)'      },
  { name: 'ক্রয় ব্যয়',          type: 'ব্যয় (Expense)'   },
  { name: 'পাওনা (Receivable)',  type: 'সম্পদ (Asset)'    },
  { name: 'বকেয়া (Payable)',    type: 'দায় (Liability)'  },
  { name: 'মূলধন (Capital)',     type: 'মালিকানা (Equity)' },
  { name: 'সাধারণ ব্যয়',        type: 'ব্যয় (Expense)'   },
]

export function AccountSetupModal({ onDone }: Props) {
  const { activeBusiness } = useAppStore()
  const [loading, setLoading] = useState(false)

  async function handleSetup() {
    if (!activeBusiness) return
    setLoading(true)
    try {
      await initDefaultAccounts(activeBusiness.id)
      toast.success('অ্যাকাউন্ট সেটআপ সম্পন্ন')
      onDone()
    } catch {
      toast.error('সমস্যা হয়েছে')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6">

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-950 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <BookOpen size={28} className="text-indigo-600" />
          </div>
          <h2 className="font-bold text-xl">অ্যাকাউন্টিং সেটআপ</h2>
          <p className="text-gray-500 text-sm mt-1">নিচের ডিফল্ট অ্যাকাউন্টগুলো তৈরি হবে</p>
        </div>

        <div className="space-y-2 mb-6">
          {defaultAccounts.map((acc, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-indigo-500" />
                <span className="text-sm font-medium">{acc.name}</span>
              </div>
              <span className="text-xs text-gray-400 bg-white dark:bg-gray-700 px-2 py-0.5 rounded-full">
                {acc.type}
              </span>
            </div>
          ))}
        </div>

        <button onClick={handleSetup} disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
          {loading ? <><Loader2 size={16} className="animate-spin" /> সেটআপ হচ্ছে...</> : 'অ্যাকাউন্ট তৈরি করো'}
        </button>
      </div>
    </div>
  )
}
