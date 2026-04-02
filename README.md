# 법망 AI — 법령 기반 AI 법률 정보 서비스

대한민국 법령 데이터(api.beopmang.org)를 실시간 참조하는 AI 법률 정보 서비스입니다.

## 로컬 실행

```bash
# 1. 패키지 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
# .env 파일에 Anthropic API 키 입력

# 3. 개발 서버 실행
npm run dev
# → http://localhost:3000
```

## Vercel 배포

```bash
# 1. Vercel CLI 설치 (이미 있으면 건너뜀)
npm i -g vercel

# 2. 배포
vercel

# 또는 GitHub 연동 후 Vercel 대시보드에서 Import
```

### Vercel 환경변수 설정

Vercel 프로젝트 → Settings → Environment Variables:

| 이름 | 값 |
|------|-----|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |

> **주의**: `.env` 파일은 절대 git에 올리지 마세요. `.gitignore`에 이미 포함되어 있습니다.

## 구조

```
├── app/
│   ├── api/chat/route.ts     # 핵심 API: 프롬프트 변환 + Claude 호출
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx              # 메인 UI
├── components/
│   ├── ChatWindow.tsx        # 대화창 + 예시 질문
│   ├── InputBar.tsx          # 입력창
│   └── MessageBubble.tsx     # 메시지 말풍선
├── lib/
│   └── anthropic.ts          # Anthropic 클라이언트 (서버 전용)
└── skills/
    └── legal-consultant.ts   # 법률 상담사 역할 정의 + 프롬프트 변환
```

## 작동 원리

사용자가 "임대차 보증금 안 돌려줘요" 라고 입력하면:

1. 서버에서 자동으로 "임대차 보증금 안 돌려줘요에 관한 내용을 **api.beopmang.org 를 참조하여** 법령 조문과 함께 설명해줘." 로 변환
2. Claude가 웹 검색(web_search 툴)으로 beopmang.org 방문 및 법령 조회
3. 법령 조문 번호와 함께 답변 생성 후 사용자에게 반환

사용자는 이 과정을 전혀 볼 수 없습니다.

## Vercel 무료 플랜 주의사항

- 함수 실행 시간 최대 60초 (법령 검색 + AI 생성 포함)
- Claude의 웹 검색이 포함되어 응답에 10~30초 소요될 수 있음
- Pro 플랜에서는 `maxDuration = 300`으로 변경 가능 (`app/api/chat/route.ts`)
