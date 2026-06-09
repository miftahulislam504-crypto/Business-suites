import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, serverTimestamp,
  orderBy, limit,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Business, BusinessMember, UserRole, Category, Brand, Product, Sale, Supplier, Purchase, Customer, DuePayment, Account, JournalEntry, Expense, AccountType, TransactionType, Employee, PayrollRecord, Attendance, Branch, AuditLog, AuditAction } from './types'

// ===== BUSINESS =====

// Create new business
export async function createBusiness(
  data: Omit<Business, 'id' | 'createdAt' | 'members'>,
  ownerUid: string,
  ownerName: string,
): Promise<string> {
  const member: BusinessMember = {
    uid:      ownerUid,
    name:     ownerName,
    role:     'owner',
    joinedAt: new Date(),
  }
  const ref = await addDoc(collection(db, 'businesses'), {
    ...data,
    members:   [member],
    ownerId:   ownerUid,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

// Get all businesses for a user
export async function getUserBusinesses(uid: string): Promise<Business[]> {
  const q = query(
    collection(db, 'businesses'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Business))
}

// Get single business
export async function getBusiness(id: string): Promise<Business | null> {
  const snap = await getDoc(doc(db, 'businesses', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Business
}

// Update business
export async function updateBusiness(
  id: string,
  data: Partial<Omit<Business, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'businesses', id), data)
}

// Add staff member
export async function addStaffMember(
  businessId: string,
  member: BusinessMember,
): Promise<void> {
  const bizRef = doc(db, 'businesses', businessId)
  const snap   = await getDoc(bizRef)
  if (!snap.exists()) return
  const members: BusinessMember[] = snap.data().members ?? []
  members.push(member)
  await updateDoc(bizRef, { members })
}

// Remove staff member
export async function removeStaffMember(
  businessId: string,
  uid: string,
): Promise<void> {
  const bizRef = doc(db, 'businesses', businessId)
  const snap   = await getDoc(bizRef)
  if (!snap.exists()) return
  const members: BusinessMember[] = snap.data().members ?? []
  await updateDoc(bizRef, { members: members.filter((m) => m.uid !== uid) })
}

// Update staff role
export async function updateStaffRole(
  businessId: string,
  uid: string,
  role: UserRole,
): Promise<void> {
  const bizRef = doc(db, 'businesses', businessId)
  const snap   = await getDoc(bizRef)
  if (!snap.exists()) return
  const members: BusinessMember[] = snap.data().members ?? []
  const updated = members.map((m) => (m.uid === uid ? { ...m, role } : m))
  await updateDoc(bizRef, { members: updated })
}

// ===== CATEGORIES =====

export async function getCategories(businessId: string): Promise<Category[]> {
  const q = query(
    collection(db, 'categories'),
    where('businessId', '==', businessId),
    orderBy('name', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category))
}

export async function addCategory(businessId: string, name: string): Promise<string> {
  const ref = await addDoc(collection(db, 'categories'), {
    businessId, name, createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, 'categories', id))
}

// ===== BRANDS =====

export async function getBrands(businessId: string): Promise<Brand[]> {
  const q = query(
    collection(db, 'brands'),
    where('businessId', '==', businessId),
    orderBy('name', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Brand))
}

export async function addBrand(businessId: string, name: string): Promise<string> {
  const ref = await addDoc(collection(db, 'brands'), {
    businessId, name, createdAt: serverTimestamp(),
  })
  return ref.id
}

// ===== PRODUCTS =====

export async function getProducts(businessId: string): Promise<Product[]> {
  const q = query(
    collection(db, 'products'),
    where('businessId', '==', businessId),
    where('isActive', '==', true),
    orderBy('name', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, 'products', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Product
}

export async function addProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'products'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  await updateDoc(doc(db, 'products', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteProduct(id: string): Promise<void> {
  await updateDoc(doc(db, 'products', id), { isActive: false, updatedAt: serverTimestamp() })
}

export async function updateStock(
  productId: string,
  newStock: number,
  businessId: string,
  productName: string,
  type: 'in' | 'out' | 'adjustment',
  quantity: number,
  reason: string,
  userId: string,
): Promise<void> {
  await updateDoc(doc(db, 'products', productId), {
    stock: newStock, updatedAt: serverTimestamp(),
  })
  await addDoc(collection(db, 'stockMovements'), {
    businessId, productId, productName,
    type, quantity, reason,
    date: serverTimestamp(),
    createdBy: userId,
  })
}

export async function getLowStockProducts(businessId: string): Promise<Product[]> {
  const q = query(
    collection(db, 'products'),
    where('businessId', '==', businessId),
    where('isActive', '==', true),
  )
  const snap = await getDocs(q)
  const all  = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))
  return all.filter((p) => p.stock <= p.reorderLevel)
}

// ===== SALES =====

export async function createSale(data: Omit<Sale, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'sales'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getSales(businessId: string, limitCount = 50): Promise<Sale[]> {
  const q = query(
    collection(db, 'sales'),
    where('businessId', '==', businessId),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale))
}

export async function getSale(id: string): Promise<Sale | null> {
  const snap = await getDoc(doc(db, 'sales', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Sale
}

export async function getTodaySales(businessId: string): Promise<Sale[]> {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end   = new Date(); end.setHours(23, 59, 59, 999)
  const q = query(
    collection(db, 'sales'),
    where('businessId', '==', businessId),
    where('createdAt', '>=', start),
    where('createdAt', '<=', end),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale))
}

export async function generateInvoiceNo(businessId: string): Promise<string> {
  const today = new Date()
  const yy    = today.getFullYear().toString().slice(-2)
  const mm    = String(today.getMonth() + 1).padStart(2, '0')
  const dd    = String(today.getDate()).padStart(2, '0')
  const rand  = Math.floor(100 + Math.random() * 900)
  return `INV-${yy}${mm}${dd}-${rand}`
}

// ===== SUPPLIERS =====

export async function getSuppliers(businessId: string): Promise<Supplier[]> {
  const q = query(
    collection(db, 'suppliers'),
    where('businessId', '==', businessId),
    where('isActive', '==', true),
    orderBy('name', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Supplier))
}

export async function addSupplier(data: Omit<Supplier, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'suppliers'), {
    ...data, createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateSupplier(id: string, data: Partial<Supplier>): Promise<void> {
  await updateDoc(doc(db, 'suppliers', id), data)
}

export async function deleteSupplier(id: string): Promise<void> {
  await updateDoc(doc(db, 'suppliers', id), { isActive: false })
}

export async function updateSupplierDue(
  supplierId: string,
  paidAmount: number,
  dueAmount: number,
): Promise<void> {
  const ref  = doc(db, 'suppliers', supplierId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data = snap.data()
  await updateDoc(ref, {
    totalPaid: (data.totalPaid ?? 0) + paidAmount,
    totalDue:  (data.totalDue  ?? 0) + dueAmount,
  })
}

// ===== PURCHASES =====

export async function createPurchase(data: Omit<Purchase, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'purchases'), {
    ...data, createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getPurchases(businessId: string, limitCount = 50): Promise<Purchase[]> {
  const q = query(
    collection(db, 'purchases'),
    where('businessId', '==', businessId),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Purchase))
}

export async function getSupplierPurchases(
  businessId: string,
  supplierId: string,
): Promise<Purchase[]> {
  const q = query(
    collection(db, 'purchases'),
    where('businessId', '==', businessId),
    where('supplierId', '==', supplierId),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Purchase))
}

export async function generatePurchaseNo(businessId: string): Promise<string> {
  const today = new Date()
  const yy    = today.getFullYear().toString().slice(-2)
  const mm    = String(today.getMonth() + 1).padStart(2, '0')
  const dd    = String(today.getDate()).padStart(2, '0')
  const rand  = Math.floor(100 + Math.random() * 900)
  return `PUR-${yy}${mm}${dd}-${rand}`
}

// ===== CUSTOMERS =====

export async function getCustomers(businessId: string): Promise<Customer[]> {
  const q = query(
    collection(db, 'customers'),
    where('businessId', '==', businessId),
    where('isActive', '==', true),
    orderBy('name', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer))
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const snap = await getDoc(doc(db, 'customers', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Customer
}

export async function addCustomer(data: Omit<Customer, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'customers'), {
    ...data, createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<void> {
  await updateDoc(doc(db, 'customers', id), data)
}

export async function deleteCustomer(id: string): Promise<void> {
  await updateDoc(doc(db, 'customers', id), { isActive: false })
}

export async function updateCustomerDue(
  customerId: string,
  saleAmount: number,
  paidAmount: number,
  dueAmount: number,
): Promise<void> {
  const ref  = doc(db, 'customers', customerId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data = snap.data()
  const newTotalDue  = (data.totalDue ?? 0) + dueAmount
  const newTotalPaid = (data.totalPaid ?? 0) + paidAmount
  const newTotal     = (data.totalPurchase ?? 0) + saleAmount
  // Risk score: based on due/total ratio & days outstanding
  const riskScore = newTotal > 0
    ? Math.min(100, Math.round((newTotalDue / newTotal) * 100))
    : 0
  await updateDoc(ref, {
    totalDue:      newTotalDue,
    totalPaid:     newTotalPaid,
    totalPurchase: newTotal,
    riskScore,
  })
}

export async function collectDuePayment(
  data: Omit<DuePayment, 'id'>,
): Promise<void> {
  await addDoc(collection(db, 'duePayments'), {
    ...data, createdAt: serverTimestamp(),
  })
  const ref  = doc(db, 'customers', data.customerId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const cur = snap.data()
  const newDue  = Math.max(0, (cur.totalDue ?? 0) - data.amount)
  const newPaid = (cur.totalPaid ?? 0) + data.amount
  const riskScore = cur.totalPurchase > 0
    ? Math.min(100, Math.round((newDue / cur.totalPurchase) * 100))
    : 0
  await updateDoc(ref, { totalDue: newDue, totalPaid: newPaid, riskScore })
}

export async function getCustomerSales(
  businessId: string,
  customerName: string,
): Promise<Sale[]> {
  const q = query(
    collection(db, 'sales'),
    where('businessId', '==', businessId),
    where('customerName', '==', customerName),
    orderBy('createdAt', 'desc'),
    limit(20),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale))
}

export async function getDuePayments(
  businessId: string,
  customerId: string,
): Promise<DuePayment[]> {
  const q = query(
    collection(db, 'duePayments'),
    where('businessId', '==', businessId),
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DuePayment))
}

// ===== ACCOUNTS =====

export async function getAccounts(businessId: string): Promise<Account[]> {
  const q = query(
    collection(db, 'accounts'),
    where('businessId', '==', businessId),
    orderBy('name', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Account))
}

export async function initDefaultAccounts(businessId: string): Promise<void> {
  const defaults: Omit<Account, 'id' | 'createdAt'>[] = [
    { businessId, name: 'নগদ (Cash)',         type: 'asset',     balance: 0, isDefault: true  },
    { businessId, name: 'ব্যাংক (Bank)',       type: 'asset',     balance: 0, isDefault: true  },
    { businessId, name: 'বিক্রয় আয়',         type: 'income',    balance: 0, isDefault: true  },
    { businessId, name: 'ক্রয় ব্যয়',          type: 'expense',   balance: 0, isDefault: true  },
    { businessId, name: 'পাওনা (Receivable)',  type: 'asset',     balance: 0, isDefault: true  },
    { businessId, name: 'বকেয়া (Payable)',    type: 'liability', balance: 0, isDefault: true  },
    { businessId, name: 'মূলধন (Capital)',     type: 'equity',    balance: 0, isDefault: true  },
    { businessId, name: 'সাধারণ ব্যয়',        type: 'expense',   balance: 0, isDefault: false },
  ]
  for (const acc of defaults) {
    await addDoc(collection(db, 'accounts'), { ...acc, createdAt: serverTimestamp() })
  }
}

export async function addAccount(data: Omit<Account, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'accounts'), {
    ...data, createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateAccountBalance(
  accountId: string,
  amount: number,
  type: TransactionType,
  accountType: AccountType,
): Promise<void> {
  const ref  = doc(db, 'accounts', accountId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const cur = snap.data().balance ?? 0
  // Normal balance: asset/expense = debit increases, credit decreases
  //                 liability/equity/income = credit increases, debit decreases
  const isNormalDebit = accountType === 'asset' || accountType === 'expense'
  const newBalance = isNormalDebit
    ? type === 'debit' ? cur + amount : cur - amount
    : type === 'credit' ? cur + amount : cur - amount
  await updateDoc(ref, { balance: newBalance })
}

// ===== JOURNAL ENTRIES =====

export async function addJournalEntry(data: Omit<JournalEntry, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'journalEntries'), {
    ...data, createdAt: serverTimestamp(),
  })
  // Update account balances
  for (const line of data.lines) {
    const accSnap = await getDoc(doc(db, 'accounts', line.accountId))
    if (accSnap.exists()) {
      await updateAccountBalance(line.accountId, line.amount, line.type, accSnap.data().type)
    }
  }
  return ref.id
}

export async function getJournalEntries(businessId: string, limitCount = 50): Promise<JournalEntry[]> {
  const q = query(
    collection(db, 'journalEntries'),
    where('businessId', '==', businessId),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as JournalEntry))
}

// ===== EXPENSES =====

export async function addExpense(data: Omit<Expense, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'expenses'), {
    ...data, createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getExpenses(businessId: string, limitCount = 100): Promise<Expense[]> {
  const q = query(
    collection(db, 'expenses'),
    where('businessId', '==', businessId),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense))
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, 'expenses', id))
}

// ===== EMPLOYEES =====

export async function getEmployees(businessId: string): Promise<Employee[]> {
  const q = query(
    collection(db, 'employees'),
    where('businessId', '==', businessId),
    orderBy('name', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Employee))
}

export async function addEmployee(data: Omit<Employee, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'employees'), {
    ...data, createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateEmployee(id: string, data: Partial<Employee>): Promise<void> {
  await updateDoc(doc(db, 'employees', id), data)
}

export async function deleteEmployee(id: string): Promise<void> {
  await updateDoc(doc(db, 'employees', id), { status: 'terminated' })
}

// ===== PAYROLL =====

export async function getPayrollRecords(businessId: string): Promise<PayrollRecord[]> {
  const q = query(
    collection(db, 'payroll'),
    where('businessId', '==', businessId),
    orderBy('createdAt', 'desc'),
    limit(100),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PayrollRecord))
}

export async function addPayrollRecord(data: Omit<PayrollRecord, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'payroll'), {
    ...data, createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getPayrollByMonth(
  businessId: string, month: number, year: number,
): Promise<PayrollRecord[]> {
  const q = query(
    collection(db, 'payroll'),
    where('businessId', '==', businessId),
    where('month', '==', month),
    where('year',  '==', year),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PayrollRecord))
}

// ===== ATTENDANCE =====

export async function markAttendance(data: Omit<Attendance, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'attendance'), {
    ...data, createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getAttendanceByDate(
  businessId: string, date: Date,
): Promise<Attendance[]> {
  const start = new Date(date); start.setHours(0,0,0,0)
  const end   = new Date(date); end.setHours(23,59,59,999)
  const q = query(
    collection(db, 'attendance'),
    where('businessId', '==', businessId),
    where('date', '>=', start),
    where('date', '<=', end),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Attendance))
}

export async function getEmployeeAttendance(
  businessId: string, employeeId: string, month: number, year: number,
): Promise<Attendance[]> {
  const start = new Date(year, month - 1, 1)
  const end   = new Date(year, month, 0, 23, 59, 59)
  const q = query(
    collection(db, 'attendance'),
    where('businessId', '==', businessId),
    where('employeeId', '==', employeeId),
    where('date', '>=', start),
    where('date', '<=', end),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Attendance))
}

// ===== BRANCHES =====

export async function getBranches(businessId: string): Promise<Branch[]> {
  const q = query(
    collection(db, 'branches'),
    where('businessId', '==', businessId),
    where('isActive', '==', true),
    orderBy('createdAt', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Branch))
}

export async function addBranch(data: Omit<Branch, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'branches'), {
    ...data, createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateBranch(id: string, data: Partial<Branch>): Promise<void> {
  await updateDoc(doc(db, 'branches', id), data)
}

export async function deleteBranch(id: string): Promise<void> {
  await updateDoc(doc(db, 'branches', id), { isActive: false })
}

export async function initMainBranch(businessId: string, businessName: string): Promise<string> {
  const ref = await addDoc(collection(db, 'branches'), {
    businessId,
    name:     `${businessName} (প্রধান শাখা)`,
    isActive: true,
    isMain:   true,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

// ===== AUDIT LOGS =====

export async function addAuditLog(data: Omit<AuditLog, 'id'>): Promise<void> {
  await addDoc(collection(db, 'auditLogs'), {
    ...data, createdAt: serverTimestamp(),
  })
}

export async function getAuditLogs(
  businessId: string,
  limitCount = 100,
): Promise<AuditLog[]> {
  const q = query(
    collection(db, 'auditLogs'),
    where('businessId', '==', businessId),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog))
}

export async function getAuditLogsByUser(
  businessId: string,
  userId: string,
): Promise<AuditLog[]> {
  const q = query(
    collection(db, 'auditLogs'),
    where('businessId', '==', businessId),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog))
}

export async function getAuditLogsByModule(
  businessId: string,
  module: string,
): Promise<AuditLog[]> {
  const q = query(
    collection(db, 'auditLogs'),
    where('businessId', '==', businessId),
    where('module', '==', module),
    orderBy('createdAt', 'desc'),
    limit(50),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog))
}
