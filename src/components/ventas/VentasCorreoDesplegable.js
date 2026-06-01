'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * @param {{ value: string, label: string }[]} options
 */
export default function VentasCorreoDesplegable({
    id,
    label,
    value,
    options,
    onChange,
    disabled = false,
    darkMode,
    placeholder = 'Seleccionar…',
}) {
    const [abierto, setAbierto] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        if (!abierto) return
        const cerrar = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
        }
        document.addEventListener('mousedown', cerrar)
        return () => document.removeEventListener('mousedown', cerrar)
    }, [abierto])

    const seleccionado = options.find((o) => String(o.value) === String(value))
    const textoMostrado = seleccionado?.label ?? placeholder

    const trigger = `flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition text-left ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    } ${
        darkMode
            ? 'border-violet-800/60 bg-[#12101a] text-violet-50 hover:border-violet-600'
            : 'border-violet-200 bg-white text-violet-950 hover:border-violet-300 hover:bg-violet-50/80'
    } ${abierto ? (darkMode ? 'border-violet-500 ring-1 ring-violet-500/40' : 'border-violet-400 ring-1 ring-violet-300/60') : ''}`

    const panel = `absolute z-30 mt-1.5 w-full min-w-[10rem] max-h-52 overflow-y-auto rounded-xl border py-1 shadow-lg ${
        darkMode ? 'border-violet-800/60 bg-[#1a1628]' : 'border-violet-200 bg-white'
    }`

    return (
        <div ref={ref} className="relative min-w-0">
            {label ? (
                <label htmlFor={id} className="block text-xs font-medium text-violet-800/80 dark:text-violet-300/70 mb-1">
                    {label}
                </label>
            ) : null}
            <button
                id={id}
                type="button"
                disabled={disabled}
                className={trigger}
                aria-expanded={abierto}
                aria-haspopup="listbox"
                onClick={() => !disabled && setAbierto((o) => !o)}
            >
                <span className={`truncate ${!seleccionado ? 'text-violet-500/80 dark:text-violet-400/70' : ''}`}>
                    {textoMostrado}
                </span>
                <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-100/80 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200 text-[10px] transition-transform ${
                        abierto ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                >
                    ▼
                </span>
            </button>
            {abierto && !disabled && (
                <ul role="listbox" className={panel} aria-labelledby={label ? id : undefined}>
                    {options.map((opt) => {
                        const activo = String(opt.value) === String(value)
                        return (
                            <li key={String(opt.value) || 'empty'}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={activo}
                                    className={`w-full px-3 py-2 text-left text-sm transition ${
                                        activo
                                            ? darkMode
                                                ? 'bg-violet-800/60 text-white font-semibold'
                                                : 'bg-violet-200/90 text-violet-950 font-semibold'
                                            : darkMode
                                              ? 'text-violet-100 hover:bg-violet-900/40'
                                              : 'text-violet-900 hover:bg-violet-50'
                                    }`}
                                    onClick={() => {
                                        onChange(String(opt.value))
                                        setAbierto(false)
                                    }}
                                >
                                    {opt.label}
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
