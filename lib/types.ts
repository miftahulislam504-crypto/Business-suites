// ===== USER & AUTH =====
export interface User {
  uid: string
  email: string | null
  phone: string | null
  displayName: string | null
  photoURL: string | null
  createdAt: Date
}

// ===== BUSINESS =====
export type BusinessCategory =
  | 'retail'
  | 'wholesale'
  | 'restaurant'
  | 'pharmacy'
  | 'construction'
  | 'fishfarm'
  | 'other'

export type UserRole = 'owner' | 'manager' | 'accountant' | 'salesman'

export interface Business {
  id: string
  name: string
  category: BusinessCategory
  logoUrl?: string
  address?: string
  phone?: string
  ownerId: string          // যিনি ব্যবসা তৈরি করেছেন (প্রতিষ্ঠাতা মালিক) — তাকে সরানো যায় না
  ownerIds: string[]       // সব মালিকের uid (members-এর role থেকে আসে)
  memberIds: string[]      // সব সদস্যের uid — "আমার ব্যবসা" খোঁজার জন্য
  roles: Record<string, UserRole>  // uid -> ভূমিকা (Firestore rules এটা দেখে অনুমতি দেয়)
  members: BusinessMember[]
  createdAt: Date
  autoPosting?: boolean                                  // বিক্রয়/ক্রয়/ব্যয় নিজে থেকে জার্নালে বসবে কিনা
  accountMap?:  Partial<Record<AccountKey, string>>       // সিস্টেম অ্যাকাউন্টের id
}

// ইমেইল দিয়ে স্টাফ খোঁজার জন্য — লগইনের সময় সেভ হয়
export interface UserProfile {
  uid: string
  email: string | null
  displayName: string | null
  phone: string | null
}

export interface BusinessMember {
  uid: string
  name: string
  role: UserRole
  joinedAt: Date
}

// ===== INVENTORY =====
export type ProductUnit = 'pcs' | 'kg' | 'liter' | 'meter' | 'box' | 'dozen' | 'bag' | 'ton' | 'sqft'

export interface Category {
  id: string
  businessId: string
  name: string
  createdAt: Date
}

export interface Brand {
  id: string
  businessId: string
  name: string
  createdAt: Date
}

