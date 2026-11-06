'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { DateRangePicker, type DateRange } from '@/components/reports/DateRangePicker'
import { SalesReport } from '@/components/reports/SalesReport'
import { PurchaseReport } from '@/components/reports/PurchaseReport'
import { InventoryReport } from '@/components/reports/InventoryReport'
import { ProfitLossReport } from '@/components/reports/ProfitLossReport'
import { getProducts } from '@/lib/firestore'
import { getSalesInRange, getPurchasesInRange, getExpensesInRange, getPayrollInRange, getStockLossesInRange } from '@/lib/reports'
import { useAppStore } from '@/store/useAppStore'
import {
  BarChart2, ShoppingCart, TruckIcon,
  Package, Scale, Loader2, RefreshCw,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Sale, Purchase, Product, Expense, PayrollRecord, StockMovement } from '@/lib/types'

type Tab = 'sales' | 'purchase' | 'inventory' | 'profit'

export default function ReportsPage() {
  const { activeBusiness } = useAppStore()

  const [tab,       setTab]       = useState<Tab>('sales')
  const [sales,     setSales]     = useState<Sale[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [products,  setProducts]  = useState<Product[]>([])
  const [expenses,  setExpenses]  = useState<Expense[]>([])
  const [payroll,   setPayroll]   = useState<PayrollRecord[]>([])
  const [stockLoss, setStockLoss] = useState<StockMovement[]>([])
  const [truncated, setTruncated] = useState(false)
  const [loading,   setLoading]   = useState(true)

  const [dateRange, setDateRange] = useState<DateRange>({
    label: 'এই মাস',
    from:  new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to:    new Date(),
  })

  async function load() {
    if (!activeBusiness) return
    setLoading(true)
    try {
      // নির্বাচিত তারিখের সব রেকর্ড (আগের মতো শেষ ৫০০টা না)
      const { from, to } = dateRange
      const [s, p, pr, e, pay, loss] = await Promise.all([
        getSalesInRange(activeBusiness.id, from, to),
        getPurchasesInRange(activeBusiness.id, from, to),
        getProducts(activeBusiness.id),
        getExpensesInRange(activeBusiness.id, from, to),
        getPayrollInRange(activeBusiness.id, from, to).catch(() => ({ items: [] as PayrollRecord[], truncated: false })),
        getStockLossesInRange(activeBusiness.id, from, to).catch(() => ({ items: [] as StockMovement[], truncated: false })),
      ])
      setSales(s.items)
      setPurchases(p.items)
      setProducts(pr)
      setExpenses(e.items)
      setPayroll(pay.items)
      setStockLoss(loss.items)
      setTruncated(s.truncated || p.truncated || e.truncated || pay.truncated)
    } catch { toast.error('রিপোর্ট লোড হয়নি') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [activeBusiness, dateRange])

  // ডেটা এখন সরাসরি নির্বাচিত তারিখের জন্য আনা হয় — আলাদা ছাঁকনি লাগে না
  const filteredSales     = sales
  const filteredPurchases = purchases
  const filteredExpenses  = expenses

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'sales',     label: 'বিক্রয়',    icon: <ShoppingCart size={15} />, color: 'text-blue-600'   },
    { key: 'purchase',  label: 'ক্রয়',       icon: <TruckIcon size={15} />,    color: 'text-purple-600' },
    { key: 'inventory', label: 'ইনভেন্টরি', icon: <Package size={15} />,      color: 'text-orange-600' },
    { key: 'profit',    label: 'লাভ-ক্ষতি',  icon: <Scale size={15} />,        color: 'text-green-600'  },
  ]

  // Export to CSV
  function exportCSV() {
    let csv = ''
    if (tab === 'sales') {
      csv = 'ইনভয়েস,কাস্টমার,পরিমাণ,পরিশোধ,বাকি,স্ট্যাটাস\n'
      filteredSales.forEach(s => {
        csv += `${s.invoiceNo},${s.customerName},${s.grandTotal},${s.paidAmount},${s.dueAmount},${s.status}\n`
      })
    } else if (tab === 'purchase') {
      csv = 'ইনভয়েস,সাপ্লায়ার,পরিমাণ,পরিশোধ,বকেয়া,স্ট্যাটাস\n'
      filteredPurchases.forEach(p => {
        csv += `${p.invoiceNo},${p.supplierName},${p.grandTotal},${p.paidAmount},${p.dueAmount},${p.status}\n`
      })
    } else if (tab === 'inventory') {
      csv = 'পণ্য,SKU,স্টক,ক্রয়মূল্য,বিক্রয়মূল্য,মোট মূল্য\n'
      products.forEach(p => {
        csv += `${p.name},${p.sku},${p.stock},${p.purchasePrice},${p.salePrice},${p.stock * p.purchasePrice}\n`
      })
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `report-${tab}-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV ডাউনলোড শুরু হয়েছে')
  }

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart2 size={22} className="text-blue-600" />
            রিপোর্ট
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">ব্যবসার বিশ্লেষণ ও পরিসংখ্যান</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          {tab !== 'profit' && (
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Download size={14} /> CSV
            </button>
          )}
          <button onClick={load}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw size={15} className={cn(loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-5 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center',
              tab === t.key
                ? 'bg-white dark:bg-gray-900 shadow-sm ' + t.color
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
            )}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Date range label */}
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-full font-medium text-xs">
          {dateRange.label}
        </span>
        {tab === 'sales' && <span>{filteredSales.length}টি বিক্রয়</span>}
        {tab === 'purchase' && <span>{filteredPurchases.length}টি ক্রয়</span>}
        {tab === 'inventory' && <span>{products.length}টি পণ্য</span>}
        {tab === 'profit' && <span>{filteredSales.length}টি বিক্রয়, {filteredExpenses.length}টি ব্যয়</span>}
      </div>

      {truncated && (
        <div className="mb-4 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-xs">
          এই সময়ে রেকর্ড অনেক বেশি, তাই সব দেখানো যায়নি — সংখ্যা অসম্পূর্ণ। তারিখের সীমা ছোট করে দেখুন।
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <Loader2 size={36} className="animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">রিপোর্ট লোড হচ্ছে...</p>
          </div>
        </div>
      ) : (
        <>
          {tab === 'sales'     && <SalesReport     sales={filteredSales} />}
          {tab === 'purchase'  && <PurchaseReport  purchases={filteredPurchases} />}
          {tab === 'inventory' && <InventoryReport products={products} />}
          {tab === 'profit'    && <ProfitLossReport sales={filteredSales} expenses={filteredExpenses} payroll={payroll} stockLoss={stockLoss} />}
        </>
      )}
    </MainLayout>
  )
}
