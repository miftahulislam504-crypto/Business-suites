import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, serverTimestamp,
  orderBy, limit, runTransaction, setDoc,
} from 'firebase/firestore'
import type { DocumentData, Transaction } from 'firebase/firestore'
import { db } from './firebase'
import type { Business, BusinessMember, UserRole, Category, Brand, Product, Sale, Supplier, Purchase, Customer, DuePayment, Account, JournalEntry, Expense, AccountType, TransactionType, Employee, PayrollRecord, Attendance, Branch, AuditLog, AuditAction, UserProfile, AccountKey, JournalSource, PaymentMethod } from './types'

// ===== ERROR HELPERS =====

// ব্যবহারকারীকে দেখানোর মতো বাংলা বার্তাসহ error
export function appError(message: string): Error {
  const e = new Error(message)
  e.name = 'AppError'
  return e
}

// AppError হলে তার বার্তা, নাহলে fallback বার্তা
export function userMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.name === 'AppError' ? e.message : fallback
}

// ===== USER LOOKUP (ইমেইল -> uid) =====

// লগইনের সময় সেভ হয়। doc id = ইমেইল, তাই শুধু পুরো ইমেইল জানা থাকলেই খোঁজা যায়
// (সবার তালিকা দেখা যায় না)। ইমেইল না থাকলে (ফোন লগইন) সেভ হয় না — তখন UID দিয়ে যোগ করতে হবে।
export async function saveUserProfile(u: UserProfile): Promise<void> {
  if (!u.email) return
  const email = u.email.trim().toLowerCase()
  await setDoc(doc(db, 'userEmails', email), {
    uid:         u.uid,
    email,
    displayName: u.displayName,
    updatedAt:   serverTimestamp(),
  }, { merge: true })
}

export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  const key = email.trim().toLowerCase()
  if (!key || key.includes('/')) return null
  const snap = await getDoc(doc(db, 'userEmails', key))
  if (!snap.exists()) return null
  const d = snap.data()
  return { uid: d.uid, email: d.email ?? key, displayName: d.displayName ?? null, phone: null }
}

// ===== BUSINESS =====

// members থেকে ownerIds ও memberIds বের করে — সবসময় এই একটা জায়গা থেকেই বানানো হয়
function memberFields(members: BusinessMember[]) {
  const roles: Record<string, UserRole> = {}
  members.forEach((m) => { roles[m.uid] = m.role })
  return {
    memberIds: Array.from(new Set(members.map((m) => m.uid))),
    ownerIds:  Array.from(new Set(members.filter((m) => m.role === 'owner').map((m) => m.uid))),
    roles,
  }
}

// পুরনো ব্যবসায় ownerIds/memberIds থাকে না — পড়ার সময় members থেকে বানিয়ে নেয়
function normalizeBusiness(id: string, data: DocumentData): Business {
  const members: BusinessMember[] = data.members ?? []
  const f = memberFields(members)
  return {
    ...data,
    id,
    members,
    ownerIds:  f.ownerIds.length  ? f.ownerIds  : [data.ownerId],
    memberIds: f.memberIds.length ? f.memberIds : [data.ownerId],
    roles:     data.roles ?? f.roles,
  } as Business
}

// Create new business
export async function createBusiness(
  data: Omit<Business, 'id' | 'createdAt' | 'members' | 'ownerIds' | 'memberIds' | 'roles'>,
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
    ...memberFields([member]),
    ownerId:   ownerUid,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

// ব্যবহারকারী যে যে ব্যবসার সদস্য (মালিক বা স্টাফ) — সব
export async function getUserBusinesses(uid: string): Promise<Business[]> {
  const [asMember, asCreator] = await Promise.all([
    getDocs(query(collection(db, 'businesses'), where('memberIds', 'array-contains', uid))),
    // memberIds ছাড়া পুরনো ব্যবসার জন্য
    getDocs(query(collection(db, 'businesses'), where('ownerId', '==', uid))),
  ])

  const map = new Map<string, Business>()
  for (const d of [...asMember.docs, ...asCreator.docs]) {
    if (!map.has(d.id)) map.set(d.id, normalizeBusiness(d.id, d.data()))
  }

  // পুরনো ব্যবসায় memberIds/roles না থাকলে একবার বসিয়ে দাও (ব্যর্থ হলেও সমস্যা নেই)
  for (const d of asCreator.docs) {
    const members = map.get(d.id)!.members
    if ((!d.data().memberIds || !d.data().roles) && members.length > 0) {
      updateDoc(d.ref, memberFields(members)).catch(() => {})
    }
  }

  const time = (b: Business) => (b.createdAt as any)?.seconds ?? 0
  return Array.from(map.values()).sort((a, b) => time(b) - time(a))
}

// Get single business
export async function getBusiness(id: string): Promise<Business | null> {
  const snap = await getDoc(doc(db, 'businesses', id))
  if (!snap.exists()) return null
  return normalizeBusiness(snap.id, snap.data())
}

// Update business
export async function updateBusiness(
  id: string,
  data: Partial<Omit<Business, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'businesses', id), data)
}

