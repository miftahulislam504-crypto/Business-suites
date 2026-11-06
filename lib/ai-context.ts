import { getProducts, getCustomers, getEmployees } from './firestore'
import { getSalesInRange, getPurchasesInRange, getExpensesInRange, getPayrollInRange, getStockLossesInRange } from './reports'
import { summarizeProfit, expenseCategories, toDate, expenseDate, payrollDate } from './finance'
import type { Business, PayrollRecord, StockMovement } from './types'

const money = (n: number) => `৳${n.toLocaleString()}`
const pct   = (a: number, b: number) => (b > 0 ? ((a / b) * 100).toFixed(1) : '0')

// AI-র জন্য ব্যবসার সারসংক্ষেপ। হিসাব lib/finance.ts থেকে — রিপোর্ট ও dashboard-এর সাথে সংখ্যা মেলে।
// এই মাস ও গত মাসের পুরো ডেটা তারিখ ধরে আনা হয় (আগে শুধু শেষ ১০০টা বিক্রয়)।
export async function buildBusinessContext(business: Business): Promise<string> {
  try {
    const now       = new Date()
    const monthFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevFrom  = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to        = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    const [salesR, purchasesR, expensesR, payrollR, lossR, products, customers, employees] = await Promise.all([
      getSalesInRange(business.id, prevFrom, to),
      getPurchasesInRange(business.id, prevFrom, to),
      getExpensesInRange(business.id, prevFrom, to),
      getPayrollInRange(business.id, prevFrom, to).catch(() => ({ items: [] as PayrollRecord[], truncated: false })),
      getStockLossesInRange(business.id, prevFrom, to).catch(() => ({ items: [] as StockMovement[], truncated: false })),
      getProducts(business.id),
      getCustomers(business.id),
      getEmployees(business.id),
    ])
    const truncated = salesR.truncated || purchasesR.truncated || expensesR.truncated || payrollR.truncated

    const cur  = (d: any) => toDate(d) >= monthFrom
    const sales    = salesR.items
    const monthlySales     = sales.filter((s) => cur(s.createdAt))
    const monthlyPurchases = purchasesR.items.filter((p) => cur(p.createdAt))
    const monthlyExpenses  = expensesR.items.filter((e) => cur(expenseDate(e)))
    const monthlyPayroll   = payrollR.items.filter((p) => cur(payrollDate(p)))

    const thisM = summarizeProfit({ sales: monthlySales, expenses: monthlyExpenses, payroll: monthlyPayroll, stockLoss: lossR.items.filter((m) => cur(m.date)) })
    const lastM = summarizeProfit({
      sales:    sales.filter((s) => !cur(s.createdAt)),
      expenses: expensesR.items.filter((e) => !cur(expenseDate(e))),
      payroll:  payrollR.items.filter((p) => !cur(payrollDate(p))),
      stockLoss: lossR.items.filter((m) => !cur(m.date)),
    })

    const totalDue = customers.reduce((s, c) => s + (c.totalDue ?? 0), 0)
    const lowStock = products.filter((p) => p.stock <= p.reorderLevel)
    const activeEmp = employees.filter((e) => e.status === 'active')
    const stockValue = products.reduce((s, p) => s + (p.stock ?? 0) * (p.purchasePrice ?? 0), 0)

    // এই মাসের সেরা পণ্য
    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {}
    monthlySales.forEach((s) => s.items.forEach((i) => {
      if (!productMap[i.productId]) productMap[i.productId] = { name: i.productName, qty: 0, revenue: 0 }
      productMap[i.productId].qty     += i.quantity
      productMap[i.productId].revenue += i.total
    }))
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

    const highRisk = customers.filter((c) => c.riskScore > 50 && (c.totalDue ?? 0) > 0)
    const expCats  = expenseCategories({ expenses: monthlyExpenses, payroll: monthlyPayroll })

    const ctx = `
ব্যবসার নাম: ${business.name}
ব্যবসার ধরন: ${business.category}
বর্তমান তারিখ: ${now.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
${truncated ? '(সতর্কতা: রেকর্ড অনেক বেশি হওয়ায় নিচের কিছু সংখ্যা আংশিক হতে পারে)\n' : ''}
=== এই মাসের আর্থিক সারসংক্ষেপ (সব সংখ্যা ভ্যাট বাদে, ক্রয়মূল্য বিক্রির সময়ের) ===
বিক্রয় (রাজস্ব): ${money(thisM.revenue)}  [${thisM.saleCount}টি বিক্রয়]
ভ্যাট সংগৃহীত (আয় নয়): ${money(thisM.vat)}
বিক্রীত পণ্যের ব্যয় (COGS): ${money(thisM.cogs)}
স্টক ক্ষতি/সংশোধন (নষ্ট, মেয়াদ উত্তীর্ণ, গণনা সংশোধন): ${money(thisM.stockLoss)}
মোট লাভ (Gross): ${money(thisM.grossProfit)} (${pct(thisM.grossProfit, thisM.revenue)}%)
বেতন: ${money(thisM.salary)}
অন্যান্য পরিচালন ব্যয়: ${money(thisM.otherExpenses)}
নিট মুনাফা: ${money(thisM.netProfit)} (মার্জিন ${pct(thisM.netProfit, thisM.revenue)}%)
মোট ক্রয় (স্টক কেনা, লাভ-ক্ষতিতে ধরা হয়নি): ${money(monthlyPurchases.reduce((s, p) => s + p.grandTotal, 0))}

=== গত মাসের সাথে তুলনা ===
গত মাসের বিক্রয়: ${money(lastM.revenue)} | নিট মুনাফা: ${money(lastM.netProfit)}
বিক্রয়ের পরিবর্তন: ${lastM.revenue > 0 ? (((thisM.revenue - lastM.revenue) / lastM.revenue) * 100).toFixed(1) + '%' : 'গত মাসের তথ্য নেই'}
(এই মাস এখনও চলছে — তুলনা করার সময় মাসের কত দিন গেছে সেটা মাথায় রাখো)

=== ইনভেন্টরি ===
মোট পণ্য: ${products.length}টি
মজুত পণ্যের মূল্য (ক্রয়মূল্যে): ${money(stockValue)}
লো স্টক পণ্য: ${lowStock.length}টি
${lowStock.length > 0 ? `লো স্টক তালিকা: ${lowStock.slice(0, 5).map((p) => `${p.name} (${p.stock} ${p.unit})`).join(', ')}` : ''}

=== কাস্টমার ===
মোট কাস্টমার: ${customers.length}জন
মোট পাওনা: ${money(totalDue)}
উচ্চ ঝুঁকির কাস্টমার: ${highRisk.length}জন
${highRisk.length > 0 ? `ঝুঁকিপূর্ণ কাস্টমার: ${highRisk.slice(0, 3).map((c) => `${c.name} (${money(c.totalDue)})`).join(', ')}` : ''}

=== সেরা বিক্রিত পণ্য (এই মাস) ===
${topProducts.map((p, i) => `${i + 1}. ${p.name}: ${p.qty}টি, ${money(p.revenue)}`).join('\n') || 'এই মাসে কোনো বিক্রয় নেই'}

=== ব্যয়ের বিভাজন (এই মাস) ===
${expCats.map(([k, v]) => `${k}: ${money(v)}`).join('\n') || 'কোনো ব্যয় নেই'}

=== কর্মচারী ===
সক্রিয় কর্মচারী: ${activeEmp.length}জন
মাসিক বেতন বিল (নির্ধারিত): ${money(activeEmp.reduce((s, e) => s + e.baseSalary + e.allowances, 0))}
    `.trim()

    return ctx
  } catch (e) {
    return `ব্যবসার নাম: ${business.name}\nডেটা লোড করতে সমস্যা হয়েছে।`
  }
}

// System prompt for the AI
export function buildSystemPrompt(context: string): string {
  return `তুমি একটি স্মার্ট বাংলাদেশি ব্যবসা সহকারী AI। তোমার কাজ হলো ব্যবসার মালিককে তার ব্যবসার ডেটা বিশ্লেষণ করে সহজ বাংলায় পরামর্শ দেওয়া।

নিচে ব্যবসার বর্তমান তথ্য দেওয়া আছে:

${context}

গুরুত্বপূর্ণ নির্দেশনা:
- সব উত্তর বাংলায় দাও
- সংখ্যা বাংলায় লেখার দরকার নেই, ইংরেজি সংখ্যাই চলবে
- সংক্ষিপ্ত কিন্তু তথ্যবহুল উত্তর দাও
- ব্যবহারিক পরামর্শ দাও যা ব্যবসায়ী সরাসরি কাজে লাগাতে পারবেন
- ডেটা না থাকলে সৎভাবে বলো
- প্রতিটি উত্তরে সম্ভব হলে একটি actionable পরামর্শ যোগ করো`
}
