'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from '@/lib/axios'
import ProductCard from '@/components/ProductCard'
import ProductGrid from '@/components/ProductGrid'
import SwitchToggle from '@/components/SwitchToggle'
import { useAdminTheme } from '@/contexts/AdminThemeContext'
import {
    getCategoriasPrincipales,
    getFiltrosDinamicos,
    getFiltrosDinamicosBusqueda,
    getMarcas,
    getProductos,
} from '@/lib/productos'

const PER_PAGE = 16

function FancySelect({
    value,
    onChange,
    options,
    disabled = false,
    darkMode = false,
    placeholder = 'Selecciona…',
    className = '',
}) {
    const [open, setOpen] = useState(false)
    const wrapRef = useRef(null)
    const selected = options.find((o) => o.value === value)

    useEffect(() => {
        const onDocClick = (e) => {
            if (!wrapRef.current) return
            if (!wrapRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [])

    const btnClass = darkMode
        ? 'w-full rounded-xl border border-violet-800/50 bg-[#12101a]/80 px-3 py-2 text-left text-sm text-gray-100 transition hover:border-violet-600/60'
        : 'w-full rounded-xl border border-violet-100 bg-white px-3 py-2 text-left text-sm text-gray-900 transition hover:border-violet-300/80'

    const menuClass = darkMode
        ? 'absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-violet-800/60 bg-[#191429] p-1 shadow-2xl'
        : 'absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-violet-200 bg-white p-1 shadow-xl'

    const itemClass = (active) =>
        `w-full rounded-lg px-2.5 py-2 text-left text-sm transition ${
            active
                ? darkMode
                    ? 'bg-violet-600/30 text-violet-100'
                    : 'bg-violet-100 text-violet-900'
                : darkMode
                  ? 'text-violet-100/90 hover:bg-violet-900/40'
                  : 'text-gray-800 hover:bg-violet-50'
        }`

    return (
        <div ref={wrapRef} className={`relative ${className}`}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen((v) => !v)}
                className={`${btnClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <span className="block truncate">{selected?.label || placeholder}</span>
                <span
                    className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
                        darkMode ? 'text-violet-300/70' : 'text-violet-500'
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

function buildPaginationSlots(current, last) {
    if (last <= 1) return [1]
    const delta = 2
    const pages = new Set([1, last])
    for (let i = current - delta; i <= current + delta; i++) {
        if (i >= 1 && i <= last) pages.add(i)
    }
    const sorted = [...pages].sort((a, b) => a - b)
    const out = []
    for (let i = 0; i < sorted.length; i++) {
        const n = sorted[i]
        if (i > 0) {
            const prev = sorted[i - 1]
            if (n - prev === 2) out.push(prev + 1)
            else if (n - prev > 2) out.push('ellipsis')
        }
        out.push(n)
    }
    return out
}

function VentasPaginationPurple({ current, lastPage, onPageChange, darkMode }) {
    if (lastPage <= 1) return null
    const slots = buildPaginationSlots(current, lastPage)
    const btnBase =
        'inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-35 disabled:pointer-events-none'
    const inactive = darkMode
        ? 'bg-[#1e1830]/90 text-violet-100/80 hover:bg-violet-950/50 border border-violet-800/50'
        : 'bg-violet-50/80 text-violet-950 hover:bg-violet-100 border border-violet-100'
    const active = darkMode
        ? 'bg-gradient-to-br from-[#5b4d7a] to-[#8b7cb8] text-white border border-violet-400/25 shadow-md shadow-black/30'
        : 'bg-gradient-to-br from-[#5b4d7a] to-[#8b7cb8] text-white border border-violet-300/40 shadow-md shadow-violet-900/15'

    return (
        <div
            className={`flex flex-wrap items-center justify-center gap-1.5 rounded-2xl px-3 py-3.5 ${
                darkMode ? 'border border-violet-900/40 bg-[#16131f]/80' : 'border border-violet-100 bg-violet-50/50'
            }`}
        >
            <button
                type="button"
                className={`${btnBase} ${inactive} px-2.5`}
                disabled={current <= 1}
                onClick={() => onPageChange(1)}
                aria-label="Primera página"
            >
                «
            </button>
            <button
                type="button"
                className={`${btnBase} ${inactive} px-2.5`}
                disabled={current <= 1}
                onClick={() => onPageChange(current - 1)}
                aria-label="Página anterior"
            >
                ‹
            </button>
            {slots.map((s, idx) =>
                s === 'ellipsis' ? (
                    <span
                        key={`e-${idx}`}
                        className={`inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-xl text-sm ${
                            darkMode ? 'text-violet-400/70' : 'text-violet-400'
                        }`}
                    >
                        …
                    </span>
                ) : (
                    <button
                        key={`p-${s}`}
                        type="button"
                        className={`${btnBase} ${s === current ? active : inactive}`}
                        onClick={() => onPageChange(s)}
                    >
                        {s}
                    </button>
                ),
            )}
            <button
                type="button"
                className={`${btnBase} ${inactive} px-2.5`}
                disabled={current >= lastPage}
                onClick={() => onPageChange(current + 1)}
                aria-label="Página siguiente"
            >
                ›
            </button>
            <button
                type="button"
                className={`${btnBase} ${inactive} px-2.5`}
                disabled={current >= lastPage}
                onClick={() => onPageChange(lastPage)}
                aria-label="Última página"
            >
                »
            </button>
        </div>
    )
}

export default function VentasCatalogoPage() {
    const { darkMode } = useAdminTheme()
    const [categorias, setCategorias] = useState([])
    const [marcas, setMarcas] = useState([])

    const [searchQ, setSearchQ] = useState('')
    const [debouncedQ, setDebouncedQ] = useState('')
    const [catPrincipal, setCatPrincipal] = useState('')
    const [subcategoria, setSubcategoria] = useState('')
    const [marca, setMarca] = useState('')
    const [soloStock, setSoloStock] = useState(true)
    const [filtrosDinamicos, setFiltrosDinamicos] = useState({})
    const [filtrosVals, setFiltrosVals] = useState({})
    const [loadingFiltrosDinamicos, setLoadingFiltrosDinamicos] = useState(false)

    const [mode, setMode] = useState('popular')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [rows, setRows] = useState([])
    const [page, setPage] = useState(1)
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })

    const subOpciones = useMemo(() => {
        const cat = categorias.find((c) => c.id === catPrincipal)
        return Array.isArray(cat?.subcategorias) ? cat.subcategorias : []
    }, [categorias, catPrincipal])

    const filtrosActivos = useMemo(
        () =>
            Object.fromEntries(
                Object.entries(filtrosVals).filter(([, v]) => v != null && String(v).trim() !== ''),
            ),
        [filtrosVals],
    )
    const filtrosDinamicosEntries = useMemo(
        () => Object.entries(filtrosDinamicos),
        [filtrosDinamicos],
    )
    const filtrosCarriles = useMemo(() => {
        if (filtrosDinamicosEntries.length === 0) return []
        if (filtrosDinamicosEntries.length <= 8) return [filtrosDinamicosEntries]
        const r1 = []
        const r2 = []
        filtrosDinamicosEntries.forEach((item, idx) => {
            if (idx % 2 === 0) r1.push(item)
            else r2.push(item)
        })
        return [r1, r2]
    }, [filtrosDinamicosEntries])

    const hasManualFilters = Boolean(
        debouncedQ.trim() ||
            catPrincipal ||
            subcategoria ||
            marca ||
            soloStock ||
            Object.keys(filtrosActivos).length,
    )

    const inputClass = darkMode
        ? 'w-full rounded-xl border border-violet-800/50 bg-[#12101a]/80 px-3 py-2 text-sm text-gray-100 placeholder:text-violet-400/60'
        : 'w-full rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400'

    const categoriaOptions = useMemo(
        () => [{ value: '', label: 'Todas' }, ...categorias.map((c) => ({ value: c.id, label: c.nombre }))],
        [categorias],
    )
    const subcategoriaOptions = useMemo(() => {
        const base = [{ value: '', label: 'Todas' }]
        if (catPrincipal) base.push({ value: 'ver-todo', label: 'Ver toda la categoría' })
        return [...base, ...subOpciones.map((s) => ({ value: s, label: s }))]
    }, [catPrincipal, subOpciones])
    const marcaOptions = useMemo(
        () => [{ value: '', label: 'Todas' }, ...marcas.map((m) => ({ value: m, label: m }))],
        [marcas],
    )

    const loadCatalogLists = useCallback(async () => {
        const [cats, m] = await Promise.all([getCategoriasPrincipales(), getMarcas()])
        setCategorias(Array.isArray(cats) ? cats : [])
        setMarcas(Array.isArray(m) ? m : [])
    }, [])

    const loadPopular = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const { data } = await axios.get('/admin/stats/categorias-mas-vistas')
            const top = (Array.isArray(data?.data) ? data.data : [])
                .map((x) => String(x?.nombre || '').trim())
                .filter((x) => x && x.toLowerCase() !== 'sin categoría')
                .slice(0, 4)

            if (top.length === 0) {
                const res = await getProductos({ page: 1, per_page: PER_PAGE })
                const p = Array.isArray(res?.productos) ? res.productos : []
                setRows(p)
                setMeta({
                    current_page: res?.current_page || 1,
                    last_page: res?.last_page || 1,
                    total: res?.total || p.length,
                })
                setMode('filtered')
                return
            }

            const packs = await Promise.all(top.map((grupo) => getProductos({ grupo, per_page: 12, page: 1 })))
            const uniq = new Map()
            for (const pack of packs) {
                for (const p of pack?.productos || []) {
                    if (p?.clave && !uniq.has(p.clave)) uniq.set(p.clave, p)
                }
            }
            const merged = Array.from(uniq.values())
            setRows(merged)
            setMeta({
                current_page: 1,
                last_page: Math.max(1, Math.ceil(merged.length / PER_PAGE)),
                total: merged.length,
            })
            setPage(1)
            setMode('popular')
        } catch (e) {
            setError(e?.message || 'No se pudo cargar el catálogo.')
            setRows([])
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchFiltered = useCallback(
        async (nextPage = 1) => {
            setLoading(true)
            setError('')
            try {
                const params = { page: nextPage, per_page: PER_PAGE }
                if (debouncedQ.trim()) params.busqueda_q = debouncedQ.trim()
                if (catPrincipal && subcategoria === 'ver-todo') params.categoria_principal = catPrincipal
                if (subcategoria && subcategoria !== 'ver-todo') params.grupo = subcategoria
                if (marca) params.marca = marca
                if (soloStock) params.solo_con_stock = true
                if (Object.keys(filtrosActivos).length) params.filtros = filtrosActivos
                const res = await getProductos(params)
                let p = Array.isArray(res?.productos) ? res.productos : []
                if (!soloStock) {
                    p = p.filter((x) => (Number(x?.disponible) || 0) + (Number(x?.disponible_cd) || 0) <= 0)
                }
                setRows(p)
                setMeta({
                    current_page: res?.current_page || nextPage,
                    last_page: res?.last_page || 1,
                    total: p.length,
                })
                setPage(res?.current_page || nextPage)
                setMode('filtered')
            } catch (e) {
                setError(e?.message || 'No se pudo cargar el catálogo.')
                setRows([])
            } finally {
                setLoading(false)
            }
        },
        [debouncedQ, catPrincipal, subcategoria, marca, soloStock, filtrosActivos],
    )

    useEffect(() => {
        loadCatalogLists()
        loadPopular()
    }, [loadCatalogLists, loadPopular])

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(searchQ), 320)
        return () => clearTimeout(t)
    }, [searchQ])

    useEffect(() => {
        setPage(1)
        if (hasManualFilters) fetchFiltered(1)
        else loadPopular()
    }, [hasManualFilters, fetchFiltered, loadPopular])

    useEffect(() => {
        setSubcategoria('')
        setFiltrosVals({})
    }, [catPrincipal])

    useEffect(() => {
        let cancelled = false
        const loadDynamic = async () => {
            try {
                setLoadingFiltrosDinamicos(true)
                if (debouncedQ.trim()) {
                    const fd = await getFiltrosDinamicosBusqueda(debouncedQ, {
                        marca,
                        soloConStock: soloStock,
                        filtros: filtrosActivos,
                    })
                    if (!cancelled) setFiltrosDinamicos(fd && typeof fd === 'object' ? fd : {})
                    return
                }
                if (catPrincipal) {
                    const subToUse = subcategoria || 'ver-todo'
                    const fd = await getFiltrosDinamicos(catPrincipal, subToUse, {
                        marca,
                        soloConStock: soloStock,
                        filtros: filtrosActivos,
                    })
                    if (!cancelled) setFiltrosDinamicos(fd && typeof fd === 'object' ? fd : {})
                    return
                }
                if (!cancelled) setFiltrosDinamicos({})
            } catch {
                if (!cancelled) setFiltrosDinamicos({})
            } finally {
                if (!cancelled) setLoadingFiltrosDinamicos(false)
            }
        }
        loadDynamic()
        return () => {
            cancelled = true
        }
    }, [debouncedQ, catPrincipal, subcategoria, marca, soloStock, filtrosActivos])

    const handleLimpiar = () => {
        setSearchQ('')
        setCatPrincipal('')
        setSubcategoria('')
        setMarca('')
        setSoloStock(true)
        setFiltrosVals({})
        loadPopular()
    }

    const visibleRows = useMemo(() => {
        if (mode !== 'popular') return rows
        const start = (page - 1) * PER_PAGE
        return rows.slice(start, start + PER_PAGE)
    }, [rows, mode, page])

    const currentPage = mode === 'popular' ? page : meta.current_page || 1
    const lastPage = mode === 'popular' ? Math.max(1, Math.ceil(rows.length / PER_PAGE)) : meta.last_page || 1
    const totalRows = mode === 'popular' ? rows.length : meta.total || rows.length

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-violet-950 dark:text-white">Catálogo</h1>
                <p className="text-sm text-violet-800/70 dark:text-violet-200/60 mt-1">
                    Productos para cotizar en formato de cuadrícula.
                </p>
            </div>

            <div
                className={`rounded-2xl border p-4 md:p-5 ${
                    darkMode ? 'border-violet-900/40 bg-[#1a1628]/90' : 'border-violet-100 bg-white'
                }`}
            >
                <div className="flex flex-wrap items-end gap-2 md:gap-3">
                    <div className="min-w-[220px] flex-1">
                        <label className="block text-xs mb-1 text-violet-800/80 dark:text-violet-200/70">Buscar</label>
                        <input
                            value={searchQ}
                            onChange={(e) => setSearchQ(e.target.value)}
                            placeholder="Nombre, clave o palabra…"
                            className={inputClass}
                        />
                    </div>
                    <div className="min-w-[170px]">
                        <label className="block text-xs mb-1 text-violet-800/80 dark:text-violet-200/70">Categoría</label>
                        <FancySelect
                            value={catPrincipal}
                            onChange={(v) => {
                                setCatPrincipal(v)
                                setSubcategoria('')
                            }}
                            options={categoriaOptions}
                            darkMode={darkMode}
                        />
                    </div>
                    <div className="min-w-[170px]">
                        <label className="block text-xs mb-1 text-violet-800/80 dark:text-violet-200/70">Subcategoría</label>
                        <FancySelect
                            value={subcategoria}
                            onChange={setSubcategoria}
                            options={subcategoriaOptions}
                            darkMode={darkMode}
                            disabled={!catPrincipal}
                        />
                    </div>
                    <div className="min-w-[170px]">
                        <label className="block text-xs mb-1 text-violet-800/80 dark:text-violet-200/70">Marca</label>
                        <FancySelect value={marca} onChange={setMarca} options={marcaOptions} darkMode={darkMode} />
                    </div>
                    <label className="inline-flex items-center gap-2 px-2 pb-2">
                        <SwitchToggle
                            id="ventas-catalogo-solo-stock"
                            checked={soloStock}
                            onChange={setSoloStock}
                            darkMode={darkMode}
                            aria-label={soloStock ? 'Con stock' : 'Sin stock'}
                        />
                        <span className="text-sm text-violet-800/80 dark:text-violet-200/80 select-none">
                            {soloStock ? 'Con stock' : 'Sin stock'}
                        </span>
                    </label>
                    <button
                        type="button"
                        onClick={handleLimpiar}
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                            darkMode
                                ? 'border-violet-700 text-violet-200 hover:bg-violet-900/40'
                                : 'border-violet-200 text-violet-900 hover:bg-violet-50'
                        }`}
                    >
                        Limpiar
                    </button>
                </div>

                {loadingFiltrosDinamicos ? (
                    <div className={`mt-4 border-t pt-4 text-xs ${darkMode ? 'border-violet-900/40 text-violet-300/70' : 'border-violet-100 text-violet-700/80'}`}>
                        Cargando filtros dinámicos…
                    </div>
                ) : filtrosDinamicosEntries.length > 0 ? (
                    <div
                        className={`mt-4 border-t pt-4 ${
                            darkMode ? 'border-violet-900/40' : 'border-violet-100'
                        }`}
                    >
                        <p className="mb-2 text-xs uppercase tracking-wide text-violet-700/80 dark:text-violet-300/70">
                            Filtros dinámicos
                        </p>
                        <div
                            className={`rounded-xl border px-2 py-2 ${
                                darkMode ? 'border-violet-900/40 bg-[#141024]/65' : 'border-violet-100 bg-violet-50/35'
                            }`}
                        >
                            <div className="overflow-x-auto pb-1">
                                <div className="min-w-max space-y-2">
                                    {filtrosCarriles.map((carril, carrilIdx) => (
                                        <div key={carrilIdx} className="flex items-start gap-2">
                                            {carril.map(([etiqueta, valores]) => (
                                                <div
                                                    key={etiqueta}
                                                    className={`w-[200px] rounded-lg p-1.5 ${
                                                        darkMode ? 'bg-violet-950/30' : 'bg-white/80'
                                                    }`}
                                                >
                                                    <label className="block text-[11px] mb-1 text-violet-800/80 dark:text-violet-200/70 truncate">
                                                        {etiqueta}
                                                    </label>
                                                    <FancySelect
                                                        value={filtrosVals[etiqueta] || ''}
                                                        onChange={(val) =>
                                                            setFiltrosVals((prev) => ({
                                                                ...prev,
                                                                [etiqueta]: val || undefined,
                                                            }))
                                                        }
                                                        options={[
                                                            { value: '', label: 'Cualquiera' },
                                                            ...((valores || []).map((v) => ({ value: v, label: v }))),
                                                        ]}
                                                        darkMode={darkMode}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            {error ? (
                <div className={`rounded-xl border px-4 py-3 text-sm ${darkMode ? 'border-rose-900/50 bg-rose-950/30 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>
                    {error}
                </div>
            ) : null}

            {loading ? (
                <div className="py-10 text-sm text-violet-700/80 dark:text-violet-300/70">Cargando productos…</div>
            ) : visibleRows.length === 0 ? (
                <div className={`rounded-2xl border px-4 py-10 text-center text-sm ${darkMode ? 'border-violet-900/40 text-violet-300/70' : 'border-violet-100 bg-violet-50/50 text-violet-900/75'}`}>
                    Sin resultados para esos filtros.
                </div>
            ) : (
                <>
                    <ProductGrid darkMode={darkMode}>
                        {visibleRows.map((producto) => (
                            <ProductCard
                                key={producto.clave}
                                producto={producto}
                                darkMode={darkMode}
                            />
                        ))}
                    </ProductGrid>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className={`text-xs ${darkMode ? 'text-violet-300/65' : 'text-violet-800/70'}`}>
                            Página {currentPage} de {lastPage} · {totalRows} resultados
                        </p>
                        <VentasPaginationPurple
                            current={currentPage}
                            lastPage={lastPage}
                            onPageChange={(p) => {
                                if (mode === 'popular') setPage(p)
                                else fetchFiltered(p)
                            }}
                            darkMode={darkMode}
                        />
                    </div>
                </>
            )}
        </div>
    )
}
