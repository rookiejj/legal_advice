'use client'

import { useState, useCallback, useRef } from 'react'
import { ChatWindow } from '@/components/ChatWindow'
import { InputBar } from '@/components/InputBar'
import { Sidebar } from '@/components/Sidebar'
import type { Message, DebugCall } from '@/components/MessageBubble'

const CLIENT_TIMEOUT_MS = 75_000

function buildFallbackAnswer(debugCalls: DebugCall[]): string {
  const sections: string[] = []
  for (const call of debugCalls) {
    try {
      const data = JSON.parse(call.result)
      if (call.command === 'law.get' && data.articles?.length) {
        const articleLines = data.articles
          .filter((a: { full_text?: string }) => a.full_text?.trim())
          .map((a: { full_text: string }) => {
            const text = a.full_text.trim()
            const end = text.indexOf(')')
            return end > 0 ? `**${text.slice(0, end + 1)}**${text.slice(end + 1)}` : text
          })
        if (articleLines.length > 0)
          sections.push(`### 「${data.law_name ?? ''}」\n\n${articleLines.join('\n\n')}`)
      } else if (call.command === 'tools.overview' && data.law_name) {
        const snippets = (data.top_articles ?? [])
          .map((a: { snippet: string }) => {
            const s = a.snippet.trim()
            const end = s.indexOf(')')
            return end > 0 ? `**${s.slice(0, end + 1)}**${s.slice(end + 1)}` : s
          }).join('\n\n')
        if (snippets) sections.push(`### 「${data.law_name}」 (주요 조문)\n\n${snippets}`)
      } else if (call.command === 'law.search' && data.results?.length && !sections.length) {
        const list = data.results
          .map((r: { law_name: string; purpose?: string }) =>
            `- 「${r.law_name}」${r.purpose ? ': ' + r.purpose : ''}`)
          .join('\n')
        sections.push(`## 관련 법령 목록\n\n${list}`)
      }
    } catch { /* skip */ }
  }
  if (sections.length === 0) return ''
  return sections.join('\n\n---\n\n') + '\n\n<source>api.beopmang.org</source>'
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentRequestId = useRef<string | null>(null)   // 현재 진행 중인 요청 ID
  const stoppedIds = useRef<Set<string>>(new Set())      // 중단된 요청 ID 목록

  const sendMessage = useCallback(async (userText: string) => {
    if (isLoading) return
    setError(null)
    setSidebarOpen(false)

    const requestId = Date.now().toString()
    const asstMsgId = requestId + '_asst'
    currentRequestId.current = requestId

    setMessages(prev => [
      ...prev,
      { id: requestId, role: 'user', content: userText },
      { id: asstMsgId, role: 'assistant', content: '', debug: [], loading: true },
    ])
    setIsLoading(true)

    const controller = new AbortController()
    abortRef.current = controller
    timeoutRef.current = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)

    const collectedDebug: DebugCall[] = []
    let answerReceived = false

    // 이 요청이 중단됐는지 확인
    const isStopped = () => stoppedIds.current.has(requestId)

    const updateAsst = (updater: (m: Message) => Message) => {
      // 중단된 요청의 업데이트는 무시
      if (isStopped()) return
      setMessages(prev => prev.map(m => m.id === asstMsgId ? updater(m) : m))
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errText = await res.text()
        try { throw new Error(JSON.parse(errText).error || '서버 오류') }
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
            updateAsst(m => ({ ...m, debug: [...(m.debug ?? []), data as DebugCall] }))
          } else if (event === 'answer') {
            answerReceived = true
            updateAsst(m => ({ ...m, content: data.text, loading: false }))
          } else if (event === 'error') {
            if (!isStopped()) setError(data.message || '서버 오류가 발생했습니다.')
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        if (!isStopped()) setError(err instanceof Error ? err.message : '알 수 없는 오류')
      }
    }

    // 중단된 요청이면 여기서 종료 — finalize/fallback 없이
    if (isStopped()) {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
      return
    }

    // answer 없고 debug 있으면 → finalize 시도
    if (!answerReceived && collectedDebug.length > 0) {
      try {
        const finalizeController = new AbortController()
        const finalizeTimeout = setTimeout(() => finalizeController.abort(), 50_000)
        const finalRes = await fetch('/api/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: userText, debugCalls: collectedDebug }),
          signal: finalizeController.signal,
        })
        clearTimeout(finalizeTimeout)
        if (!isStopped() && finalRes.ok) {
          const finalData = await finalRes.json()
          if (finalData.answer) {
            answerReceived = true
            updateAsst(m => ({ ...m, content: finalData.answer, loading: false }))
          }
        }
      } catch { /* fallback으로 */ }

      if (!answerReceived && !isStopped()) {
        const fallback = buildFallbackAnswer(collectedDebug)
        if (fallback) {
          updateAsst(m => ({ ...m, content: fallback, loading: false }))
          answerReceived = true
        }
      }
    }

    if (!answerReceived && !isStopped()) {
      updateAsst(m => ({ ...m, content: '__error__', loading: false }))
    } else {
      updateAsst(m => ({ ...m, loading: false }))
    }

    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    setIsLoading(false)
    abortRef.current = null
  }, [isLoading])

  const handleStop = () => {
    // 현재 진행 중인 요청 ID를 중단 목록에 등록
    if (currentRequestId.current) {
      stoppedIds.current.add(currentRequestId.current)
      currentRequestId.current = null
    }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    abortRef.current?.abort()
    setIsLoading(false)
    setMessages(prev => prev.map(m => m.loading ? { ...m, loading: false } : m))
  }

  const handleNewChat = () => {
    handleStop()
    stoppedIds.current.clear()
    setMessages([])
    setError(null)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#ECF3E8' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar isOpen={sidebarOpen} onNewChat={handleNewChat} onCategoryClick={sendMessage} onClose={() => setSidebarOpen(false)} />

      <main className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center px-4 py-3 flex-shrink-0 gap-3"
          style={{ borderBottom: '1px solid #E2DDD5', background: '#ECF3E8' }}>
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