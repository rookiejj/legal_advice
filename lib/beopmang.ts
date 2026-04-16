const MCP_URL = 'https://api.beopmang.org/mcp'
let reqId = 1

async function mcpCall(command: string, params: Record<string, unknown> = {}): Promise<string> {
    const res = await fetch(MCP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: reqId++,
            method: 'tools/call',
            params: { name: '묻다', arguments: { command, params } },
        }),
    })
    const json = await res.json()
    return json?.result?.content?.[0]?.text ?? ''
}

// 질의에서 핵심 검색어 추출 (짧은 명사 위주)
function extractKeywords(query: string): string {
    return query
        .replace(/관련|주요|법률을|알려줘|설명해|줘|에서|에|의|을|를|이|가|은|는|하면|어떻게|되나요|있나요|되나|해요|하나요/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(w => w.length >= 2)
        .slice(0, 3)
        .join(' ')
}

interface LawArticle {
    label: string
    full_text: string
}

interface LawResult {
    law_id: string
    law_name: string
    law_type: string
}

async function getArticles(lawId: string, lawName: string, grep: string): Promise<string> {
    try {
        const result = await mcpCall('law.get', { law_id: lawId, grep })
        const data = JSON.parse(result)
        const articles: LawArticle[] = data?.articles ?? []
        if (articles.length === 0) return ''
        const text = articles
            .map(a => `${a.label} ${a.full_text}`)
            .join('\n')
        return `### 「${lawName}」\n${text}`
    } catch {
        return ''
    }
}

export async function fetchLegalContext(query: string): Promise<string> {
    try {
        const keyword = extractKeywords(query)
        const searchTerm = keyword || query.slice(0, 10)

        // 1단계: 관련 법령 검색 (법률 + 대통령령 포함)
        const searchResult = await mcpCall('law.search', { q: searchTerm, limit: 6 })
        const searchData = JSON.parse(searchResult)
        const laws: LawResult[] = searchData?.results ?? []

        if (laws.length === 0) return ''

        // 법률 우선, 대통령령 보조로 최대 4개
        const statutes = laws.filter(l => l.law_type === '법률').slice(0, 3)
        const decrees = laws.filter(l => l.law_type === '대통령령').slice(0, 1)
        const targets = [...statutes, ...decrees]

        // 2단계: 각 법령에서 핵심 조문 병렬 수집
        const results = await Promise.all(
            targets.map(law => getArticles(law.law_id, law.law_name, searchTerm))
        )

        const context = results.filter(Boolean).join('\n\n')
        return context
    } catch (err) {
        console.error('[beopmang] fetch error:', err)
        return ''
    }
}