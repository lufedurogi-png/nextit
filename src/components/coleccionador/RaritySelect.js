'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { RARITY_OPTIONS } from '@/lib/rarityOptions'

/**
 * Selector de rareza con diseño propio (evita el menú nativo del SO).
 * `value` y `onChange(code)` controlados.
 */
export default function RaritySelect({ value, onChange, disabled = false, className = '' }) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef(null)
    const listId = useId()
    const active = RARITY_OPTIONS.find((r) => r.code === value) || RARITY_OPTIONS[0]

    useEffect(() => {
        if (!open) return
        const close = (e) => {
            if (!rootRef.current?.contains(e.target)) setOpen(false)
        }
        const onKey = (e) => {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', close)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', close)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            <button
                type="button"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => !disabled && setOpen((v) => !v)}
                className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold shadow-sm transition hover:border-slate-300 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-50 dark:hover:border-slate-500"
                style={{ boxShadow: `inset 4px 0 0 0 ${active.color}` }}
            >
                <span className="min-w-0 flex-1 truncate">
                    <span className="font-black text-[var(--app-accent)]">{active.code}</span>
                    <span className="text-slate-600 dark:text-slate-300"> · {active.label}</span>
                </span>
                <svg className={`h-4 w-4 shrink-0 text-slate-500 transition ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {open ? (
                <ul
                    id={listId}
                    role="listbox"
                    className="absolute z-[100] mt-1 max-h-[min(320px,55vh)] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl dark:border-slate-600 dark:bg-slate-900"
                >
                    {RARITY_OPTIONS.map((r) => {
                        const selected = r.code === value
                        return (
                            <li key={r.code} role="presentation">
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    onClick={() => {
                                        onChange(r.code)
                                        setOpen(false)
                                    }}
                                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${
                                        selected
                                            ? 'bg-[var(--app-accent)]/12 font-bold text-slate-900 dark:text-slate-50'
                                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/30" style={{ backgroundColor: r.color }} aria-hidden />
                                    <span className="font-black text-[var(--app-accent)]">{r.code}</span>
                                    <span className="truncate text-slate-600 dark:text-slate-300">{r.label}</span>
                                </button>
                            </li>
                        )
                    })}
                </ul>
            ) : null}
        </div>
    )
}
