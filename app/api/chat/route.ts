import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { LEGAL_CONSULTANT_SKILL } from '@/skills/legal-consultant'
import { fetchLegalContext } from '@/lib/beopmang'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { message }: { message: string } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 })
    }

    // api.beopmang.org 에서 직접 법령 데이터 fetch
    const legalContext = await fetchLegalContext(message)

    const userContent = legalContext
      ? `사용자 질문: ${message}\n\n--- api.beopmang.org 법령 데이터 ---\n${legalContext}`
      : message

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: LEGAL_CONSULTANT_SKILL,
      messages: [{ role: 'user', content: userContent }],
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
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}