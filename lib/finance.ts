import type { Sale, Expense, PayrollRecord, StockMovement } from './types'

// রিপোর্ট, dashboard ও AI — সব জায়গার লাভ-ক্ষতির হিসাব এই একটা ফাইল থেকে আসে, যাতে সংখ্যা সব পাতায় মেলে।
// এখানে Firebase নেই — শুধু হিসাব।

export const SALARY_CATEGORY = 'বেতন ও মজুরি'

const round2 = (n: number) => Math.round(n * 100) / 100

// Firestore Timestamp, Date, string — যেটাই হোক Date বানায়
export function toDate(x: any): Date {
  if (x instanceof Date) return x
  if (x && typeof x.toDate === 'function') return x.toDate()
  if (x && typeof x.seconds === 'number') return new Date(x.seconds * 1000)
  return new Date(x)
}

// ভ্যাট বাদে বিক্রয় — ভ্যাট ব্যবসার আয় নয়, সরকারের দেনা
export function saleNet(s: Pick<Sale, 'grandTotal' | 'vatAmount'>): number {
  return (s.grandTotal ?? 0) - (s.vatAmount ?? 0)
}

// বিক্রীত পণ্যের ক্রয়মূল্য (বিক্রির সময়ের)
export function saleCost(s: Pick<Sale, 'items'>): number {
  return (s.items ?? []).reduce((n, i) => n + (i.purchasePrice ?? 0) * (i.quantity ?? 0), 0)
}

export const expenseDate = (e: Pick<Expense, 'date' | 'createdAt'>): Date => toDate(e.date ?? e.createdAt)
export const payrollDate = (p: Pick<PayrollRecord, 'paidAt' | 'createdAt'>): Date => toDate(p.paidAt ?? p.createdAt)

interface Input {
  sales:      Sale[]
  expenses:   Expense[]
  payroll:    PayrollRecord[]
  stockLoss?: StockMovement[]   // ক্ষতি/সংশোধনের স্টক মুভমেন্ট (lossValue সহ)
}

export interface ProfitSummary {
  saleCount:    number
  billed:       number   // ভ্যাটসহ মোট ইনভয়েস
  vat:          number
  revenue:      number   // ভ্যাট বাদে
  cogs:         number
  stockLoss:    number   // স্টক ক্ষতি/সংশোধন (ক্ষতি ধনাত্মক)
  grossProfit:  number
  salary:       number
  otherExpenses:number
  opex:         number   // salary + otherExpenses
  netProfit:    number
  // বেতন কোথা থেকে নেওয়া হয়েছে: পে-রোল রেকর্ড থাকলে সেখান থেকে, না থাকলে 'বেতন ও মজুরি' ব্যয় থেকে
  salarySource: 'payroll' | 'expense' | 'none'
  // পে-রোল থেকে বেতন নেওয়ায় যে 'বেতন ও মজুরি' ব্যয় বাদ গেছে (দুইবার গোনা এড়াতে)
  ignoredSalaryExpenses: number
}

function usesPayroll(payroll: PayrollRecord[]): boolean {
  return payroll.reduce((n, p) => n + (p.netSalary ?? 0), 0) > 0
}

export function summarizeProfit({ sales, expenses, payroll, stockLoss = [] }: Input): ProfitSummary {
  const billed  = sales.reduce((n, s) => n + (s.grandTotal ?? 0), 0)
  const vat     = sales.reduce((n, s) => n + (s.vatAmount ?? 0), 0)
  const cogs    = sales.reduce((n, s) => n + saleCost(s), 0)
  const revenue = billed - vat
  const loss    = stockLoss.reduce((n, m) => n + (m.lossValue ?? 0), 0)

  const payrollTotal   = payroll.reduce((n, p) => n + (p.netSalary ?? 0), 0)
  const salaryExpenses = expenses.filter((e) => e.category === SALARY_CATEGORY).reduce((n, e) => n + e.amount, 0)
  const otherExpenses  = expenses.filter((e) => e.category !== SALARY_CATEGORY).reduce((n, e) => n + e.amount, 0)

  const fromPayroll = payrollTotal > 0
  const salary      = fromPayroll ? payrollTotal : salaryExpenses
  const opex        = otherExpenses + salary
  const grossProfit = revenue - cogs - loss

  return {
    saleCount:     sales.length,
    billed:        round2(billed),
    vat:           round2(vat),
    revenue:       round2(revenue),
    cogs:          round2(cogs),
    stockLoss:     round2(loss),
    grossProfit:   round2(grossProfit),
    salary:        round2(salary),
    otherExpenses: round2(otherExpenses),
    opex:          round2(opex),
    netProfit:     round2(grossProfit - opex),
    salarySource:  fromPayroll ? 'payroll' : salaryExpenses > 0 ? 'expense' : 'none',
    ignoredSalaryExpenses: fromPayroll ? round2(salaryExpenses) : 0,
  }
}

// মাস অনুযায়ী (পুরনো থেকে নতুন) — চার্টের জন্য
export function monthlyProfit({ sales, expenses, payroll, stockLoss = [] }: Input) {
  const fromPayroll = usesPayroll(payroll)
  const map = new Map<string, { y: number; m: number; revenue: number; cogs: number; opex: number }>()
  const bucket = (d: Date) => {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, { y: d.getFullYear(), m: d.getMonth() + 1, revenue: 0, cogs: 0, opex: 0 })
    return map.get(key)!
  }

  sales.forEach((s) => { const b = bucket(toDate(s.createdAt)); b.revenue += saleNet(s); b.cogs += saleCost(s) })
  stockLoss.forEach((m) => { bucket(toDate(m.date)).cogs += m.lossValue ?? 0 })
  expenses.forEach((e) => {
    if (fromPayroll && e.category === SALARY_CATEGORY) return
    bucket(expenseDate(e)).opex += e.amount
  })
  if (fromPayroll) payroll.forEach((p) => { bucket(payrollDate(p)).opex += p.netSalary ?? 0 })

  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, v]) => ({
      month:       `${v.m}/${String(v.y).slice(-2)}`,
      revenue:     round2(v.revenue),
      grossProfit: round2(v.revenue - v.cogs),
      netProfit:   round2(v.revenue - v.cogs - v.opex),
    }))
}

// ব্যয়ের বিভাজন (বড় থেকে ছোট); পে-রোল থাকলে বেতন আলাদা এক লাইনে
export function expenseCategories({ expenses, payroll }: Pick<Input, 'expenses' | 'payroll'>): [string, number][] {
  const fromPayroll = usesPayroll(payroll)
  const map: Record<string, number> = {}
  expenses.forEach((e) => {
    if (fromPayroll && e.category === SALARY_CATEGORY) return
    map[e.category] = (map[e.category] ?? 0) + e.amount
  })
  if (fromPayroll) map[SALARY_CATEGORY] = (map[SALARY_CATEGORY] ?? 0) + payroll.reduce((n, p) => n + (p.netSalary ?? 0), 0)
  return Object.entries(map).map(([k, v]): [string, number] => [k, round2(v)]).sort((a, b) => b[1] - a[1])
}

// CashFlow ইত্যাদিতে: এই ব্যয় গোনা হবে কিনা (পে-রোল থাকলে 'বেতন ও মজুরি' ব্যয় বাদ)
export function countsAsExpense(e: Pick<Expense, 'category'>, payrollInUse: boolean): boolean {
  return !(payrollInUse && e.category === SALARY_CATEGORY)
}
export { usesPayroll }
