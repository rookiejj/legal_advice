import Anthropic from '@anthropic-ai/sdk'

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.')
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// web_search 툴을 지원하는 모델
// claude-sonnet-4-5-20250514 로 변경 시 더 빠르고 비용 절감
export const MODEL = 'claude-opus-4-5-20250514'