// সদস্য তালিকা বদলানোর একটাই পথ — transaction-এ, তাই দুজন একসাথে বদলালেও একজনেরটা হারায় না।
// নিয়ম: শুধু মালিক বদলাতে পারে, আর অন্তত একজন মালিক সবসময় থাকতে হবে।
async function changeMembers(
  businessId: string,
  actorUid: string,
  change: (members: BusinessMember[], creatorId: string) => BusinessMember[],
): Promise<void> {
  const ref = doc(db, 'businesses', businessId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) throw appError('ব্যবসা পাওয়া যায়নি')
    const data    = snap.data()
    const current: BusinessMember[] = data.members ?? []

    const actorIsOwner =
      data.ownerId === actorUid ||
      current.some((m) => m.uid === actorUid && m.role === 'owner')
    if (!actorIsOwner) throw appError('শুধু মালিক স্টাফ বদলাতে পারবেন')

    const next = change(current, data.ownerId)
    if (!next.some((m) => m.role === 'owner')) throw appError('অন্তত একজন মালিক থাকতে হবে')

    tx.update(ref, { members: next, ...memberFields(next) })
  })
}

// Add staff member (মালিক হিসেবেও যোগ করা যায় — role: 'owner')
export async function addStaffMember(
  businessId: string,
  member: BusinessMember,
  actorUid: string,
): Promise<void> {
  await changeMembers(businessId, actorUid, (members) => {
    if (members.some((m) => m.uid === member.uid)) {
      throw appError('এই ব্যবহারকারী আগে থেকেই যোগ করা আছে')
    }
    return [...members, member]
  })
}

// Remove staff member
export async function removeStaffMember(
  businessId: string,
  uid: string,
  actorUid: string,
): Promise<void> {
  await changeMembers(businessId, actorUid, (members, creatorId) => {
    if (uid === creatorId) throw appError('প্রতিষ্ঠাতা মালিককে সরানো যাবে না')
    return members.filter((m) => m.uid !== uid)
  })
}

