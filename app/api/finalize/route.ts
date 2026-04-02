import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { FINALIZE_SKILL } from '@/skills/legal-consultant'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const MODEL = 'claude-sonnet-4-6'

type DebugCall = { command: string; params: Record<string, unknown>; result: string }

export async function POST(req: NextRequest) {
    try {
        const { question, debugCalls }: { question: string; debugCalls: DebugCall[] } = await req.json()

        // 모든 호출 결과에서 법령 데이터 추출 (law.get, tools.overview, law.search 모두)
        const sections: string[] = []

        for (const call of debugCalls) {
            try {
                const data = JSON.parse(call.result)

                if (call.command === 'law.get' && data.articles?.length) {
                    const lawName = data.law_name ?? ''
                    const articles = data.articles
                        .filter((a: { full_text?: string }) => a.full_text?.trim())
                        .map((a: { full_text: string }) => a.full_text.trim())
                        .join('\n')
                    if (articles) sections.push(`### 「${lawName}」\n${articles}`)

                } else if (call.command === 'tools.overview' && data.law_name) {
                    const snippets = (data.top_articles ?? [])
                        .map((a: { label: string; snippet: string }) => `${a.label} ${a.snippet}`)
                        .join('\n')
                    if (snippets) sections.push(`### 「${data.law_name}」 (주요 조문)\n${snippets}`)

                } else if (call.command === 'law.search' && data.results?.length) {
                    const list = data.results
                        .map((r: { law_name: string; purpose?: string }) =>
                            `- 「${r.law_name}」${r.purpose ? ': ' + r.purpose : ''}`)
                        .join('\n')
                    sections.push(`## 검색된 법령\n${list}`)
                }
            } catch { /* skip */ }
        }

        if (sections.length === 0) {
            return NextResponse.json({ error: '수집된 법령 데이터 없음' }, { status: 400 })
        }

        // 토큰 절약을 위해 4000자로 제한
        const collectedData = sections.join('\n\n').slice(0, 4000)

        const response = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 2048,
            system: FINALIZE_SKILL,
            messages: [{
                role: 'user',
                content: `사용자 질문: ${question}\n\n--- api.beopmang.org 수집 데이터 ---\n${collectedData}\n\n위 조문을 최대한 인용하여 답변하세요.`,
            }],
        })

        const answer = response.content
            .filter(b => b.type === 'text')
            .map(b => (b as { type: 'text'; text: string }).text)
            .join('')

        return NextResponse.json({ answer })
    } catch (err) {
        console.error('[finalize] error:', err)
        return NextResponse.json({ error: '답변 생성 실패' }, { status: 500 })
    }
}