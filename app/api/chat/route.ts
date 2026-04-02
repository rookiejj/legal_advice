import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { LEGAL_CONSULTANT_SKILL } from '@/skills/legal-consultant'
import type Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 300

const MCP_URL = 'https://api.beopmang.org/mcp'
let reqId = 1

async function callBeopmang(command: string, params: Record<string, unknown> = {}): Promise<string> {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: reqId++,
      method: 'tools/call',
      params: { name: '법망', arguments: { command, params } },
    }),
  })
  const json = await res.json()
  return json?.result?.content?.[0]?.text ?? '결과 없음'
}

const BEOPMANG_TOOL: Anthropic.Tool = {
  name: 'beopmang_api',
  description: `api.beopmang.org 법령 API. 반드시 여러 번 호출하여 조문을 충분히 수집하세요.
명령어:
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
      { role: 'user', content: '지금까지 조회한 법령 데이터를 바탕으로 답변을 완성해주세요. 추가 조회 없이 현재 수집된 내용으로만 답변하세요.' },
    ],
  })
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
}

type DebugCall = { command: string; params: Record<string, unknown>; result: string }

export async function POST(req: NextRequest) {
  try {
    const { message }: { message: string } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 })
    }

    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: message }]
    const debugCalls: DebugCall[] = []

    const MAX_ROUNDS = 5
    const TIME_LIMIT_MS = 40_000
    const startTime = Date.now()
    let finalAnswer = ''

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
          .map(b => b.text)
          .join('')
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
            // 디버그용 호출 기록
            debugCalls.push({ command: input.command, params: input.params ?? {}, result })
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

    // beopmang 호출이 있었으면 출처 강제 지정
    if (debugCalls.length > 0) {
      finalAnswer = finalAnswer.replace(/<source>.*?<\/source>/g, "<source>api.beopmang.org<\/source>")
    }

    return NextResponse.json({ answer: finalAnswer, debug: debugCalls })
  } catch (err: unknown) {
    console.error('[chat] error:', JSON.stringify(err, null, 2))
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}