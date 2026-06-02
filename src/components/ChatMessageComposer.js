'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'

const ACCENTS = {
    orange: {
        ring: 'focus-within:ring-[#FF8000]/40 focus-within:border-[#FF8000]',
        btn: 'bg-[#FF8000] hover:bg-[#e67300] shadow-[#FF8000]/25',
    },
    emerald: {
        ring: 'focus-within:ring-emerald-500/40 focus-within:border-emerald-500',
        btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25',
    },
}

export default function ChatMessageComposer({
    value,
    onChange,
    onSubmit,
    placeholder = 'Escribe tu mensaje…',
    disabled = false,
    sending = false,
    darkMode = false,
    accent = 'orange',
    maxLength = 5000,
}) {
    const textareaRef = useRef(null)
    const accentStyles = ACCENTS[accent] || ACCENTS.orange
    const trimmed = String(value || '').trim()
    const canSend = trimmed.length > 0 && !disabled && !sending

    useEffect(() => {
        const el = textareaRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    }, [value])

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (canSend) onSubmit?.()
        }
    }

    return (
        <div
            className={`rounded-2xl border-2 p-2 transition-all focus-within:ring-2 ${accentStyles.ring} ${
                darkMode
                    ? 'border-gray-600/80 bg-[#262626]/60 backdrop-blur-sm'
                    : 'border-gray-200/90 bg-white shadow-sm'
            }`}
        >
            <div className="flex items-end gap-2">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    rows={1}
                    disabled={disabled || sending}
                    className={`flex-1 min-w-0 max-h-40 resize-none rounded-xl px-4 py-3 text-sm leading-relaxed border-0 focus:ring-0 focus:outline-none transition-colors ${
                        darkMode
                            ? 'bg-[#202020]/50 text-gray-100 placeholder-gray-500'
                            : 'bg-gray-50/80 text-gray-900 placeholder-gray-400'
                    } ${trimmed ? (darkMode ? 'bg-[#202020]/80' : 'bg-[#EEF2FF]') : ''}`}
                />
                <button
                    type="button"
                    onClick={() => canSend && onSubmit?.()}
                    disabled={!canSend}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition-all disabled:opacity-40 disabled:shadow-none mb-0.5 ${accentStyles.btn}`}
                    title="Enviar (Enter)"
                >
                    {sending ? (
                        <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                        <Image src="/Imagenes/icon_enviar.png" alt="Enviar" width={22} height={22} className="object-contain invert" />
                    )}
                </button>
            </div>
            <div className={`mt-1.5 px-1 flex justify-between text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                <span>Enter para enviar · Shift+Enter nueva línea</span>
                {value.length > maxLength * 0.85 && (
                    <span className={value.length >= maxLength ? 'text-rose-500' : ''}>
                        {value.length}/{maxLength}
                    </span>
                )}
            </div>
        </div>
    )
}
