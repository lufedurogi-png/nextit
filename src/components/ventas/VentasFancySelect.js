'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * @param {{ value: string, label: string, hint?: string, dotClass?: string }[]} options
 */
export default function VentasFancySelect({
    value,
    onChange,
    options,
    disabled = false,
    darkMode = false,
    placeholder = 'Selecciona…',
    className = '',
    compact = false,
    label = '',
}) {
    const [open, setOpen] = useState(false)
    const wrapRef = useRef(null)
    const selected = options.find((o) => o.value === value)

    useEffect(() => {
        const onDocClick = (e) => {
            if (!wrapRef.current?.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [])

    const py = compact ? 'py-1.5' : 'py-2.5'
    const text = compact ? 'text-xs' : 'text-sm'

    const btnClass = darkMode
        ? `relative w-full rounded-xl border border-orange-800/60 bg-gradient-to-b from-[#262626] to-[#202020] px-3 ${py} pr-9 text-left ${text} text-gray-100 shadow-sm transition hover:border-orange-500/70 focus:outline-none focus:ring-2 focus:ring-orange-500/35`
        : `relative w-full rounded-xl border border-orange-200/90 bg-gradient-to-b from-white to-orange-50/40 px-3 ${py} pr-9 text-left ${text} text-gray-900 shadow-sm transition hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400/30`

    const menuClass = darkMode
        ? 'absolute z-50 mt-1.5 max-h-64 w-full min-w-[10rem] overflow-y-auto rounded-xl border border-orange-700/50 bg-[#262626] p-1.5 shadow-2xl shadow-black/40 ring-1 ring-orange-500/10'
        : 'absolute z-50 mt-1.5 max-h-64 w-full min-w-[10rem] overflow-y-auto rounded-xl border border-orange-200 bg-white p-1.5 shadow-xl shadow-orange-900/10 ring-1 ring-orange-100'

    const itemClass = (active) =>
        `flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left ${text} transition ${
            active
                ? darkMode
                    ? 'bg-orange-600/35 text-white font-medium'
                    : 'bg-orange-100 text-orange-950 font-medium'
                : darkMode
                  ? 'text-orange-100/90 hover:bg-orange-900/45'
                  : 'text-gray-800 hover:bg-orange-50'
        }`

    return (
        <div ref={wrapRef} className={className}>
            {label ? (
                <p className={`mb-1.5 text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-300/70' : 'text-orange-600/90'}`}>
                    {label}
                </p>
            ) : null}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen((v) => !v)}
                className={`${btnClass} ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${open ? (darkMode ? 'border-orange-500/80 ring-2 ring-orange-500/25' : 'border-orange-400 ring-2 ring-orange-300/40') : ''}`}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="flex min-w-0 items-center gap-2">
                    {selected?.dotClass ? <span className={`h-2 w-2 shrink-0 rounded-full ${selected.dotClass}`} /> : null}
                    <span className="truncate">{selected?.label || placeholder}</span>
                </span>
                <span
                    className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition ${open ? 'rotate-180' : ''} ${
                        darkMode ? 'text-orange-300/80' : 'text-orange-500'
                    }`}
                    aria-hidden
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </span>
            </button>

            {open && !disabled ? (
                <div className={menuClass} role="listbox">
                    {options.map((o) => (
                        <button
                            key={o.value}
                            type="button"
                            role="option"
                            aria-selected={o.value === value}
                            className={itemClass(o.value === value)}
                            onClick={() => {
                                onChange(o.value)
                                setOpen(false)
                            }}
                        >
                            {o.dotClass ? <span className={`h-2 w-2 shrink-0 rounded-full ${o.dotClass}`} /> : null}
                            <span className="min-w-0 flex-1 truncate">{o.label}</span>
                            {o.hint ? (
                                <span className={`shrink-0 text-[10px] ${darkMode ? 'text-orange-400' : 'text-orange-500'}`}>{o.hint}</span>
                            ) : null}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    )
}
