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

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: userText },
      { id: asstMsgId, role: 'assistant', content: '', debug: [], loading: true },
    ])
    setIsLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    timeoutRef.current = setTimeout(() => {
      controller.abort()
    }, CLIENT_TIMEOUT_MS)

    const collectedDebug: DebugCall[] = []
    let answerReceived = false

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
        signal: controller.signal,
      })

      // 500 등 에러 응답 처리
      if (!res.ok) {
        const errText = await res.text()
        try { const e = JSON.parse(errText); throw new Error(e.error || '서버 오류') }
        catch { throw new Error(`서버 오류 (${res.status})`) }
      }
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
            collectedDebug.push(data as DebugCall)
            setMessages(prev => prev.map(m =>
              m.id === asstMsgId
                ? { ...m, debug: [...(m.debug ?? []), data as DebugCall] }
                : m
            ))
          } else if (event === 'answer') {
            answerReceived = true
            setMessages(prev => prev.map(m =>
              m.id === asstMsgId ? { ...m, content: data.text, loading: false } : m
            ))
          } else if (event === 'error') {
            setError(data.message)
          }
        }
      }
    } catch (err) {
      // AbortError(타임아웃/중단)는 조용히 처리 — 디버그 패널 유지
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : '알 수 없는 오류')
      }
    }

    // 스트림 끝났는데 answer 없고 debug 데이터 있으면 → finalize 자동 호출
    if (!answerReceived && collectedDebug.length > 0) {
      try {
        const finalRes = await fetch('/api/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: userText, debugCalls: collectedDebug }),
        })
        const finalData = await finalRes.json()
        if (finalData.answer) {
          setMessages(prev => prev.map(m =>
            m.id === asstMsgId ? { ...m, content: finalData.answer, loading: false } : m
          ))
          answerReceived = true
        }
      } catch {
        // finalize 실패해도 디버그 패널은 유지
      }
    }

    // 최종 loading 해제
    setMessages(prev => prev.map(m =>
      m.id === asstMsgId ? { ...m, loading: false } : m
    ))

    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    setIsLoading(false)
    abortRef.current = null

  }, [isLoading])

  const handleStop = () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    abortRef.current?.abort()
    setIsLoading(false)
    setMessages(prev => prev.map(m => m.loading ? { ...m, loading: false } : m))
  }

  const handleNewChat = () => {
    handleStop()
    setMessages([])
    setError(null)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F4F1EB' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
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