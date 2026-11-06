import { collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore'
import type { QueryConstraint, QueryDocumentSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { expenseDate, payrollDate, toDate } from './finance'
import type { Sale, Purchase, Expense, PayrollRecord, StockMovement } from './types'

// তারিখ ধরে সব রেকর্ড আনে (৫০০টা করে পাতা, শেষ পর্যন্ত) — আগের "শেষ ৫০০টা" সীমা আর নেই।
// নিরাপত্তার জন্য একটা collection থেকে সর্বোচ্চ MAX_DOCS রেকর্ড; ছাড়ালে truncated = true।
const PAGE     = 500
const MAX_DOCS = 10000

export interface Fetched<T> {
  items:     T[]
  truncated: boolean
}

async function fetchPaged<T>(
  col: string,
  businessId: string,
  extra: QueryConstraint[],
  maxDocs = MAX_DOCS,
): Promise<Fetched<T>> {
  const items: T[] = []
  let last: QueryDocumentSnapshot | undefined

  for (;;) {
    const snap = await getDocs(query(
      collection(db, col),
      where('businessId', '==', businessId),
      ...extra,
      orderBy('createdAt', 'desc'),
      ...(last ? [startAfter(last)] : []),
      limit(PAGE),
    ))
    snap.docs.forEach((d) => items.push({ id: d.id, ...d.data() } as T))
    if (snap.docs.length < PAGE) return { items, truncated: false }
    if (items.length >= maxDocs) return { items, truncated: true }
    last = snap.docs[snap.docs.length - 1]
  }
}

export function getSalesInRange(businessId: string, from: Date, to: Date) {
  return fetchPaged<Sale>('sales', businessId, [where('createdAt', '>=', from), where('createdAt', '<=', to)])
}

export function getPurchasesInRange(businessId: string, from: Date, to: Date) {
  return fetchPaged<Purchase>('purchases', businessId, [where('createdAt', '>=', from), where('createdAt', '<=', to)])
}

// ব্যয় ও বেতনে আসল তারিখ (date / paidAt) আলাদা ফিল্ড। নতুন index না লাগাতে createdAt >= from দিয়ে আনি
// (পিছনের তারিখে ওঠানো ব্যয়ও এতে ধরা পড়ে), তারপর আসল তারিখ ধরে ছাঁকি।
// একটাই ফাঁক: আগাম তারিখ দিয়ে ঢোকানো ব্যয়, যা এই সময়সীমার আগে এন্ট্রি হয়েছে।
export async function getExpensesInRange(businessId: string, from: Date, to: Date): Promise<Fetched<Expense>> {
  const r = await fetchPaged<Expense>('expenses', businessId, [where('createdAt', '>=', from)])
  return { items: r.items.filter((e) => { const d = expenseDate(e); return d >= from && d <= to }), truncated: r.truncated }
}

export async function getPayrollInRange(businessId: string, from: Date, to: Date): Promise<Fetched<PayrollRecord>> {
  const r = await fetchPaged<PayrollRecord>('payroll', businessId, [where('createdAt', '>=', from)])
  return { items: r.items.filter((p) => { const d = payrollDate(p); return d >= from && d <= to }), truncated: r.truncated }
}

// স্টক ক্ষতি/সংশোধনের মুভমেন্ট (lossValue আছে এমন)। সংখ্যায় কম, তাই শুধু `hasLoss` দিয়ে খুঁজে তারিখ ধরে ছাঁকি
// — এতে নতুন Firestore index লাগে না।
export async function getStockLossesInRange(businessId: string, from: Date, to: Date): Promise<Fetched<StockMovement>> {
  const items: StockMovement[] = []
  let last: QueryDocumentSnapshot | undefined
  let truncated = false

  for (;;) {
    const snap = await getDocs(query(
      collection(db, 'stockMovements'),
      where('businessId', '==', businessId),
      where('hasLoss', '==', true),
      ...(last ? [startAfter(last)] : []),
      limit(PAGE),
    ))
    snap.docs.forEach((d) => items.push({ id: d.id, ...d.data() } as StockMovement))
    if (snap.docs.length < PAGE) break
    if (items.length >= MAX_DOCS) { truncated = true; break }
    last = snap.docs[snap.docs.length - 1]
  }
  return { items: items.filter((m) => { const d = toDate(m.date); return d >= from && d <= to }), truncated }
}
