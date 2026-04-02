'use client'

import { useEffect, useRef } from 'react'
import { MessageBubble, TypingIndicator, type Message } from './MessageBubble'

type Props = {
  messages: Message[]
  isLoading: boolean
  onExampleClick: (text: string) => void
}

const EXAMPLES = [
  '전세 계약 만료 후 집주인이 보증금을 안 돌려줘요',
  '퇴직금은 언제, 얼마나 받을 수 있나요?',
  '월세 3개월 미납 시 집주인이 바로 내보낼 수 있나요?',
  '계약서 없이 일한 경우 임금을 받을 수 있나요?',
  '이혼 시 재산분할은 어떻게 이루어지나요?',
]

export function ChatWindow({ messages, isLoading, onExampleClick }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // 대화가 없으면 환영 화면
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="max-w-xl w-full text-center">
          <h2
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: 'Noto Serif KR, serif', color: '#1C1C1E' }}
          >
            무엇이든 물어보세요
          </h2>
          <p className="text-sm mb-10" style={{ color: '#6B7280' }}>
            실제 법령에 근거해 정확한 정보를 제공합니다
          </p>

          <div className="grid gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => onExampleClick(ex)}
                className="text-left w-full px-4 py-3 rounded-xl text-sm transition-all hover:shadow-sm"
                style={{
                  background: '#fff',
                  border: '1px solid #E5E3DC',
                  color: '#374151',
                  fontFamily: 'Noto Sans KR, sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2563EB'
                  e.currentTarget.style.color = '#2563EB'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E5E3DC'
                  e.currentTarget.style.color = '#374151'
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
