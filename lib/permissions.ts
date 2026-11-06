import type { Business, UserRole } from './types'

// কোন ভূমিকা কোন মডিউল দেখতে পারবে (Sidebar আর পাতা-গার্ড এটা ব্যবহার করে)
// সত্যিকারের সুরক্ষা Firestore rules-এ — এটা শুধু অপ্রয়োজনীয় মেনু লুকায়
const ALL: UserRole[]        = ['owner', 'manager', 'accountant', 'salesman']
const FINANCE: UserRole[]    = ['owner', 'manager', 'accountant']
const MANAGEMENT: UserRole[] = ['owner', 'manager']

const ACCESS: Record<string, UserRole[]> = {
  dashboard:  ALL,
  inventory:  ALL,
  sales:      ALL,
  customers:  ALL,
  settings:   ALL,
  purchase:   FINANCE,
  suppliers:  FINANCE,
  accounting: FINANCE,
  reports:    FINANCE,
  employees:  FINANCE,
  ai:         FINANCE,
  branches:   MANAGEMENT,
  audit:      MANAGEMENT,
}

// এই ব্যবহারকারী এই ব্যবসায় কী ভূমিকায় আছে (না পেলে null)
export function getRole(business: Business | null, uid?: string | null): UserRole | null {
  if (!business || !uid) return null
  if (business.ownerId === uid) return 'owner'
  return business.members?.find((m) => m.uid === uid)?.role ?? null
}

// কোন ভূমিকা কোন কাজের বোতাম দেখবে (Firestore rules-এর সাথে মেলানো; সত্যিকারের সুরক্ষা rules-এ)
const ACTIONS = {
  'product.manage':  MANAGEMENT,   // পণ্য যোগ/সম্পাদনা/মোছা, স্টক সমন্বয়
  'customer.manage': MANAGEMENT,   // কাস্টমার সম্পাদনা/মোছা (যোগ করা সবাই পারে)
  'supplier.delete': MANAGEMENT,
  'employee.delete': MANAGEMENT,
} as const

export type Action = keyof typeof ACTIONS

export function can(role: UserRole | null, action: Action): boolean {
  return (ACTIONS[action] as readonly UserRole[]).includes(role ?? 'salesman')
}

// ভূমিকা না পেলে সবচেয়ে কম অনুমতি (salesman) ধরা হয়
export function canAccess(role: UserRole | null, module: string): boolean {
  const allowed = ACCESS[module]
  if (!allowed) return true               // অজানা পাতা — আটকাই না
  return allowed.includes(role ?? 'salesman')
}

// '/sales/new' -> 'sales'
export function moduleFromPath(pathname: string): string {
  return pathname.split('/')[1] ?? ''
}
