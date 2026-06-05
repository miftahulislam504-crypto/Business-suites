import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, serverTimestamp,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Business, BusinessMember, UserRole, Category, Brand, Product } from './types'

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
