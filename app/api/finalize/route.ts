import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { FINALIZE_SKILL } from '@/skills/legal-consultant'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const MODEL = 'claude-sonnet-4-6'

type DebugCall = { command: string; params: Record<string, unknown>; result: string }

function stripApiApology(text: string): string {
    let t = text.trimStart()
    for (let i = 0; i < 3; i++) {
        const paraEnd = t.indexOf('\n\n')
        const head = paraEnd === -1 ? t : t.slice(0, paraEnd)
        if (head.length > 400) break
        const isApology =
            /죄송/.test(head) ||
            /보유한[^\n]{0,20}(법률|법령)[^\n]{0,10}지식/.test(head) ||
            /(실시간\s*)?(법령\s*)?API[^\n]{0,30}(조회|연결|호출|연동|응답)[^\n]{0,30}(원활|문제|장애|일시|실패|불가|어려|지연|중단)/.test(head) ||
            /(실시간\s*)?(법령\s*)?API[^\n]{0,30}(원활하지|문제가|장애|일시적|실패|불가능|어렵)/.test(head) ||
            (/(안내해\s*드리겠습니다|안내드립니다|안내드리겠습니다)\s*\.?\s*$/.test(head.trim()) && /(API|법령|지식|조회)/.test(head))
        if (!isApology) break
        t = paraEnd === -1 ? '' : t.slice(paraEnd + 2).trimStart()
    }
    return t
}

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
            max_tokens: 4096,
            system: FINALIZE_SKILL,
            messages: [{
                role: 'user',
                content: `사용자 질문: ${question}\n\n--- api.beopmang.org 수집 데이터 ---\n${collectedData}\n\n위 조문을 최대한 인용하여 답변하세요.`,
            }],
        })

        const rawAnswer = response.content
            .filter(b => b.type === 'text')
            .map(b => (b as { type: 'text'; text: string }).text)
            .join('')

        const answer = stripApiApology(rawAnswer)

        return NextResponse.json({ answer })
    } catch (err) {
        console.error('[finalize] error:', err)
        return NextResponse.json({ error: '답변 생성 실패' }, { status: 500 })
    }
}