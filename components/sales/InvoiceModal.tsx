'use client'

import { useRef } from 'react'
import { X, Printer, Share2, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Sale } from '@/lib/types'

interface Props {
  sale: Sale
  onClose: () => void
  onNewSale: () => void
}

export function InvoiceModal({ sale, onClose, onNewSale }: Props) {
  const { activeBusiness } = useAppStore()
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    const content = printRef.current?.innerHTML
    if (!content) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html>
        <head>
          <title>Invoice ${sale.invoiceNo}</title>
          <style>
            body { font-family: 'Hind Siliguri', sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
            table { width: 100%; border-collapse: collapse; }
            td, th { padding: 6px 4px; font-size: 13px; }
            th { border-bottom: 1px solid #000; text-align: left; }
            .total-row { border-top: 1px solid #000; font-weight: bold; }
            .center { text-align: center; }
            .right { text-align: right; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>${content}<br/><button onclick="window.print()">Print</button></body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 500)
  }

  function handleWhatsApp() {
    const text = `*${activeBusiness?.name ?? 'Smart ERP'}*\nইনভয়েস: ${sale.invoiceNo}\nকাস্টমার: ${sale.customerName}\n${sale.items.map(i => `• ${i.productName} × ${i.quantity} = ৳${i.total}`).join('\n')}\n\n*মোট: ৳${sale.grandTotal.toLocaleString()}*\n*পরিশোধ: ৳${sale.paidAmount.toLocaleString()}*\n${sale.dueAmount > 0 ? `*বাকি: ৳${sale.dueAmount.toLocaleString()}*` : '✓ সম্পূর্ণ পরিশোধ'}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const payLabel: Record<string, string> = {
    cash:   'নগদ', bank: 'ব্যাংক',
    bkash:  'bKash', nagad: 'নগদ (Nagad)', credit: 'বাকি',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-green-500" />
            <h2 className="font-bold">বিক্রয় সম্পন্ন!</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        {/* Invoice content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div ref={printRef} className="space-y-3">
            {/* Business info */}
            <div className="text-center pb-3 border-b border-dashed border-gray-300 dark:border-gray-700">
              <h3 className="font-bold text-lg">{activeBusiness?.name}</h3>
              {activeBusiness?.address && <p className="text-xs text-gray-500">{activeBusiness.address}</p>}
              {activeBusiness?.phone  && <p className="text-xs text-gray-500">{activeBusiness.phone}</p>}
            </div>

            {/* Invoice meta */}
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <div>
                <p><span className="text-gray-400">ইনভয়েস:</span> <strong>{sale.invoiceNo}</strong></p>
                <p><span className="text-gray-400">তারিখ:</span> {new Date().toLocaleDateString('bn-BD')}</p>
              </div>
              <div className="text-right">
                <p><span className="text-gray-400">কাস্টমার:</span> <strong>{sale.customerName}</strong></p>
                {sale.customerPhone && <p>{sale.customerPhone}</p>}
              </div>
            </div>

            {/* Items */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500">
                  <th className="pb-2 text-left">পণ্য</th>
                  <th className="pb-2 text-center">পরিমাণ</th>
                  <th className="pb-2 text-right">মূল্য</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="py-1.5">
                      <p className="font-medium text-xs">{item.productName}</p>
                      <p className="text-xs text-gray-400">৳{item.salePrice} × {item.quantity}</p>
                    </td>
                    <td className="py-1.5 text-center text-xs">{item.quantity} {item.unit}</td>
                    <td className="py-1.5 text-right font-semibold text-xs">
                      ৳{item.total.toLocaleString()}
                      {item.discount > 0 && (
                        <p className="text-green-600 text-xs">-৳{item.discount}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="space-y-1.5 pt-2 border-t border-dashed border-gray-300 dark:border-gray-700 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>সাবটোটাল</span>
                <span>৳{sale.subtotal.toLocaleString()}</span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>মোট ছাড়</span>
                  <span>-৳{sale.discountAmount.toLocaleString()}</span>
                </div>
              )}
              {sale.vatAmount > 0 && (
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>VAT ({sale.vatPercent}%)</span>
                  <span>+৳{sale.vatAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-1 border-t border-gray-200 dark:border-gray-700">
                <span>গ্র্যান্ড টোটাল</span>
                <span className="text-blue-600">৳{sale.grandTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-green-600 font-medium">
                <span>পরিশোধ ({payLabel[sale.paymentMethod]})</span>
                <span>৳{sale.paidAmount.toLocaleString()}</span>
              </div>
              {sale.dueAmount > 0 && (
                <div className="flex justify-between text-red-600 font-bold">
                  <span>বাকি</span>
                  <span>৳{sale.dueAmount.toLocaleString()}</span>
                </div>
              )}
              {sale.dueAmount === 0 && (
                <p className="text-center text-green-600 font-medium text-xs pt-1">✓ সম্পূর্ণ পরিশোধ</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handlePrint}
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <Printer size={15} /> প্রিন্ট
            </button>
            <button onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium text-sm transition-colors">
              <Share2 size={15} /> WhatsApp
            </button>
          </div>
          <button onClick={onNewSale}
            className="w-full btn-primary py-3 font-semibold">
            নতুন বিক্রয় করো →
          </button>
        </div>
      </div>
    </div>
  )
}