// Update staff role
export async function updateStaffRole(
  businessId: string,
  uid: string,
  role: UserRole,
  actorUid: string,
): Promise<void> {
  await changeMembers(businessId, actorUid, (members, creatorId) => {
    if (uid === creatorId && role !== 'owner') {
      throw appError('প্রতিষ্ঠাতা মালিকের ভূমিকা বদলানো যাবে না')
    }
    return members.map((m) => (m.uid === uid ? { ...m, role } : m))
  })
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

// স্টকের যেসব কারণ "ক্ষতি" ধরা হয় (ক্রয়/বিক্রয় নয়, তাই আলাদা লেনদেন ছাড়াই মূল্য কমে)
export const STOCK_LOSS_REASONS = ['ক্ষতিগ্রস্ত', 'মেয়াদ উত্তীর্ণ']

// ক্ষতির মূল্য: ধনাত্মক = ক্ষতি, ঋণাত্মক = সংশোধনে স্টক বেড়ে লাভ। ক্ষতি ধরা না হলে ০
export function stockLossValue(
  type: 'in' | 'out' | 'adjustment', reason: string, previous: number, next: number, unitCost: number,
): number {
  const counts = type === 'adjustment' || (type === 'out' && STOCK_LOSS_REASONS.includes(reason))
  return counts ? round2((previous - next) * (unitCost || 0)) : 0
}

// হাতে স্টক বদল। স্টক Firestore-এর বর্তমান সংখ্যা থেকে হিসাব হয় (আগে ব্রাউজারের পুরনো সংখ্যা ধরত),
// ক্ষতি/সংশোধন হলে মূল্য ধরা হয় ও অটো-পোস্টিং চালু থাকলে জার্নালে (ক্ষতি: COGS ডেবিট, মজুত পণ্য ক্রেডিট) বসে।
export async function adjustStock(p: {
  businessId: string
  productId:  string
  type:       'in' | 'out' | 'adjustment'
  quantity:   number
  reason:     string
  userId:     string
}): Promise<void> {
  if (p.type === 'adjustment' ? !(p.quantity >= 0) : !(p.quantity > 0)) throw appError('পরিমাণ সঠিক নয়')
  const productRef = doc(db, 'products', p.productId)
  const moveRef    = doc(collection(db, 'stockMovements'))

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(productRef)
    if (!snap.exists() || snap.data().businessId !== p.businessId) throw appError('পণ্যটি পাওয়া যায়নি')
    const cur  = snap.data()
    const prev = cur.stock ?? 0
    const next = p.type === 'in' ? prev + p.quantity : p.type === 'out' ? prev - p.quantity : p.quantity
    if (next < 0) throw appError(`স্টকে আছে ${prev}টি, এর বেশি বের করা যাবে না`)

    const unitCost  = cur.purchasePrice ?? 0
    const lossValue = stockLossValue(p.type, p.reason, prev, next, unitCost)
    const cents     = toCents(Math.abs(lossValue))
    const lines     = lineSet(
      lossValue > 0
        ? [{ key: 'cogs', type: 'debit', cents }, { key: 'inventory', type: 'credit', cents }]
        : [{ key: 'inventory', type: 'debit', cents }, { key: 'cogs', type: 'credit', cents }],
    )
    const posting = lossValue !== 0 ? await readPosting(tx, p.businessId, lines) : ({ status: 'off' } as PostingPlan)

    tx.update(productRef, { stock: next, updatedAt: serverTimestamp() })
    tx.set(moveRef, {
      businessId:    p.businessId,
      productId:     p.productId,
      productName:   cur.name,
      type:          p.type,
      quantity:      p.quantity,
      reason:        p.reason,
      previousStock: prev,
      newStock:      next,
      unitCost,
      date:          serverTimestamp(),
      createdBy:     p.userId,
      ...(lossValue !== 0 ? { lossValue, hasLoss: true } : {}),
      ...(posting.status === 'ok'      ? { journalPosted: true }  : {}),
      ...(posting.status === 'skipped' ? { journalSkipped: true } : {}),
    })
    if (posting.status === 'ok') {
      writePosting(tx, posting, {
        businessId:  p.businessId,
        description: `${lossValue > 0 ? 'স্টক ক্ষতি' : 'স্টক সংশোধন'} - ${cur.name}`,
        reference:   p.reason,
        source:      'stock_adjustment',
        sourceId:    moveRef.id,
        createdBy:   p.userId,
      })
    }
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

// ===== সিরিয়াল নম্বর (ইনভয়েস / ক্রয়) =====
// প্রতি ব্যবসা, প্রতি ধরন, প্রতি বছরের আলাদা counter। নম্বর বসে বিক্রয়/ক্রয় সেভ হওয়ার
// একই transaction-এ — তাই কোনো নম্বর ডুপ্লিকেট হয় না, আর সেভ ব্যর্থ হলে নম্বর খরচও হয় না।

type CounterKind = 'sale' | 'purchase'

function counterRef(businessId: string, kind: CounterKind, year: number) {
  return doc(db, 'counters', `${businessId}_${kind}_${year}`)
}

function formatNumber(kind: CounterKind, year: number, seq: number): string {
  return `${kind === 'sale' ? 'INV' : 'PUR'}-${year}-${String(seq).padStart(5, '0')}`
}

// বিক্রয় সেভ + স্টক কমানো + স্টক মুভমেন্ট + কাস্টমারের বাকি — সব একসাথে।
// কোনো একটা ব্যর্থ হলে কিছুই সেভ হয় না। স্টক পড়া হয় Firestore থেকে (ব্রাউজারের পুরনো সংখ্যা থেকে না)।
export async function createSaleWithStock(
  sale: Omit<Sale, 'id' | 'createdAt' | 'invoiceNo'>,
  userId: string,
): Promise<{ id: string; invoiceNo: string }> {
  if (sale.items.length === 0) throw appError('কার্টে পণ্য নেই')
  if (new Set(sale.items.map((i) => i.productId)).size !== sale.items.length) {
    throw appError('একই পণ্য দুইবার আছে')
  }
  if (sale.dueAmount > 0 && !sale.customerId) {
    throw appError('বাকিতে বিক্রি করতে তালিকা থেকে কাস্টমার বেছে নাও')
  }

  const year        = new Date().getFullYear()
  const saleRef     = doc(collection(db, 'sales'))
  const productRefs = sale.items.map((i) => doc(db, 'products', i.productId))
  const customerRef = sale.customerId ? doc(db, 'customers', sale.customerId) : null
  const numberRef   = counterRef(sale.businessId, 'sale', year)
  let   invoiceNo   = ''

  await runTransaction(db, async (tx) => {
    // ১) আগে সব পড়ো (Firestore transaction-এর নিয়ম)
    const productSnaps = await Promise.all(productRefs.map((r) => tx.get(r)))
    const customerSnap = customerRef ? await tx.get(customerRef) : null
    const numberSnap   = await tx.get(numberRef)

    // ২) যাচাই
    sale.items.forEach((item, idx) => {
      const snap = productSnaps[idx]
      if (!snap.exists() || snap.data().businessId !== sale.businessId) {
        throw appError(`"${item.productName}" পণ্যটি পাওয়া যায়নি`)
      }
      if (!(item.quantity > 0)) {
        throw appError(`"${item.productName}"-এর পরিমাণ সঠিক নয়`)
      }
      const stock = snap.data().stock ?? 0
      if (item.quantity > stock) {
        throw appError(`"${item.productName}" স্টকে আছে ${stock}টি, কিন্তু ${item.quantity}টি দিতে চাইছো`)
      }
    })
    if (customerRef && (!customerSnap?.exists() || customerSnap.data().businessId !== sale.businessId)) {
      throw appError('কাস্টমার পাওয়া যায়নি')
    }

    // জার্নালের জন্য দরকারি অ্যাকাউন্ট পড়ো (বিক্রীত পণ্যের ব্যয় = পরিমাণ × পণ্যের বর্তমান ক্রয়মূল্য)
    const cost = sale.items.reduce(
      (n, item, idx) => n + item.quantity * (productSnaps[idx].data()!.purchasePrice ?? 0), 0,
    )
    const posting = await readPosting(tx, sale.businessId, saleLines(sale, cost))

    // ৩) এবার লেখো
    const seq = (numberSnap.exists() ? numberSnap.data().value ?? 0 : 0) + 1
    invoiceNo = formatNumber('sale', year, seq)
    tx.set(numberRef, {
      businessId: sale.businessId, kind: 'sale', year, value: seq, updatedAt: serverTimestamp(),
    })
    tx.set(saleRef, {
      ...sale, invoiceNo, createdAt: serverTimestamp(),
      ...(posting.status === 'skipped' ? { journalSkipped: true } : {}),
    })

    sale.items.forEach((item, idx) => {
      const stock = productSnaps[idx].data()!.stock ?? 0
      tx.update(productRefs[idx], { stock: stock - item.quantity, updatedAt: serverTimestamp() })
      tx.set(doc(collection(db, 'stockMovements')), {
        businessId:  sale.businessId,
        productId:   item.productId,
        productName: item.productName,
        type:        'out',
        quantity:    item.quantity,
        reason:      `বিক্রয় - ${invoiceNo}`,
        date:        serverTimestamp(),
        createdBy:   userId,
      })
    })

    if (customerRef && customerSnap) {
      const c             = customerSnap.data()!
      const paid          = Math.min(sale.paidAmount, sale.grandTotal) // ফেরত টাকা বাদ
      const totalDue      = (c.totalDue ?? 0) + sale.dueAmount
      const totalPurchase = (c.totalPurchase ?? 0) + sale.grandTotal
      tx.update(customerRef, {
        totalDue,
        totalPaid:     (c.totalPaid ?? 0) + paid,
        totalPurchase,
        riskScore:     totalPurchase > 0 ? Math.min(100, Math.round((totalDue / totalPurchase) * 100)) : 0,
      })
    }

    if (posting.status === 'ok') {
      writePosting(tx, posting, {
        businessId:  sale.businessId,
        description: `বিক্রয় - ${invoiceNo}`,
        reference:   invoiceNo,
        source:      'sale',
        sourceId:    saleRef.id,
        createdBy:   userId,
      })
    }
  })

  return { id: saleRef.id, invoiceNo }
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

// ===== PURCHASES =====

// ক্রয় সেভ + স্টক বাড়ানো + ক্রয়মূল্য + স্টক মুভমেন্ট + সাপ্লায়ারের বাকি — সব একসাথে।
// স্টক বাড়ে Firestore-এর বর্তমান সংখ্যার ওপর (ব্রাউজারের পুরনো সংখ্যা ধরে না)।
export async function createPurchaseWithStock(
  purchase: Omit<Purchase, 'id' | 'createdAt' | 'invoiceNo'>,
  userId: string,
): Promise<{ id: string; invoiceNo: string }> {
  if (purchase.items.length === 0) throw appError('কার্টে পণ্য নেই')
  if (new Set(purchase.items.map((i) => i.productId)).size !== purchase.items.length) {
    throw appError('একই পণ্য দুইবার আছে')
  }
  if (purchase.dueAmount > 0 && !purchase.supplierId) {
    throw appError('বাকিতে ক্রয়ে তালিকা থেকে সাপ্লায়ার বেছে নাও')
  }

  const year        = new Date().getFullYear()
  const purchaseRef = doc(collection(db, 'purchases'))
  const productRefs = purchase.items.map((i) => doc(db, 'products', i.productId))
  const supplierRef = purchase.supplierId ? doc(db, 'suppliers', purchase.supplierId) : null
  const numberRef   = counterRef(purchase.businessId, 'purchase', year)
  let   invoiceNo   = ''

  await runTransaction(db, async (tx) => {
    // ১) আগে সব পড়ো
    const productSnaps = await Promise.all(productRefs.map((r) => tx.get(r)))
    const supplierSnap = supplierRef ? await tx.get(supplierRef) : null
    const numberSnap   = await tx.get(numberRef)

    // ২) যাচাই
    purchase.items.forEach((item, idx) => {
      const snap = productSnaps[idx]
      if (!snap.exists() || snap.data().businessId !== purchase.businessId) {
        throw appError(`"${item.productName}" পণ্যটি পাওয়া যায়নি`)
      }
      if (!(item.quantity > 0)) throw appError(`"${item.productName}"-এর পরিমাণ সঠিক নয়`)
      if (!(item.purchasePrice >= 0)) throw appError(`"${item.productName}"-এর ক্রয়মূল্য সঠিক নয়`)
    })
    if (supplierRef && (!supplierSnap?.exists() || supplierSnap.data().businessId !== purchase.businessId)) {
      throw appError('সাপ্লায়ার পাওয়া যায়নি')
    }

    const posting = await readPosting(tx, purchase.businessId, purchaseLines(purchase))

    // ৩) এবার লেখো
    const seq = (numberSnap.exists() ? numberSnap.data().value ?? 0 : 0) + 1
    invoiceNo = formatNumber('purchase', year, seq)
    tx.set(numberRef, {
      businessId: purchase.businessId, kind: 'purchase', year, value: seq, updatedAt: serverTimestamp(),
    })
    tx.set(purchaseRef, {
      ...purchase, invoiceNo, createdAt: serverTimestamp(),
      ...(posting.status === 'skipped' ? { journalSkipped: true } : {}),
    })

    purchase.items.forEach((item, idx) => {
      const current = productSnaps[idx].data()!
      const update: Record<string, unknown> = {
        stock:     (current.stock ?? 0) + item.quantity,
        updatedAt: serverTimestamp(),
      }
      if (item.purchasePrice !== current.purchasePrice) update.purchasePrice = item.purchasePrice
      tx.update(productRefs[idx], update)
      tx.set(doc(collection(db, 'stockMovements')), {
        businessId:  purchase.businessId,
        productId:   item.productId,
        productName: item.productName,
        type:        'in',
        quantity:    item.quantity,
        reason:      `ক্রয় - ${invoiceNo}`,
        date:        serverTimestamp(),
        createdBy:   userId,
      })
    })

    if (supplierRef && supplierSnap) {
      const sp = supplierSnap.data()!
      tx.update(supplierRef, {
        totalPaid: (sp.totalPaid ?? 0) + Math.min(purchase.paidAmount, purchase.grandTotal), // ফেরত টাকা বাদ
        totalDue:  (sp.totalDue  ?? 0) + purchase.dueAmount,
      })
    }

    if (posting.status === 'ok') {
      writePosting(tx, posting, {
        businessId:  purchase.businessId,
        description: `ক্রয় - ${invoiceNo}`,
        reference:   invoiceNo,
        source:      'purchase',
        sourceId:    purchaseRef.id,
        createdBy:   userId,
      })
    }
  })

  return { id: purchaseRef.id, invoiceNo }
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

export async function collectDuePayment(
  data: Omit<DuePayment, 'id'>,
): Promise<void> {
  if (!(data.amount > 0)) throw appError('পরিমাণ সঠিক নয়')
  const customerRef = doc(db, 'customers', data.customerId)
  const paymentRef  = doc(collection(db, 'duePayments'))

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(customerRef)
    if (!snap.exists() || snap.data().businessId !== data.businessId) {
      throw appError('কাস্টমার পাওয়া যায়নি')
    }
    const cur = snap.data()
    const due = cur.totalDue ?? 0
    if (data.amount > due) throw appError(`বাকি আছে মাত্র ৳${due.toLocaleString()}`)

    const posting = await readPosting(tx, data.businessId, collectionLines(data))

    const newDue  = due - data.amount
    const newPaid = (cur.totalPaid ?? 0) + data.amount
    const riskScore = (cur.totalPurchase ?? 0) > 0
      ? Math.min(100, Math.round((newDue / cur.totalPurchase) * 100))
      : 0

    tx.set(paymentRef, { ...data, createdAt: serverTimestamp() })
    tx.update(customerRef, { totalDue: newDue, totalPaid: newPaid, riskScore })

    if (posting.status === 'ok') {
      writePosting(tx, posting, {
        businessId:  data.businessId,
        description: `বাকি আদায় - ${data.customerName}`,
        reference:   data.customerName,
        source:      'due_collection',
        sourceId:    paymentRef.id,
        createdBy:   data.createdBy,
      })
    }
  })
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

// ===== অ্যাকাউন্ট ও অটো-পোস্টিং =====

// অটো-পোস্টিং এই সিস্টেম অ্যাকাউন্টগুলো ব্যবহার করে। পুরনো ব্যবসার অ্যাকাউন্ট নাম মিলিয়ে চেনা হয় (legacy)।
const SYSTEM_ACCOUNTS: { key: AccountKey; name: string; type: AccountType; legacy: string[] }[] = [
  { key: 'cash',        name: 'নগদ (Cash)',                 type: 'asset',     legacy: ['নগদ (Cash)'] },
  { key: 'bank',        name: 'ব্যাংক (Bank)',              type: 'asset',     legacy: ['ব্যাংক (Bank)'] },
  { key: 'receivable',  name: 'পাওনা (Receivable)',         type: 'asset',     legacy: ['পাওনা (Receivable)'] },
  { key: 'inventory',   name: 'মজুত পণ্য (Inventory)',      type: 'asset',     legacy: [] },
  { key: 'payable',     name: 'বকেয়া (Payable)',           type: 'liability', legacy: ['বকেয়া (Payable)'] },
  { key: 'vat_payable', name: 'ভ্যাট দায় (VAT Payable)',     type: 'liability', legacy: [] },
  { key: 'sales',       name: 'বিক্রয় আয়',                 type: 'income',    legacy: ['বিক্রয় আয়'] },
  { key: 'cogs',        name: 'বিক্রীত পণ্যের ব্যয় (COGS)',  type: 'expense',   legacy: [] },
  { key: 'expense',     name: 'সাধারণ ব্যয়',                type: 'expense',   legacy: ['সাধারণ ব্যয়'] },
]

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
  const base = { businessId, balance: 0, isDefault: true, createdAt: serverTimestamp() }
  const docs: Record<string, unknown>[] = [
    ...SYSTEM_ACCOUNTS.map((a) => ({ ...base, name: a.name, type: a.type, key: a.key })),
    { ...base, name: 'ক্রয় ব্যয়',       type: 'expense' },
    { ...base, name: 'মূলধন (Capital)', type: 'equity'  },
  ]
  await Promise.all(docs.map((d) => addDoc(collection(db, 'accounts'), d)))
}

export async function addAccount(data: Omit<Account, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'accounts'), {
    ...data, createdAt: serverTimestamp(),
  })
  return ref.id
}

