'use client'

import { useEffect, useRef, useState } from 'react'

const ACCENTS = {
    orange: {
        btnLight:
            'w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-left text-sm text-gray-900 transition hover:border-orange-300/80',
        btnDark:
            'w-full rounded-xl border border-orange-800/50 bg-[#202020]/80 px-3 py-2 text-left text-sm text-gray-100 transition hover:border-orange-600/60',
        menuLight: 'absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-orange-200 bg-white p-1 shadow-xl',
        menuDark:
            'absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-orange-800/60 bg-[#262626] p-1 shadow-2xl',
        caretLight: 'text-orange-500',
        caretDark: 'text-orange-300/70',
        itemActiveLight: 'bg-orange-100 text-orange-900',
        itemActiveDark: 'bg-orange-600/30 text-orange-100',
        itemIdleLight: 'text-gray-800 hover:bg-orange-50',
        itemIdleDark: 'text-orange-100/90 hover:bg-orange-900/40',
    },
    emerald: {
        btnLight:
            'w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-left text-sm text-gray-900 transition hover:border-emerald-300/80',
        btnDark:
            'w-full rounded-xl border border-emerald-800/50 bg-[#202020]/80 px-3 py-2 text-left text-sm text-gray-100 transition hover:border-emerald-600/60',
        menuLight: 'absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-emerald-200 bg-white p-1 shadow-xl',
        menuDark:
            'absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-emerald-800/60 bg-[#262626] p-1 shadow-2xl',
        caretLight: 'text-emerald-600',
        caretDark: 'text-emerald-300/70',
        itemActiveLight: 'bg-emerald-100 text-emerald-900',
        itemActiveDark: 'bg-emerald-600/30 text-emerald-100',
        itemIdleLight: 'text-gray-800 hover:bg-emerald-50',
        itemIdleDark: 'text-emerald-100/90 hover:bg-emerald-900/40',
    },
}

export default function FancySelect({
    value,
    onChange,
    options,
    disabled = false,
    darkMode = false,
    accent = 'orange',
    placeholder = 'Selecciona…',
    className = '',
}) {
    const [open, setOpen] = useState(false)
    const wrapRef = useRef(null)
    const selected = options.find((o) => o.value === value)
    const theme = ACCENTS[accent] || ACCENTS.orange

    useEffect(() => {
        const onDocClick = (e) => {
            if (!wrapRef.current) return
            if (!wrapRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [])

    const btnClass = darkMode ? theme.btnDark : theme.btnLight
    const menuClass = darkMode ? theme.menuDark : theme.menuLight

    const itemClass = (active) =>
        `w-full rounded-lg px-2.5 py-2 text-left text-sm transition ${
            active
                ? darkMode
                    ? theme.itemActiveDark
                    : theme.itemActiveLight
                : darkMode
                  ? theme.itemIdleDark
                  : theme.itemIdleLight
        }`

    return (
        <div ref={wrapRef} className={`relative ${className}`}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen((v) => !v)}
                className={`${btnClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <span className="block truncate pr-5">{selected?.label || placeholder}</span>
                <span
                    className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
                        darkMode ? theme.caretDark : theme.caretLight
                    }`}
                >
                    ▾
                </span>
            </button>

            {open && !disabled && (
                <div className={menuClass}>
                    {options.map((o) => (
                        <button
                            key={o.value}
                            type="button"
                            className={itemClass(o.value === value)}
                            onClick={() => {
                                onChange(o.value)
                                setOpen(false)
                            }}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
