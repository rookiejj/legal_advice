'use client'

import { useState, useCallback, useRef } from 'react'
import { ChatWindow } from '@/components/ChatWindow'
import { InputBar } from '@/components/InputBar'
import { Sidebar } from '@/components/Sidebar'
import type { Message, DebugCall } from '@/components/MessageBubble'

const CLIENT_TIMEOUT_MS = 75_000

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sendMessage = useCallback(async (userText: string) => {
    if (isLoading) return
    setError(null)
    setSidebarOpen(false)

    const userMsgId = Date.now().toString()
    const asstMsgId = (Date.now() + 1).toString()

    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: userText }])
    // 빈 assistant 메시지 미리 추가 — 디버그 데이터를 실시간으로 채워넣음
    setMessages(prev => [...prev, { id: asstMsgId, role: 'assistant', content: '', debug: [], loading: true }])
    setIsLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    timeoutRef.current = setTimeout(() => {
      controller.abort()
    }, CLIENT_TIMEOUT_MS)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
        signal: controller.signal,
      })

      if (!res.body) throw new Error('스트림 없음')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const eventMatch = part.match(/^event: (\w+)/)
          const dataMatch = part.match(/^data: (.+)$/m)
          if (!eventMatch || !dataMatch) continue

          const event = eventMatch[1]
          const data = JSON.parse(dataMatch[1])

          if (event === 'debug') {
            // 디버그 호출 즉시 패널에 추가
            setMessages(prev => prev.map(m =>
              m.id === asstMsgId
                ? { ...m, debug: [...(m.debug ?? []), data as DebugCall] }
                : m
            ))
          } else if (event === 'answer') {
            setMessages(prev => prev.map(m =>
              m.id === asstMsgId ? { ...m, content: data.text } : m
            ))
          } else if (event === 'error') {
            setError(data.message)
            // 에러가 나도 디버그 패널은 유지 (content만 비워둠)
          }
        }
      }
    } catch (err) {
      const isAbort = (err as Error).name === 'AbortError'
      if (!isAbort) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류')
      }
      // AbortError(타임아웃)는 에러 메시지 없이 조용히 종료 — 디버그 패널은 남아있음
    } finally {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
      setIsLoading(false)
      abortRef.current = null
      // 로딩 끝 — 빈 상태면 실패 메시지 표시
      setMessages(prev => prev.map(m => m.id === asstMsgId ? { ...m, loading: false } : m))
    }
  }, [isLoading])

  const handleStop = () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    abortRef.current?.abort()
    setIsLoading(false)
  }
  const handleNewChat = () => { handleStop(); setMessages([]); setError(null); setSidebarOpen(false) }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F4F1EB' }}>
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <Sidebar isOpen={sidebarOpen} onNewChat={handleNewChat} onCategoryClick={sendMessage} onClose={() => setSidebarOpen(false)} />

      <main className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center px-4 py-3 flex-shrink-0 gap-3"
          style={{ borderBottom: '1px solid #E2DDD5', background: '#F4F1EB' }}>
          <button className="md:hidden flex flex-col gap-1 p-1" onClick={() => setSidebarOpen(true)} aria-label="메뉴">
            {[0, 1, 2].map((i) => <span key={i} className="block w-5 h-0.5 rounded" style={{ background: '#1A1A1A' }} />)}
          </button>
          <span className="md:hidden text-lg font-bold"
            style={{ fontFamily: 'Noto Serif KR, serif', color: '#1A3A1E' }}>법망</span>
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