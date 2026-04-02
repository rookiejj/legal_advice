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

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-12 pb-6 overflow-y-auto">
        <div className="max-w-xl w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-2xl font-bold"
              style={{ background: '#A8E063', color: '#0A1F0E', fontFamily: 'Noto Serif KR, serif' }}>
              법
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Noto Serif KR, serif' }}>
              무엇이든 물어보세요
            </h2>
            <p className="text-sm" style={{ color: '#6B6860' }}>실제 법령에 근거해 정확한 정보를 제공합니다</p>
            <p className="text-xs mt-1" style={{ color: '#A8A49C' }}>법령 조회로 인해 답변까지 1분 내외 소요될 수 있습니다</p>
          </div>
          <div className="grid gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => onExampleClick(ex)}
                className="text-left w-full px-4 py-3 rounded-xl text-sm transition-all"
                style={{ background: '#F7FAF4', border: '1px solid #D4E8C8', color: '#3D3A30' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#A8E063'; e.currentTarget.style.color = '#1A3A1E'; e.currentTarget.style.background = '#F5FCE8' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2DDD5'; e.currentTarget.style.color = '#3D3A30'; e.currentTarget.style.background = '#F7FAF4' }}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // 로딩 중인 마지막 assistant 메시지 분리
  const lastMsg = messages[messages.length - 1]
  const loadingMsg = isLoading && lastMsg?.role === 'assistant' && lastMsg?.loading ? lastMsg : null
  const visibleMessages = loadingMsg ? messages.slice(0, -1) : messages

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        {visibleMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* 항상 대기 메시지 먼저 */}
        {isLoading && <TypingIndicator />}

        {/* 디버그 패널은 대기 메시지 아래 */}
        {loadingMsg && loadingMsg.debug && loadingMsg.debug.length > 0 && (
          <MessageBubble key={loadingMsg.id} message={loadingMsg} />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}