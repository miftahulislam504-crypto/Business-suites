'use client'

import { useState, useEffect, useMemo } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProductSearch } from '@/components/sales/ProductSearch'
import { CartItem } from '@/components/sales/CartItem'
import { InvoiceModal } from '@/components/sales/InvoiceModal'
import { getProducts, createSale, generateInvoiceNo, updateStock } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import {
  ShoppingCart, User, ChevronDown, ChevronUp,
  Trash2, Loader2, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Product, SaleItem, Sale, PaymentMethod } from '@/lib/types'

const paymentMethods: { value: PaymentMethod; label: string; color: string }[] = [
  { value: 'cash',   label: 'নগদ',          color: 'bg-green-500'  },
  { value: 'bank',   label: 'ব্যাংক',        color: 'bg-blue-500'   },
  { value: 'bkash',  label: 'bKash',        color: 'bg-pink-500'   },
  { value: 'nagad',  label: 'নগদ (Nagad)',   color: 'bg-orange-500' },
  { value: 'credit', label: 'বাকি (Credit)', color: 'bg-red-500'    },
]

export default function NewSalePage() {
  const { activeBusiness, user } = useAppStore()

  const [products,       setProducts]       = useState<Product[]>([])
  const [cart,           setCart]           = useState<SaleItem[]>([])
  const [customerName,   setCustomerName]   = useState('নগদ বিক্রয়')
  const [customerPhone,  setCustomerPhone]  = useState('')
  const [vatPercent,     setVatPercent]     = useState(0)
  const [paymentMethod,  setPaymentMethod]  = useState<PaymentMethod>('cash')
  const [paidAmount,     setPaidAmount]     = useState(0)
  const [note,           setNote]           = useState('')
  const [loading,        setLoading]        = useState(false)
  const [showProducts,   setShowProducts]   = useState(true)
  const [completedSale,  setCompletedSale]  = useState<Sale | null>(null)

  useEffect(() => {
    if (activeBusiness) {
      getProducts(activeBusiness.id).then(setProducts)
    }
  }, [activeBusiness])

  // Add product to cart
  function addToCart(product: Product) {
    setCart(prev => {
      const exists = prev.find(i => i.productId === product.id)
      if (exists) {
        return prev.map(i => i.productId === product.id
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.salePrice - i.discount }
          : i
        )
      }
      const newItem: SaleItem = {
        productId:     product.id,
        productName:   product.name,
        sku:           product.sku,
        unit:          product.unit,
        quantity:      1,
        purchasePrice: product.purchasePrice,
        salePrice:     product.salePrice,
        discount:      0,
        total:         product.salePrice,
      }
      return [...prev, newItem]
    })
    toast.success(`${product.name} যোগ হয়েছে`, { duration: 1000 })
  }

  // Update quantity
  function updateQty(productId: string, qty: number) {
    setCart(prev => prev.map(i => i.productId === productId
      ? { ...i, quantity: qty, total: qty * i.salePrice - i.discount }
      : i
    ))
  }

  // Update discount
  function updateDiscount(productId: string, discount: number) {
    setCart(prev => prev.map(i => i.productId === productId
      ? { ...i, discount, total: i.quantity * i.salePrice - discount }
      : i
    ))
  }

  // Remove from cart
  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(i => i.productId !== productId))
  }

  // Calculations
  const subtotal       = useMemo(() => cart.reduce((s, i) => s + i.quantity * i.salePrice, 0), [cart])
  const discountAmount = useMemo(() => cart.reduce((s, i) => s + i.discount, 0), [cart])
  const afterDiscount  = subtotal - discountAmount
  const vatAmount      = useMemo(() => Math.round(afterDiscount * vatPercent / 100), [afterDiscount, vatPercent])
  const grandTotal     = afterDiscount + vatAmount
  const dueAmount      = Math.max(0, grandTotal - paidAmount)
  const changeAmount   = Math.max(0, paidAmount - grandTotal)

  // Auto-fill paid on cash
  useEffect(() => {
    if (paymentMethod === 'cash') setPaidAmount(grandTotal)
    if (paymentMethod === 'credit') setPaidAmount(0)
  }, [paymentMethod, grandTotal])

  // Submit sale
  async function handleSubmit() {
    if (cart.length === 0)    { toast.error('কার্টে পণ্য যোগ করো');         return }
    if (!customerName.trim()) { toast.error('কাস্টমারের নাম দাও');          return }
    if (paidAmount < 0)       { toast.error('পরিশোধের পরিমাণ সঠিক নয়');   return }
    if (!activeBusiness || !user) return

    setLoading(true)
    try {
      const invoiceNo = await generateInvoiceNo(activeBusiness.id)
      const status =
        paidAmount >= grandTotal ? 'paid'
        : paidAmount > 0        ? 'partial'
        :                         'due'

      const sale: Omit<Sale, 'id'> = {
        businessId:    activeBusiness.id,
        invoiceNo,
        customerName:  customerName.trim(),
        customerPhone: customerPhone.trim(),
        items:         cart,
        subtotal,
        discountAmount,
        vatAmount,
        vatPercent,
        grandTotal,
        paidAmount,
        dueAmount,
        paymentMethod,
        note:          note.trim(),
        status,
        createdBy:     user.uid,
        createdAt:     new Date(),
      }

      const saleId = await createSale(sale)

      // Update stock for each item
      for (const item of cart) {
        const product = products.find(p => p.id === item.productId)
        if (product) {
          const newStock = product.stock - item.quantity
          await updateStock(
            item.productId, Math.max(0, newStock),
            activeBusiness.id, item.productName,
            'out', item.quantity, `বিক্রয় - ${invoiceNo}`, user.uid,
          )
        }
      }

      // Refresh products for updated stock
      const updated = await getProducts(activeBusiness.id)
      setProducts(updated)

      setCompletedSale({ ...sale, id: saleId })
      toast.success('বিক্রয় সম্পন্ন হয়েছে!')
    } catch (e) {
      toast.error('সমস্যা হয়েছে, আবার চেষ্টা করো')
    } finally {
      setLoading(false)
    }
  }

  // New sale reset
  function resetSale() {
    setCart([])
    setCustomerName('নগদ বিক্রয়')
    setCustomerPhone('')
    setVatPercent(0)
    setPaymentMethod('cash')
    setPaidAmount(0)
    setNote('')
    setCompletedSale(null)
  }

  return (
    <MainLayout>
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-5rem)]">

        {/* LEFT — Product search */}
        <div className={cn(
          'lg:flex-1 flex flex-col card',
          showProducts ? 'flex' : 'hidden lg:flex',
        )}>
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h2 className="font-bold text-gray-800 dark:text-gray-100">পণ্য বেছে নাও</h2>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
              {products.length}টি পণ্য
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <ProductSearch products={products} onAdd={addToCart} />
          </div>
        </div>

        {/* RIGHT — Cart & Checkout */}
        <div className="lg:w-96 flex flex-col gap-3">

          {/* Mobile toggle */}
          <button
            onClick={() => setShowProducts(!showProducts)}
            className="lg:hidden flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 text-sm font-medium"
          >
            {showProducts
              ? <><ChevronDown size={16} /> কার্ট দেখো ({cart.length})</>
              : <><ChevronUp size={16} /> পণ্য বেছে নাও</>}
          </button>

          {/* Cart */}
          <div className="card flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-blue-600" />
                <h2 className="font-bold">কার্ট</h2>
                {cart.length > 0 && (
                  <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">{cart.length}</span>
                )}
              </div>
              {cart.length > 0 && (
                <button onClick={() => setCart([])}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                  <Trash2 size={12} /> সব মুছো
                </button>
              )}
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-24 text-gray-400">
                  <ShoppingCart size={28} className="mb-2 opacity-30" />
                  <p className="text-sm">কার্ট খালি আছে</p>
                </div>
              ) : (
                cart.map(item => (
                  <CartItem
                    key={item.productId}
                    item={item}
                    onQtyChange={updateQty}
                    onDiscountChange={updateDiscount}
                    onRemove={removeFromCart}
                  />
                ))
              )}
            </div>

            {/* Customer */}
            <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                    placeholder="কাস্টমারের নাম" className="input-field pl-8 text-sm py-2" />
                </div>
                <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="ফোন" className="input-field w-32 text-sm py-2" />
              </div>

              {/* VAT */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 whitespace-nowrap">VAT %</label>
                <input type="number" value={vatPercent}
                  onChange={e => setVatPercent(+e.target.value)}
                  min={0} max={100} className="input-field w-20 text-sm py-1.5 text-center" />
              </div>

              {/* Summary */}
              {cart.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-500"><span>সাবটোটাল</span><span>৳{subtotal.toLocaleString()}</span></div>
                  {discountAmount > 0 && <div className="flex justify-between text-green-600"><span>ছাড়</span><span>-৳{discountAmount.toLocaleString()}</span></div>}
                  {vatAmount > 0 && <div className="flex justify-between text-gray-500"><span>VAT</span><span>+৳{vatAmount.toLocaleString()}</span></div>}
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-200 dark:border-gray-700">
                    <span>মোট</span>
                    <span className="text-blue-600">৳{grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Payment method */}
              <div className="grid grid-cols-5 gap-1">
                {paymentMethods.map(m => (
                  <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                    className={cn(
                      'py-1.5 rounded-lg text-xs font-medium transition-all',
                      paymentMethod === m.value
                        ? `${m.color} text-white`
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Paid amount */}
              <div className="flex gap-2 items-center">
                <label className="text-xs text-gray-500 whitespace-nowrap">পরিশোধ ৳</label>
                <input type="number" value={paidAmount}
                  onChange={e => setPaidAmount(+e.target.value)}
                  className="input-field flex-1 text-sm py-2 font-bold" />
              </div>

              {/* Due / Change */}
              {cart.length > 0 && (
                <div className={cn(
                  'flex justify-between items-center px-3 py-2 rounded-lg text-sm font-bold',
                  dueAmount > 0
                    ? 'bg-red-50 dark:bg-red-950 text-red-600'
                    : 'bg-green-50 dark:bg-green-950 text-green-600',
                )}>
                  {dueAmount > 0 ? (
                    <><AlertCircle size={14} /><span>বাকি: ৳{dueAmount.toLocaleString()}</span></>
                  ) : (
                    <><span>ফেরত:</span><span>৳{changeAmount.toLocaleString()}</span></>
                  )}
                </div>
              )}

              {/* Note */}
              <input value={note} onChange={e => setNote(e.target.value)}
                placeholder="নোট (ঐচ্ছিক)" className="input-field text-sm py-2" />

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading || cart.length === 0}
                className="w-full btn-primary py-3.5 text-base font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading
                  ? <><Loader2 size={18} className="animate-spin" /> প্রক্রিয়া হচ্ছে...</>
                  : `বিক্রয় সম্পন্ন করো — ৳${grandTotal.toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {completedSale && (
        <InvoiceModal
          sale={completedSale}
          onClose={resetSale}
          onNewSale={resetSale}
        />
      )}
    </MainLayout>
  )
}
