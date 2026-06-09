'use client'

import { Minus, Plus, Trash2 } from 'lucide-react'
import type { PurchaseItem } from '@/lib/types'

interface Props {
  item:          PurchaseItem
  onQtyChange:   (productId: string, qty: number) => void
  onPriceChange: (productId: string, price: number) => void
  onRemove:      (productId: string) => void
}

export function PurchaseCartItem({ item, onQtyChange, onPriceChange, onRemove }: Props) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.productName}</p>
          <p className="text-xs text-gray-400">{item.sku}</p>
        </div>
        <button onClick={() => onRemove(item.productId)}
          className="p-1 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 shrink-0">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Qty */}
        <div className="flex items-center gap-1 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <button onClick={() => onQtyChange(item.productId, Math.max(1, item.quantity - 1))}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-l-lg">
            <Minus size={12} />
          </button>
          <input type="number" value={item.quantity}
            onChange={e => onQtyChange(item.productId, Math.max(1, +e.target.value))}
            className="w-10 text-center text-sm font-bold bg-transparent outline-none" min={1} />
          <button onClick={() => onQtyChange(item.productId, item.quantity + 1)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-r-lg">
            <Plus size={12} />
          </button>
        </div>

        {/* Purchase price editable */}
        <div className="flex items-center gap-1 flex-1">
          <span className="text-xs text-gray-400 whitespace-nowrap">মূল্য ৳</span>
          <input type="number" value={item.purchasePrice}
            onChange={e => onPriceChange(item.productId, Math.max(0, +e.target.value))}
            className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
            min={0} />
        </div>

        {/* Total */}
        <div className="text-right shrink-0">
          <p className="font-bold text-sm text-purple-600">৳{item.total.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}
