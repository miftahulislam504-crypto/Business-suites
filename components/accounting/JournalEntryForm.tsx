'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Plus, Trash2, BookOpen } from 'lucide-react'
import { addJournalEntry, getAccounts } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Account, JournalLine, TransactionType } from '@/lib/types'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export function JournalEntryForm({ onClose, onSaved }: Props) {
  const { activeBusiness, user } = useAppStore()
  const [accounts,    setAccounts]    = useState<Account[]>([])
  const [loading,     setLoading]     = useState(false)
  const [description, setDescription] = useState('')
  const [reference,   setReference]   = useState('')
  const [date,        setDate]        = useState(new Date().toISOString().split('T')[0])
  const [lines, setLines] = useState<JournalLine[]>([
    { accountId: '', accountName: '', type: 'debit',  amount: 0 },
    { accountId: '', accountName: '', type: 'credit', amount: 0 },
  ])

  useEffect(() => {
    if (activeBusiness) getAccounts(activeBusiness.id).then(setAccounts)
  }, [activeBusiness])

  function addLine() {
    setLines(prev => [...prev, { accountId: '', accountName: '', type: 'debit', amount: 0 }])
  }

  function removeLine(i: number) {
    if (lines.length <= 2) return
    setLines(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateLine(i: number, key: string, value: any) {
    setLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l
      if (key === 'accountId') {
        const acc = accounts.find(a => a.id === value)
        return { ...l, accountId: value, accountName: acc?.name ?? '' }
      }
      return { ...l, [key]: value }
    }))
  }

  const totalDebit  = lines.filter(l => l.type === 'debit').reduce((s, l) => s + l.amount, 0)
  const totalCredit = lines.filter(l => l.type === 'credit').reduce((s, l) => s + l.amount, 0)
  const isBalanced  = totalDebit === totalCredit && totalDebit > 0

  async function handleSubmit() {
    if (!description.trim()) { toast.error('বিবরণ দাও');              return }
    if (!isBalanced)          { toast.error('ডেবিট ও ক্রেডিট সমান হতে হবে'); return }
    if (lines.some(l => !l.accountId)) { toast.error('সব অ্যাকাউন্ট বেছে নাও'); return }
    if (!activeBusiness || !user) return

    setLoading(true)
    try {
      await addJournalEntry({
        businessId:  activeBusiness.id,
        date:        new Date(date),
        description: description.trim(),
        reference:   reference.trim(),
        lines,
        createdBy:   user.uid,
        createdAt:   new Date(),
      })
      toast.success('জার্নাল এন্ট্রি যোগ হয়েছে')
      onSaved()
    } catch {
      toast.error('সমস্যা হয়েছে')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">

        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-indigo-600" />
            <h2 className="font-bold text-lg">জার্নাল এন্ট্রি</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">তারিখ</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">রেফারেন্স</label>
              <input value={reference} onChange={e => setReference(e.target.value)}
                placeholder="REF-001" className="input-field" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">বিবরণ *</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="লেনদেনের বিবরণ" className="input-field" />
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">লেজার লাইন</label>
              <button onClick={addLine}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                <Plus size={12} /> লাইন যোগ
              </button>
            </div>

            {/* Header */}
            <div className="grid grid-cols-12 gap-2 mb-1 px-1">
              <span className="col-span-5 text-xs text-gray-400">অ্যাকাউন্ট</span>
              <span className="col-span-3 text-xs text-gray-400">ধরন</span>
              <span className="col-span-3 text-xs text-gray-400">পরিমাণ</span>
              <span className="col-span-1" />
            </div>

            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <select value={line.accountId}
                    onChange={e => updateLine(i, 'accountId', e.target.value)}
                    className="col-span-5 input-field text-sm py-2">
                    <option value="">বেছে নাও</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>

                  <select value={line.type}
                    onChange={e => updateLine(i, 'type', e.target.value as TransactionType)}
                    className={cn(
                      'col-span-3 input-field text-sm py-2 font-medium',
                      line.type === 'debit' ? 'text-blue-600' : 'text-green-600',
                    )}>
                    <option value="debit">ডেবিট</option>
                    <option value="credit">ক্রেডিট</option>
                  </select>

                  <input type="number" value={line.amount}
                    onChange={e => updateLine(i, 'amount', +e.target.value)}
                    placeholder="0" min={0}
                    className="col-span-3 input-field text-sm py-2" />

                  <button onClick={() => removeLine(i)} disabled={lines.length <= 2}
                    className="col-span-1 flex justify-center text-red-400 hover:text-red-600 disabled:opacity-30">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Balance checker */}
          <div className={cn(
            'p-3 rounded-xl flex items-center justify-between text-sm font-medium',
            isBalanced
              ? 'bg-green-50 dark:bg-green-950 text-green-600'
              : 'bg-red-50 dark:bg-red-950 text-red-600',
          )}>
            <div className="flex gap-4">
              <span>ডেবিট: ৳{totalDebit.toLocaleString()}</span>
              <span>ক্রেডিট: ৳{totalCredit.toLocaleString()}</span>
            </div>
            <span>{isBalanced ? '✓ সুষম' : '✗ অসুষম'}</span>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button onClick={onClose} className="flex-1 btn-secondary py-3">বাতিল</button>
          <button onClick={handleSubmit} disabled={loading || !isBalanced}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            {loading && <Loader2 size={16} className="animate-spin" />}
            এন্ট্রি যোগ করো
          </button>
        </div>
      </div>
    </div>
  )
}
