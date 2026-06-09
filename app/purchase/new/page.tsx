'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { PurchaseCartItem } from '@/components/purchase/PurchaseCartItem'
import {
  getProducts, getSuppliers,
  createPurchase, generatePurchaseNo,
  updateStock, updateSupplierDue,
} from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import {
  Search, Plus, Loader2, TruckIcon,
  Trash2, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Product, Supplier, PurchaseItem, PaymentMethod } from '@/lib/types'

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'cash',   label: 'নগদ'    },
  { value: 'bank',   label: 'ব্যাংক'  },
  { value: 'bkash',  label: 'bKash'  },
  { value: 'nagad',  label: 'Nagad'  },
  { value: 'credit', label: 'বাকি'   },
]

export default function NewPurchasePage() {
  const router               = useRouter()
  const { activeBusiness, user } = useAppStore()

  const [products,       setProducts]       = useState<Product[]>([])
  const [suppliers,      setSuppliers]      = useState<Supplier[]>([])
  const [cart,           setCart]           = useState<PurchaseItem[]>([])
  const [search,         setSearch]         = useState('')
  const [showSearch,     setShowSearch]     = useState(true)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [supplierSearch, setSupplierSearch] = useState('')
  const [showSuppliers,  setShowSuppliers]  = useState(false)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [paymentMethod,  setPaymentMethod]  = useState<PaymentMethod>('cash')
  const [paidAmount,     setPaidAmount]     = useState(0)
  const [note,           setNote]           = useState('')
  const [loading,        setLoading]        = useState(false)

  useEffect(() => {
    if (!activeBusiness) return
    getProducts(activeBusiness.id).then(setProducts)
    getSuppliers(activeBusiness.id).then(setSuppliers)
  }, [activeBusiness])

  // Filtered product search
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products.slice(0, 16)
    const q = search.toLowerCase()
    return products.filter(p =>
      p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [products, search])

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers.slice(0, 8)
    const q = supplierSearch.toLowerCase()
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(q) || s.phone.includes(q)
    )
  }, [suppliers, supplierSearch])

  function addToCart(product: Product) {
    setCart(prev => {
      const exists = prev.find(i => i.productId === product.id)
      if (exists) {
        return prev.map(i => i.productId === product.id
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.purchasePrice }
          : i
        )
      }
      return [...prev, {
        productId:     product.id,
        productName:   product.name,
        sku:           product.sku,
        unit:          product.unit,
        quantity:      1,
        purchasePrice: product.purchasePrice,
        total:         product.purchasePrice,
      }]
    })
    toast.success(`${product.name} যোগ হয়েছে`, { duration: 800 })
  }

  function updateQty(productId: string, qty: number) {
    setCart(prev => prev.map(i => i.productId === productId
      ? { ...i, quantity: qty, total: qty * i.purchasePrice } : i
    ))
  }

  function updatePrice(productId: string, price: number) {
    setCart(prev => prev.map(i => i.productId === productId
      ? { ...i, purchasePrice: price, total: i.quantity * price } : i
    ))
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(i => i.productId !== productId))
  }

  const subtotal   = useMemo(() => cart.reduce((s, i) => s + i.total, 0), [cart])
  const grandTotal = subtotal - discountAmount

  useEffect(() => {
    if (paymentMethod === 'cash')   setPaidAmount(grandTotal)
    if (paymentMethod === 'credit') setPaidAmount(0)
  }, [paymentMethod, grandTotal])

  const dueAmount = Math.max(0, grandTotal - paidAmount)

  async function handleSubmit() {
    if (cart.length === 0) { toast.error('পণ্য যোগ করো'); return }
    if (!activeBusiness || !user) return
    setLoading(true)
    try {
      const purchaseNo = await generatePurchaseNo(activeBusiness.id)
      const status = paidAmount >= grandTotal ? 'paid' : paidAmount > 0 ? 'partial' : 'due'

      const purchase = {
        businessId:    activeBusiness.id,
        invoiceNo:     purchaseNo,
        supplierId:    selectedSupplier?.id,
        supplierName:  selectedSupplier?.name ?? 'সরাসরি ক্রয়',
        supplierPhone: selectedSupplier?.phone ?? '',
        items:         cart,
        subtotal,
        discountAmount,
        grandTotal,
        paidAmount,
        dueAmount,
        paymentMethod,
        note:          note.trim(),
        status,
        createdBy:     user.uid,
        createdAt:     new Date(),
      }

      await createPurchase(purchase as any)

      // Update stock for each product
      for (const item of cart) {
        const product = products.find(p => p.id === item.productId)
        if (product) {
          const newStock = product.stock + item.quantity
          await updateStock(
            item.productId, newStock,
            activeBusiness.id, item.productName,
            'in', item.quantity, `ক্রয় - ${purchaseNo}`, user.uid,
          )
          // Update product purchase price
          if (item.purchasePrice !== product.purchasePrice) {
            const { updateProduct } = await import('@/lib/firestore')
            await updateProduct(item.productId, { purchasePrice: item.purchasePrice })
          }
        }
      }

      // Update supplier due
      if (selectedSupplier) {
        await updateSupplierDue(selectedSupplier.id, paidAmount, dueAmount)
      }

      toast.success(`ক্রয় সম্পন্ন! (${purchaseNo})`)
      router.push('/purchase')
    } catch (e) {
      console.error(e)
      toast.error('সমস্যা হয়েছে')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout>
      <div className="flex flex-col lg:flex-row gap-4">

        {/* LEFT — Product search */}
        <div className="lg:flex-1 card flex flex-col" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h2 className="font-bold">পণ্য বেছে নাও</h2>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
              {products.length}টি পণ্য
            </span>
          </div>

          <div className="relative mb-3 shrink-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="পণ্যের নাম বা SKU খোঁজো..."
              className="input-field pl-9" />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {filteredProducts.map(product => (
                <button key={product.id} onClick={() => addToCart(product)}
                  className="text-left p-3 rounded-xl border-2 border-transparent hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950 bg-white dark:bg-gray-900 transition-all active:scale-95">
                  <p className="font-semibold text-sm line-clamp-2 mb-1">{product.name}</p>
                  <p className="text-xs text-gray-400 mb-1">{product.sku}</p>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-purple-600 text-sm">৳{product.purchasePrice.toLocaleString()}</p>
                    <span className="text-xs text-gray-400">স্টক: {product.stock}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Cart & Checkout */}
        <div className="lg:w-96 space-y-3">

          {/* Supplier selector */}
          <div className="card">
            <h3 className="font-semibold text-sm mb-2">সাপ্লায়ার (ঐচ্ছিক)</h3>
            {selectedSupplier ? (
              <div className="flex items-center justify-between p-2.5 bg-purple-50 dark:bg-purple-950 rounded-xl">
                <div>
                  <p className="font-semibold text-sm text-purple-700 dark:text-purple-300">{selectedSupplier.name}</p>
                  <p className="text-xs text-purple-500">{selectedSupplier.phone}</p>
                </div>
                <button onClick={() => setSelectedSupplier(null)}
                  className="text-xs text-red-500 hover:text-red-700">পরিবর্তন</button>
              </div>
            ) : (
              <div>
                <button onClick={() => setShowSuppliers(!showSuppliers)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 text-sm hover:border-purple-400 hover:text-purple-600 transition-colors">
                  <span>সাপ্লায়ার বেছে নাও</span>
                  <ChevronDown size={14} className={cn('transition-transform', showSuppliers && 'rotate-180')} />
                </button>
                {showSuppliers && (
                  <div className="mt-2 space-y-1.5">
                    <input value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)}
                      placeholder="খোঁজো..." className="input-field text-sm py-2" />
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {filteredSuppliers.map(s => (
                        <button key={s.id}
                          onClick={() => { setSelectedSupplier(s); setShowSuppliers(false) }}
                          className="w-full text-left p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors">
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.phone}</p>
                        </button>
                      ))}
                      {filteredSuppliers.length === 0 && (
                        <p className="text-center text-xs text-gray-400 py-2">কোনো সাপ্লায়ার নেই</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TruckIcon size={16} className="text-purple-600" />
                <h2 className="font-bold">ক্রয় তালিকা</h2>
                {cart.length > 0 && (
                  <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded-full">{cart.length}</span>
                )}
              </div>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-red-500 flex items-center gap-1">
                  <Trash2 size={11} /> সব মুছো
                </button>
              )}
            </div>

            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-gray-400">
                  <TruckIcon size={28} className="mb-2 opacity-30" />
                  <p className="text-sm">পণ্য যোগ করো</p>
                </div>
              ) : cart.map(item => (
                <PurchaseCartItem key={item.productId} item={item}
                  onQtyChange={updateQty}
                  onPriceChange={updatePrice}
                  onRemove={removeFromCart} />
              ))}
            </div>

            {/* Totals */}
            {cart.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>সাবটোটাল</span>
                    <span>৳{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm whitespace-nowrap">ছাড় ৳</span>
                    <input type="number" value={discountAmount}
                      onChange={e => setDiscountAmount(Math.max(0, +e.target.value))}
                      className="input-field py-1 text-sm flex-1" min={0} />
                  </div>
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-200 dark:border-gray-700">
                    <span>মোট</span>
                    <span className="text-purple-600">৳{grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Payment */}
                <div className="grid grid-cols-5 gap-1">
                  {paymentMethods.map(m => (
                    <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                      className={cn(
                        'py-1.5 rounded-lg text-xs font-medium transition-all',
                        paymentMethod === m.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                      )}>
                      {m.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 whitespace-nowrap">পরিশোধ ৳</label>
                  <input type="number" value={paidAmount}
                    onChange={e => setPaidAmount(+e.target.value)}
                    className="input-field flex-1 text-sm py-2 font-bold" />
                </div>

                {dueAmount > 0 && (
                  <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 text-sm font-bold">
                    <span>বকেয়া</span>
                    <span>৳{dueAmount.toLocaleString()}</span>
                  </div>
                )}

                <input value={note} onChange={e => setNote(e.target.value)}
                  placeholder="নোট (ঐচ্ছিক)" className="input-field text-sm py-2" />

                <button onClick={handleSubmit} disabled={loading || cart.length === 0}
                  className="w-full py-3.5 text-base font-bold flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50">
                  {loading
                    ? <><Loader2 size={18} className="animate-spin" /> সংরক্ষণ হচ্ছে...</>
                    : `ক্রয় সম্পন্ন করো — ৳${grandTotal.toLocaleString()}`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
