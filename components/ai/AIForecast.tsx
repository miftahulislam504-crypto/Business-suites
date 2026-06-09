'use client'

import { useState } from 'react'
import {
  Sparkles, Loader2, TrendingUp, Package,
  Wallet, RefreshCw, ChevronDown, ChevronUp,
  BarChart2,
} from 'lucide-react'
import { buildBusinessContext, buildSystemPrompt } from '@/lib/ai-context'
import { useAppStore } from '@/store/useAppStore'
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from 'recharts'
import { cn } from '@/lib/utils'

type ForecastType = 'sales' | 'inventory' | 'cashflow'

interface ForecastData {
  type:    ForecastType
  text:    string
  chart?:  any[]
  time:    Date
}

const forecastConfig: Record<ForecastType, {
  label: string
  icon: React.ReactNode
  color: string
  bg: string
  prompt: string
}> = {
  sales: {
    label:  'বিক্রয় Forecast',
    icon:   <TrendingUp size={16} />,
    color:  'text-blue-600',
    bg:     'bg-blue-50 dark:bg-blue-950',
    prompt: `আমার বিক্রয় ডেটার ভিত্তিতে আগামী ৩০ দিনের বিক্রয় forecast করো।
উত্তরে অবশ্যই এই JSON ফরম্যাটে একটি forecast_data অ্যারে দাও (7টি weekly projection):
<forecast_data>
[
  {"week": "সপ্তাহ ১", "projected": NUMBER, "min": NUMBER, "max": NUMBER},
  {"week": "সপ্তাহ ২", "projected": NUMBER, "min": NUMBER, "max": NUMBER},
  {"week": "সপ্তাহ ৩", "projected": NUMBER, "min": NUMBER, "max": NUMBER},
  {"week": "সপ্তাহ ৪", "projected": NUMBER, "min": NUMBER, "max": NUMBER}
]
</forecast_data>
তারপর বাংলায় বিস্তারিত বিশ্লেষণ এবং পরামর্শ দাও।`,
  },
  inventory: {
    label:  'ইনভেন্টরি Forecast',
    icon:   <Package size={16} />,
    color:  'text-orange-600',
    bg:     'bg-orange-50 dark:bg-orange-950',
    prompt: `আমার বিক্রয় ও স্টক ডেটার ভিত্তিতে কোন পণ্যগুলো কত দিনে শেষ হবে এবং কখন রিঅর্ডার করতে হবে তা forecast করো।
উত্তরে অবশ্যই এই JSON ফরম্যাটে একটি inventory_forecast অ্যারে দাও (লো স্টক পণ্যগুলোর জন্য):
<inventory_forecast>
[
  {"product": "পণ্যের নাম", "currentStock": NUMBER, "daysLeft": NUMBER, "reorderDate": "তারিখ", "suggestedQty": NUMBER},
  {"product": "পণ্যের নাম", "currentStock": NUMBER, "daysLeft": NUMBER, "reorderDate": "তারিখ", "suggestedQty": NUMBER}
]
</inventory_forecast>
তারপর বাংলায় বিস্তারিত পরামর্শ দাও।`,
  },
  cashflow: {
    label:  'ক্যাশ ফ্লো Forecast',
    icon:   <Wallet size={16} />,
    color:  'text-green-600',
    bg:     'bg-green-50 dark:bg-green-950',
    prompt: `আমার আয়, ব্যয়, পাওনা ও বকেয়া ডেটার ভিত্তিতে আগামী ৪ সপ্তাহের ক্যাশ ফ্লো forecast করো।
উত্তরে অবশ্যই এই JSON ফরম্যাটে একটি cashflow_forecast অ্যারে দাও:
<cashflow_forecast>
[
  {"week": "সপ্তাহ ১", "inflow": NUMBER, "outflow": NUMBER, "net": NUMBER},
  {"week": "সপ্তাহ ২", "inflow": NUMBER, "outflow": NUMBER, "net": NUMBER},
  {"week": "সপ্তাহ ৩", "inflow": NUMBER, "outflow": NUMBER, "net": NUMBER},
  {"week": "সপ্তাহ ৪", "inflow": NUMBER, "outflow": NUMBER, "net": NUMBER}
]
</cashflow_forecast>
তারপর বাংলায় বিস্তারিত বিশ্লেষণ ও পরামর্শ দাও।`,
  },
}

// Extract JSON from AI response between tags
function extractJSON(text: string, tag: string): any[] | null {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)
  const match = text.match(regex)
  if (!match) return null
  try { return JSON.parse(match[1].trim()) }
  catch { return null }
}

