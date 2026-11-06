import { NextRequest, NextResponse } from 'next/server'

// Vercel-এ Node runtime; AI উত্তরের জন্য একটু বেশি সময় দেওয়া হলো
export const runtime = 'nodejs'
export const maxDuration = 60

// কোন AI ব্যবহার হবে: GROQ_API_KEY থাকলে Groq (ফ্রি tier আছে), নাহলে ANTHROPIC_API_KEY।
// দুটোই থাকলে AI_PROVIDER=groq|anthropic দিয়ে বাছা যায়।
const GROQ_MODEL        = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'   // llama-3.3-70b-versatile ১৬ আগস্ট ২০২৬ থেকে বন্ধ
const ANTHROPIC_MODEL   = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5'
// Groq ফ্রি tier: প্রতি মিনিটে ৮,০০০ টোকেন, দিনে ২ লাখ (কনসোলের limits পাতায় আসল সীমা দেখুন)
const GROQ_MAX_OUTPUT   = Math.max(200,  Number(process.env.GROQ_MAX_OUTPUT)  || 1500)
const GROQ_TPM_BUDGET   = Math.max(2000, Number(process.env.GROQ_TPM_BUDGET)  || 7000)
const AI_ROLES          = ['owner', 'manager', 'accountant']   // lib/permissions.ts-এর 'ai' এর সাথে মিল
const MAX_SYSTEM_CHARS  = 20000
const MAX_MESSAGES      = 20
const MAX_MESSAGE_CHARS = 4000
const MAX_TOKENS_CAP    = 2000
const RATE_LIMIT        = 20          // প্রতি ব্যবহারকারী, প্রতি মিনিটে
const RATE_WINDOW_MS    = 60_000

type Msg = { role: 'user' | 'assistant'; content: string }
type Provider = 'groq' | 'anthropic'
type Outcome  = { ok: true; text: string } | { ok: false; status: number; error: string }

function pickProvider(): { provider: Provider; key: string } | null {
  const groq = process.env.GROQ_API_KEY
  const anth = process.env.ANTHROPIC_API_KEY
  const want = (process.env.AI_PROVIDER || '').toLowerCase()
  if (want === 'anthropic' && anth) return { provider: 'anthropic', key: anth }
  if (want === 'groq' && groq)      return { provider: 'groq', key: groq }
  if (groq) return { provider: 'groq', key: groq }
  if (anth) return { provider: 'anthropic', key: anth }
  return null
}

// বাংলা লেখায় টোকেন বেশি লাগে — মোটামুটি ২ অক্ষরে ১ টোকেন ধরে আন্দাজ (নিরাপদ দিকে)
const estTokens = (s: string) => Math.ceil(s.length / 2)

// ফ্রি সীমার মধ্যে রাখতে সবচেয়ে পুরনো কথোপকথন আগে বাদ; শেষ প্রশ্ন সবসময় থাকে
function fitHistory(system: string, msgs: Msg[], maxOut: number, budget: number): Msg[] {
  const out  = [...msgs]
  const used = () => estTokens(system) + out.reduce((n, m) => n + estTokens(m.content), 0) + maxOut
  while (out.length > 1 && used() > budget) out.shift()
  while (out.length > 1 && out[0].role !== 'user') out.shift()
  return out
}

