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

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mt-1"
        style={{ background: '#A8E063', color: '#0A1F0E', fontFamily: 'Noto Serif KR, serif' }}>
        법
      </div>
      <div className="flex-1 max-w-[85%]">
        {/* 답변 */}
        <div className="rounded-2xl rounded-tl-sm px-5 py-4 text-sm shadow-sm"
          style={{ background: '#fff', border: '1px solid #E2DDD5' }}>
          <div className="prose-legal">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {highlightArticles(text)}
            </ReactMarkdown>
          </div>
        </div>

        {/* 출처 + 디버그 토글 */}
        <div className="mt-1.5 flex items-center justify-between gap-2">
          {hasDebug && (
            <button
              onClick={() => setDebugOpen(v => !v)}
              className="text-xs px-2 py-0.5 rounded-full transition-all"
              style={{
                background: debugOpen ? '#1A3A1E' : '#F0FAE0',
                color: debugOpen ? '#A8E063' : '#3A7D1E',
                border: '1px solid #C6E89A',
              }}
            >
              {debugOpen ? '▲ 법망 데이터 숨기기' : '▼ 법망 데이터 보기'} ({message.debug!.length}회 호출)
            </button>
          )}
          {source && (
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

        {/* 디버그 패널 */}
        {debugOpen && hasDebug && (
          <div className="mt-2 rounded-xl overflow-hidden text-xs"
            style={{ border: '1px solid #C6E89A', background: '#F7FCF0' }}>
            {message.debug!.map((call, i) => (
              <div key={i} style={{ borderBottom: i < message.debug!.length - 1 ? '1px solid #DCF0C0' : 'none' }}>
                {/* 호출 헤더 */}
                <div className="px-3 py-2 flex items-center gap-2 font-mono"
                  style={{ background: '#EDF7DC', borderBottom: '1px solid #DCF0C0' }}>
                  <span style={{ color: '#3A7D1E', fontWeight: 600 }}>#{i + 1}</span>
                  <span style={{ color: '#1A3A1E', fontWeight: 600 }}>{call.command}</span>
                  <span style={{ color: '#6B9A3E' }}>{JSON.stringify(call.params)}</span>
                </div>
                {/* 결과 */}
                <pre className="px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all"
                  style={{ color: '#3D3A30', maxHeight: '200px', overflowY: 'auto', margin: 0 }}>
                  {(() => {
                    try { return JSON.stringify(JSON.parse(call.result), null, 2) }
                    catch { return call.result }
                  })()}
                </pre>
              </div>
            ))}
          </div>
        )}
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