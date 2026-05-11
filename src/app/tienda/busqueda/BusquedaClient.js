'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import useSWR from 'swr'
import ProductCard from '@/components/ProductCard'
import ProductGrid from '@/components/ProductGrid'
import TiendaNavHeader from '@/components/TiendaNavHeader'
import { getCatalogEstado, getFiltrosDinamicosBusqueda, getProductos } from '@/lib/productos'
import { getBusqueda, getBusquedaSessionId } from '@/lib/busqueda'
import { useTiendaDarkMode } from '@/hooks/useTiendaDarkMode'
import { useMobileLeftDrawerSwipe } from '@/hooks/useMobileLeftDrawerSwipe'

const emptyResult = {
    busqueda_id: 0,
    texto_original: '',
    texto_normalizado: '',
    correccion_aplicada: false,
    productos: [],
}

const RANGOS_PRECIO = [
    { value: '', label: 'Todos los precios', min: null, max: null },
    { value: '0-500', label: '$0 - $500', min: 0, max: 500 },
    { value: '500-1000', label: '$500 - $1,000', min: 500, max: 1000 },
    { value: '1000-5000', label: '$1,000 - $5,000', min: 1000, max: 5000 },
    { value: '5000-10000', label: '$5,000 - $10,000', min: 5000, max: 10000 },
    { value: '10000-20000', label: '$10,000 - $20,000', min: 10000, max: 20000 },
    { value: '20000-50000', label: '$20,000 - $50,000', min: 20000, max: 50000 },
    { value: '50000', label: 'Más de $50,000', min: 50000, max: null },
]

function parseUrlFilters(searchParams) {
    const marca = searchParams.get('marca') ?? ''
    const precio = searchParams.get('precio') ?? ''
    const stock = searchParams.get('stock') ?? ''
    let filtros = {}
    try {
        const raw = searchParams.get('filtros')
        if (raw) filtros = JSON.parse(decodeURIComponent(raw)) || {}
    } catch {
        //
    }
    return { marca, precio, stock, filtros }
}