async function callGroq(key: string, system: string, msgs: Msg[], maxTokens: number, signal: AbortSignal): Promise<Outcome> {
  const maxOut  = Math.min(maxTokens, GROQ_MAX_OUTPUT)
  const history = fitHistory(system, msgs, maxOut, GROQ_TPM_BUDGET)
  const isOss   = GROQ_MODEL.startsWith('openai/gpt-oss')

  const send = (withEffort: boolean) => fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model:                 GROQ_MODEL,
      messages:              [{ role: 'system', content: system }, ...history],
      max_completion_tokens: maxOut,
      temperature:           0.5,
      ...(withEffort ? { reasoning_effort: 'low' } : {}),   // GPT-OSS: কম "ভাবা" = টোকেন কম খরচ
    }),
    signal,
  })

  let res = await send(isOss)
  if (res.status === 400 && isOss) res = await send(false)   // মডেল reasoning_effort না নিলে ছাড়া আবার

  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json())?.error?.message ?? '' } catch { /* ignore */ }
    console.error('Groq API error', res.status)   // ব্যবসার ডেটা লগে রাখি না — শুধু স্ট্যাটাস

    if (res.status === 429 && /per day|TPD|RPD/i.test(detail)) {
      return { ok: false, status: 429, error: 'আজকের ফ্রি AI সীমা শেষ — কাল আবার চেষ্টা করো' }
    }
    if (res.status === 413 || /too large|reduce your message/i.test(detail)) {
      return { ok: false, status: 413, error: 'ব্যবসার তথ্য ফ্রি সীমার চেয়ে বড় হয়ে গেছে — এক মিনিট পর ছোট প্রশ্নে চেষ্টা করো' }
    }
    if (res.status === 429) {
      const wait = Math.ceil(Number(res.headers.get('retry-after')) || 0)
      return { ok: false, status: 429, error: wait > 0
        ? `AI-র ফ্রি সীমা পেরিয়ে গেছে — ${wait} সেকেন্ড পর আবার চেষ্টা করো`
        : 'AI-র ফ্রি সীমা পেরিয়ে গেছে — এক মিনিট পর আবার চেষ্টা করো' }
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, status: 500, error: 'AI-র কনফিগারেশনে সমস্যা — GROQ_API_KEY ঠিক আছে কিনা দেখুন' }
    }
    if (res.status === 404) {
      return { ok: false, status: 500, error: 'AI মডেল পাওয়া যায়নি — GROQ_MODEL ঠিক আছে কিনা দেখুন' }
    }
    return { ok: false, status: 502, error: 'AI উত্তর দিতে পারেনি, আবার চেষ্টা করো' }
  }

  const data   = await res.json()
  const choice = data?.choices?.[0]
  const text   = String(choice?.message?.content ?? '').trim()
  if (!text) {
    return { ok: false, status: 502, error: choice?.finish_reason === 'length'
      ? 'উত্তর অসম্পূর্ণ থেকে গেছে — আবার চেষ্টা করো'
      : 'AI উত্তর দেয়নি, আবার চেষ্টা করো' }
  }
  return { ok: true, text }
}

async function callAnthropic(key: string, system: string, msgs: Msg[], maxTokens: number, signal: AbortSignal): Promise<Outcome> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body:    JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: maxTokens, system, messages: msgs }),
    signal,
  })
  if (!res.ok) {
    console.error('Anthropic API error', res.status)
    if (res.status === 429) return { ok: false, status: 429, error: 'AI এখন ব্যস্ত, একটু পরে চেষ্টা করো' }
    if (res.status === 401 || res.status === 403) return { ok: false, status: 500, error: 'AI-র কনফিগারেশনে সমস্যা — API key ঠিক আছে কিনা দেখুন' }
    return { ok: false, status: 502, error: 'AI উত্তর দিতে পারেনি, আবার চেষ্টা করো' }
  }
  const data = await res.json()
  const text = (data.content ?? [])
    .filter((b: any) => b?.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
    .trim()
  return { ok: true, text }
}

// সহজ rate limit — সার্ভারের প্রতিটা instance-এ আলাদা চলে, তাই পুরোপুরি কড়া না, কিন্তু অপব্যবহার কমায়
const hits = new Map<string, number[]>()

function rateLimited(uid: string): boolean {
  const now    = Date.now()
  const recent = (hits.get(uid) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) {
    hits.set(uid, recent)
    return true
  }
  recent.push(now)
  hits.set(uid, recent)
  return false
}

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

// Firebase ID token (JWT) থেকে uid, aud, exp পড়ে।
// সই এখানে যাচাই হয় না — পরের ধাপে Firestore নিজেই এই token দিয়ে অনুরোধ যাচাই করে।
function tokenClaims(token: string): { uid: string; aud: string; exp: number } | null {
  try {
    const part = token.split('.')[1]
    const p    = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
    const uid  = p.user_id ?? p.sub
    if (typeof uid !== 'string' || typeof p.aud !== 'string' || typeof p.exp !== 'number') return null
    return { uid, aud: p.aud, exp: p.exp }
  } catch {
    return null
  }
}

// Firestore REST-এর ব্যবসা doc থেকে এই ব্যবহারকারীর ভূমিকা বের করে
function roleFromDoc(fields: any, uid: string): string | null {
  if (fields?.ownerId?.stringValue === uid) return 'owner'
  const fromMap = fields?.roles?.mapValue?.fields?.[uid]?.stringValue
  if (fromMap) return fromMap
  const members: any[] = fields?.members?.arrayValue?.values ?? []
  const me = members.find((v) => v?.mapValue?.fields?.uid?.stringValue === uid)
  return me?.mapValue?.fields?.role?.stringValue ?? null
}