// প্রতিটি সিস্টেম অ্যাকাউন্ট খুঁজে `key` বসায়; না থাকলে নতুন বানায়। ফেরত দেয় key -> account id
async function ensureSystemAccounts(businessId: string): Promise<Partial<Record<AccountKey, string>>> {
  const accs = await getAccounts(businessId)
  const used = new Set<string>()
  const map: Partial<Record<AccountKey, string>> = {}

  for (const def of SYSTEM_ACCOUNTS) {
    const found =
      accs.find((a) => a.key === def.key && !used.has(a.id)) ??
      accs.find((a) => !a.key && !used.has(a.id) && a.type === def.type && def.legacy.includes(a.name))

    if (found) {
      if (!found.key) await updateDoc(doc(db, 'accounts', found.id), { key: def.key })
      used.add(found.id)
      map[def.key] = found.id
    } else {
      const ref = await addDoc(collection(db, 'accounts'), {
        businessId, name: def.name, type: def.type, balance: 0,
        isDefault: true, key: def.key, createdAt: serverTimestamp(),
      })
      map[def.key] = ref.id
    }
  }
  return map
}

// মালিক চালু করেন। এরপর থেকে বিক্রয়, ক্রয়, বাকি আদায় ও ব্যয় নিজে থেকে জার্নাল ও অ্যাকাউন্ট ব্যালেন্সে বসে।
export async function enableAutoPosting(businessId: string): Promise<Partial<Record<AccountKey, string>>> {
  const accountMap = await ensureSystemAccounts(businessId)
  await updateDoc(doc(db, 'businesses', businessId), {
    autoPosting: true,
    accountMap,
    autoPostingStartedAt: serverTimestamp(),
  })
  return accountMap
}

