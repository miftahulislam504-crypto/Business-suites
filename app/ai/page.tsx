'use client'

import { useState, useEffect, useRef } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { ChatMessage, type Message } from '@/components/ai/ChatMessage'
import { SuggestedQuestions } from '@/components/ai/SuggestedQuestions'
import { AIReportAnalysis } from '@/components/ai/AIReportAnalysis'
import { AIForecast } from '@/components/ai/AIForecast'
import { buildBusinessContext, buildSystemPrompt } from '@/lib/ai-context'
import { useAppStore } from '@/store/useAppStore'
import {
  Send, Loader2, Sparkles, Trash2,
  Bot, RefreshCw, AlertCircle,
  MessageCircle, BarChart2, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'chat' | 'analysis' | 'forecast'

export default function AIPage() {
  const { activeBusiness } = useAppStore()

  const [tab,        setTab]        = useState<Tab>('chat')
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [context,    setContext]    = useState('')
  const [ctxLoading, setCtxLoading] = useState(true)
  const [ctxError,   setCtxError]   = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    async function loadContext() {
      if (!activeBusiness) return
      setCtxLoading(true)
      setCtxError(false)
      try {
        const ctx = await buildBusinessContext(activeBusiness)
        setContext(ctx)
        setMessages([{
          id:      'welcome',
          role:    'assistant',
          content: `আসসালামুআলাইকুম! আমি তোমার **${activeBusiness.name}**-এর AI সহকারী।\n\nতোমার ব্যবসার ডেটা বিশ্লেষণ করে যেকোনো প্রশ্নের উত্তর দিতে পারবো। যেমন:\n• লাভ-ক্ষতির হিসাব\n• সেরা পণ্য বা কাস্টমার\n• পরামর্শ ও forecasting\n\nকী জানতে চাও?`,
          time:    new Date(),
        }])
      } catch {
        setCtxError(true)
      } finally {
        setCtxLoading(false)
      }
    }
    loadContext()
  }, [activeBusiness])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text?: string) {
    const userText = (text ?? input).trim()
    if (!userText || loading || !context) return

    const userMsg: Message = {
      id:      Date.now().toString(),
      role:    'user',
      content: userText,
      time:    new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.slice(-10).map(m => ({
        role:    m.role,
        content: m.content,
      }))

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system:     buildSystemPrompt(context),
          messages:   [...history, { role: 'user', content: userText }],
        }),
      })

      if (!response.ok) throw new Error()
      const data    = await response.json()
      const aiText  = data.content?.[0]?.text ?? 'উত্তর পাওয়া যায়নি।'

      setMessages(prev => [...prev, {
        id:      (Date.now() + 1).toString(),
        role:    'assistant',
        content: aiText,
        time:    new Date(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        id:      (Date.now() + 1).toString(),
        role:    'assistant',
        content: 'দুঃখিত, এই মুহূর্তে সংযোগ হচ্ছে না। ইন্টারনেট চেক করো এবং আবার চেষ্টা করো।',
        time:    new Date(),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'chat',     label: 'AI Chat',       icon: <MessageCircle size={15} /> },
    { key: 'analysis', label: 'রিপোর্ট বিশ্লেষণ', icon: <BarChart2 size={15} />    },
    { key: 'forecast', label: 'Forecast',       icon: <TrendingUp size={15} />     },
  ]

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-900 dark:text-white">AI Business Assistant</h1>
            <p className="text-xs text-gray-400">Powered by Claude • তোমার ব্যবসার ডেটা দিয়ে বিশ্লেষণ</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-5">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all',
                tab === t.key
                  ? 'bg-white dark:bg-gray-900 shadow-sm text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
              )}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Context loading */}
        {ctxLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-xl">
                <Loader2 size={24} className="text-white animate-spin" />
              </div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">ব্যবসার ডেটা লোড হচ্ছে...</p>
              <p className="text-sm text-gray-400 mt-1">একটু অপেক্ষা করো</p>
            </div>
          </div>
        )}

        {/* Context error */}
        {ctxError && !ctxLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
              <p className="font-semibold mb-4">ডেটা লোড হয়নি</p>
              <button onClick={() => window.location.reload()}
                className="flex items-center gap-2 mx-auto btn-primary px-4 py-2">
                <RefreshCw size={14} /> আবার চেষ্টা করো
              </button>
            </div>
          </div>
        )}

        {/* Tab content */}
        {!ctxLoading && !ctxError && (
          <>
            {/* ===== CHAT TAB ===== */}
            {tab === 'chat' && (
              <div className="flex flex-col" style={{ height: 'calc(100vh - 16rem)' }}>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 py-2 px-1">
                  {messages.map(msg => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}

                  {/* Typing indicator */}
                  {loading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                        <Bot size={15} className="text-white" />
                      </div>
                      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                        <div className="flex gap-1.5 items-center h-5">
                          {[0,1,2].map(i => (
                            <div key={i}
                              className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {messages.length <= 1 && !loading && (
                    <SuggestedQuestions onSelect={q => sendMessage(q)} />
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="shrink-0 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex gap-2 items-end">
                    {messages.length > 1 && (
                      <button
                        onClick={() => setMessages(prev => prev.slice(0,1))}
                        className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors shrink-0"
                        title="চ্যাট পরিষ্কার করো"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="তোমার ব্যবসা সম্পর্কে যেকোনো প্রশ্ন করো..."
                        rows={1}
                        className={cn(
                          'w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700',
                          'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
                          'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                          'resize-none text-sm leading-relaxed max-h-32 overflow-y-auto',
                        )}
                        style={{ minHeight: '48px' }}
                      />
                    </div>
                    <button
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || loading}
                      className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0',
                        input.trim() && !loading
                          ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg hover:opacity-90 active:scale-95'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed',
                      )}
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-center text-gray-400 mt-2">
                    Enter চাপো পাঠাতে • Shift+Enter নতুন লাইন
                  </p>
                </div>
              </div>
            )}

            {/* ===== ANALYSIS TAB ===== */}
            {tab === 'analysis' && (
              <div className="pb-6">
                <AIReportAnalysis />
              </div>
            )}

            {/* ===== FORECAST TAB ===== */}
            {tab === 'forecast' && (
              <div className="pb-6">
                <AIForecast />
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  )
}
