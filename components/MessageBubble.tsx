'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export type DebugCall = { command: string; params: Record<string, unknown>; result: string }

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  debug?: DebugCall[]
  loading?: boolean  // 아직 응답 수신 중
}

function parseSource(content: string): { text: string; source: string | null } {
  const match = content.match(/<source>(.*?)<\/source>/)
  if (!match) return { text: content.trim(), source: null }
  return { text: content.replace(/<source>.*?<\/source>/, '').trim(), source: match[1] }
}

function highlightArticles(text: string): string {
  return text
    .replace(/제(\d+)조(의\d+)?/g, (m) => `**${m}**`)
    .replace(/제(\d+)항/g, (m) => `**${m}**`)
    .replace(/제(\d+)호/g, (m) => `**${m}**`)
}

function formatResult(raw: string): string {
  try { return JSON.stringify(JSON.parse(raw), null, 2) }
  catch { return raw }
}

function DebugPanel({ calls }: { calls: DebugCall[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  return (
    <div className="mt-2 rounded-xl overflow-hidden text-xs"
      style={{ border: '1px solid #C6E89A', background: '#F7FCF0' }}>
      <div className="px-3 py-2 flex items-center gap-2"
        style={{ background: '#EDF7DC', borderBottom: '1px solid #DCF0C0' }}>
        <span style={{ color: '#3A7D1E', fontWeight: 600 }}>api.beopmang.org 호출 내역</span>
        <span style={{ color: '#6B9A3E' }}>총 {calls.length}회</span>
      </div>
      {calls.map((call, i) => {
        const isOpen = openIndex === i
        let parsedResult: unknown = null
        try { parsedResult = JSON.parse(call.result) } catch { /* raw */ }
        let summary = ''
        if (parsedResult && typeof parsedResult === 'object') {
          const r = parsedResult as Record<string, unknown>
          if (r.law_name) summary = `→ ${r.law_name}`
          else if (r.total !== undefined) summary = `→ 총 ${r.total}건`
          else if (Array.isArray(r.results)) summary = `→ ${(r.results as unknown[]).length}개 법령`
          else if (Array.isArray(r.articles)) summary = `→ ${(r.articles as unknown[]).length}개 조문`
        }
        return (
          <div key={i} style={{ borderBottom: i < calls.length - 1 ? '1px solid #DCF0C0' : 'none' }}>
            <button onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 font-mono transition-all"
              style={{ background: isOpen ? '#E4F5CC' : 'transparent' }}>
              <span style={{ color: '#3A7D1E', fontWeight: 700, minWidth: 20 }}>#{i + 1}</span>
              <span style={{ color: '#1A3A1E', fontWeight: 600 }}>{call.command}</span>
              <span style={{ color: '#6B9A3E', flex: 1 }}>{JSON.stringify(call.params)}</span>
              {summary && <span style={{ color: '#3A7D1E', fontWeight: 500 }}>{summary}</span>}
              <span style={{ color: '#A8C87A', marginLeft: 4 }}>{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <pre className="px-3 py-3 overflow-x-auto whitespace-pre-wrap break-all"
                style={{
                  color: '#2D3A1E', background: '#F0F9E4',
                  borderTop: '1px solid #DCF0C0', margin: 0,
                  fontSize: '11px', lineHeight: 1.6,
                  maxHeight: '400px', overflowY: 'auto',
                }}>
                {formatResult(call.result)}
              </pre>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function MessageBubble({ message }: { message: Message }) {
  const [debugOpen, setDebugOpen] = useState(false)

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed"
          style={{ background: '#1A3A1E', color: '#E8F5D0' }}>
          {message.content}
        </div>
      </div>
    )
  }

  const { text, source } = parseSource(message.content)
  const isPrimary = source === 'api.beopmang.org'
  const hasDebug = message.debug && message.debug.length > 0

  // 로딩 중이거나 content가 있으면 정상 — 로딩 끝난 후에도 비어있으면 실패
  const showEmpty = !message.loading && !text.trim()
  // 로딩 중이고 아직 아무것도 없으면 bubble 자체를 숨김 (TypingIndicator가 대신함)
  if (message.loading && !text.trim() && !hasDebug) return null

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mt-1"
        style={{ background: '#A8E063', color: '#0A1F0E', fontFamily: 'Noto Serif KR, serif' }}>
        법
      </div>
      <div className="flex-1 max-w-[85%]">
        {/* 답변 또는 실패 메시지 */}
        {(text.trim() || showEmpty) && (
          <div className="rounded-2xl rounded-tl-sm px-5 py-4 text-sm shadow-sm"
            style={{ background: '#fff', border: '1px solid #E2DDD5' }}>
            {showEmpty ? (
              <p className="text-xs" style={{ color: '#A8A49C' }}>
                답변을 받지 못했습니다. 아래 법망 호출 내역을 확인하세요.
              </p>
            ) : (
              <div className="prose-legal">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {highlightArticles(text)}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* 디버그 토글 + 출처 */}
        {(hasDebug || (source && text.trim())) && (
          <div className="mt-1.5 flex items-center justify-between gap-2">
            {hasDebug && (
              <button onClick={() => setDebugOpen(v => !v)}
                className="text-xs px-2 py-0.5 rounded-full transition-all"
                style={{
                  background: debugOpen ? '#1A3A1E' : '#F0FAE0',
                  color: debugOpen ? '#A8E063' : '#3A7D1E',
                  border: '1px solid #C6E89A',
                }}>
                {debugOpen ? '▲ 닫기' : '▼ 법망 호출 내역'} ({message.debug!.length}회)
              </button>
            )}
            {source && text.trim() && (
              <span className="text-xs px-2 py-0.5 rounded-full ml-auto"
                style={{
                  background: isPrimary ? '#F0FAE0' : '#F3F4F6',
                  color: isPrimary ? '#3A7D1E' : '#9CA3AF',
                  border: `1px solid ${isPrimary ? '#C6E89A' : '#E5E7EB'}`,
                }}>
                출처: {source}
              </span>
            )}
          </div>
        )}

        {debugOpen && hasDebug && <DebugPanel calls={message.debug!} />}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: '#A8E063', color: '#0A1F0E', fontFamily: 'Noto Serif KR, serif' }}>
        법
      </div>
      <div className="rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm"
        style={{ background: '#fff', border: '1px solid #E2DDD5' }}>
        <p className="text-xs mb-2" style={{ color: '#A8E063', fontWeight: 600 }}>
          법령 조회 중 · 1분 내외 소요됩니다
        </p>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, background: '#A8E063' }} />
          ))}
        </div>
      </div>
    </div>
  )
}