export async function disableAutoPosting(businessId: string): Promise<void> {
  await updateDoc(doc(db, 'businesses', businessId), { autoPosting: false })
}

// ---------- জার্নাল তৈরির সাধারণ অংশ ----------

type PostingLine = { key: AccountKey; type: TransactionType; amount: number }
type PostingOk   = {
  status:   'ok'
  lines:    PostingLine[]
  accounts: Map<AccountKey, { id: string; data: DocumentData }>
}
type PostingPlan = { status: 'off' } | { status: 'skipped' } | PostingOk

const toCents   = (n: number) => Math.round((Number(n) || 0) * 100)
const fromCents = (c: number) => c / 100
const round2    = (n: number) => Math.round(n * 100) / 100

// বিক্রয়/ক্রয়ে টাকা কোন অ্যাকাউন্টে যাবে — নগদ হলে নগদ, বাকি সব (ব্যাংক, bKash, Nagad) ব্যাংক
function walletKey(method: PaymentMethod): AccountKey {
  return method === 'cash' ? 'cash' : 'bank'
}

// অঙ্ক সেন্টে (পয়সায়) গোনা হয়, তাই ডেবিট-ক্রেডিট সবসময় হুবহু মেলে
function lineSet(parts: { key: AccountKey; type: TransactionType; cents: number }[]): PostingLine[] {
  return parts.filter((p) => p.cents > 0).map((p) => ({ key: p.key, type: p.type, amount: fromCents(p.cents) }))
}

