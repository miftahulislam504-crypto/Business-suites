import { auth } from './firebase'
import { appError } from './firestore'

export interface AIMessage {
  role:    'user' | 'assistant'
  content: string
}

// ব্রাউজার থেকে সরাসরি Anthropic না ডেকে নিজের সার্ভার route (/api/ai) ডাকে।
// ব্যর্থ হলে বাংলা বার্তাসহ AppError ছোড়ে — userMessage(e, fallback) দিয়ে দেখানো যায়।
export async function askAI(params: {
  businessId: string
  system:     string
  messages:   AIMessage[]
  maxTokens?: number
}): Promise<string> {
  const user = auth.currentUser
  if (!user) throw appError('আবার লগইন করো')
  const token = await user.getIdToken()

  const res  = await fetch('/api/ai', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body:    JSON.stringify(params),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw appError(data?.error ?? 'AI-তে সমস্যা হয়েছে')
  return typeof data.text === 'string' ? data.text : ''
}
