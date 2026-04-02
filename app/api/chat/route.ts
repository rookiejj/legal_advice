import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { LEGAL_CONSULTANT_SKILL, transformToLegalQuery } from '@/skills/legal-consultant'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { message }: { message: string } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 })
    }

    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: LEGAL_CONSULTANT_SKILL,
      mcp_servers: [
        {
          type: 'url',
          url: 'https://api.beopmang.org/mcp',
          name: 'beopmang',
        },
      ],
      messages: [
        { role: 'user', content: transformToLegalQuery(message) },
      ],
      betas: ['mcp-client-1.0'],
    } as Parameters<typeof anthropic.beta.messages.create>[0])

    const answer = (response.content as Array<{ type: string; text?: string }>)
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
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