// Remove the JSON tags from display text
function cleanText(text: string): string {
  return text
    .replace(/<forecast_data>[\s\S]*?<\/forecast_data>/g, '')
    .replace(/<inventory_forecast>[\s\S]*?<\/inventory_forecast>/g, '')
    .replace(/<cashflow_forecast>[\s\S]*?<\/cashflow_forecast>/g, '')
    .trim()
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-3 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: ৳{Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export function AIForecast() {
  const { activeBusiness } = useAppStore()
  const [activeType, setActiveType] = useState<ForecastType>('sales')
  const [loading,    setLoading]    = useState(false)
  const [results,    setResults]    = useState<Record<ForecastType, ForecastData | null>>({
    sales: null, inventory: null, cashflow: null,
  })
  const [expanded,  setExpanded]  = useState(true)

  async function runForecast(type: ForecastType) {
    if (!activeBusiness || loading) return
    setLoading(true)
    setActiveType(type)
    try {
      const context = await buildBusinessContext(activeBusiness)
      const system  = buildSystemPrompt(context)
      const cfg     = forecastConfig[type]

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1500,
          system,
          messages: [{ role: 'user', content: cfg.prompt }],
        }),
      })
      const data = await response.json()
      const raw  = data.content?.[0]?.text ?? ''

      // Extract chart data
      let chart: any[] | null = null
      if (type === 'sales')     chart = extractJSON(raw, 'forecast_data')
      if (type === 'inventory') chart = extractJSON(raw, 'inventory_forecast')
      if (type === 'cashflow')  chart = extractJSON(raw, 'cashflow_forecast')

      setResults(prev => ({
        ...prev,
        [type]: { type, text: cleanText(raw), chart: chart ?? [], time: new Date() },
      }))
      setExpanded(true)
    } catch {
      setResults(prev => ({
        ...prev,
        [type]: { type, text: 'সংযোগ সমস্যা। আবার চেষ্টা করো।', chart: [], time: new Date() },
      }))
    } finally {
      setLoading(false)
    }
  }

  const current = results[activeType]

  return (
    <div className="card border border-purple-100 dark:border-purple-900">

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
          <BarChart2 size={15} className="text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">AI Forecasting</h3>
          <p className="text-xs text-gray-400">AI ভবিষ্যৎ পূর্বাভাস দেবে</p>
        </div>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(Object.keys(forecastConfig) as ForecastType[]).map(type => {
          const cfg    = forecastConfig[type]
          const isDone = !!results[type]
          return (
            <button key={type}
              onClick={() => { setActiveType(type); if (!results[type]) runForecast(type) }}
              disabled={loading}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                activeType === type
                  ? 'border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-950'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-200',
                loading && 'cursor-not-allowed opacity-60',
              )}>
              <div className={cn('p-1.5 rounded-lg', cfg.bg, cfg.color)}>
                {cfg.icon}
              </div>
              <span className="text-xs font-medium text-center leading-tight">{cfg.label}</span>
              {isDone && <span className="text-xs text-green-600">✓ তৈরি</span>}
            </button>
          )
        })}
      </div>

      {/* Run button if not generated */}
      {!current && !loading && (
        <button onClick={() => runForecast(activeType)}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
          <Sparkles size={15} />
          {forecastConfig[activeType].label} চালাও
        </button>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-950 rounded-xl">
          <Loader2 size={18} className="animate-spin text-purple-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
              {forecastConfig[activeType].label} তৈরি হচ্ছে...
            </p>
            <p className="text-xs text-purple-500">ডেটা বিশ্লেষণ করছে</p>
          </div>
        </div>
      )}

      {/* Result */}
      {current && !loading && (
        <div className="space-y-4">

          {/* Chart — Sales forecast */}
          {activeType === 'sales' && current.chart && current.chart.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">সাপ্তাহিক বিক্রয় পূর্বাভাস</p>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={current.chart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="projected" name="পূর্বাভাস" stroke="#8b5cf6" strokeWidth={2} fill="url(#gForecast)" />
                  <Area type="monotone" dataKey="max" name="সর্বোচ্চ" stroke="#22c55e" strokeWidth={1} strokeDasharray="4 4" fill="none" />
                  <Area type="monotone" dataKey="min" name="সর্বনিম্ন" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Chart — Inventory forecast */}
          {activeType === 'inventory' && current.chart && current.chart.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">পণ্য শেষ হওয়ার পূর্বাভাস (দিনে)</p>
              <div className="space-y-2">
                {current.chart.slice(0, 6).map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 dark:text-gray-400 w-32 truncate shrink-0">{item.product}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                      <div
                        className={cn(
                          'h-3 rounded-full transition-all',
                          item.daysLeft <= 3  ? 'bg-red-500' :
                          item.daysLeft <= 7  ? 'bg-orange-400' :
                          item.daysLeft <= 14 ? 'bg-yellow-400' : 'bg-green-400',
                        )}
                        style={{ width: `${Math.min(100, (item.daysLeft / 30) * 100)}%` }}
                      />
                    </div>
                    <span className={cn(
                      'text-xs font-bold w-16 text-right shrink-0',
                      item.daysLeft <= 3  ? 'text-red-600' :
                      item.daysLeft <= 7  ? 'text-orange-600' : 'text-green-600',
                    )}>
                      {item.daysLeft} দিন
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart — Cashflow forecast */}
          {activeType === 'cashflow' && current.chart && current.chart.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">সাপ্তাহিক ক্যাশ ফ্লো পূর্বাভাস</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={current.chart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="inflow"  name="আয়"  fill="#22c55e" radius={[4,4,0,0]} />
                  <Bar dataKey="outflow" name="ব্যয়" fill="#ef4444" radius={[4,4,0,0]} />
                  <Bar dataKey="net"     name="নিট"  fill="#3b82f6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* AI Analysis text */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/40 rounded-xl p-4 border border-purple-100 dark:border-purple-900">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-purple-600">AI বিশ্লেষণ</p>
              <div className="flex gap-2">
                <button onClick={() => runForecast(activeType)}
                  className="text-purple-400 hover:text-purple-600 p-1">
                  <RefreshCw size={11} />
                </button>
                <button onClick={() => setExpanded(!expanded)}
                  className="text-purple-400 hover:text-purple-600 p-1">
                  {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>
            </div>
            {expanded && (
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {current.text}
              </p>
            )}
          </div>

          <p className="text-xs text-gray-400 text-right">
            {current.time.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}
    </div>
  )
}