export interface Product {
  id: string
  businessId: string
  name: string
  sku: string
  barcode?: string
  categoryId?: string
  categoryName?: string
  brandId?: string
  brandName?: string
  unit: ProductUnit
  purchasePrice: number
  salePrice: number
  wholesalePrice?: number
  stock: number
  reorderLevel: number
  imageUrl?: string
  description?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface StockMovement {
  id: string
  businessId: string
  productId: string
  productName: string
  type: 'in' | 'out' | 'adjustment'
  quantity: number
  reason: string
  date: Date
  createdBy: string
  previousStock?: number
  newStock?:      number
  unitCost?:      number    // পণ্যের ক্রয়মূল্য (তখনকার)
  lossValue?:     number    // স্টক ক্ষতির মূল্য: ধনাত্মক = ক্ষতি, ঋণাত্মক = সংশোধনে স্টক বাড়ল (লাভ)
  hasLoss?:       boolean   // lossValue থাকলে true (index ছাড়া খোঁজার জন্য)
  journalPosted?:  boolean
  journalSkipped?: boolean
}

// ===== INVITE =====
export interface StaffInvite {
  id: string
  businessId: string
  email: string
  role: UserRole
  status: 'pending' | 'accepted' | 'rejected'
  invitedAt: Date
}

// ===== LANGUAGE =====
export type Language = 'bn' | 'en'

// ===== THEME =====
export type Theme = 'light' | 'dark'

// ===== SALES =====
export type PaymentMethod = 'cash' | 'bank' | 'bkash' | 'nagad' | 'credit'

export interface SaleItem {
  productId:    string
  productName:  string
  sku:          string
  unit:         string
  quantity:     number
  purchasePrice:number
  salePrice:    number
  discount:     number
  total:        number
}

export interface Sale {
  id:            string
  businessId:    string
  invoiceNo:     string
  customerId?:   string
  customerName:  string
  customerPhone?: string
  items:         SaleItem[]
  subtotal:      number
  discountAmount:number
  vatAmount:     number
  vatPercent:    number
  grandTotal:    number
  paidAmount:    number
  dueAmount:     number
  paymentMethod: PaymentMethod
  note?:         string
  status:        'paid' | 'partial' | 'due'
  createdBy:     string
  createdAt:     Date
  journalSkipped?: boolean   // অটো-পোস্টিং চালু ছিল কিন্তু অ্যাকাউন্ট না পাওয়ায় বসেনি
}

// ===== SUPPLIER =====
export interface Supplier {
  id:          string
  businessId:  string
  name:        string
  phone:       string
  email?:      string
  address?:    string
  company?:    string
  totalDue:    number
  totalPaid:   number
  note?:       string
  isActive:    boolean
  createdAt:   Date
}

// ===== PURCHASE =====
export interface PurchaseItem {
  productId:    string
  productName:  string
  sku:          string
  unit:         string
  quantity:     number
  purchasePrice:number
  total:        number
}

export interface Purchase {
  id:            string
  businessId:    string
  invoiceNo:     string
  supplierId?:   string
  supplierName:  string
  supplierPhone?: string
  items:         PurchaseItem[]
  subtotal:      number
  discountAmount:number
  grandTotal:    number
  paidAmount:    number
  dueAmount:     number
  paymentMethod: PaymentMethod
  note?:         string
  status:        'paid' | 'partial' | 'due'
  createdBy:     string
  createdAt:     Date
  journalSkipped?: boolean
}

// ===== CUSTOMER =====
export interface Customer {
  id:          string
  businessId:  string
  name:        string
  phone:       string
  email?:      string
  address?:    string
  nid?:        string
  totalDue:    number
  totalPaid:   number
  totalPurchase:number
  riskScore:   number   // 0-100 (0=safe, 100=high risk)
  note?:       string
  isActive:    boolean
  createdAt:   Date
}

// ===== DUE PAYMENT =====
export interface DuePayment {
  id:          string
  businessId:  string
  customerId:  string
  customerName:string
  amount:      number
  note?:       string
  method:      PaymentMethod
  createdBy:   string
  createdAt:   Date
}

// ===== ACCOUNTING =====
export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'

// অটো-পোস্টিং যে সিস্টেম অ্যাকাউন্টগুলো ব্যবহার করে
export type AccountKey =
  | 'cash' | 'bank' | 'receivable' | 'inventory'
  | 'payable' | 'vat_payable'
  | 'sales' | 'cogs' | 'expense'

// জার্নাল এন্ট্রি কোথা থেকে এসেছে
export type JournalSource =
  | 'manual' | 'sale' | 'purchase' | 'due_collection' | 'expense' | 'expense_reversal'
  | 'payroll' | 'stock_adjustment'
export type TransactionType = 'debit' | 'credit'

export interface Account {
  id:          string
  businessId:  string
  name:        string
  type:        AccountType
  balance:     number
  isDefault:   boolean
  createdAt:   Date
  key?:        AccountKey   // সিস্টেম অ্যাকাউন্ট চেনার জন্য
}

export interface JournalEntry {
  id:          string
  businessId:  string
  date:        Date
  description: string
  reference?:  string
  lines:       JournalLine[]
  createdBy:   string
  createdAt:   Date
  source?:     JournalSource
  sourceId?:   string
}

export interface JournalLine {
  accountId:   string
  accountName: string
  type:        TransactionType
  amount:      number
}

export interface Expense {
  id:          string
  businessId:  string
  category:    string
  description: string
  amount:      number
  date:        Date
  paymentMethod: PaymentMethod
  reference?:  string
  createdBy:   string
  createdAt:   Date
  journalPosted?:  boolean
  journalSkipped?: boolean
}

// ===== EMPLOYEE =====
export type EmployeeStatus = 'active' | 'inactive' | 'terminated'
export type SalaryType     = 'monthly' | 'daily' | 'hourly'

export interface Employee {
  id:           string
  businessId:   string
  name:         string
  phone:        string
  email?:       string
  nid?:         string
  address?:     string
  designation:  string
  department?:  string
  joiningDate:  Date
  salaryType:   SalaryType
  baseSalary:   number
  allowances:   number
  status:       EmployeeStatus
  bankAccount?: string
  bkashNumber?: string
  photo?:       string
  note?:        string
  createdAt:    Date
}

export interface PayrollRecord {
  id:           string
  businessId:   string
  employeeId:   string
  employeeName: string
  designation:  string
  month:        number
  year:         number
  baseSalary:   number
  allowances:   number
  bonus:        number
  deductions:   number
  netSalary:    number
  paymentMethod: PaymentMethod
  paidAt:       Date
  note?:        string
  createdBy:    string
  createdAt:    Date
  journalPosted?:  boolean
  journalSkipped?: boolean
}

export interface Attendance {
  id:          string
  businessId:  string
  employeeId:  string
  employeeName:string
  date:        Date
  status:      'present' | 'absent' | 'halfday' | 'leave'
  note?:       string
  createdAt:   Date
}

// ===== BRANCH =====
export interface Branch {
  id:         string
  businessId: string
  name:       string
  address?:   string
  phone?:     string
  managerId?: string
  managerName?:string
  isActive:   boolean
  isMain:     boolean
  createdAt:  Date
}

// ===== AUDIT LOG =====
export type AuditAction =
  | 'create' | 'update' | 'delete'
  | 'sale' | 'purchase' | 'payment'
  | 'login' | 'logout' | 'stock_adjust'

export interface AuditLog {
  id:          string
  businessId:  string
  userId:      string
  userName:    string
  action:      AuditAction
  module:      string
  description: string
  before?:     Record<string, any>
  after?:      Record<string, any>
  ipAddress?:  string
  createdAt:   Date
}
