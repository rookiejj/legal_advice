'use client'

import { useState, useCallback, useRef } from 'react'
import { ChatWindow } from '@/components/ChatWindow'
import { InputBar } from '@/components/InputBar'
import { Sidebar } from '@/components/Sidebar'
import type { Message } from '@/components/MessageBubble'

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (userText: string) => {
    if (isLoading) return
    setError(null)
    setSidebarOpen(false)

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content: userText },
    ])
    setIsLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }), // 히스토리 전달 없음
        signal: controller.signal,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '서버 오류')
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: data.answer },
      ])
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [isLoading])

  const handleStop = () => { abortRef.current?.abort(); setIsLoading(false) }
  const handleNewChat = () => { handleStop(); setMessages([]); setError(null); setSidebarOpen(false) }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F4F1EB' }}>
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <Sidebar isOpen={sidebarOpen} onNewChat={handleNewChat} onCategoryClick={sendMessage} onClose={() => setSidebarOpen(false)} />

      <main className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center px-4 py-3 flex-shrink-0 gap-3" style={{ borderBottom: '1px solid #E2DDD5', background: '#F4F1EB' }}>
          <button className="md:hidden flex flex-col gap-1 p-1" onClick={() => setSidebarOpen(true)} aria-label="메뉴">
            {[0, 1, 2].map((i) => <span key={i} className="block w-5 h-0.5 rounded" style={{ background: '#1A1A1A' }} />)}
          </button>
          <span className="md:hidden text-lg font-bold" style={{ fontFamily: 'Noto Serif KR, serif', color: '#1A3A1E' }}>법망</span>
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#A8E063' }} />
            <span className="text-xs" style={{ color: '#6B6860' }}>api.beopmang.org 연동</span>
          </div>
        </header>

        {error && (
          <div className="mx-3 mt-3 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
            <span>⚠</span><span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        <ChatWindow messages={messages} isLoading={isLoading} onExampleClick={sendMessage} />
        <InputBar onSend={sendMessage} onStop={handleStop} disabled={isLoading} isLoading={isLoading} />
      </main>
    </div>
  )
}