function saleLines(
  s: { grandTotal: number; paidAmount: number; vatAmount?: number; paymentMethod: PaymentMethod },
  cost: number,
): PostingLine[] {
  const grand = toCents(s.grandTotal)
  const paid  = Math.min(Math.max(toCents(s.paidAmount), 0), grand)   // ফেরত টাকা বাদ
  const vat   = Math.min(Math.max(toCents(s.vatAmount ?? 0), 0), grand)
  const cogs  = Math.max(toCents(cost), 0)
  return lineSet([
    { key: walletKey(s.paymentMethod), type: 'debit',  cents: paid },
    { key: 'receivable',               type: 'debit',  cents: grand - paid },
    { key: 'sales',                    type: 'credit', cents: grand - vat },
    { key: 'vat_payable',              type: 'credit', cents: vat },
    { key: 'cogs',                     type: 'debit',  cents: cogs },
    { key: 'inventory',                type: 'credit', cents: cogs },
  ])
}

function purchaseLines(
  p: { grandTotal: number; paidAmount: number; paymentMethod: PaymentMethod },
): PostingLine[] {
  const grand = toCents(p.grandTotal)
  const paid  = Math.min(Math.max(toCents(p.paidAmount), 0), grand)
  return lineSet([
    { key: 'inventory',               type: 'debit',  cents: grand },
    { key: walletKey(p.paymentMethod), type: 'credit', cents: paid },
    { key: 'payable',                 type: 'credit', cents: grand - paid },
  ])
}

