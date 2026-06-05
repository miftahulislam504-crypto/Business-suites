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
