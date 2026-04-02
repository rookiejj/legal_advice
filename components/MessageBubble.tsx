'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function parseSource(content: string): { text: string; source: string | null } {
  const match = content.match(/<source>(.*?)<\/source>/)
  if (!match) return { text: content.trim(), source: null }
  return {
    text: content.replace(/<source>.*?<\/source>/, '').trim(),
    source: match[1],
  }
}

// 제N조, 제N조의N, 제N항, 제N호 → **제N조** 볼드 처리
function highlightArticles(text: string): string {
  return text.replace(
    /제(\d+)조(의\d+)?(\s*(제\d+항)?(\s*제\d+호)?)?/g,
    (match) => `**${match}**`
  ).replace(
    /제(\d+)항/g,
    (match) => `**${match}**`
  ).replace(
    /제(\d+)호/g,
    (match) => `**${match}**`
  )
}

export function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed"
          style={{ background: '#1A3A1E', color: '#E8F5D0' }}
        >
          {message.content}
        </div>
      </div>
    )
  }

  const { text, source } = parseSource(message.content)
  const isPrimary = source === 'api.beopmang.org'
  const highlighted = highlightArticles(text)

  return (
    <div className="flex gap-3">
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mt-1"
        style={{ background: '#A8E063', color: '#0A1F0E', fontFamily: 'Noto Serif KR, serif' }}
      >
        법
      </div>
      <div className="flex-1 max-w-[85%]">
        <div
          className="rounded-2xl rounded-tl-sm px-5 py-4 text-sm shadow-sm"
          style={{ background: '#fff', border: '1px solid #E2DDD5' }}
        >
          <div className="prose-legal">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {highlighted}
            </ReactMarkdown>
          </div>
        </div>
        {source && (
          <div className="mt-1.5 flex justify-end">
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: isPrimary ? '#F0FAE0' : '#F3F4F6',
                color: isPrimary ? '#3A7D1E' : '#9CA3AF',
                border: `1px solid ${isPrimary ? '#C6E89A' : '#E5E7EB'}`,
              }}
            >
              출처: {source}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: '#A8E063', color: '#0A1F0E', fontFamily: 'Noto Serif KR, serif' }}
      >
        법
      </div>
      <div
        className="rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm"
        style={{ background: '#fff', border: '1px solid #E2DDD5' }}
      >
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