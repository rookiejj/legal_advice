import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { LEGAL_CONSULTANT_SKILL, transformToLegalQuery } from '@/skills/legal-consultant'

export const maxDuration = 60

type HistoryItem = {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] }: { message: string; history: HistoryItem[] } =
      await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 })
    }

    const messages = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user' as const, content: transformToLegalQuery(message) },
    ]

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: LEGAL_CONSULTANT_SKILL,
      tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }] as never,
      messages,
    })

    const answer = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('')

    if (!answer) {
      return NextResponse.json(
        { error: '답변을 생성하지 못했습니다. 다시 시도해주세요.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ answer })
  } catch (err: unknown) {
    console.error('[chat] error:', JSON.stringify(err, null, 2))

    const message =
      err instanceof Error ? err.message : '서버 오류가 발생했습니다.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}