'use client'

import { useState } from 'react'
import { X, Loader2, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react'
import { updateStock } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Product } from '@/lib/types'

interface Props {
  product: Product
  onClose: () => void
  onUpdated: () => void
}

type AdjType = 'in' | 'out' | 'adjustment'

const types: { value: AdjType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'in',         label: 'স্টক ইন (যোগ)',   icon: <ArrowUp size={14} />,    color: 'text-green-600 border-green-300 bg-green-50 dark:bg-green-950' },
  { value: 'out',        label: 'স্টক আউট (বাদ)',  icon: <ArrowDown size={14} />,  color: 'text-red-500 border-red-300 bg-red-50 dark:bg-red-950'         },
  { value: 'adjustment', label: 'এডজাস্টমেন্ট',    icon: <RefreshCw size={14} />,  color: 'text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950'      },
]

const reasons: Record<AdjType, string[]> = {
  in:         ['নতুন ক্রয়', 'রিটার্ন', 'বদলি', 'অন্যান্য'],
  out:        ['বিক্রয়', 'ক্ষতিগ্রস্ত', 'মেয়াদ উত্তীর্ণ', 'বদলি', 'অন্যান্য'],
  adjustment: ['গণনা সংশোধন', 'অডিট', 'অন্যান্য'],
}

export function StockAdjustModal({ product, onClose, onUpdated }: Props) {
  const { activeBusiness, user } = useAppStore()
  const [type,     setType]     = useState<AdjType>('in')
  const [qty,      setQty]      = useState(1)
  const [reason,   setReason]   = useState(reasons.in[0])
  const [loading,  setLoading]  = useState(false)

  const newStock = type === 'in'
    ? product.stock + qty
    : type === 'out'
    ? product.stock - qty
    : qty  // adjustment = set to exact value

  async function handleSubmit() {
    if (qty <= 0) { toast.error('পরিমাণ দাও'); return }
    if (type === 'out' && product.stock - qty < 0) {
      toast.error('স্টক এর চেয়ে বেশি বের করা যাবে না')
      return
    }
    if (!activeBusiness || !user) return
    setLoading(true)
    try {
      await updateStock(
        product.id, newStock,
        activeBusiness.id, product.name,
        type, qty, reason, user.uid,
      )
      toast.success('স্টক আপডেট হয়েছে')
      onUpdated()
    } catch {
      toast.error('সমস্যা হয়েছে')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl">

        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="font-bold">স্টক এডজাস্ট</h2>
            <p className="text-sm text-gray-500 truncate">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Current stock */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">বর্তমান স্টক</span>
            <span className="font-bold text-lg">{product.stock} {product.unit}</span>
          </div>

          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {types.map((t) => (
              <button
                key={t.value}
                onClick={() => { setType(t.value); setReason(reasons[t.value][0]) }}
                className={cn(
                  'flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-medium transition-all',
                  type === t.value ? t.color + ' border-current' : 'border-gray-200 dark:border-gray-700',
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {type === 'adjustment' ? 'নতুন স্টক পরিমাণ' : 'পরিমাণ'} ({product.unit})
            </label>
            <input
              type="number"
              value={qty}
              onChange={e => setQty(+e.target.value)}
              min={1}
              className="input-field text-xl font-bold text-center"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium mb-1.5">কারণ</label>
            <div className="flex flex-wrap gap-2">
              {reasons[type].map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    reason === r
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* New stock preview */}
          <div className={cn(
            'p-3 rounded-xl text-center',
            newStock < 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-blue-50 dark:bg-blue-950',
          )}>
            <p className="text-xs text-gray-500 mb-1">আপডেটের পর স্টক হবে</p>
            <p className={cn('text-2xl font-bold', newStock < 0 ? 'text-red-600' : 'text-blue-600')}>
              {newStock < 0 ? '⚠️ ' : ''}{newStock} {product.unit}
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="flex-1 btn-secondary py-3">বাতিল</button>
          <button
            onClick={handleSubmit}
            disabled={loading || newStock < 0}
            className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            আপডেট করো
          </button>
        </div>
      </div>
    </div>
  )
}
