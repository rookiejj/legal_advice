import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { LEGAL_CONSULTANT_SKILL } from '@/skills/legal-consultant'

export const maxDuration = 60

type DebugCall = { command: string; params: Record<string, unknown>; result: string }

export async function POST(req: NextRequest) {
  try {
    const { question, debugCalls }: { question: string; debugCalls: DebugCall[] } = await req.json()

    // 수집된 법령 데이터를 텍스트로 정리
    const collectedData = debugCalls
      .filter(c => c.command === 'law.get' || c.command === 'tools.overview')
      .map((c, i) => {
        try {
          const parsed = JSON.parse(c.result)
          const lawName = parsed.law_name ?? ''
          const articles = (parsed.articles ?? [])
            .map((a: { label: string; full_text: string }) => `${a.label} ${a.full_text}`)
            .join('\n')
          return lawName || articles ? `### ${lawName}\n${articles}` : c.result
        } catch {
          return `#${i + 1} ${c.command}: ${c.result.slice(0, 500)}`
        }
      })
      .filter(Boolean)
      .join('\n\n')

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: LEGAL_CONSULTANT_SKILL,
      messages: [{
        role: 'user',
        content: `사용자 질문: ${question}\n\n--- api.beopmang.org 수집 법령 데이터 ---\n${collectedData}\n\n위 데이터를 기반으로 질문에 답변하세요.`,
      }],
    })

    const answer = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    // 법망 데이터 사용했으면 출처 강제 지정
    const finalAnswer = answer.replace(/<source>.*?<\/source>/g, '<source>api.beopmang.org</source>')

    return NextResponse.json({ answer: finalAnswer })
  } catch (err) {
    console.error('[finalize] error:', err)
    return NextResponse.json({ error: '답변 생성 실패' }, { status: 500 })
  }
}