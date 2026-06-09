'use client'

import { useState, useMemo } from 'react'
import { Search, Package, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/types'

interface Props {
  products: Product[]
  onAdd: (product: Product) => void
}

export function ProductSearch({ products, onAdd }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return products.slice(0, 20)
    const q = search.toLowerCase()
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode?.includes(q) ||
      p.categoryName?.toLowerCase().includes(q)
    ).slice(0, 30)
  }, [products, search])

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="পণ্যের নাম, SKU বা বারকোড..."
          className="input-field pl-9 pr-4"
          autoFocus
        />
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <Package size={32} className="mb-2 opacity-40" />
            <p className="text-sm">কোনো পণ্য পাওয়া যায়নি</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map(product => {
              const isOut = product.stock === 0
              const isLow = product.stock <= product.reorderLevel && product.stock > 0
              return (
                <button
                  key={product.id}
                  onClick={() => !isOut && onAdd(product)}
                  disabled={isOut}
                  className={cn(
                    'text-left p-3 rounded-xl border-2 transition-all duration-150',
                    isOut
                      ? 'border-gray-100 dark:border-gray-800 opacity-50 cursor-not-allowed'
                      : 'border-transparent hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 active:scale-95',
                    'bg-white dark:bg-gray-900',
                  )}
                >
                  {/* Product name */}
                  <p className="font-semibold text-sm text-gray-900 dark:text-white leading-tight mb-1 line-clamp-2">
                    {product.name}
                  </p>

                  {/* SKU */}
                  <p className="text-xs text-gray-400 mb-2">{product.sku}</p>

                  {/* Price + Stock */}
                  <div className="flex items-end justify-between gap-1">
                    <p className="font-bold text-blue-600 text-sm">৳{product.salePrice.toLocaleString()}</p>
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full font-medium',
                      isOut ? 'bg-red-100 dark:bg-red-950 text-red-600'
                      : isLow ? 'bg-orange-100 dark:bg-orange-950 text-orange-600'
                      : 'bg-green-100 dark:bg-green-950 text-green-600',
                    )}>
                      {isOut ? 'শেষ' : `${product.stock}`}
                    </span>
                  </div>

                  {/* Add icon */}
                  {!isOut && (
                    <div className="mt-2 flex justify-center">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Plus size={12} className="text-blue-600" />
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
