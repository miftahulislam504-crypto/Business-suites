import { getSales, getPurchases, getProducts, getCustomers, getExpenses, getEmployees } from './firestore'
import type { Business } from './types'

// Build a rich context snapshot for the AI
export async function buildBusinessContext(business: Business): Promise<string> {
  try {
    const [sales, purchases, products, customers, expenses, employees] = await Promise.all([
      getSales(business.id, 100),
      getPurchases(business.id, 50),
      getProducts(business.id),
      getCustomers(business.id),
      getExpenses(business.id, 100),
      getEmployees(business.id),
    ])

    const now       = new Date()
    const thisMonth = (d: any) => {
      const date = d instanceof Date ? d : new Date(d.seconds * 1000)
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }

    const monthlySales    = sales.filter(s => thisMonth(s.createdAt))
    const monthlyPurchases= purchases.filter(p => thisMonth(p.createdAt))
    const monthlyExpenses = expenses.filter(e => thisMonth(e.date ?? e.createdAt))

    const totalRevenue    = monthlySales.reduce((s, x) => s + x.grandTotal, 0)
    const totalCOGS       = monthlySales.reduce((s, x) =>
      s + x.items.reduce((si, i) => si + i.purchasePrice * i.quantity, 0), 0)
    const totalExpAmt     = monthlyExpenses.reduce((s, e) => s + e.amount, 0)
    const grossProfit     = totalRevenue - totalCOGS
    const netProfit       = grossProfit - totalExpAmt
    const totalDue        = customers.reduce((s, c) => s + (c.totalDue ?? 0), 0)
    const lowStock        = products.filter(p => p.stock <= p.reorderLevel)
    const activeEmp       = employees.filter(e => e.status === 'active')

    // Top products this month
    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {}
    monthlySales.forEach(s => s.items.forEach(i => {
      if (!productMap[i.productId]) productMap[i.productId] = { name: i.productName, qty: 0, revenue: 0 }
      productMap[i.productId].qty     += i.quantity
      productMap[i.productId].revenue += i.total
    }))
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue).slice(0, 5)

    // High risk customers
    const highRisk = customers.filter(c => c.riskScore > 50 && (c.totalDue ?? 0) > 0)

    // Category expense breakdown
    const expCats: Record<string, number> = {}
    monthlyExpenses.forEach(e => { expCats[e.category] = (expCats[e.category] ?? 0) + e.amount })

    const ctx = `
ব্যবসার নাম: ${business.name}
ব্যবসার ধরন: ${business.category}
বর্তমান তারিখ: ${now.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}

=== এই মাসের আর্থিক সারসংক্ষেপ ===
মোট বিক্রয়: ৳${totalRevenue.toLocaleString()}
বিক্রয় সংখ্যা: ${monthlySales.length}টি
মোট ক্রয়: ৳${monthlyPurchases.reduce((s, p) => s + p.grandTotal, 0).toLocaleString()}
মোট পরিচালন ব্যয়: ৳${totalExpAmt.toLocaleString()}
মোট লাভ (Gross): ৳${grossProfit.toLocaleString()}
নিট মুনাফা: ৳${netProfit.toLocaleString()}
মুনাফা মার্জিন: ${totalRevenue > 0 ? ((netProfit/totalRevenue)*100).toFixed(1) : 0}%

=== ইনভেন্টরি ===
মোট পণ্য: ${products.length}টি
লো স্টক পণ্য: ${lowStock.length}টি
${lowStock.length > 0 ? `লো স্টক তালিকা: ${lowStock.slice(0,5).map(p => `${p.name} (${p.stock} ${p.unit})`).join(', ')}` : ''}

=== কাস্টমার ===
মোট কাস্টমার: ${customers.length}জন
মোট পাওনা: ৳${totalDue.toLocaleString()}
উচ্চ ঝুঁকির কাস্টমার: ${highRisk.length}জন
${highRisk.length > 0 ? `ঝুঁকিপূর্ণ কাস্টমার: ${highRisk.slice(0,3).map(c => `${c.name} (৳${c.totalDue.toLocaleString()})`).join(', ')}` : ''}

=== সেরা বিক্রিত পণ্য (এই মাস) ===
${topProducts.map((p, i) => `${i+1}. ${p.name}: ${p.qty}টি, ৳${p.revenue.toLocaleString()}`).join('\n')}

=== ব্যয়ের বিভাজন ===
${Object.entries(expCats).map(([k, v]) => `${k}: ৳${v.toLocaleString()}`).join('\n') || 'কোনো ব্যয় নেই'}

=== কর্মচারী ===
সক্রিয় কর্মচারী: ${activeEmp.length}জন
মাসিক বেতন বিল: ৳${activeEmp.reduce((s, e) => s + e.baseSalary + e.allowances, 0).toLocaleString()}
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
