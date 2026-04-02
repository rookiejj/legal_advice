import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { LEGAL_CONSULTANT_SKILL } from '@/skills/legal-consultant'
import type Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

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

// Claude 가 직접 호출할 수 있는 법망 툴 정의
const BEOPMANG_TOOL: Anthropic.Tool = {
  name: 'beopmang_api',
  description: `api.beopmang.org 법령 API. 반드시 여러 번 호출하여 조문을 충분히 수집하세요.
명령어:
- law.search: 법령 검색. params: {q, limit?}
- law.get: 조문 조회. params: {law_id, grep?} — grep으로 관련 조문만 추출
- tools.overview: 법령 종합. params: {law_id, q?}`,
  input_schema: {
    type: 'object' as const,
    properties: {
      command: { type: 'string', description: 'law.search | law.get | tools.overview' },
      params: { type: 'object', description: '명령어별 파라미터' },
    },
    required: ['command'],
  },
}

export async function POST(req: NextRequest) {
  try {
    const { message }: { message: string } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 })
    }

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: message },
    ]

    // tool_use 루프 — Claude 가 충분히 조회할 때까지 반복
    let finalAnswer = ''
    const MAX_ROUNDS = 8

    for (let i = 0; i < MAX_ROUNDS; i++) {
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
        // Claude 가 요청한 툴 호출들을 모두 실행
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        )

        const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
          toolUseBlocks.map(async (toolUse) => {
            const input = toolUse.input as { command: string; params?: Record<string, unknown> }
            const result = await callBeopmang(input.command, input.params ?? {})
            return {
              type: 'tool_result' as const,
              tool_use_id: toolUse.id,
              content: result,
            }
          })
        )

        messages.push({ role: 'assistant', content: response.content })
        messages.push({ role: 'user', content: toolResults })
        continue
      }

      // max_tokens 등 다른 stop_reason
      finalAnswer = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('')
      break
    }

    if (!finalAnswer) {
      return NextResponse.json(
        { error: '답변을 생성하지 못했습니다. 다시 시도해주세요.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ answer: finalAnswer })
  } catch (err: unknown) {
    console.error('[chat] error:', JSON.stringify(err, null, 2))
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}