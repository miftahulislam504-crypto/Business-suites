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
  ownerId: string
  members: BusinessMember[]
  createdAt: Date
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
export type TransactionType = 'debit' | 'credit'

export interface Account {
  id:          string
  businessId:  string
  name:        string
  type:        AccountType
  balance:     number
  isDefault:   boolean
  createdAt:   Date
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
