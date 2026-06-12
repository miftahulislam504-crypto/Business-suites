'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Package, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAppStore } from '@/store/useAppStore'
import { getLowStockProducts } from '@/lib/firestore'

function getStockColor(stock: number, reorder: number) {
  const ratio = stock / reorder
  if (ratio <= 0.1) return 'text-red-600 bg-red-50 dark:bg-red-950'
  if (ratio <= 0.3) return 'text-orange-600 bg-orange-50 dark:bg-orange-950'
  return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950'
}

export function LowStockAlert() {
  const { language, activeBusiness } = useAppStore()
  const [items, setItems]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBusiness) { setLoading(false); return }
    getLowStockProducts(activeBusiness.id)
      .then(data => setItems(data.slice(0, 5)))
      .finally(() => setLoading(false))
  }, [activeBusiness])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-red-50 dark:bg-red-950 rounded-lg">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <h2 className="font-bold text-gray-800 dark:text-gray-100">
            {language === 'bn' ? 'লো স্টক সতর্কতা' : 'Low Stock Alert'}
          </h2>
        </div>
        <Link href="/inventory" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
          {language === 'bn' ? 'সব দেখো' : 'View All'} <ArrowRight size={11} />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={18} className="animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          {language === 'bn' ? 'সব স্টক ঠিক আছে ✓' : 'All stock levels OK ✓'}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="p-1.5 bg-white dark:bg-gray-700 rounded-lg">
                <Package size={14} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.name}</p>
                <p className="text-xs text-gray-400">
                  {language === 'bn' ? 'রিঅর্ডার লেভেল' : 'Reorder'}: {item.reorderLevel} {item.unit}
                </p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getStockColor(item.stock, item.reorderLevel)}`}>
                {item.stock} {item.unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
