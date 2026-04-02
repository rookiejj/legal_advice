import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { LEGAL_CONSULTANT_SKILL, transformToLegalQuery } from '@/skills/legal-consultant'

export const maxDuration = 60 // Vercel Pro: 300, Free: 60초

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
      // @ts-expect-error: web_search_20250305 는 최신 툴 타입으로 SDK 버전에 따라 타입 미인식 가능
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
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
  } catch (err) {
    console.error('[chat/route] error:', err)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}
