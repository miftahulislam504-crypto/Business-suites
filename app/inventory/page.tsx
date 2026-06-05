'use client'

import { useState, useEffect, useMemo } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProductCard } from '@/components/inventory/ProductCard'
import { ProductForm } from '@/components/inventory/ProductForm'
import { StockAdjustModal } from '@/components/inventory/StockAdjustModal'
import { getProducts, deleteProduct } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import {
  Plus, Search, Filter, Package,
  AlertTriangle, TrendingDown, BarChart2,
  Loader2, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Product } from '@/lib/types'

type FilterType = 'all' | 'low' | 'out'

export default function InventoryPage() {
  const { activeBusiness, language } = useAppStore()

  const [products,       setProducts]       = useState<Product[]>([])
  const [loading,        setLoading]        = useState(true)
  const [search,         setSearch]         = useState('')
  const [filter,         setFilter]         = useState<FilterType>('all')
  const [showForm,       setShowForm]       = useState(false)
  const [editProduct,    setEditProduct]    = useState<Product | null>(null)
  const [adjustProduct,  setAdjustProduct]  = useState<Product | null>(null)
  const [confirmDelete,  setConfirmDelete]  = useState<Product | null>(null)

  async function load() {
    if (!activeBusiness) return
    setLoading(true)
    try {
      const list = await getProducts(activeBusiness.id)
      setProducts(list)
    } catch {
      toast.error('পণ্য লোড হয়নি')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [activeBusiness])

  // Stats
  const stats = useMemo(() => ({
    total:    products.length,
    lowStock: products.filter(p => p.stock <= p.reorderLevel && p.stock > 0).length,
    outStock: products.filter(p => p.stock === 0).length,
    value:    products.reduce((s, p) => s + p.stock * p.purchasePrice, 0),
  }), [products])

  // Filtered list
  const filtered = useMemo(() => {
    let list = products
    if (filter === 'low') list = list.filter(p => p.stock <= p.reorderLevel && p.stock > 0)
    if (filter === 'out') list = list.filter(p => p.stock === 0)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.categoryName?.toLowerCase().includes(q) ||
        p.brandName?.toLowerCase().includes(q)
      )
    }
    return list
  }, [products, filter, search])

  async function handleDelete(product: Product) {
    try {
      await deleteProduct(product.id)
      toast.success('পণ্য মুছে গেছে')
      setConfirmDelete(null)
      load()
    } catch {
      toast.error('সমস্যা হয়েছে')
    }
  }

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ইনভেন্টরি</h1>
          <p className="text-sm text-gray-400 mt-0.5">মোট {stats.total}টি পণ্য</p>
        </div>
        <button
          onClick={() => { setEditProduct(null); setShowForm(true) }}
          className="btn-primary flex items-center gap-2 px-4 py-2.5"
        >
          <Plus size={17} />
          <span className="hidden sm:inline">নতুন পণ্য</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'মোট পণ্য',     value: `${stats.total}টি`,                       color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950',   icon: <Package size={16} /> },
          { label: 'লো স্টক',      value: `${stats.lowStock}টি`,                    color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950', icon: <AlertTriangle size={16} /> },
          { label: 'স্টক শেষ',     value: `${stats.outStock}টি`,                    color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950',     icon: <TrendingDown size={16} /> },
          { label: 'মোট মূল্য',    value: `৳${stats.value.toLocaleString()}`,        color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950', icon: <BarChart2 size={16} /> },
        ].map((s) => (
          <div key={s.label} className="card flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', s.bg, s.color)}>{s.icon}</div>
            <div>
              <p className={cn('font-bold text-lg leading-tight', s.color)}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="পণ্যের নাম, SKU, ক্যাটাগরি দিয়ে খোঁজো..."
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'সব'       },
            { key: 'low', label: '⚠ লো'     },
            { key: 'out', label: '✗ শেষ'    },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as FilterType)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium border transition-all whitespace-nowrap',
                filter === f.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400',
              )}
            >
              {f.label}
            </button>
          ))}
          <button onClick={load} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Package size={48} className="mb-3 opacity-40" />
          <p className="font-medium">
            {search || filter !== 'all' ? 'কোনো পণ্য পাওয়া যায়নি' : 'এখনো কোনো পণ্য যোগ হয়নি'}
          </p>
          {!search && filter === 'all' && (
            <button
              onClick={() => { setEditProduct(null); setShowForm(true) }}
              className="mt-4 btn-primary px-5 py-2.5"
            >
              প্রথম পণ্য যোগ করো
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onEdit={(p) => { setEditProduct(p); setShowForm(true) }}
              onDelete={(p) => setConfirmDelete(p)}
              onStockAdjust={(p) => setAdjustProduct(p)}
            />
          ))}
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <ProductForm
          product={editProduct}
          onClose={() => { setShowForm(false); setEditProduct(null) }}
          onSaved={() => { setShowForm(false); setEditProduct(null); load() }}
        />
      )}

      {/* Stock Adjust Modal */}
      {adjustProduct && (
        <StockAdjustModal
          product={adjustProduct}
          onClose={() => setAdjustProduct(null)}
          onUpdated={() => { setAdjustProduct(null); load() }}
        />
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-lg mb-2">পণ্য মুছবে?</h3>
            <p className="text-gray-500 text-sm mb-5">
              <strong>{confirmDelete.name}</strong> মুছে ফেলা হবে। এটি পূর্বাবস্থায় ফেরানো যাবে না।
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 btn-secondary py-2.5">বাতিল</button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                মুছে ফেলো
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
