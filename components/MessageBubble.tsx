'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed"
          style={{ background: '#2563EB', color: '#fff' }}
        >
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      {/* 아이콘 */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mt-1"
        style={{ background: '#0F1117', color: '#fff', fontFamily: 'Noto Serif KR, serif' }}
      >
        법
      </div>

      {/* 답변 카드 */}
      <div
        className="flex-1 max-w-[85%] rounded-2xl rounded-tl-sm px-5 py-4 text-sm shadow-sm"
        style={{ background: '#fff', border: '1px solid #E5E3DC' }}
      >
        <div className="prose-legal">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: '#0F1117', color: '#fff', fontFamily: 'Noto Serif KR, serif' }}
      >
        법
      </div>
      <div
        className="rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-1"
        style={{ background: '#fff', border: '1px solid #E5E3DC' }}
      >
        <span className="text-xs text-gray-400 mr-1">법령 조회 중</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}
