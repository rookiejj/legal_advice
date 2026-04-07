# 서사 — 나만의 이야기

매일의 감정을 기록하고, 그 감정을 담은 단편 소설을 만들어 드립니다.

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
# Vercel CLI로 배포
npm i -g vercel
vercel

# 또는 GitHub 연동 후 Vercel 대시보드에서 Import
```

### Vercel 프로젝트 설정 (최초 1회)

GitHub에서 Import 후 반드시 확인:

Vercel 프로젝트 → Settings → General:

| 항목 | 값 |
| --- | --- |
| **Framework Preset** | **Next.js** |

> Framework Preset이 Next.js로 설정되어 있지 않으면 배포가 실패합니다. 변경 후 Redeploy 하세요.

### Vercel 환경변수 설정

Vercel 프로젝트 → Settings → Environment Variables:

| 이름 | 값 |
| --- | --- |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |

> `.env` 파일은 절대 git에 올리지 마세요. `.gitignore`에 이미 포함되어 있습니다.

## 구조

```
├── app/
│   ├── api/
│   │   └── novel/route.ts          # SSE 스트리밍 소설 생성 API
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                    # 메인 UI (기분 기록 + 소설 생성 + 이야기 목록)
├── components/
│   ├── layout/
│   │   └── Header.tsx
│   ├── mood/
│   │   ├── MoodSelector.tsx        # 오늘의 기분 아이콘 선택기
│   │   └── MoodHistory.tsx         # 최근 7일 기분 히스토리 스트립
│   └── novel/
│       ├── NovelWizard.tsx         # 장르/분위기/필체/분량 선택 wizard
│       ├── NovelViewer.tsx         # 스트리밍 소설 뷰어
│       ├── NovelCard.tsx           # 저장된 소설 카드
│       └── NovelReadModal.tsx      # 저장된 소설 전체 읽기 모달
├── lib/
│   ├── anthropic.ts                # Anthropic 클라이언트 singleton (서버 전용)
│   ├── storage.ts                  # localStorage 추상화 (mood / novel)
│   ├── types.ts                    # 공유 타입 및 상수 맵
│   └── utils.ts                    # cn(), formatDate(), extractTitle() 등
├── prompts/
│   └── novelist.ts                 # 소설가 시스템 프롬프트 빌더
└── vercel.json                     # maxDuration: 300
```

## 작동 원리

1. 사용자가 오늘의 기분을 아이콘으로 선택 → `localStorage`에 저장
2. "오늘의 이야기 만들기" 클릭 → 장르 / 분위기 / 필체 / 분량 선택 wizard
3. `/api/novel`에 POST → Anthropic SSE 스트리밍으로 소설 생성
4. 최근 7일간 기분 데이터가 시스템 프롬프트에 조용히 반영됨
5. 생성 완료 후 "저장하기" → `localStorage`에 보관
6. 홈 화면에서 지난 이야기 목록 확인 및 재열람 가능