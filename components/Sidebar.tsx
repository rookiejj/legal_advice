'use client'

const SIDEBAR_CATEGORIES = [
    { emoji: '🏠', label: '임대차' },
    { emoji: '💼', label: '노동·고용' },
    { emoji: '👨‍👩‍👧', label: '가족·상속' },
    { emoji: '🚗', label: '교통·사고' },
    { emoji: '💰', label: '채권·채무' },
    { emoji: '🏢', label: '기업·상사' },
]

type Props = {
    isOpen: boolean
    onNewChat: () => void
    onCategoryClick: (query: string) => void
    onClose: () => void
}

export function Sidebar({ isOpen, onNewChat, onCategoryClick, onClose }: Props) {
    return (
        <aside
            className={`
        fixed md:static inset-y-0 left-0 z-30
        flex flex-col w-64 flex-shrink-0
        transform transition-transform duration-300 ease-in-out
        md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
            style={{ background: '#0F1117', color: '#fff' }}
        >
            <div className="flex items-center justify-between px-5 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                    <div className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Noto Serif KR, serif' }}>법망</div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>AI 법률 정보 서비스</div>
                </div>
                <button className="md:hidden p-1 rounded opacity-50 hover:opacity-100" onClick={onClose} aria-label="닫기">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </button>
            </div>

            <div className="px-4 pt-4">
                <button
                    onClick={onNewChat}
                    className="w-full text-sm py-2.5 rounded-lg transition-all text-left px-3 flex items-center gap-2"
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                >
                    <span>＋</span><span>새 대화</span>
                </button>
            </div>

            <div className="px-4 pt-6">
                <div className="text-xs font-medium mb-2 px-1" style={{ color: 'rgba(255,255,255,0.3)' }}>법률 분야</div>
                <nav className="flex flex-col gap-0.5">
                    {SIDEBAR_CATEGORIES.map((cat) => (
                        <button
                            key={cat.label}
                            onClick={() => onCategoryClick(`${cat.label} 관련 주요 법률을 알려줘`)}
                            className="text-left text-sm px-3 py-2.5 rounded-lg transition-all flex items-center gap-2.5 active:opacity-70"
                            style={{ color: 'rgba(255,255,255,0.55)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
                        >
                            <span style={{ fontSize: '15px' }}>{cat.emoji}</span>
                            <span>{cat.label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-auto px-4 py-5">
                <div className="text-xs rounded-lg px-3 py-3" style={{ background: 'rgba(37,99,235,0.15)', color: 'rgba(147,197,253,0.9)', lineHeight: '1.6' }}>
                    본 서비스는 법적 조언을 제공하지 않습니다. 중요한 사안은 법률 전문가와 상담하세요.
                </div>
            </div>
        </aside>
    )
}