function collectionLines(d: { amount: number; method: PaymentMethod }): PostingLine[] {
  const amt = toCents(d.amount)
  return lineSet([
    { key: walletKey(d.method), type: 'debit',  cents: amt },
    { key: 'receivable',        type: 'credit', cents: amt },
  ])
}

function expenseLines(e: { amount: number; paymentMethod: PaymentMethod }, reverse = false): PostingLine[] {
  const amt  = toCents(e.amount)
  const side = (t: TransactionType): TransactionType => (reverse ? (t === 'debit' ? 'credit' : 'debit') : t)
  return lineSet([
    { key: 'expense',                 type: side('debit'),  cents: amt },
    { key: walletKey(e.paymentMethod), type: side('credit'), cents: amt },
  ])
}

// ব্যবসার সেটিং ও দরকারি অ্যাকাউন্ট পড়ে (transaction-এ — লেখার আগে)।
//  off     = অটো-পোস্টিং বন্ধ, কিছু করার নেই
//  skipped = চালু, কিন্তু কোনো অ্যাকাউন্ট পাওয়া যায়নি — লেনদেন চলবে, জার্নাল বসবে না (চিহ্ন দেওয়া হবে)
//  ok      = জার্নাল বসানো যাবে
async function readPosting(
  tx: Transaction,
  businessId: string,
  lines: PostingLine[],
  opts: { ignoreSwitch?: boolean } = {},
): Promise<PostingPlan> {
  if (lines.length === 0) return { status: 'off' }

  const bSnap = await tx.get(doc(db, 'businesses', businessId))
  const b     = bSnap.exists() ? bSnap.data() : null
  if (!b?.accountMap) return { status: 'off' }
  if (!b.autoPosting && !opts.ignoreSwitch) return { status: 'off' }

  const keys  = Array.from(new Set(lines.map((l) => l.key)))
  const snaps = await Promise.all(
    keys.map((k) => (b.accountMap[k] ? tx.get(doc(db, 'accounts', b.accountMap[k])) : Promise.resolve(null))),
  )
  const accounts = new Map<AccountKey, { id: string; data: DocumentData }>()
  for (let i = 0; i < keys.length; i++) {
    const s = snaps[i]
    if (!s || !s.exists() || s.data().businessId !== businessId) return { status: 'skipped' }
    accounts.set(keys[i], { id: s.id, data: s.data() })
  }

  const debit  = lines.filter((l) => l.type === 'debit').reduce((n, l) => n + toCents(l.amount), 0)
  const credit = lines.filter((l) => l.type === 'credit').reduce((n, l) => n + toCents(l.amount), 0)
  if (debit !== credit) throw appError('জার্নালের ডেবিট ও ক্রেডিট মেলেনি — অঙ্ক যাচাই করো')

  return { status: 'ok', lines, accounts }
}

// অ্যাকাউন্টের ধরন অনুযায়ী ব্যালেন্স কতটা বাড়বে/কমবে (সম্পদ ও ব্যয়: ডেবিটে বাড়ে; বাকিগুলো: ক্রেডিটে বাড়ে)
function balanceDelta(accountType: string, lineType: TransactionType, amount: number): number {
  const normalDebit = accountType === 'asset' || accountType === 'expense'
  return (lineType === 'debit') === normalDebit ? amount : -amount
}

// জার্নাল এন্ট্রি লেখা + অ্যাকাউন্টের ব্যালেন্স আপডেট (একই transaction-এ)
function writePosting(
  tx: Transaction,
  plan: PostingOk,
  entry: { businessId: string; description: string; reference: string; source: JournalSource; sourceId: string; createdBy: string },
): void {
  const lines = plan.lines.map((l) => {
    const a = plan.accounts.get(l.key)!
    return { accountId: a.id, accountName: a.data.name, type: l.type, amount: l.amount }
  })
  tx.set(doc(collection(db, 'journalEntries')), {
    ...entry, date: new Date(), lines, createdAt: serverTimestamp(),
  })

  // একই অ্যাকাউন্ট একাধিক লাইনে থাকলে একবারেই আপডেট
  const byAccount = new Map<string, { balance: number; delta: number }>()
  for (const l of plan.lines) {
    const a   = plan.accounts.get(l.key)!
    const cur = byAccount.get(a.id) ?? { balance: a.data.balance ?? 0, delta: 0 }
    cur.delta += balanceDelta(a.data.type, l.type, l.amount)
    byAccount.set(a.id, cur)
  }
  byAccount.forEach((v, id) => {
    tx.update(doc(db, 'accounts', id), { balance: round2(v.balance + v.delta) })
  })
}

// ---------- হাতে জার্নাল ----------

