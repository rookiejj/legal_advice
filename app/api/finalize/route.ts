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

        // law.get 결과에서 조문 전문 추출
        const lawSections: string[] = []
        for (const call of debugCalls) {
            if (call.command !== 'law.get') continue
            try {
                const data = JSON.parse(call.result)
                if (!data.articles?.length) continue
                const lawName = data.law_name ?? ''
                const articles = data.articles
                    .filter((a: { full_text?: string }) => a.full_text?.trim())
                    .map((a: { full_text: string }) => a.full_text.trim())
                    .join('\n')
                if (articles) lawSections.push(`### 「${lawName}」\n${articles}`)
            } catch { /* skip */ }
        }

        // law.search 결과도 포함
        const searchSections: string[] = []
        for (const call of debugCalls) {
            if (call.command !== 'law.search') continue
            try {
                const data = JSON.parse(call.result)
                if (data.results?.length) {
                    searchSections.push(
                        data.results.map((r: { law_name: string; purpose?: string }) =>
                            `- 「${r.law_name}」${r.purpose ? ': ' + r.purpose : ''}`
                        ).join('\n')
                    )
                }
            } catch { /* skip */ }
        }

        const collectedData = [
            searchSections.length ? `## 검색된 법령 목록\n${searchSections.join('\n')}` : '',
            lawSections.length ? `## 수집된 조문 원문\n${lawSections.join('\n\n')}` : '',
        ].filter(Boolean).join('\n\n')

        if (!collectedData) {
            return NextResponse.json({ error: '수집된 법령 데이터 없음' }, { status: 400 })
        }

        const response = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: FINALIZE_SKILL,
            messages: [{
                role: 'user',
                content: `사용자 질문: ${question}\n\n--- api.beopmang.org 수집 데이터 ---\n${collectedData}\n\n위 조문 원문을 최대한 많이 인용하여 답변하세요.`,
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