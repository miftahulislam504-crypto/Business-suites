'use client'

import { useState } from 'react'
import { Sparkles, Loader2, TrendingDown, TrendingUp, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { buildBusinessContext, buildSystemPrompt } from '@/lib/ai-context'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

const analysisQuestions = [
  { label: 'এই মাসে লাভ কেন কমেছে?',        prompt: 'এই মাসে লাভ কমার সম্ভাব্য কারণ বিশ্লেষণ করো এবং সমাধানের পরামর্শ দাও।' },
  { label: 'বিক্রয় কেন কমেছে/বেড়েছে?',      prompt: 'বিক্রয়ের প্রবণতা বিশ্লেষণ করো। কী কারণে পরিবর্তন হয়েছে এবং কী করা উচিত?' },
  { label: 'ব্যয় কোথায় বেশি হচ্ছে?',         prompt: 'কোন খাতে অতিরিক্ত ব্যয় হচ্ছে? ব্যয় কমানোর পরামর্শ দাও।' },
  { label: 'কোন পণ্য ভালো চলছে না?',          prompt: 'কম বিক্রিত বা লোকসানি পণ্য চিহ্নিত করো এবং পরামর্শ দাও।' },
  { label: 'কাস্টমার পাওনা ঝুঁকি কতটুকু?',   prompt: 'কাস্টমার পাওনার ঝুঁকি বিশ্লেষণ করো। কার কাছ থেকে টাকা আদায় জরুরি?' },
  { label: 'ব্যবসার সার্বিক স্বাস্থ্য কেমন?', prompt: 'ব্যবসার সার্বিক আর্থিক স্বাস্থ্য মূল্যায়ন করো। শক্তি ও দুর্বলতা চিহ্নিত করো।' },
]

interface AnalysisResult {
  question: string
  answer:   string
  time:     Date
}

export function AIReportAnalysis() {
  const { activeBusiness } = useAppStore()
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState<AnalysisResult | null>(null)
  const [expanded,  setExpanded]  = useState(true)
  const [customQ,   setCustomQ]   = useState('')
  const [showCustom,setShowCustom]= useState(false)

  async function analyze(question: string, prompt: string) {
    if (!activeBusiness || loading) return
    setLoading(true)
    setResult(null)
    try {
      const context = await buildBusinessContext(activeBusiness)
      const system  = buildSystemPrompt(context)

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await response.json()
      setResult({
        question,
        answer: data.content?.[0]?.text ?? 'বিশ্লেষণ পাওয়া যায়নি।',
        time:   new Date(),
      })
      setExpanded(true)
    } catch {
      setResult({
        question,
        answer: 'সংযোগ সমস্যা। আবার চেষ্টা করো।',
        time:   new Date(),
      })
    } finally {
      setLoading(false)
    }
  }

  function handleCustom() {
    if (!customQ.trim()) return
    analyze(customQ, customQ)
    setCustomQ('')
    setShowCustom(false)
  }

  return (
    <div className="card border border-indigo-100 dark:border-indigo-900">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Sparkles size={15} className="text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">AI রিপোর্ট বিশ্লেষণ</h3>
          <p className="text-xs text-gray-400">একটি প্রশ্ন বেছে নাও — AI বিশ্লেষণ করবে</p>
        </div>
      </div>

      {/* Quick question chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {analysisQuestions.map(q => (
          <button
            key={q.label}
            onClick={() => analyze(q.label, q.prompt)}
            disabled={loading}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              loading
                ? 'border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed'
                : 'border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:border-indigo-400',
            )}
          >
            {q.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-all"
        >
          + নিজের প্রশ্ন
        </button>
      </div>

      {/* Custom question input */}
      {showCustom && (
        <div className="flex gap-2 mb-4">
          <input
            value={customQ}
            onChange={e => setCustomQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCustom()}
            placeholder="তোমার নিজের প্রশ্ন লেখো..."
            className="input-field flex-1 text-sm"
            autoFocus
          />
          <button onClick={handleCustom} disabled={!customQ.trim() || loading}
            className="btn-primary px-4 py-2 text-sm">
            বিশ্লেষণ
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-950 rounded-xl">
          <Loader2 size={18} className="animate-spin text-indigo-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">বিশ্লেষণ করছে...</p>
            <p className="text-xs text-indigo-500">ব্যবসার সব ডেটা পর্যালোচনা হচ্ছে</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 rounded-xl border border-indigo-100 dark:border-indigo-900 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-100 dark:border-indigo-900">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-indigo-500" />
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 line-clamp-1">{result.question}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => result && analyze(result.question,
                analysisQuestions.find(q => q.label === result.question)?.prompt ?? result.question)}
                className="text-indigo-400 hover:text-indigo-600 p-1">
                <RefreshCw size={12} />
              </button>
              <button onClick={() => setExpanded(!expanded)}
                className="text-indigo-400 hover:text-indigo-600 p-1">
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {expanded && (
            <div className="px-4 py-3">
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {result.answer}
              </div>
              <p className="text-xs text-indigo-400 mt-3">
                {result.time.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