export async function addJournalEntry(data: Omit<JournalEntry, 'id'>): Promise<string> {
  if (data.lines.length < 2) throw appError('কমপক্ষে দুটি লাইন লাগবে')
  if (data.lines.some((l) => !(l.amount > 0))) throw appError('প্রতিটি লাইনের পরিমাণ শূন্যের বেশি হতে হবে')
  const sum = (t: TransactionType) =>
    data.lines.filter((l) => l.type === t).reduce((n, l) => n + toCents(l.amount), 0)
  if (sum('debit') !== sum('credit')) throw appError('ডেবিট ও ক্রেডিট সমান হতে হবে')

  const ids      = Array.from(new Set(data.lines.map((l) => l.accountId)))
  const entryRef = doc(collection(db, 'journalEntries'))

  await runTransaction(db, async (tx) => {
    const snaps = await Promise.all(ids.map((id) => tx.get(doc(db, 'accounts', id))))
    const info  = new Map<string, DocumentData>()
    snaps.forEach((s, i) => {
      if (!s.exists() || s.data().businessId !== data.businessId) throw appError('অ্যাকাউন্ট পাওয়া যায়নি')
      info.set(ids[i], s.data())
    })

    tx.set(entryRef, { ...data, source: 'manual', createdAt: serverTimestamp() })

    const delta = new Map<string, number>()
    data.lines.forEach((l) => {
      const t = info.get(l.accountId)!.type
      delta.set(l.accountId, (delta.get(l.accountId) ?? 0) + balanceDelta(t, l.type, l.amount))
    })
    delta.forEach((d, id) => {
      tx.update(doc(db, 'accounts', id), { balance: round2((info.get(id)!.balance ?? 0) + d) })
    })
  })
  return entryRef.id
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
  if (!(data.amount > 0)) throw appError('পরিমাণ সঠিক নয়')
  const ref = doc(collection(db, 'expenses'))

  await runTransaction(db, async (tx) => {
    const posting = await readPosting(tx, data.businessId, expenseLines(data))
    tx.set(ref, {
      ...data,
      createdAt: serverTimestamp(),
      ...(posting.status === 'ok'      ? { journalPosted: true }  : {}),
      ...(posting.status === 'skipped' ? { journalSkipped: true } : {}),
    })
    if (posting.status === 'ok') {
      writePosting(tx, posting, {
        businessId:  data.businessId,
        description: `ব্যয় - ${data.category}`,
        reference:   data.reference || data.category,
        source:      'expense',
        sourceId:    ref.id,
        createdBy:   data.createdBy,
      })
    }
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

// জার্নালে বসে থাকা ব্যয় মুছলে উল্টো এন্ট্রি বসে (জার্নাল কখনও মোছা হয় না)
export async function deleteExpense(id: string, userId: string): Promise<void> {
  const ref = doc(db, 'expenses', id)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    const e = snap.data()

    let posting: PostingPlan = { status: 'off' }
    if (e.journalPosted) {
      posting = await readPosting(tx, e.businessId, expenseLines(e as { amount: number; paymentMethod: PaymentMethod }, true), { ignoreSwitch: true })
      if (posting.status !== 'ok') {
        throw appError('এই ব্যয়ের জার্নাল উল্টাতে অ্যাকাউন্ট পাওয়া যায়নি — অ্যাকাউন্টিং থেকে অটো-পোস্টিং আবার চালু করুন')
      }
      writePosting(tx, posting, {
        businessId:  e.businessId,
        description: `ব্যয় বাতিল - ${e.category}`,
        reference:   e.reference || e.category,
        source:      'expense_reversal',
        sourceId:    id,
        createdBy:   userId,
      })
    }
    tx.delete(ref)
  })
}

// অটো-পোস্টিং চালু থাকা সত্ত্বেও যে লেনদেন জার্নালে বসেনি তার সংখ্যা (সর্বোচ্চ ৫০ গোনে)
export async function getJournalSkippedCount(businessId: string): Promise<number> {
  const counts = await Promise.all(
    ['sales', 'purchases', 'expenses', 'payroll', 'stockMovements'].map(async (col) => {
      const snap = await getDocs(query(
        collection(db, col),
        where('businessId', '==', businessId),
        where('journalSkipped', '==', true),
        limit(50),
      ))
      return snap.size
    }),
  )
  return counts.reduce((a, b) => a + b, 0)
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
  if (!(data.netSalary >= 0)) throw appError('বেতনের পরিমাণ সঠিক নয়')
  const ref = doc(collection(db, 'payroll'))

  await runTransaction(db, async (tx) => {
    const amt = toCents(data.netSalary)
    const posting = await readPosting(tx, data.businessId, lineSet([
      { key: 'expense',                   type: 'debit',  cents: amt },
      { key: walletKey(data.paymentMethod), type: 'credit', cents: amt },
    ]))
    tx.set(ref, {
      ...data,
      createdAt: serverTimestamp(),
      ...(posting.status === 'ok'      ? { journalPosted: true }  : {}),
      ...(posting.status === 'skipped' ? { journalSkipped: true } : {}),
    })
    if (posting.status === 'ok') {
      writePosting(tx, posting, {
        businessId:  data.businessId,
        description: `বেতন - ${data.employeeName}`,
        reference:   `${data.month}/${data.year}`,
        source:      'payroll',
        sourceId:    ref.id,
        createdBy:   data.createdBy,
      })
    }
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