export async function POST(req: NextRequest) {
  const picked    = pickProvider()
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  if (!picked || !projectId) {
    return fail(500, 'AI এখনো চালু করা হয়নি — সার্ভারে GROQ_API_KEY (অথবা ANTHROPIC_API_KEY) বসাতে হবে')
  }

  // ১) লগইন করা ব্যবহারকারী কিনা
  const token  = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const claims = token ? tokenClaims(token) : null
  if (!claims || claims.aud !== projectId || claims.exp * 1000 < Date.now()) {
    return fail(401, 'আবার লগইন করো')
  }

  // ২) অনুরোধ যাচাই
  let body: any
  try { body = await req.json() } catch { return fail(400, 'অনুরোধ সঠিক নয়') }

  const businessId = body?.businessId
  if (typeof businessId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(businessId)) {
    return fail(400, 'ব্যবসা চেনা যায়নি')
  }
  const system = typeof body?.system === 'string' ? body.system : ''
  if (!system || system.length > MAX_SYSTEM_CHARS) return fail(400, 'অনুরোধ সঠিক নয়')

  const msgs: Msg[] = []
  const raw: any[]  = Array.isArray(body?.messages) ? body.messages.slice(-MAX_MESSAGES) : []
  for (const m of raw) {
    if ((m?.role !== 'user' && m?.role !== 'assistant') || typeof m.content !== 'string') continue
    const content = m.content.trim().slice(0, MAX_MESSAGE_CHARS)
    if (!content) continue
    const last = msgs[msgs.length - 1]
    if (last && last.role === m.role) last.content += '\n\n' + content   // পরপর একই ভূমিকা মিলিয়ে দাও
    else msgs.push({ role: m.role, content })
  }
  while (msgs.length > 0 && msgs[0].role !== 'user') msgs.shift()       // শুরু অবশ্যই user দিয়ে
  if (msgs.length === 0 || msgs[msgs.length - 1].role !== 'user') return fail(400, 'প্রশ্ন পাওয়া যায়নি')

  const maxTokens = Math.min(Math.max(Number(body?.maxTokens) || 1000, 100), MAX_TOKENS_CAP)

  // ৩) ব্যবহারকারী এই ব্যবসার সদস্য কিনা, আর ভূমিকা AI-র জন্য যথেষ্ট কিনা
  //    ব্যবহারকারীর নিজের token দিয়েই Firestore পড়া হয়, তাই আপনার rules-ই এখানে সিদ্ধান্ত নেয়
  let role: string | null = null
  try {
    const fsRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/businesses/${businessId}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
    )
    if (fsRes.status === 401) return fail(401, 'আবার লগইন করো')
    if (fsRes.status === 403 || fsRes.status === 404) return fail(403, 'এই ব্যবসায় আপনার অনুমতি নেই')
    if (!fsRes.ok) return fail(502, 'অনুমতি যাচাই করা যায়নি, আবার চেষ্টা করো')
    const doc = await fsRes.json()
    role = roleFromDoc(doc?.fields, claims.uid)
  } catch {
    return fail(502, 'অনুমতি যাচাই করা যায়নি, আবার চেষ্টা করো')
  }
  if (!role || !AI_ROLES.includes(role)) {
    return fail(403, 'AI সহকারী শুধু মালিক, ম্যানেজার ও হিসাবরক্ষক ব্যবহার করতে পারেন')
  }

  if (rateLimited(claims.uid)) return fail(429, 'একটু থেমে আবার চেষ্টা করো — অনেক দ্রুত অনুরোধ হচ্ছে')

  // ৪) AI-কে ডাকা (API key শুধু সার্ভারে থাকে)
  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), 55_000)
  try {
    const call = picked.provider === 'groq' ? callGroq : callAnthropic
    const r    = await call(picked.key, system, msgs, maxTokens, controller.signal)
    if (!r.ok) return fail(r.status, r.error)
    return NextResponse.json({ text: r.text })
  } catch (e: any) {
    if (e?.name === 'AbortError') return fail(504, 'AI উত্তর দিতে অনেক দেরি করছে, আবার চেষ্টা করো')
    console.error('AI route failed')
    return fail(502, 'AI সংযোগে সমস্যা হয়েছে')
  } finally {
    clearTimeout(timer)
  }
}
