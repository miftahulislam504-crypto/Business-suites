import { addAuditLog } from './firestore'
import type { AuditAction } from './types'

interface LogParams {
  businessId:  string
  userId:      string
  userName:    string
  action:      AuditAction
  module:      string
  description: string
  before?:     Record<string, any>
  after?:      Record<string, any>
}

// Call this whenever something important happens
export async function log(params: LogParams): Promise<void> {
  try {
    await addAuditLog({
      ...params,
      createdAt: new Date(),
    })
  } catch {
    // Audit log failure should never break main flow
    console.warn('Audit log failed:', params)
  }
}

// Shorthand helpers
export const audit = {
  sale: (businessId: string, userId: string, userName: string, desc: string) =>
    log({ businessId, userId, userName, action: 'sale', module: 'বিক্রয়', description: desc }),

  purchase: (businessId: string, userId: string, userName: string, desc: string) =>
    log({ businessId, userId, userName, action: 'purchase', module: 'ক্রয়', description: desc }),

  product: (businessId: string, userId: string, userName: string, action: AuditAction, desc: string, before?: any, after?: any) =>
    log({ businessId, userId, userName, action, module: 'ইনভেন্টরি', description: desc, before, after }),

  customer: (businessId: string, userId: string, userName: string, action: AuditAction, desc: string) =>
    log({ businessId, userId, userName, action, module: 'কাস্টমার', description: desc }),

  supplier: (businessId: string, userId: string, userName: string, action: AuditAction, desc: string) =>
    log({ businessId, userId, userName, action, module: 'সাপ্লায়ার', description: desc }),

  employee: (businessId: string, userId: string, userName: string, action: AuditAction, desc: string) =>
    log({ businessId, userId, userName, action, module: 'কর্মচারী', description: desc }),

  payment: (businessId: string, userId: string, userName: string, desc: string) =>
    log({ businessId, userId, userName, action: 'payment', module: 'পেমেন্ট', description: desc }),

  stock: (businessId: string, userId: string, userName: string, desc: string, before?: any, after?: any) =>
    log({ businessId, userId, userName, action: 'stock_adjust', module: 'স্টক', description: desc, before, after }),

  login: (businessId: string, userId: string, userName: string) =>
    log({ businessId, userId, userName, action: 'login', module: 'অথ', description: `${userName} লগইন করেছেন` }),
}
