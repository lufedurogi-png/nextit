'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { fetchVentasBusqueda } from '@/lib/ventasBusquedaApi'
import { FUZZY_THRESHOLD, bestFuzzyScore } from '@/lib/ventasSearchFuzzy'
import { searchVentasViews } from '@/lib/ventasSearchIndex'

const TYPE_LABEL = {
    vista: 'Vista',
    cotizacion: 'Cotización',
    cliente: 'Cliente',
    tarea: 'Tarea',
    pedido: 'Pedido',
    correo: 'Correo',
}

function groupResults(items) {
    const vistas = items.filter((i) => i.type === 'vista')
    const registros = items.filter((i) => i.type !== 'vista')
    return { vistas, registros }
}

export default function VentasGlobalSearch({ darkMode }) {
    const router = useRouter()
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [apiRows, setApiRows] = useState([])
    const [activeIdx, setActiveIdx] = useState(-1)
    const wrapRef = useRef(null)
    const inputRef = useRef(null)
    const debouncedQ = useDebounce(query, 320)

    const inputCls = `w-full rounded-xl border py-2 pl-10 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-violet-500/40 ${
        darkMode
            ? 'border-violet-800/60 bg-[#12101a]/90 text-white placeholder:text-violet-400/50'
            : 'border-violet-100 bg-violet-50/50 text-gray-900 placeholder:text-violet-500/60'
    }`

    useEffect(() => {
        const onDoc = (e) => {
            if (!wrapRef.current?.contains(e.target)) {
                setOpen(false)
                setActiveIdx(-1)
            }
        }
        document.addEventListener('mousedown', onDoc)
        return () => document.removeEventListener('mousedown', onDoc)
    }, [])

    useEffect(() => {
        const q = debouncedQ.trim()
        if (q.length < 2) {
            setApiRows([])
            setLoading(false)
            return
        }
        let cancelled = false
        setLoading(true)
        fetchVentasBusqueda(q)
            .then((rows) => {
                if (!cancelled) setApiRows(rows)
            })
            .catch(() => {
                if (!cancelled) setApiRows([])
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [debouncedQ])

    const results = useMemo(() => {
        const q = debouncedQ.trim()
        if (q.length < 2) return []

        const viewHits = searchVentasViews(q, FUZZY_THRESHOLD).map((v) => ({
            id: v.id,
            type: 'vista',
            vista: v.vista,
            title: v.title,
            subtitle: v.subtitle,
            href: v.href,
            score: v.score,
        }))

        const recordHits = apiRows
            .map((r) => {
                const blob = r.search_text || `${r.title} ${r.subtitle} ${r.vista}`
                const score = bestFuzzyScore(q, blob, FUZZY_THRESHOLD)
                return score > 0 ? { ...r, score } : null
            })
            .filter(Boolean)

        const merged = [...viewHits, ...recordHits]
        const seen = new Set()
        const unique = []
        for (const item of merged.sort((a, b) => b.score - a.score)) {
            if (seen.has(item.id)) continue
            seen.add(item.id)
            unique.push(item)
        }
        return unique.slice(0, 18)
    }, [debouncedQ, apiRows])

    const { vistas, registros } = groupResults(results)
    const flatList = useMemo(() => [...vistas, ...registros], [vistas, registros])

    const go = useCallback(
        (item) => {
            if (!item?.href) return
            setOpen(false)
            setQuery('')
            setActiveIdx(-1)
            router.push(item.href)
        },
        [router],
    )

    const onKeyDown = (e) => {
        if (!open && e.key !== 'ArrowDown') return
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActiveIdx((i) => Math.min(i + 1, flatList.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIdx((i) => Math.max(i - 1, 0))
        } else if (e.key === 'Enter' && activeIdx >= 0 && flatList[activeIdx]) {
            e.preventDefault()
            go(flatList[activeIdx])
        } else if (e.key === 'Escape') {
            setOpen(false)
            setActiveIdx(-1)
        }
    }

    const showPanel = open && query.trim().length >= 2

    const renderItem = (item, idx) => {
        const active = idx === activeIdx
        return (
            <button
                key={item.id}
                type="button"
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => go(item)}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    active
                        ? darkMode
                            ? 'bg-violet-600/30'
                            : 'bg-violet-100'
                        : darkMode
                          ? 'hover:bg-violet-900/35'
                          : 'hover:bg-violet-50'
                }`}
            >
                <span
                    className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        item.type === 'vista'
                            ? darkMode
                                ? 'bg-violet-500/25 text-violet-200'
                                : 'bg-violet-200 text-violet-900'
                            : darkMode
                              ? 'bg-[#2a2540] text-violet-300'
                              : 'bg-violet-50 text-violet-700'
                    }`}
                >
                    {item.vista || TYPE_LABEL[item.type] || item.type}
                </span>
                <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {item.title}
                    </span>
                    {item.subtitle ? (
                        <span className={`block truncate text-xs ${darkMode ? 'text-violet-300/70' : 'text-gray-500'}`}>{item.subtitle}</span>
                    ) : null}
                </span>
            </button>
        )
    }

    let runningIdx = 0

    return (
        <div ref={wrapRef} className="relative w-full max-w-md">
            <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value)
                    setOpen(true)
                    setActiveIdx(-1)
                }}
                onFocus={() => query.trim().length >= 2 && setOpen(true)}
                onKeyDown={onKeyDown}
                placeholder="Buscar vistas, clientes, folios…"
                className={inputCls}
                aria-label="Buscar en ventas"
                aria-expanded={showPanel}
                aria-autocomplete="list"
                autoComplete="off"
            />
            <svg
                className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${darkMode ? 'text-violet-400' : 'text-violet-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>

            {showPanel ? (
                <div
                    className={`absolute left-0 right-0 top-full z-[60] mt-2 max-h-[min(70vh,28rem)] overflow-y-auto rounded-2xl border p-2 shadow-2xl ${
                        darkMode ? 'border-violet-800/60 bg-[#191429]' : 'border-violet-200 bg-white'
                    }`}
                    role="listbox"
                >
                    {loading ? (
                        <p className={`px-3 py-4 text-center text-sm ${darkMode ? 'text-violet-300/70' : 'text-violet-600'}`}>Buscando…</p>
                    ) : results.length === 0 ? (
                        <p className={`px-3 py-4 text-center text-sm ${darkMode ? 'text-violet-300/70' : 'text-gray-500'}`}>
                            Sin coincidencias (tolerancia ~70 %).
                        </p>
                    ) : (
                        <>
                            {vistas.length > 0 ? (
                                <div className="mb-2">
                                    <p className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-violet-400' : 'text-violet-600'}`}>
                                        Vistas y secciones
                                    </p>
                                    {vistas.map((item) => renderItem(item, runningIdx++))}
                                </div>
                            ) : null}
                            {registros.length > 0 ? (
                                <div>
                                    <p className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-violet-400' : 'text-violet-600'}`}>
                                        Registros
                                    </p>
                                    {registros.map((item) => renderItem(item, runningIdx++))}
                                </div>
                            ) : null}
                        </>
                    )}
                    <p className={`mt-2 border-t px-2 pt-2 text-[10px] ${darkMode ? 'border-violet-900/50 text-violet-500' : 'border-violet-100 text-violet-500'}`}>
                        Enter para abrir · ↑↓ navegar · Esc cerrar
                    </p>
                </div>
            ) : null}
        </div>
    )
}
