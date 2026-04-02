'use client'

import { useState, useCallback } from 'react'
import { ChatWindow } from '@/components/ChatWindow'
import { InputBar } from '@/components/InputBar'
import type { Message } from '@/components/MessageBubble'

const SIDEBAR_CATEGORIES = [
  { emoji: '🏠', label: '임대차' },
  { emoji: '💼', label: '노동·고용' },
  { emoji: '👨‍👩‍👧', label: '가족·상속' },
  { emoji: '🚗', label: '교통·사고' },
  { emoji: '💰', label: '채권·채무' },
  { emoji: '🏢', label: '기업·상사' },
]

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (userText: string) => {
    if (isLoading) return
    setError(null)

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      // 히스토리: role + 텍스트만 서버로 전달
      const history = messages.map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '서버 오류')
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading])

  const handleNewChat = () => {
    setMessages([])
    setError(null)
  }

  return (
    <div className="flex h-screen" style={{ background: '#F8F6F1' }}>

      {/* ── 사이드바 ── */}
      <aside
        className="hidden md:flex flex-col w-64 flex-shrink-0"
        style={{ background: '#0F1117', color: '#fff' }}
      >
        {/* 로고 */}
        <div className="px-5 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: 'Noto Serif KR, serif' }}
          >
            법망
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            AI 법률 정보 서비스
          </div>
        </div>

        {/* 새 대화 버튼 */}
        <div className="px-4 pt-4">
          <button
            onClick={handleNewChat}
            className="w-full text-sm py-2 rounded-lg transition-all text-left px-3 flex items-center gap-2"
            style={{
              background: 'rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.7)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
          >
            <span>＋</span>
            <span>새 대화</span>
          </button>
        </div>

        {/* 분야별 카테고리 */}
        <div className="px-4 pt-6">
          <div className="text-xs font-medium mb-2 px-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            법률 분야
          </div>
          <nav className="flex flex-col gap-0.5">
            {SIDEBAR_CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => sendMessage(`${cat.label} 관련 주요 법률을 알려줘`)}
                className="text-left text-sm px-3 py-2 rounded-lg transition-all flex items-center gap-2.5"
                style={{ color: 'rgba(255,255,255,0.55)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
                }}
              >
                <span style={{ fontSize: '14px' }}>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 하단 안내 */}
        <div className="mt-auto px-4 py-5">
          <div
            className="text-xs rounded-lg px-3 py-3"
            style={{
              background: 'rgba(37,99,235,0.15)',
              color: 'rgba(147,197,253,0.9)',
              lineHeight: '1.6',
            }}
          >
            본 서비스는 법적 조언을 제공하지 않습니다. 중요한 사안은 법률 전문가와 상담하세요.
          </div>
        </div>
      </aside>

      {/* ── 메인 채팅 영역 ── */}
      <main className="flex flex-col flex-1 min-w-0">

        {/* 헤더 */}
        <header
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid #E5E3DC', background: '#F8F6F1' }}
        >
          {/* 모바일 로고 */}
          <div
            className="md:hidden text-lg font-bold"
            style={{ fontFamily: 'Noto Serif KR, serif' }}
          >
            법망
          </div>

          {/* 법령 출처 뱃지 */}
          <div className="flex items-center gap-1.5 ml-auto">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#22c55e' }}
            />
            <span className="text-xs" style={{ color: '#6B7280' }}>
              api.beopmang.org 연동
            </span>
          </div>
        </header>

        {/* 에러 배너 */}
        {error && (
          <div
            className="mx-4 mt-3 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}
          >
            <span>⚠</span>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-xs opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* 채팅 영역 */}
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onExampleClick={sendMessage}
        />

        {/* 입력창 */}
        <InputBar onSend={sendMessage} disabled={isLoading} />
      </main>
    </div>
  )
}
