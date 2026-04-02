export const LEGAL_CONSULTANT_SKILL = `
- 마지막 줄에 출처 태그`

export function transformToLegalQuery(userMessage: string): string {
  return `${userMessage}

api.beopmang.org 이용해서 설명해줘.`
}