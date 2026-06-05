'use client'

import { Edit2, Trash2, AlertTriangle, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/types'

interface Props {
  product: Product
  onEdit: (p: Product) => void
  onDelete: (p: Product) => void
  onStockAdjust: (p: Product) => void
}

export function ProductCard({ product, onEdit, onDelete, onStockAdjust }: Props) {
  const isLow      = product.stock <= product.reorderLevel
  const isOutStock = product.stock === 0
  const profit     = product.salePrice - product.purchasePrice
  const margin     = product.purchasePrice > 0
    ? ((profit / product.purchasePrice) * 100).toFixed(0)
    : '0'

  return (
    <div className={cn(
      'card border-2 transition-all duration-200',
      isOutStock ? 'border-red-200 dark:border-red-900'
      : isLow    ? 'border-orange-200 dark:border-orange-900'
      : 'border-transparent',
    )}>
      {/* Top */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
            <Package size={18} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{product.name}</p>
            <p className="text-xs text-gray-400">{product.sku}</p>
          </div>
        </div>
        {/* Stock badge */}
        <span className={cn(
          'text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-2',
          isOutStock ? 'bg-red-100 dark:bg-red-950 text-red-600'
          : isLow    ? 'bg-orange-100 dark:bg-orange-950 text-orange-600'
          : 'bg-green-100 dark:bg-green-950 text-green-600',
        )}>
          {isOutStock ? 'শেষ' : `${product.stock} ${product.unit}`}
        </span>
      </div>

      {/* Category + Brand */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {product.categoryName && (
          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
            {product.categoryName}
          </span>
        )}
        {product.brandName && (
          <span className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-full">
            {product.brandName}
          </span>
        )}
      </div>

      {/* Prices */}
      <div className="grid grid-cols-3 gap-2 mb-3 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-0.5">ক্রয়</p>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">৳{product.purchasePrice.toLocaleString()}</p>
        </div>
        <div className="text-center border-x border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400 mb-0.5">বিক্রয়</p>
          <p className="text-sm font-bold text-blue-600">৳{product.salePrice.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-0.5">লাভ</p>
          <p className={cn('text-sm font-semibold', profit >= 0 ? 'text-green-600' : 'text-red-500')}>
            {margin}%
          </p>
        </div>
      </div>

      {/* Low stock warning */}
      {isLow && !isOutStock && (
        <div className="flex items-center gap-1.5 text-xs text-orange-600 mb-3 bg-orange-50 dark:bg-orange-950 p-2 rounded-lg">
          <AlertTriangle size={12} />
          লো স্টক — রিঅর্ডার করুন ({product.reorderLevel} {product.unit})
        </div>
      )}
      {isOutStock && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 mb-3 bg-red-50 dark:bg-red-950 p-2 rounded-lg">
          <AlertTriangle size={12} />
          স্টক শেষ হয়ে গেছে!
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onStockAdjust(product)}
          className="flex-1 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-950 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
        >
          স্টক এডজাস্ট
        </button>
        <button
          onClick={() => onEdit(product)}
          className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => onDelete(product)}
          className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 text-red-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
