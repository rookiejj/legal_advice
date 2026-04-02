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

    const response = await (anthropic.messages.create as Function)({
      model: MODEL,
      max_tokens: 2048,
      system: LEGAL_CONSULTANT_SKILL,
      // web_search 대신 api.beopmang.org MCP 서버 직접 연결
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
    })

    const answer = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
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