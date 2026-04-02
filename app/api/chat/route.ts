import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { LEGAL_CONSULTANT_SKILL } from '@/skills/legal-consultant'

export const maxDuration = 300

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const MODEL = 'claude-sonnet-4-5'
const MCP_URL = 'https://api.beopmang.org/mcp'
let reqId = 1

async function callBeopmang(command: string, params: Record<string, unknown> = {}): Promise<string> {
  try {
    const res = await fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: reqId++, method: 'tools/call',
        params: { name: '법망', arguments: { command, params } },
      }),
    })
    const json = await res.json()
    return json?.result?.content?.[0]?.text ?? '결과 없음'
  } catch {
    return '조회 실패'
  }
}

const BEOPMANG_TOOL: Anthropic.Tool = {
  name: 'beopmang_api',
  description: `api.beopmang.org 법령 API. 반드시 여러 번 호출하여 조문을 충분히 수집하세요.
- law.search: 법령 검색. params: {q, limit?}
- law.get: 조문 조회. params: {law_id, grep?}
- tools.overview: 법령 종합. params: {law_id, q?}`,
  input_schema: {
    type: 'object' as const,
    properties: {
      command: { type: 'string' },
      params: { type: 'object' },
    },
    required: ['command'],
  },
}

async function generateFinalAnswer(messages: Anthropic.MessageParam[]): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: LEGAL_CONSULTANT_SKILL,
    messages: [
      ...messages,
      { role: 'user', content: '지금까지 조회한 데이터로 답변을 완성해주세요. 추가 조회 없이 지금 바로 답변하세요.' },
    ],
  })
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text).join('')
}

export async function POST(req: NextRequest) {
  let message = ''
  try {
    const body = await req.json()
    message = body.message ?? ''
  } catch {
    return new Response(JSON.stringify({ error: '요청 파싱 실패' }), { status: 400 })
  }

  if (!message.trim()) {
    return new Response(JSON.stringify({ error: '메시지를 입력해주세요.' }), { status: 400 })
  }

  const encoder = new TextEncoder()
  const send = (ctrl: ReadableStreamDefaultController, event: string, data: unknown) => {
    ctrl.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  }

  const stream = new ReadableStream({
    async start(controller) {
      const messages: Anthropic.MessageParam[] = [{ role: 'user', content: message }]
      const debugCalls: Array<{ command: string; params: Record<string, unknown>; result: string }> = []
      const MAX_ROUNDS = 5
      const TIME_LIMIT_MS = 40_000
      const startTime = Date.now()
      let finalAnswer = ''

      try {
        for (let i = 0; i < MAX_ROUNDS; i++) {
          if (Date.now() - startTime > TIME_LIMIT_MS) {
            finalAnswer = await generateFinalAnswer(messages)
            break
          }

          const response = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: LEGAL_CONSULTANT_SKILL,
            tools: [BEOPMANG_TOOL],
            messages,
          })

          if (response.stop_reason === 'end_turn') {
            finalAnswer = response.content
              .filter((b): b is Anthropic.TextBlock => b.type === 'text')
              .map(b => b.text).join('')
            break
          }

          if (response.stop_reason === 'tool_use') {
            const toolUseBlocks = response.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
            )
            const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
              toolUseBlocks.map(async (toolUse) => {
                const input = toolUse.input as { command: string; params?: Record<string, unknown> }
                const result = await callBeopmang(input.command, input.params ?? {})
                const call = { command: input.command, params: input.params ?? {}, result }
                debugCalls.push(call)
                send(controller, 'debug', call)
                return { type: 'tool_result' as const, tool_use_id: toolUse.id, content: result }
              })
            )
            messages.push({ role: 'assistant', content: response.content })
            messages.push({ role: 'user', content: toolResults })
            continue
          }

          finalAnswer = await generateFinalAnswer(messages)
          break
        }

        if (!finalAnswer) finalAnswer = await generateFinalAnswer(messages)

        if (debugCalls.length > 0) {
          finalAnswer = finalAnswer.replace(/<source>.*?<\/source>/g, '<source>api.beopmang.org</source>')
        }

        send(controller, 'answer', { text: finalAnswer })
      } catch (err) {
        send(controller, 'error', { message: err instanceof Error ? err.message : '서버 오류' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}