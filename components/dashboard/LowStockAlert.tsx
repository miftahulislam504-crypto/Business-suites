'use client'

import { AlertTriangle, Package, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useAppStore } from '@/store/useAppStore'

// Placeholder — Phase 4 (Inventory) এর পর real data আসবে
const lowStockItems = [
  { id: '1', name: 'সিমেন্ট (৫০ কেজি)',  stock: 3,  unit: 'বস্তা', reorder: 20 },
  { id: '2', name: 'রড ১২মিমি',           stock: 8,  unit: 'পিস',   reorder: 50 },
  { id: '3', name: 'টাইলস (ফ্লোর)',       stock: 12, unit: 'পিস',   reorder: 100},
  { id: '4', name: 'পেইন্ট (ব্লু)',       stock: 2,  unit: 'গ্যালন', reorder: 10 },
]

function getStockColor(stock: number, reorder: number) {
  const ratio = stock / reorder
  if (ratio <= 0.1) return 'text-red-600 bg-red-50 dark:bg-red-950'
  if (ratio <= 0.3) return 'text-orange-600 bg-orange-50 dark:bg-orange-950'
  return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950'
}

export function LowStockAlert() {
  const { language } = useAppStore()

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
        <Link
          href="/inventory"
          className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
        >
          {language === 'bn' ? 'সব দেখো' : 'View All'}
          <ArrowRight size={11} />
        </Link>
      </div>

      <div className="space-y-2">
        {lowStockItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800"
          >
            <div className="p-1.5 bg-white dark:bg-gray-700 rounded-lg">
              <Package size={14} className="text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                {item.name}
              </p>
              <p className="text-xs text-gray-400">
                রিঅর্ডার লেভেল: {item.reorder} {item.unit}
              </p>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getStockColor(item.stock, item.reorder)}`}>
              {item.stock} {item.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