export default function BusquedaClient({ initialData = null, initialQuery = '' }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const querySearch = searchParams.get('q') ?? ''
    const initialTrimmed = typeof initialQuery === 'string' ? initialQuery.trim() : ''

    const parsed = parseUrlFilters(searchParams)

    const { darkMode, setDarkMode } = useTiendaDarkMode()
    const [catalogDisponible, setCatalogDisponible] = useState(false)
    const [resultadoBusqueda, setResultadoBusqueda] = useState(() =>
        initialData && (initialData.productos?.length > 0 || initialData.texto_original !== undefined)
            ? initialData
            : null
    )
    const [loadingBusqueda, setLoadingBusqueda] = useState(() =>
        initialTrimmed ? !(initialData?.productos?.length || (initialData?.texto_original !== undefined && initialData?.texto_original !== '')) : false
    )
    const [orden, setOrden] = useState('reciente')
    const [rangoPrecio, setRangoPrecio] = useState(() => parsed.precio || '')
    const [selectedMarca, setSelectedMarca] = useState(() => parsed.marca || '')
    const [stockFiltro, setStockFiltro] = useState(() => parsed.stock || '')
    const [filtrosDinamicos, setFiltrosDinamicos] = useState({})
    const [filtrosDinamicosSeleccionados, setFiltrosDinamicosSeleccionados] = useState(() => parsed.filtros || {})
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

    const initialDataRef = useRef(initialData)
    initialDataRef.current = initialData

    useEffect(() => {
        getCatalogEstado()
            .then((estado) => setCatalogDisponible(estado?.disponible ?? false))
            .catch(() => setCatalogDisponible(false))
    }, [])

    useEffect(() => {
        if (!mobileFiltersOpen) return undefined
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = previousOverflow
        }
    }, [mobileFiltersOpen])

    const { edgeStripProps, drawerTouchProps } = useMobileLeftDrawerSwipe({
        isOpen: mobileFiltersOpen,
        onOpen: () => setMobileFiltersOpen(true),
        onClose: () => setMobileFiltersOpen(false),
        enabled: (resultadoBusqueda?.productos?.length ?? 0) > 0,
    })

    useEffect(() => {
        const q = typeof querySearch === 'string' ? querySearch.trim() : ''
        if (!catalogDisponible || !q) {
            setResultadoBusqueda(q ? null : initialData || null)
            setLoadingBusqueda(false)
            return
        }
        if (q === initialTrimmed && initialDataRef.current) {
            setResultadoBusqueda(initialDataRef.current)
            setLoadingBusqueda(false)
            return
        }
        setLoadingBusqueda(true)
        const sessionId = getBusquedaSessionId()
        getBusqueda(q, sessionId)
            .then((res) => setResultadoBusqueda(res))
            .catch(() => setResultadoBusqueda(emptyResult))
            .finally(() => setLoadingBusqueda(false))
    }, [catalogDisponible, querySearch, initialTrimmed])

    const parsedKey = `${parsed.marca}|${parsed.precio}|${parsed.stock}|${JSON.stringify(parsed.filtros)}`
    useEffect(() => {
        setSelectedMarca(parsed.marca)
        setRangoPrecio(parsed.precio)
        setStockFiltro(parsed.stock)
        setFiltrosDinamicosSeleccionados(parsed.filtros)
    }, [parsedKey])

    const rango = RANGOS_PRECIO.find((r) => r.value === rangoPrecio)
    const filtrosActivos = useMemo(
        () =>
            Object.fromEntries(
                Object.entries(filtrosDinamicosSeleccionados).filter(([, v]) => v != null && String(v).trim() !== '')
            ),
        [filtrosDinamicosSeleccionados]
    )

    const usarApiProductos = Object.keys(filtrosActivos).length > 0

    const filtrosKeyRaw =
        querySearch.trim() && catalogDisponible
            ? ['filtros-dinamicos-busq', querySearch.trim(), selectedMarca, rango?.min, rango?.max, JSON.stringify(filtrosActivos)]
            : null
    const filtrosKeyStr = filtrosKeyRaw ? JSON.stringify(filtrosKeyRaw) : ''
    const [filtrosKeyDebounced, setFiltrosKeyDebounced] = useState(() => filtrosKeyRaw)
    useEffect(() => {
        if (!filtrosKeyRaw) {
            setFiltrosKeyDebounced(null)
            return
        }
        const t = setTimeout(() => setFiltrosKeyDebounced(filtrosKeyRaw), 180)
        return () => clearTimeout(t)
    }, [filtrosKeyStr])

    const { data: filtrosDinamicosData } = useSWR(
        filtrosKeyDebounced,
        async () => {
            const f = await getFiltrosDinamicosBusqueda(querySearch.trim(), {
                marca: selectedMarca || undefined,
                precioMin: rango?.min ?? undefined,
                precioMax: rango?.max ?? undefined,
                filtros: filtrosActivos,
            })
            return f
        },
        { revalidateOnFocus: false, dedupingInterval: 30000 }
    )
    useEffect(() => {
        setFiltrosDinamicos(filtrosDinamicosData ?? {})
    }, [filtrosDinamicosData])

    useEffect(() => {
        setFiltrosDinamicosSeleccionados({})
    }, [querySearch])

    const productosKeyRaw =
        usarApiProductos && catalogDisponible && querySearch.trim()
            ? ['busqueda-productos-api', querySearch.trim(), selectedMarca, rangoPrecio, orden, JSON.stringify(filtrosActivos)]
            : null
    const productosKeyStr = productosKeyRaw ? JSON.stringify(productosKeyRaw) : ''
    const [productosKeyDebounced, setProductosKeyDebounced] = useState(() => productosKeyRaw)
    useEffect(() => {
        if (!productosKeyRaw) {
            setProductosKeyDebounced(null)
            return
        }
        const t = setTimeout(() => setProductosKeyDebounced(productosKeyRaw), 250)
        return () => clearTimeout(t)
    }, [productosKeyStr])

    const { data: productosApiData, isLoading: loadingProductosApi } = useSWR(
        productosKeyDebounced,
        async () => {
            const filters = {
                busqueda_q: querySearch.trim(),
                orden: orden === 'precio_asc' ? 'precio_asc' : orden === 'precio_desc' ? 'precio_desc' : 'reciente',
                per_page: 120,
                filtros: filtrosActivos,
            }
            if (selectedMarca) filters.marca = selectedMarca
            if (rango?.min != null) filters.precio_min = rango.min
            if (rango?.max != null) filters.precio_max = rango.max
            const res = await getProductos(filters)
            return res?.productos ?? []
        },
        { revalidateOnFocus: false, dedupingInterval: 15000 }
    )

    const marcas = useMemo(() => {
        if (!resultadoBusqueda?.productos?.length) return []
        const set = new Set()
        resultadoBusqueda.productos.forEach((p) => {
            if (p?.marca && String(p.marca).trim()) set.add(String(p.marca).trim())
        })
        return Array.from(set).sort((a, b) => a.localeCompare(b))
    }, [resultadoBusqueda?.productos])

    const productosFiltradosCliente = useMemo(() => {
        if (!resultadoBusqueda?.productos?.length) return []
        let list = [...resultadoBusqueda.productos]
        if (selectedMarca) {
            list = list.filter((p) => p?.marca && String(p.marca).trim() === selectedMarca)
        }
        const rg = RANGOS_PRECIO.find((r) => r.value === rangoPrecio)
        if (rg && (rg.min != null || rg.max != null)) {
            list = list.filter((p) => {
                const precio = Number(p?.precio)
                if (Number.isNaN(precio)) return false
                if (rg.min != null && precio < rg.min) return false
                if (rg.max != null && precio > rg.max) return false
                return true
            })
        }
        if (orden === 'precio_asc') {
            list.sort((a, b) => (Number(a?.precio) ?? 0) - (Number(b?.precio) ?? 0))
        } else if (orden === 'precio_desc') {
            list.sort((a, b) => (Number(b?.precio) ?? 0) - (Number(a?.precio) ?? 0))
        }
        return list
    }, [resultadoBusqueda?.productos, selectedMarca, rangoPrecio, orden])

    const listaBase = usarApiProductos ? productosApiData ?? [] : productosFiltradosCliente

    const productosConStock = useMemo(() => {
        if (!Array.isArray(listaBase)) return []
        if (!stockFiltro) return listaBase
        return listaBase.filter((producto) => {
            const totalStock = Number(producto?.disponible || 0) + Number(producto?.disponible_cd || 0)
            if (stockFiltro === 'con_stock') return totalStock > 0
            if (stockFiltro === 'sin_stock') return totalStock <= 0
            return true
        })
    }, [listaBase, stockFiltro])

    const actualizarUrl = useCallback(() => {
        const params = new URLSearchParams()
        const q = typeof querySearch === 'string' ? querySearch.trim() : ''
        if (q) params.set('q', q)
        if (selectedMarca) params.set('marca', selectedMarca)
        if (rangoPrecio) params.set('precio', rangoPrecio)
        if (stockFiltro) params.set('stock', stockFiltro)
        const fActivos = Object.fromEntries(
            Object.entries(filtrosDinamicosSeleccionados).filter(([, v]) => v != null && String(v).trim() !== '')
        )
        if (Object.keys(fActivos).length > 0) {
            params.set('filtros', encodeURIComponent(JSON.stringify(fActivos)))
        }
        const qs = params.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, [pathname, router, querySearch, selectedMarca, rangoPrecio, stockFiltro, filtrosDinamicosSeleccionados])

    useEffect(() => {
        actualizarUrl()
    }, [selectedMarca, rangoPrecio, stockFiltro, filtrosDinamicosSeleccionados])

    const paramsParaUrl = new URLSearchParams()
    if (typeof querySearch === 'string' && querySearch.trim()) paramsParaUrl.set('q', querySearch.trim())
    if (selectedMarca) paramsParaUrl.set('marca', selectedMarca)
    if (rangoPrecio) paramsParaUrl.set('precio', rangoPrecio)
    if (stockFiltro) paramsParaUrl.set('stock', stockFiltro)
    const fActUrl = Object.fromEntries(
        Object.entries(filtrosDinamicosSeleccionados).filter(([, v]) => v != null && String(v).trim() !== '')
    )
    if (Object.keys(fActUrl).length > 0) paramsParaUrl.set('filtros', encodeURIComponent(JSON.stringify(fActUrl)))
    const urlConFiltros = paramsParaUrl.toString() ? `${pathname}?${paramsParaUrl.toString()}` : pathname

    const bg = darkMode ? 'bg-tienda-canvas' : 'bg-gray-50'
    const textMuted = darkMode ? 'text-gray-400' : 'text-gray-600'
    const tieneResultados = resultadoBusqueda?.productos?.length > 0
    const loadingLista = usarApiProductos ? loadingProductosApi : false

    useEffect(() => {
        if (!tieneResultados) setMobileFiltersOpen(false)
    }, [tieneResultados])

    return (
        <div className={`flex min-h-screen flex-col transition-colors duration-300 ${bg} ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            <TiendaNavHeader
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                onToggleLeftSidebar={tieneResultados ? () => setMobileFiltersOpen((v) => !v) : undefined}
            />
            <div
                className={`relative flex min-h-0 w-full flex-1 ${
                    tieneResultados ? 'md:grid md:grid-cols-[16rem_minmax(0,1fr)] md:items-stretch md:gap-0' : ''
                }`}
            >
                {tieneResultados && !mobileFiltersOpen && (
                    <div className="fixed left-0 bottom-0 z-[36] w-9 md:hidden max-md:top-[var(--tienda-header-height)]" aria-hidden {...edgeStripProps} />
                )}
                {tieneResultados && mobileFiltersOpen && (
                    <button
                        type="button"
                        aria-label="Cerrar filtros"
                        onClick={() => setMobileFiltersOpen(false)}
                        className="fixed inset-0 z-[35] bg-black/50 md:hidden"
                    />
                )}
                {tieneResultados && (
                    <aside
                        className={`max-md:flex max-md:min-h-0 max-md:flex-col max-md:overflow-hidden max-md:fixed max-md:left-0 max-md:z-40 max-md:bottom-0 max-md:top-[var(--tienda-header-height)] max-md:w-[min(20rem,90vw)] max-md:shadow-xl max-md:transition-transform max-md:duration-300 ${
                            mobileFiltersOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
                        } md:translate-x-0 md:relative md:z-10 md:flex md:h-full md:min-h-0 md:w-full md:flex-1 md:flex-col md:overflow-hidden shrink-0 border-r transition-colors duration-300 max-md:border-r md:border-r ${
                            darkMode ? 'border-gray-700/45 bg-tienda-elevated' : 'border-gray-200 bg-white'
                        }`}
                        {...drawerTouchProps}
                    >
                        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto overscroll-contain p-6">
                            <div>
                                <h3 className={`text-sm font-bold uppercase mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    ORDENAR POR
                                </h3>
                                <select
                                    value={orden}
                                    onChange={(e) => setOrden(e.target.value)}
                                    className={`w-full px-4 py-2 rounded-lg border text-sm ${
                                        darkMode
                                            ? 'bg-gray-700 border-gray-600 text-white'
                                            : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                >
                                    <option value="reciente">Más recientes</option>
                                    <option value="precio_asc">Precio: menor a mayor</option>
                                    <option value="precio_desc">Precio: mayor a menor</option>
                                </select>
                            </div>

                            <div>
                                <h3 className={`text-sm font-bold uppercase mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    STOCK
                                </h3>
                                <select
                                    value={stockFiltro}
                                    onChange={(e) => setStockFiltro(e.target.value)}
                                    className={`w-full px-4 py-2 rounded-lg border text-sm ${
                                        darkMode
                                            ? 'bg-gray-700 border-gray-600 text-white'
                                            : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                >
                                    <option value="">Todos</option>
                                    <option value="con_stock">Con stock</option>
                                    <option value="sin_stock">Sin stock</option>
                                </select>
                            </div>

                            <div>
                                <h3 className={`text-sm font-bold uppercase mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    PRECIO
                                </h3>
                                <select
                                    value={rangoPrecio}
                                    onChange={(e) => setRangoPrecio(e.target.value)}
                                    className={`w-full px-4 py-2 rounded-lg border text-sm ${
                                        darkMode
                                            ? 'bg-gray-700 border-gray-600 text-white'
                                            : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                >
                                    {RANGOS_PRECIO.map((r) => (
                                        <option key={r.value || 'todos'} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <h3 className={`text-sm font-bold uppercase mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    MARCA
                                </h3>
                                <select
                                    value={selectedMarca}
                                    onChange={(e) => setSelectedMarca(e.target.value)}
                                    className={`w-full px-4 py-2 rounded-lg border text-sm ${
                                        darkMode
                                            ? 'bg-gray-700 border-gray-600 text-white'
                                            : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                >
                                    <option value="">Todas</option>
                                    {marcas.map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="overflow-y-auto max-h-[430px] pr-1 -mr-1">
                                <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-600">
                                    {Object.entries(filtrosDinamicos)
                                        .filter(([nombre]) => nombre.toLowerCase() !== 'marca')
                                        .map(([nombre, opciones]) => (
                                            <div key={nombre} className="space-y-1.5">
                                                <h3
                                                    className={`text-xs font-bold uppercase ${
                                                        darkMode ? 'text-gray-300' : 'text-gray-600'
                                                    }`}
                                                >
                                                    {nombre}
                                                </h3>
                                                <select
                                                    value={filtrosDinamicosSeleccionados[nombre] ?? ''}
                                                    onChange={(e) =>
                                                        setFiltrosDinamicosSeleccionados((s) => ({ ...s, [nombre]: e.target.value }))
                                                    }
                                                    className={`w-full px-3 py-1.5 rounded border text-xs ${
                                                        darkMode
                                                            ? 'bg-gray-700 border-gray-600 text-white'
                                                            : 'bg-white border-gray-300 text-gray-900'
                                                    }`}
                                                >
                                                    <option value="">Todas</option>
                                                    {(opciones || []).map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </aside>
                )}

                <main className="min-h-0 min-w-0 flex-1 p-4 md:min-w-0 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        <nav className={`text-sm mb-6 ${textMuted}`}>
                            <Link href="/" className="transition-colors hover:text-brand">
                                Tienda
                            </Link>
                            <span className="mx-2">/</span>
                            <span className={darkMode ? 'text-gray-300' : 'text-gray-800'}>Buscar</span>
                        </nav>

                        <h1 className="text-2xl md:text-3xl font-bold mb-2">Resultados de búsqueda</h1>
                        {querySearch.trim() && (
                            <p className={`mb-6 ${textMuted}`}>
                                Buscando: «{querySearch.trim()}»
                            </p>
                        )}

                        {!catalogDisponible && (
                            <div className={`rounded-lg border p-6 ${darkMode ? 'border-amber-900/45 bg-tienda-elevated' : 'border-amber-200 bg-amber-50'}`}>
                                <p className={darkMode ? 'text-amber-400' : 'text-amber-800'}>
                                    Catálogo no disponible. Intenta más tarde.
                                </p>
                                <Link href="/" className="mt-2 inline-block font-medium text-brand hover:text-brand-hover hover:underline">
                                    Volver a la tienda
                                </Link>
                            </div>
                        )}

                        {catalogDisponible && !querySearch.trim() && (
                            <p className={textMuted}>Escribe algo en el buscador para ver resultados.</p>
                        )}

                        {catalogDisponible && querySearch.trim() !== '' && (
                            <>
                                {loadingBusqueda ? (
                                    <p className={textMuted}>Buscando…</p>
                                ) : (
                                    resultadoBusqueda && (
                                        <>
                                            {resultadoBusqueda.correccion_aplicada && (
                                                <p
                                                    className={`mb-4 text-sm rounded-lg px-3 py-2 ${
                                                        darkMode
                                                            ? 'border border-amber-700/45 bg-tienda-elevated text-amber-300'
                                                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                                                    }`}
                                                >
                                                    Se mostraron resultados para «{resultadoBusqueda.texto_normalizado}» (se aplicó una
                                                    corrección).
                                                </p>
                                            )}
                                            {resultadoBusqueda.productos.length === 0 ? (
                                                <p className={textMuted}>
                                                    No se encontraron productos para «{resultadoBusqueda.texto_original}».
                                                </p>
                                            ) : (
                                                <div className="relative">
                                                    {loadingLista && (
                                                        <div className="absolute right-0 top-0 z-10 rounded-full bg-brand/90 px-3 py-1 text-sm font-medium text-white">
                                                            {productosConStock.length > 0 ? 'Filtrando…' : 'Cargando…'}
                                                        </div>
                                                    )}
                                                    <ProductGrid
                                                        darkMode={darkMode}
                                                        className={`transition-opacity duration-200 ${loadingLista ? 'pointer-events-none opacity-70' : ''}`}
                                                    >
                                                        {productosConStock.map((producto) => (
                                                            <ProductCard
                                                                key={producto.clave}
                                                                producto={producto}
                                                                darkMode={darkMode}
                                                                busquedaId={resultadoBusqueda.busqueda_id || undefined}
                                                                returnUrl={urlConFiltros}
                                                            />
                                                        ))}
                                                    </ProductGrid>
                                                </div>
                                            )}
                                            {resultadoBusqueda.productos.length > 0 && productosConStock.length === 0 && (
                                                <p className={textMuted}>
                                                    Ningún producto coincide con los filtros seleccionados. Prueba con otra combinación.
                                                </p>
                                            )}
                                        </>
                                    )
                                )}
                            </>
                        )}

                        <div className="mt-8">
                            <Link
                                href="/"
                                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium border transition-colors ${
                                    darkMode
                                        ? 'border-gray-700/45 bg-tienda-elevated hover:border-brand hover:text-brand'
                                        : 'border-gray-200 bg-white hover:border-brand hover:text-brand'
                                }`}
                            >
                                ← Volver a la tienda
                            </Link>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
