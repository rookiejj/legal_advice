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
        const laws: Array<{ law_id: string; law_name: string }> = searchData?.results?.slice(0, 2) ?? []

        if (laws.length === 0) return ''

        // 2단계: 상위 2개 법령 개요 조회
        const overviews = await Promise.all(
            laws.map((law) => mcpCall('tools.overview', { law_id: law.law_id, q: query }))
        )

        const context = laws
            .map((law, i) => `## ${law.law_name}\n${overviews[i]}`)
            .join('\n\n')

        return context
    } catch (err) {
        console.error('[beopmang] fetch error:', err)
        return ''
    }
}