'use client'

import { useState, useRef, KeyboardEvent } from 'react'

type Props = {
  onSend: (message: string) => void
  disabled: boolean
}

export function InputBar({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }

  return (
    <div
      className="border-t px-4 py-3"
      style={{ borderColor: '#E5E3DC', background: '#F8F6F1' }}
    >
      <div
        className="flex items-end gap-2 rounded-2xl px-4 py-2"
        style={{ background: '#fff', border: '1px solid #E5E3DC' }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
          placeholder="궁금한 법률 내용을 입력하세요..."
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder-gray-400 py-1.5"
          style={{ fontFamily: 'Noto Sans KR, sans-serif', maxHeight: '140px', color: '#1C1C1E' }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{
            background: disabled || !value.trim() ? '#E5E3DC' : '#2563EB',
            cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
          }}
          aria-label="전송"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12H19M19 12L12 5M19 12L12 19"
              stroke={disabled || !value.trim() ? '#9CA3AF' : '#fff'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <p className="text-center text-xs mt-2" style={{ color: '#9CA3AF' }}>
        법적 효력이 있는 공식 자문이 아닙니다. 중요한 결정은 전문 변호사와 상담하세요.
      </p>
    </div>
  )
}
