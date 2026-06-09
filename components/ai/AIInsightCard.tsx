'use client'

import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { buildBusinessContext, buildSystemPrompt } from '@/lib/ai-context'

interface Props {
  compact?: boolean
}

export function AIInsightCard({ compact = false }: Props) {
  const { activeBusiness } = useAppStore()
  const [insight,  setInsight]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [generated, setGenerated] = useState(false)

  async function generateInsight() {
    if (!activeBusiness) return
    setLoading(true)
    setInsight('')
    try {
      const context    = await buildBusinessContext(activeBusiness)
      const systemPmt  = buildSystemPrompt(context)

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system:     systemPmt,
          messages: [{
            role:    'user',
            content: 'আমার ব্যবসার এখনকার সবচেয়ে গুরুত্বপূর্ণ ৩টি বিষয় কী? সংক্ষেপে বলো এবং প্রতিটিতে একটি করে পরামর্শ দাও।',
          }],
        }),
      })
      const data = await response.json()
      setInsight(data.content?.[0]?.text ?? 'উত্তর পাওয়া যায়নি')
      setGenerated(true)
      setExpanded(true)
    } catch {
      setInsight('AI সংযোগে সমস্যা হয়েছে। পরে আবার চেষ্টা করো।')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card border border-indigo-100 dark:border-indigo-900 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles size={13} className="text-white" />
          </div>
          <h3 className="font-bold text-sm text-indigo-700 dark:text-indigo-300">AI Business Insight</h3>
        </div>
        {generated && (
          <button onClick={generateInsight}
            className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-500 transition-colors">
            <RefreshCw size={13} />
          </button>
        )}
      </div>

      {!generated && !loading && (
        <div className="text-center py-2">
          <p className="text-xs text-gray-500 mb-3">AI তোমার ব্যবসার ডেটা বিশ্লেষণ করে গুরুত্বপূর্ণ insights দেবে</p>
          <button onClick={generateInsight}
            className="flex items-center gap-1.5 mx-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
            <Sparkles size={13} /> বিশ্লেষণ করো
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-2 text-indigo-600">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">বিশ্লেষণ করছে...</span>
        </div>
      )}

      {generated && insight && (
        <div>
          <div className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed ${!expanded && 'line-clamp-3'}`}>
            {insight.split('\n').map((line, i) => (
              <span key={i}>{line}{i < insight.split('\n').length - 1 && <br />}</span>
            ))}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-indigo-600 mt-2 hover:text-indigo-800"
          >
            {expanded ? <><ChevronUp size={12} /> সংক্ষেপ করো</> : <><ChevronDown size={12} /> বিস্তারিত পড়ো</>}
          </button>
        </div>
      )}
    </div>
  )
}
