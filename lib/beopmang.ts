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
            params: { name: '법망', arguments: { command, params } },
        }),
    })
    const json = await res.json()
    return json?.result?.content?.[0]?.text ?? ''
}

export async function fetchLegalContext(query: string): Promise<string> {
    try {
        // 1단계: 관련 법령 검색
        const searchResult = await mcpCall('law.search', { q: query, limit: 3 })
        const searchData = JSON.parse(searchResult)
        const laws: Array<{ law_id: string; law_name: string }> =
            searchData?.results?.filter((r: { law_type: string }) => r.law_type === '법률').slice(0, 2) ?? []

        if (laws.length === 0) return ''

        // 2단계: 각 법령에서 질의 관련 조문 전문 가져오기
        const articles = await Promise.all(
            laws.map(async (law) => {
                const result = await mcpCall('law.get', { law_id: law.law_id, grep: query })
                const data = JSON.parse(result)
                const articleTexts = (data?.articles ?? [])
                    .map((a: { label: string; full_text: string }) => `${a.label} ${a.full_text}`)
                    .join('\n')
                return `### ${law.law_name}\n${articleTexts}`
            })
        )

        return articles.join('\n\n')
    } catch (err) {
        console.error('[beopmang] fetch error:', err)
        return ''
    }
}