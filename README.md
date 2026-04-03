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
│   ├── api/
│   │   ├── chat/route.ts       # 핵심 API: beopmang_api 툴로 법령 조회 + Claude 호출 (SSE 스트리밍)
│   │   └── finalize/route.ts   # 폴백 API: 스트리밍 실패 시 수집된 법령 데이터로 재답변 생성
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # 메인 UI (스트리밍 처리, 중단/재시작, 폴백 로직)
├── components/
│   ├── ChatWindow.tsx           # 대화창 + 예시 질문
│   ├── InputBar.tsx             # 입력창 + 전송/중단 버튼
│   ├── MessageBubble.tsx        # 메시지 말풍선 (debug 패널 포함)
│   └── Sidebar.tsx              # 사이드바 (새 대화, 카테고리별 예시 질문)
├── lib/
│   ├── anthropic.ts             # Anthropic 클라이언트 (서버 전용)
│   └── beopmang.ts             # beopmang MCP API 래퍼 (law.search, law.get 호출)
├── skills/
│   └── legal-consultant.ts      # AI 법률 상담사 시스템 프롬프트 (LEGAL_CONSULTANT_SKILL, FINALIZE_SKILL)
└── vercel.json                  # maxDuration: 300 (함수 실행 시간 300초)
```

## 작동 원리

사용자가 "임대차 보증금 안 돌려줘요" 라고 입력하면:

1. `/api/chat`에서 Claude가 `beopmang_api` 툴을 사용해 api.beopmang.org에서 법령 조회
   - `law.search`: 관련 법령 목록 검색
   - `law.get`: 각 법령의 조문 전문 수집 (여러 법령 반복 호출)
2. 툴 호출 결과는 `debug` 이벤트로 클라이언트에 실시간 스트리밍
3. 조문 수집 완료 후 Claude가 법령명·조문번호·원문을 인용한 답변 생성 → `answer` 이벤트로 전송
4. 답변 수신 실패 시 `/api/finalize`로 폴백: 수집된 debug 데이터를 바탕으로 재답변 생성
5. finalize도 실패하면 클라이언트에서 debug 데이터를 직접 파싱해 법령 조문을 표시

사용자는 이 과정을 전혀 볼 수 없습니다.

## Vercel 무료 플랜 주의사항

- 함수 실행 시간 최대 60초 (무료 플랜 기본값)
- 법령 검색 + AI 생성 포함 시 응답에 10~30초 소요될 수 있음
- `vercel.json`에 `maxDuration: 300`이 설정되어 있어 Pro 플랜에서 자동 적용됨
- 무료 플랜을 사용하는 경우 `vercel.json`의 `maxDuration`을 `60`으로 낮추거나 제거하세요
