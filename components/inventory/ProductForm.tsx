'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Upload, Package } from 'lucide-react'
import { addProduct, updateProduct, getCategories, getBrands, addCategory, addBrand } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Product, Category, Brand, ProductUnit } from '@/lib/types'

interface Props {
  product?: Product | null
  onClose: () => void
  onSaved: () => void
}

const units: { value: ProductUnit; label: string }[] = [
  { value: 'pcs',    label: 'পিস (Pcs)'      },
  { value: 'kg',     label: 'কেজি (KG)'       },
  { value: 'liter',  label: 'লিটার (Liter)'   },
  { value: 'meter',  label: 'মিটার (Meter)'   },
  { value: 'box',    label: 'বাক্স (Box)'      },
  { value: 'dozen',  label: 'ডজন (Dozen)'     },
  { value: 'bag',    label: 'বস্তা (Bag)'      },
  { value: 'ton',    label: 'টন (Ton)'         },
  { value: 'sqft',   label: 'স্কয়ার ফুট (Sqft)' },
]

export function ProductForm({ product, onClose, onSaved }: Props) {
  const { activeBusiness, user } = useAppStore()
  const isEdit = !!product

  const [loading,     setLoading]     = useState(false)
  const [categories,  setCategories]  = useState<Category[]>([])
  const [brands,      setBrands]      = useState<Brand[]>([])
  const [newCatName,  setNewCatName]  = useState('')
  const [newBrandName,setNewBrandName]= useState('')
  const [showNewCat,  setShowNewCat]  = useState(false)
  const [showNewBrand,setShowNewBrand]= useState(false)

  // Form fields
  const [form, setForm] = useState({
    name:           product?.name          ?? '',
    sku:            product?.sku           ?? '',
    barcode:        product?.barcode       ?? '',
    categoryId:     product?.categoryId    ?? '',
    categoryName:   product?.categoryName  ?? '',
    brandId:        product?.brandId       ?? '',
    brandName:      product?.brandName     ?? '',
    unit:           product?.unit          ?? 'pcs' as ProductUnit,
    purchasePrice:  product?.purchasePrice ?? 0,
    salePrice:      product?.salePrice     ?? 0,
    wholesalePrice: product?.wholesalePrice ?? 0,
    stock:          product?.stock         ?? 0,
    reorderLevel:   product?.reorderLevel  ?? 5,
    description:    product?.description   ?? '',
  })

  useEffect(() => {
    if (!activeBusiness) return
    getCategories(activeBusiness.id).then(setCategories)
    getBrands(activeBusiness.id).then(setBrands)
  }, [activeBusiness])

  function set(key: string, value: any) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // Auto-generate SKU
  function generateSku() {
    const prefix = form.name.slice(0, 3).toUpperCase().replace(/\s/g, '')
    const rand   = Math.floor(1000 + Math.random() * 9000)
    set('sku', `${prefix}-${rand}`)
  }

  async function handleAddCategory() {
    if (!newCatName.trim() || !activeBusiness) return
    const id   = await addCategory(activeBusiness.id, newCatName.trim())
    const cats = await getCategories(activeBusiness.id)
    setCategories(cats)
    set('categoryId',   id)
    set('categoryName', newCatName.trim())
    setNewCatName('')
    setShowNewCat(false)
  }

  async function handleAddBrand() {
    if (!newBrandName.trim() || !activeBusiness) return
    const id     = await addBrand(activeBusiness.id, newBrandName.trim())
    const brands = await getBrands(activeBusiness.id)
    setBrands(brands)
    set('brandId',   id)
    set('brandName', newBrandName.trim())
    setNewBrandName('')
    setShowNewBrand(false)
  }

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error('পণ্যের নাম দাও'); return }
    if (!form.sku.trim())  { toast.error('SKU দাও'); return }
    if (form.salePrice <= 0) { toast.error('বিক্রয় মূল্য দাও'); return }
    if (!activeBusiness)   return

    setLoading(true)
    try {
      const data = {
        ...form,
        businessId: activeBusiness.id,
        isActive:   true,
      }
      if (isEdit && product) {
        await updateProduct(product.id, data)
        toast.success('পণ্য আপডেট হয়েছে')
      } else {
        await addProduct(data as any)
        toast.success('পণ্য যোগ হয়েছে')
      }
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

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-blue-600" />
            <h2 className="font-bold text-lg">{isEdit ? 'পণ্য সম্পাদনা' : 'নতুন পণ্য যোগ'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">পণ্যের নাম *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="যেমন: সিমেন্ট (৫০ কেজি)" className="input-field" />
          </div>

          {/* SKU */}
          <div>
            <label className="block text-sm font-medium mb-1.5">SKU *</label>
            <div className="flex gap-2">
              <input value={form.sku} onChange={e => set('sku', e.target.value)}
                placeholder="CEM-1001" className="input-field flex-1" />
              <button onClick={generateSku}
                className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 whitespace-nowrap">
                অটো
              </button>
            </div>
          </div>

          {/* Barcode */}
          <div>
            <label className="block text-sm font-medium mb-1.5">বারকোড</label>
            <input value={form.barcode} onChange={e => set('barcode', e.target.value)}
              placeholder="বারকোড নম্বর" className="input-field" />
          </div>

          {/* Category + Brand row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">ক্যাটাগরি</label>
              {showNewCat ? (
                <div className="flex gap-1">
                  <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                    placeholder="নতুন ক্যাটাগরি" className="input-field flex-1 text-sm py-2" />
                  <button onClick={handleAddCategory} className="px-2 py-2 bg-blue-600 text-white rounded-lg text-xs">যোগ</button>
                  <button onClick={() => setShowNewCat(false)} className="px-2 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs">✕</button>
                </div>
              ) : (
                <select value={form.categoryId}
                  onChange={e => {
                    const cat = categories.find(c => c.id === e.target.value)
                    set('categoryId',   e.target.value)
                    set('categoryName', cat?.name ?? '')
                  }}
                  className="input-field text-sm">
                  <option value="">বেছে নাও</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="__new__" onClick={() => setShowNewCat(true)}>+ নতুন যোগ</option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">ব্র্যান্ড</label>
              {showNewBrand ? (
                <div className="flex gap-1">
                  <input value={newBrandName} onChange={e => setNewBrandName(e.target.value)}
                    placeholder="নতুন ব্র্যান্ড" className="input-field flex-1 text-sm py-2" />
                  <button onClick={handleAddBrand} className="px-2 py-2 bg-blue-600 text-white rounded-lg text-xs">যোগ</button>
                  <button onClick={() => setShowNewBrand(false)} className="px-2 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs">✕</button>
                </div>
              ) : (
                <select value={form.brandId}
                  onChange={e => {
                    const brand = brands.find(b => b.id === e.target.value)
                    set('brandId',   e.target.value)
                    set('brandName', brand?.name ?? '')
                  }}
                  className="input-field text-sm">
                  <option value="">বেছে নাও</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium mb-1.5">একক (Unit)</label>
            <select value={form.unit} onChange={e => set('unit', e.target.value)} className="input-field">
              {units.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">ক্রয়মূল্য (৳)</label>
              <input type="number" value={form.purchasePrice}
                onChange={e => set('purchasePrice', +e.target.value)}
                placeholder="0" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-blue-600">বিক্রয়মূল্য (৳) *</label>
              <input type="number" value={form.salePrice}
                onChange={e => set('salePrice', +e.target.value)}
                placeholder="0" className="input-field border-blue-300 dark:border-blue-700" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">পাইকারি (৳)</label>
              <input type="number" value={form.wholesalePrice}
                onChange={e => set('wholesalePrice', +e.target.value)}
                placeholder="0" className="input-field" />
            </div>
          </div>

          {/* Stock + Reorder */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">বর্তমান স্টক</label>
              <input type="number" value={form.stock}
                onChange={e => set('stock', +e.target.value)}
                placeholder="0" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">রিঅর্ডার লেভেল</label>
              <input type="number" value={form.reorderLevel}
                onChange={e => set('reorderLevel', +e.target.value)}
                placeholder="5" className="input-field" />
            </div>
          </div>

          {/* Profit indicator */}
          {form.purchasePrice > 0 && form.salePrice > 0 && (
            <div className={cn(
              'p-3 rounded-lg text-sm font-medium',
              form.salePrice > form.purchasePrice
                ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-950 text-red-600',
            )}>
              {form.salePrice > form.purchasePrice ? '✓' : '✗'} লাভ:{' '}
              ৳{(form.salePrice - form.purchasePrice).toLocaleString()} |{' '}
              মার্জিন: {(((form.salePrice - form.purchasePrice) / form.purchasePrice) * 100).toFixed(1)}%
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">বিবরণ (ঐচ্ছিক)</label>
            <textarea value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="পণ্যের বিবরণ..." rows={2} className="input-field resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button onClick={onClose} className="flex-1 btn-secondary py-3">বাতিল</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {isEdit ? 'আপডেট করো' : 'যোগ করো'}
          </button>
        </div>
      </div>
    </div>
  )
}
