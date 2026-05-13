'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/auth'
import { useTiendaDarkMode } from '@/hooks/useTiendaDarkMode'
import { usePersistedBoolean } from '@/hooks/usePersistedBoolean'
import ProductCard from '@/components/ProductCard'
import ProductGrid from '@/components/ProductGrid'
import SearchBar from '@/components/SearchBar'
import {
    getCatalogEstado,
    getDestacados,
    getUltimos,
    getPorClaves,
    getRecomendados,
    getProductos,
    getCategoriasPrincipales,
    getMarcas,
    getVistosRecientesClaves,
} from '@/lib/productos'
import { getPublicidad, resolvePublicidadUrl } from '@/lib/publicidad'
import TiendaNavHeader from '@/components/TiendaNavHeader'
import { useCarritoCount } from '@/lib/carrito'
import { useFavoritos } from '@/lib/favoritos'
import { useCotizacion } from '@/lib/cotizaciones'
import { getOrCreateGuestId } from '@/lib/guestId'
import { useMobileLeftDrawerSwipe } from '@/hooks/useMobileLeftDrawerSwipe'

export default function TiendaClient({ initialData = {} }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user, logout } = useAuth({ middleware: 'guest' })

    // Si hay ?q= en la URL, redirigir a la vista de búsqueda para que los resultados siempre estén en otra vista
    useEffect(() => {
        const q = searchParams.get('q')
        if (typeof q === 'string' && q.trim() !== '') {
            router.replace(`/tienda/busqueda?${new URLSearchParams({ q: q.trim() }).toString()}`)
        }
    }, [searchParams, router])

    const { darkMode, setDarkMode } = useTiendaDarkMode()
    const [selectedCategory, setSelectedCategory] = useState('todos')
    const [selectedMarca, setSelectedMarca] = useState('')
    const [openSubcategoryPanel, setOpenSubcategoryPanel] = useState(null)
    const [openCotizacionesPanel, setOpenCotizacionesPanel] = useState(false)
    const [tooltipModoCotizacion, setTooltipModoCotizacion] = useState(false)
    const [tooltipModoCotizacionRect, setTooltipModoCotizacionRect] = useState(null)
    const refModoCotizacionRow = useRef(null)
    const [subcategorias, setSubcategorias] = useState({})
    const [sidebarRetraido, setSidebarRetraido] = usePersistedBoolean('sidebarRetraido', false)
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
    const [currentSlide, setCurrentSlide] = useState(0)
    const [userDropdownOpen, setUserDropdownOpen] = useState(false)
    const { count: cartCount } = useCarritoCount(!!user)
    const { claves: favoritosClaves } = useFavoritos(!!user)
    const favoritosCount = favoritosClaves?.length ?? 0
    const { modoActivo: modoCotizacionActivo, toggleModo: toggleModoCotizacion } = useCotizacion(user)

    const [catalogDisponible, setCatalogDisponible] = useState(() => initialData?.catalogDisponible ?? false)
    const [destacados, setDestacados] = useState(() => initialData?.destacados ?? [])
    const [ultimos, setUltimos] = useState(() => initialData?.ultimos ?? [])
    const [categoriasPrincipales, setCategoriasPrincipales] = useState(() => initialData?.categoriasPrincipales ?? [])
    const [marcas, setMarcas] = useState(() => initialData?.marcas ?? [])
    const [vistosRecientemente, setVistosRecientemente] = useState([])
    const [productosInteres, setProductosInteres] = useState([])
    const productosFiltradosKey = catalogDisponible && (selectedCategory !== 'todos' || selectedMarca)
        ? ['tienda-productos', selectedCategory, selectedMarca]
        : null
    const { data: productosFiltradosData, isLoading: loadingFiltrados } = useSWR(
        productosFiltradosKey,
        ([_, cat, marca]) => {
            const params = {}
            if (cat !== 'todos') params.categoria_principal = cat
            if (marca) params.marca = marca
            return getProductos(params).then((r) => r?.productos ?? [])
        },
        { revalidateOnFocus: false, dedupingInterval: 30000 }
    )
    const productosFiltrados = productosFiltradosData ?? []
    const [loadingInicial, setLoadingInicial] = useState(false)

    // Imágenes del carrusel promocional: SSR (inmediato) + SWR (revalidar en cliente)
    const { data: publicidadSwr } = useSWR(
        'publicidad',
        getPublicidad,
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
            fallbackData: initialData?.publicidad
                ? {
                      carrusel_activo: initialData.publicidad.carrusel_activo !== false,
                      slides: Array.isArray(initialData.publicidad.slides) ? initialData.publicidad.slides : [],
                  }
                : { carrusel_activo: true, slides: [] },
        }
    )
    const carruselActivo = publicidadSwr?.carrusel_activo !== false
    const imagenesPromocionales = Array.isArray(publicidadSwr?.slides) ? publicidadSwr.slides : []

    /** Carga inicial: estado del catálogo + todos los datos de tienda de una vez; solo entonces se muestra la página */
    const refetchTienda = useCallback(async () => {
        setLoadingInicial(true)
        try {
            const estado = await getCatalogEstado()
            const disp = estado?.disponible ?? false
            setCatalogDisponible(disp)
            if (disp) {
                const [dest, ult, catPrincipales, marcasRes] = await Promise.all([
                    getDestacados(8),
                    getUltimos(8),
                    getCategoriasPrincipales(),
                    getMarcas(),
                ])
                setDestacados(Array.isArray(dest) ? dest : [])
                setUltimos(Array.isArray(ult) ? ult : [])
                setCategoriasPrincipales(Array.isArray(catPrincipales) ? catPrincipales : [])
                setMarcas(Array.isArray(marcasRes) ? marcasRes : [])
            }
        } catch {
            setCatalogDisponible(false)
        } finally {
            setLoadingInicial(false)
        }
    }, [])

    const loadVistosYRecomendados = useCallback(async () => {
        if (!catalogDisponible) return
        const effectiveUserId = user?.id ?? (typeof window !== 'undefined' ? getOrCreateGuestId() : null)
        const claves = getVistosRecientesClaves(effectiveUserId)
        try {
            const [vistos, rec] = await Promise.all([
                getPorClaves(claves),
                getRecomendados(claves, 8),
            ])
            setVistosRecientemente(Array.isArray(vistos) ? vistos : [])
            setProductosInteres(Array.isArray(rec) ? rec : [])
        } catch {
            setVistosRecientemente([])
            setProductosInteres([])
        }
    }, [catalogDisponible, user?.id])

    /** Vistos y recomendados se cargan en cliente (localStorage, etc.) */
    useEffect(() => {
        if (catalogDisponible) loadVistosYRecomendados()
    }, [catalogDisponible, loadVistosYRecomendados])

    useEffect(() => {
        if (!mobileFiltersOpen) return undefined
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = previousOverflow
        }
    }, [mobileFiltersOpen])

    const openMobileFilters = useCallback(() => {
        setSidebarRetraido(false)
        setMobileFiltersOpen(true)
    }, [setSidebarRetraido])

    const toggleMobileDrawer = useCallback(() => {
        setSidebarRetraido(false)
        setMobileFiltersOpen((v) => !v)
    }, [setSidebarRetraido])

    const { edgeStripProps, drawerTouchProps } = useMobileLeftDrawerSwipe({
        isOpen: mobileFiltersOpen,
        onOpen: openMobileFilters,
        onClose: () => setMobileFiltersOpen(false),
        enabled: true,
    })

    /** Refetch en background cada 3 min para mantener datos actualizados sin saturar */
    useEffect(() => {
        const interval = setInterval(refetchTienda, 180000)
        return () => clearInterval(interval)
    }, [refetchTienda])

    // Auto-avanzar el carrusel
    useEffect(() => {
        if (!carruselActivo || imagenesPromocionales.length === 0) return undefined
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % imagenesPromocionales.length)
        }, 5000)
        return () => clearInterval(interval)
    }, [carruselActivo, imagenesPromocionales.length])

    const iconoPorCategoria = {
        todos: '/Imagenes/icon_producto.png',
        accesorios: '/Imagenes/icon_accesorio.webp',
        laptops: '/Imagenes/icon_laptop.webp',
        monitores: '/Imagenes/icon_monitor.png',
        audio: '/Imagenes/icon_audio.webp',
        almacenamiento: '/Imagenes/icon_almacenamiento.png',
        componentes: '/Imagenes/icon_componentes.png',
        impresoras: '/Imagenes/icon_impresora.png',
        pcs: '/Imagenes/icon_computadora.png',
        infraestructura_servidores: encodeURI('/Imagenes/icon_infraestructura y servidores.png'),
        software_polizas: '/Imagenes/icon_software.png',
        otros: '/Imagenes/icon_otros.png',
    }
    const categorias = [
        { id: 'todos', nombre: 'Todos los productos', icono: iconoPorCategoria.todos },
        ...categoriasPrincipales.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            icono: iconoPorCategoria[c.id] || '/Imagenes/icon_producto.png',
        })),
    ]
    const subcategoriasDeSeleccion = selectedCategory !== 'todos'
        ? (categoriasPrincipales.find((cat) => cat.id === selectedCategory)?.subcategorias ?? [])
        : []

    return (
        <div
            className={`flex min-h-screen flex-col transition-colors duration-300 ${
                darkMode ? 'bg-tienda-canvas text-gray-100' : 'bg-gray-50 text-gray-900'
            }`}
            style={darkMode ? { '--sidebar-bg': 'rgb(32 32 32)' } : undefined}
        >
            {/* Header: TiendaNavHeader incluye Cotizaciones (dropdown) y Chat con proveedor */}
            <TiendaNavHeader darkMode={darkMode} setDarkMode={setDarkMode} onToggleLeftSidebar={toggleMobileDrawer} />
            <div
                className={`relative flex min-h-0 w-full flex-1 md:grid md:items-stretch md:gap-0 md:min-h-0 ${
                    sidebarRetraido ? 'md:grid-cols-[4rem_minmax(0,1fr)]' : 'md:grid-cols-[16rem_minmax(0,1fr)]'
                }`}
            >
                {!mobileFiltersOpen && (
                    <div
                        className="fixed left-0 bottom-0 z-[36] w-9 md:hidden max-md:top-[var(--tienda-header-height)]"
                        aria-hidden
                        {...edgeStripProps}
                    />
                )}
                {mobileFiltersOpen && (
                    <button
                        type="button"
                        aria-label="Cerrar filtros"
                        onClick={() => setMobileFiltersOpen(false)}
                        className="fixed inset-0 z-[35] bg-black/50 md:hidden"
                    />
                )}
                {/* Overlay para cerrar el panel desplegable (móviles / clic fuera) */}
                {openSubcategoryPanel && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={() => setOpenSubcategoryPanel(null)}
                        aria-hidden
                    />
                )}
                {openCotizacionesPanel && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={() => setOpenCotizacionesPanel(false)}
                        aria-hidden
                    />
                )}

                {/* Columna sidebar + flyouts. En md: grid alinea altura con main (sin fixed = no tapa el footer). */}
                <div
                    className={`max-md:contents md:relative md:flex md:min-h-0 md:h-full md:w-full md:flex-col md:self-stretch md:border-r md:transition-all md:duration-300 ${
                        darkMode ? 'md:border-gray-700' : 'md:border-gray-200'
                    }`}
                >
                {/* Sidebar Izquierdo - Retráctil (mismo color que panel subcategorías: --sidebar-bg) */}
                <aside
                    className={`w-full max-md:flex max-md:min-h-0 max-md:flex-col max-md:w-[min(20rem,90vw)] max-md:fixed max-md:left-0 max-md:z-40 max-md:bottom-0 max-md:top-[var(--tienda-header-height)] max-md:overflow-hidden max-md:shadow-xl max-md:transition-transform max-md:duration-300 ${
                        mobileFiltersOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
                    } md:translate-x-0 md:relative md:z-10 md:flex md:h-full md:min-h-0 md:flex-1 md:flex-col md:overflow-visible border-r transition-all duration-300 max-md:border-r md:border-r-0 ${
                        darkMode ? 'border-gray-700' : 'bg-white border-gray-200'
                    }`}
                    style={darkMode ? { backgroundColor: 'var(--sidebar-bg)' } : undefined}
                    {...drawerTouchProps}
                >
                    {/* Botón para retraer/expandir */}
                    <button
                        onClick={() => {
                            const newState = !sidebarRetraido
                            setSidebarRetraido(newState)
                            localStorage.setItem('sidebarRetraido', JSON.stringify(newState))
                            if (newState) {
                            setOpenSubcategoryPanel(null)
                            setOpenCotizacionesPanel(false)
                        }
                        }}
                        className={`hidden md:flex absolute -right-3 top-4 z-30 w-6 h-6 rounded-full items-center justify-center transition-colors ${
                            darkMode 
                                ? 'bg-gray-700 hover:bg-gray-600 border border-gray-600' 
                                : 'bg-white hover:bg-gray-100 border border-gray-300 shadow-md'
                        }`}
                        aria-label={sidebarRetraido ? 'Expandir barra' : 'Retraer barra'}
                    >
                        <svg 
                            className={`w-4 h-4 transition-transform duration-300 ${sidebarRetraido ? 'rotate-180' : ''} ${
                                darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    <div
                        className={`min-h-0 flex-1 space-y-8 overflow-y-auto overscroll-contain p-6 ${sidebarRetraido ? 'px-2' : ''}`}
                    >
                        {/* Filtros */}
                        <div className="space-y-4">
                        {!sidebarRetraido ? (
                            <div className="flex items-center space-x-2">
                                <div className="relative w-5 h-5">
                                    <Image
                                        src="/Imagenes/icon_filtro.png"
                                        alt="Filtros"
                                        fill
                                        className={`object-contain transition-all duration-300 ${
                                            darkMode 
                                                ? 'brightness-0 invert' // Convierte negro a blanco en modo oscuro
                                                : '' // En modo claro se mantiene el color original
                                        }`}
                                    />
                                </div>
                                <h3 className={`text-lg font-semibold ${
                                    darkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                    Filtros
                                </h3>
                            </div>
                        ) : (
                            <div className="flex justify-center">
                                <div className="relative w-5 h-5">
                                    <Image
                                        src="/Imagenes/icon_filtro.png"
                                        alt="Filtros"
                                        fill
                                        className={`object-contain transition-all duration-300 ${
                                            darkMode 
                                                ? 'brightness-0 invert' // Convierte negro a blanco en modo oscuro
                                                : '' // En modo claro se mantiene el color original
                                        }`}
                                    />
                                </div>
                            </div>
                        )}

                            {/* Cotizaciones — título igual que Categorías */}
                            {!sidebarRetraido && (
                                <h4 className={`text-sm font-medium mb-3 ${
                                    darkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                    Cotizaciones
                                </h4>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setOpenSubcategoryPanel(null)
                                    setOpenCotizacionesPanel(!openCotizacionesPanel)
                                }}
                                className={`w-full ${sidebarRetraido ? 'justify-center px-2' : 'text-left px-3'} py-2 rounded-lg text-sm transition-colors flex items-center ${sidebarRetraido ? '' : 'justify-between'} ${
                                    openCotizacionesPanel
                                        ? darkMode ? 'bg-brand text-white' : 'bg-brand text-white'
                                        : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                                }`}
                                title="Mis cotizaciones"
                            >
                                <div className={`flex items-center ${sidebarRetraido ? '' : 'space-x-3 flex-1 min-w-0'}`}>
                                    <div className="relative w-5 h-5 flex-shrink-0">
                                        <Image
                                            src="/Imagenes/icon_pedidos.png"
                                            alt=""
                                            fill
                                            className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`}
                                        />
                                    </div>
                                    {!sidebarRetraido && <span>Mis cotizaciones</span>}
                                </div>
                                {!sidebarRetraido && (
                                    <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${openCotizacionesPanel ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7 7" />
                                    </svg>
                                )}
                            </button>

                            {/* Categorías */}
                            <div>
                                {!sidebarRetraido && (
                                    <h4 className={`text-sm font-medium mb-3 ${
                                        darkMode ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                        Categorías
                                    </h4>
                                )}
                                <div className="space-y-2">
                                    {categorias.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setOpenCotizacionesPanel(false)
                                                if (cat.id === 'todos') {
                                                    setSelectedCategory('todos')
                                                    setOpenSubcategoryPanel(null)
                                                } else {
                                                    const isOpen = openSubcategoryPanel === cat.id
                                                    setOpenSubcategoryPanel(isOpen ? null : cat.id)
                                                    setSelectedCategory(cat.id)
                                                }
                                            }}
                                            className={`w-full ${sidebarRetraido ? 'justify-center px-2' : 'text-left px-3'} py-2 rounded-lg text-sm transition-colors flex items-center ${sidebarRetraido ? '' : 'justify-between'} ${
                                                selectedCategory === cat.id
                                                    ? darkMode
                                                        ? 'bg-brand text-white'
                                                        : 'bg-brand text-white'
                                                    : darkMode
                                                        ? 'text-gray-300 hover:bg-gray-700'
                                                        : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                            title={sidebarRetraido ? cat.nombre : ''}
                                        >
                                            <div className={`flex items-center ${sidebarRetraido ? '' : 'space-x-3 flex-1'}`}>
                                                <div className="relative w-5 h-5 flex-shrink-0">
                                                    <Image
                                                        src={cat.icono}
                                                        alt={cat.nombre}
                                                        fill
                                                        className={`object-contain transition-all duration-300 ${
                                                            darkMode 
                                                                ? 'brightness-0 invert' // Convierte negro a blanco en modo oscuro
                                                                : '' // En modo claro se mantiene el color original
                                                        }`}
                                                    />
                                                </div>
                                                {!sidebarRetraido && <span>{cat.nombre}</span>}
                                            </div>
                                            {!sidebarRetraido && cat.id !== 'todos' && (
                                                <svg 
                                                    className={`w-4 h-4 transition-transform duration-300 ${
                                                        openSubcategoryPanel === cat.id ? 'rotate-90' : ''
                                                    }`}
                                                    fill="none" 
                                                    stroke="currentColor" 
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            </div>
                    </div>
                </aside>

                {/* Panel de subcategorías — móvil: modal; escritorio: anclado al borde derecho del sidebar (left-full), sin tapar la barra */}
                {openSubcategoryPanel && !sidebarRetraido && (
                    <div
                        className={`max-md:fixed max-md:inset-x-4 max-md:top-[var(--tienda-header-height)] max-md:mt-4 max-md:z-50 max-md:max-h-[min(85dvh,32rem)] max-md:overflow-hidden max-md:rounded-lg max-md:shadow-2xl md:absolute md:left-full md:top-0 md:ml-0 md:z-50 md:w-[min(28rem,calc(100vw-5rem))] md:max-h-[calc(100vh-2rem)] md:overflow-hidden md:rounded-r-xl md:rounded-l-none md:border md:border-l-0 md:shadow-2xl transition-all duration-300 ease-in-out ${
                            darkMode ? 'max-md:border max-md:border-gray-700/45 bg-tienda-elevated md:border-gray-700/45' : 'max-md:border max-md:border-gray-200 bg-white md:border-gray-200'
                        }`}
                        style={darkMode ? { backgroundColor: 'var(--sidebar-bg)' } : undefined}
                    >
                            <div className="overflow-y-auto max-h-[calc(100vh-4rem)] p-4">
                                <div className={`flex items-center justify-between mb-4 pb-3 border-b shrink-0 ${
                                    darkMode ? 'border-gray-700' : 'border-gray-200'
                                }`}>
                                    <h2 className={`text-lg font-bold uppercase truncate pr-2 ${
                                        darkMode ? 'text-white' : 'text-gray-900'
                                    }`}>
                                        {categorias.find(c => c.id === openSubcategoryPanel)?.nombre ?? openSubcategoryPanel}
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => setOpenSubcategoryPanel(null)}
                                        className={`p-1 rounded transition-colors shrink-0 ${
                                            darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                                        }`}
                                        aria-label="Cerrar panel"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                {subcategoriasDeSeleccion.length === 0 ? (
                                    <p className={`py-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        No hay subcategorías en esta categoría
                                    </p>
                                ) : (
                                    <div
                                        className={`grid gap-0 [grid-template-columns:repeat(auto-fill,minmax(10rem,1fr))] ${
                                            darkMode ? 'border-gray-700' : 'border-gray-200'
                                        }`}
                                    >
                                        <div className={`min-w-0 border-b border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                            <Link
                                                href={`/tienda/${encodeURIComponent(openSubcategoryPanel)}/ver-todo`}
                                                prefetch
                                                onClick={() => setOpenSubcategoryPanel(null)}
                                                className={`w-full text-left px-3 py-2.5 text-sm transition-colors block break-words ${
                                                    darkMode ? 'text-white hover:bg-gray-700/50' : 'text-gray-900 hover:bg-gray-50'
                                                }`}
                                            >
                                                Ver todo
                                            </Link>
                                        </div>
                                        {subcategoriasDeSeleccion.map((subcat, index) => (
                                            <div key={index} className={`min-w-0 border-b border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                                <Link
                                                    href={`/tienda/${encodeURIComponent(openSubcategoryPanel)}/${encodeURIComponent(subcat)}`}
                                                    prefetch
                                                    onClick={() => setOpenSubcategoryPanel(null)}
                                                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors block break-words ${
                                                        darkMode ? 'text-white hover:bg-gray-700/50' : 'text-gray-900 hover:bg-gray-50'
                                                    }`}
                                                    title={subcat}
                                                >
                                                    {subcat}
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                    </div>
                )}

                {/* Panel COTIZACIONES — misma lógica que panel de subcategorías: al lado del sidebar */}
                {openCotizacionesPanel && !sidebarRetraido && (
                    <>
                    <div
                        className={`max-md:fixed max-md:inset-x-4 max-md:top-[var(--tienda-header-height)] max-md:mt-4 max-md:z-50 max-md:max-h-[min(85dvh,28rem)] max-md:overflow-hidden max-md:rounded-xl max-md:shadow-2xl md:absolute md:left-full md:top-0 md:ml-0 md:z-50 md:w-72 md:max-h-[calc(100vh-2rem)] md:overflow-hidden md:rounded-r-xl md:rounded-l-none md:border md:border-l-0 md:shadow-2xl transition-all duration-300 ease-in-out ${
                            darkMode ? 'max-md:border max-md:border-gray-700/45 bg-tienda-elevated md:border-gray-700/45' : 'max-md:border max-md:border-gray-200 bg-white md:border-gray-200'
                        }`}
                        style={darkMode ? { backgroundColor: 'var(--sidebar-bg)' } : undefined}
                    >
                        <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <h2 className={`text-lg font-bold uppercase tracking-wide truncate pr-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                Cotizaciones
                            </h2>
                            <button
                                type="button"
                                onClick={() => setOpenCotizacionesPanel(false)}
                                className={`p-1.5 rounded-lg transition-colors shrink-0 ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                                aria-label="Cerrar"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 space-y-1">
                            <div
                                ref={refModoCotizacionRow}
                                onMouseEnter={() => {
                                    if (refModoCotizacionRow.current) {
                                        setTooltipModoCotizacionRect(refModoCotizacionRow.current.getBoundingClientRect())
                                        setTooltipModoCotizacion(true)
                                    }
                                }}
                                onMouseLeave={() => { setTooltipModoCotizacion(false); setTooltipModoCotizacionRect(null) }}
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleModoCotizacion()}
                                    className={`w-full text-left px-4 py-3 rounded-lg text-sm flex items-center justify-between transition-colors ${
                                        darkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100'
                                    }`}
                                >
                                    <span>Modo cotización</span>
                                    <span className={modoCotizacionActivo ? 'text-brand font-medium' : darkMode ? 'text-gray-400' : 'text-gray-500'}>
                                        {modoCotizacionActivo ? 'Activado' : 'Desactivado'}
                                    </span>
                                </button>
                            </div>
                            <Link
                                href="/tienda/cotizaciones"
                                onClick={() => setOpenCotizacionesPanel(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                                    darkMode ? 'text-white hover:bg-gray-700 hover:text-brand' : 'text-gray-900 hover:bg-gray-100 hover:text-brand'
                                }`}
                            >
                                <div className="relative w-5 h-5 flex-shrink-0">
                                    <Image
                                        src="/Imagenes/icon_pedidos.png"
                                        alt=""
                                        fill
                                        className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`}
                                    />
                                </div>
                                Mis cotizaciones
                            </Link>
                            <Link
                                href="/dashboard?tab=cotizaciones"
                                onClick={() => setOpenCotizacionesPanel(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                                    darkMode ? 'text-white hover:bg-gray-700 hover:text-brand' : 'text-gray-900 hover:bg-gray-100 hover:text-brand'
                                }`}
                            >
                                <div className="relative w-5 h-5 flex-shrink-0">
                                    <Image
                                        src="/Imagenes/icon_historia.webp"
                                        alt=""
                                        fill
                                        className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`}
                                    />
                                </div>
                                Historial de cotizaciones
                            </Link>
                        </div>
                    </div>
                    {/* Tooltip fuera del panel: cuando está Desactivado (verde) */}
                    {!modoCotizacionActivo && tooltipModoCotizacion && tooltipModoCotizacionRect && (
                        <div
                            className={`fixed z-[70] w-56 rounded-xl border-2 shadow-xl p-3 ${
                                darkMode ? 'border-emerald-600/50 bg-tienda-elevated' : 'border-emerald-500/60 bg-white'
                            }`}
                            style={{
                                left: tooltipModoCotizacionRect.right + 8,
                                top: tooltipModoCotizacionRect.top + tooltipModoCotizacionRect.height / 2 - 40,
                            }}
                            role="tooltip"
                        >
                            <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Cómo funciona</p>
                            <ul className="space-y-1.5 text-xs">
                                <li className={`flex gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    <span className="text-emerald-500 shrink-0 mt-0.5">•</span>
                                    <span>Al activarlo aparece un campo en la esquina superior derecha: márcalo en cada producto para elegir cantidad a cotizar.</span>
                                </li>
                                <li className={`flex gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    <span className="text-emerald-500 shrink-0 mt-0.5">•</span>
                                    <span>Para ver lo cotizado, vuelve aquí y entra a &quot;Mis cotizaciones&quot;.</span>
                                </li>
                                <li className={`flex gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    <span className="text-emerald-500 shrink-0 mt-0.5">•</span>
                                    <span>Con el modo activo, las comparaciones en subcategorías quedan desactivadas.</span>
                                </li>
                            </ul>
                        </div>
                    )}
                    {/* Tooltip cuando está Activado (amarillo/ámbar, advertencia suave) */}
                    {modoCotizacionActivo && tooltipModoCotizacion && tooltipModoCotizacionRect && (
                        <div
                            className={`fixed z-[70] w-52 rounded-xl border-2 shadow-xl p-3 ${
                                darkMode ? 'border-amber-500/50 bg-tienda-elevated' : 'border-amber-400/70 bg-white'
                            }`}
                            style={{
                                left: tooltipModoCotizacionRect.right + 8,
                                top: tooltipModoCotizacionRect.top + tooltipModoCotizacionRect.height / 2 - 28,
                            }}
                            role="tooltip"
                        >
                            <p className={`text-xs font-semibold mb-1.5 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>Ten en cuenta</p>
                            <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Si desactivas el modo, ya no podrás agregar productos a la cotización desde la tienda hasta que lo vuelvas a activar.
                            </p>
                        </div>
                    )}
                    </>
                )}
                </div>

                {/* Contenido Principal (misma fila de grid que el sidebar; el footer va después, ancho completo) */}
                <main className="min-h-0 min-w-0 flex-1 p-4 md:min-w-0 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        {!catalogDisponible && (
                            <div className={`mb-8 rounded-lg border p-6 ${
                                darkMode ? 'border-amber-900/45 bg-tienda-elevated' : 'border-amber-200 bg-amber-50'
                            }`}>
                                <h2 className={`text-xl font-semibold mb-2 ${
                                    darkMode ? 'text-amber-400' : 'text-amber-800'
                                }`}>
                                    Catálogo no disponible
                                </h2>
                                <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                                    El catálogo de productos no está disponible en este momento. Por favor, verifica la configuración o intente más tarde.
                                </p>
                                <p className={`mt-2 text-sm ${
                                    darkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                    Los productos se mostrarán aquí cuando el catálogo esté configurado y sincronizado.
                                </p>
                            </div>
                        )}

                        {/* Carrusel Promocional */}
                        {carruselActivo && (
                        <div className="relative mb-8 rounded-lg overflow-hidden">
                            <div className="relative h-64 md:h-80 lg:h-96">
                                {imagenesPromocionales.length > 0 ? (
                                    imagenesPromocionales.map((imagen, index) => {
                                        const slide = (
                                            <img
                                                src={resolvePublicidadUrl(imagen.url)}
                                                alt={imagen.titulo || `Promoción ${index + 1}`}
                                                className={`absolute inset-0 w-full h-full object-cover ${imagen.enlace ? 'cursor-pointer' : ''}`}
                                            />
                                        )
                                        const inner =
                                            imagen.enlace && String(imagen.enlace).trim() !== '' ? (
                                                /^https?:\/\//i.test(imagen.enlace) ? (
                                                    <a
                                                        href={imagen.enlace}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="absolute inset-0 block"
                                                        aria-label={imagen.titulo || 'Abrir enlace'}
                                                    >
                                                        {slide}
                                                    </a>
                                                ) : (
                                                    <Link
                                                        href={imagen.enlace.startsWith('/') ? imagen.enlace : `/${imagen.enlace}`}
                                                        className="absolute inset-0 block"
                                                        aria-label={imagen.titulo || 'Ir a la promoción'}
                                                    >
                                                        {slide}
                                                    </Link>
                                                )
                                            ) : (
                                                <div className="absolute inset-0">{slide}</div>
                                            )
                                        return (
                                        <div
                                            key={imagen.id ?? index}
                                            className={`absolute inset-0 transition-opacity duration-500 ${
                                                index === currentSlide ? 'opacity-100' : 'opacity-0'
                                            }`}
                                        >
                                            {inner}
                                        </div>
                                        )
                                    })
                                ) : (
                                    <div className={`absolute inset-0 flex items-center justify-center ${darkMode ? 'bg-tienda-elevated' : 'bg-gray-100'}`}>
                                        <span className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Sin imágenes de publicidad</span>
                                    </div>
                                )}
                            </div>
                            {imagenesPromocionales.length > 1 && (
                                <>
                                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                        {imagenesPromocionales.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setCurrentSlide(index)}
                                                className={`h-2 rounded-full transition-all ${
                                                    index === currentSlide
                                                        ? 'w-8 bg-brand'
                                                        : 'w-2 bg-white/50 hover:bg-white/75'
                                                }`}
                                                aria-label={`Ir a slide ${index + 1}`}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setCurrentSlide((prev) => (prev - 1 + imagenesPromocionales.length) % imagenesPromocionales.length)}
                                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                                        aria-label="Slide anterior"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setCurrentSlide((prev) => (prev + 1) % imagenesPromocionales.length)}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                                        aria-label="Slide siguiente"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </>
                            )}
                        </div>
                        )}

                        {catalogDisponible && (
                            <>
                        {/* Sección: Productos Destacados */}
                        <section className="mb-12">
                            <h2 className={`text-2xl font-bold mb-6 ${
                                darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                                Productos destacados
                            </h2>
                            <ProductGrid darkMode={darkMode}>
                                {destacados.slice(0, 8).map((producto) => (
                                    <ProductCard key={producto.clave} producto={producto} darkMode={darkMode} />
                                ))}
                            </ProductGrid>
                        </section>

                        {/* Sección: Últimos Productos */}
                        <section className="mb-12">
                            <h2 className={`text-2xl font-bold mb-6 ${
                                darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                                Últimos productos
                            </h2>
                            <ProductGrid darkMode={darkMode}>
                                {ultimos.slice(0, 8).map((producto) => (
                                    <ProductCard key={producto.clave} producto={producto} darkMode={darkMode} />
                                ))}
                            </ProductGrid>
                        </section>

                        {/* Sección: Vistos Recientemente */}
                        {vistosRecientemente.length > 0 && (
                        <section className="mb-12">
                            <h2 className={`text-2xl font-bold mb-6 ${
                                darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                                Vistos recientemente
                            </h2>
                            <ProductGrid darkMode={darkMode}>
                                {vistosRecientemente.slice(0, 8).map((producto) => (
                                    <ProductCard key={producto.clave} producto={producto} darkMode={darkMode} />
                                ))}
                            </ProductGrid>
                        </section>
                        )}

                        {/* Sección: Productos que te pueden interesar */}
                        <section className="mb-12">
                            <h2 className={`text-2xl font-bold mb-6 ${
                                darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                                Productos que te pueden interesar
                            </h2>
                            <ProductGrid darkMode={darkMode}>
                                {productosInteres.slice(0, 8).map((producto) => (
                                    <ProductCard key={producto.clave} producto={producto} darkMode={darkMode} />
                                ))}
                            </ProductGrid>
                        </section>

                        {/* Grid de Productos (filtro por categoría o marca); se mantiene visible mientras carga para no sentir corte */}
                        {(selectedCategory !== 'todos' || selectedMarca) && (
                            <section className="mb-12 relative">
                                {loadingFiltrados && productosFiltrados.length === 0 && (
                                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Cargando…</p>
                                )}
                                {(productosFiltrados.length > 0 || !loadingFiltrados) && (
                                    <ProductGrid
                                        darkMode={darkMode}
                                        className={`transition-opacity duration-200 ${loadingFiltrados ? 'pointer-events-none opacity-60' : ''}`}
                                    >
                                        {productosFiltrados.map((producto) => (
                                            <ProductCard key={producto.clave} producto={producto} darkMode={darkMode} />
                                        ))}
                                    </ProductGrid>
                                )}
                                {loadingFiltrados && productosFiltrados.length > 0 && (
                                    <div className="absolute top-2 right-2 px-3 py-1 rounded-full text-sm font-medium bg-brand/90 text-white">
                                        Actualizando…
                                    </div>
                                )}
                                {!loadingFiltrados && productosFiltrados.length === 0 && (
                                    <div className={`text-center py-12 ${
                                        darkMode ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                        No hay productos con los filtros seleccionados.
                                    </div>
                                )}
                            </section>
                        )}
                            </>
                        )}
                    </div>
                </main>
            </div>

            {/* Sección de Contacto */}
            <footer className={`border-t transition-colors duration-300 ${
                darkMode ? 'border-gray-800/70 bg-tienda-canvas' : 'border-gray-200 bg-white'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {/* Franja superior con solo logo */}
                    <div className={`pb-10 border-b px-2 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                        <div className="flex justify-center items-center">
                            <div className="flex justify-center sm:col-span-1 lg:col-span-1 lg:justify-self-center">
                                <Link
                                    href="https://nxt.it.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand p-2 flex items-center"
                                >
                                    <Image
                                        src="/Imagenes/logo_nxtIt.png"
                                        alt="NXT.IT"
                                        width={220}
                                        height={72}
                                        className="h-12 sm:h-14 md:h-16 w-auto object-contain opacity-95 hover:opacity-100 transition-opacity"
                                    />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Debajo: columnas de texto */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-10">
                        {/* Información de Contacto */}
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="relative w-8 h-8">
                                    <Image
                                        src="/Imagenes/icon_contacto.png"
                                        alt="Contacto"
                                        fill
                                        className={`object-contain ${
                                            darkMode ? 'brightness-0 invert' : ''
                                        }`}
                                    />
                                </div>
                                <h3 className={`text-xl font-bold ${
                                    darkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                    Contáctanos
                                </h3>
                            </div>
                            <div className={`space-y-2 ${
                                darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                                <p className="text-lg font-semibold text-brand">333 616-7279</p>
                                <p className="text-base">desarrollo@nxt.it.com</p>
                                <p className="text-sm leading-relaxed">
                                    Av. Lopez Mateos #1038-11, Col Italia Providencia CP 44630<br />
                                    Jalisco, Guadalajara
                                </p>
                            </div>
                        </div>

                        {/* Enlaces Rápidos */}
                        <div>
                            <h3 className={`text-lg font-semibold mb-4 ${
                                darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                                Enlaces rápidos
                            </h3>
                            <ul className={`space-y-2 ${
                                darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                                <li>
                                    <Link href="/" className="hover:text-brand transition-colors">
                                        Inicio
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/" className="hover:text-brand transition-colors">
                                        Tienda
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/login" className="hover:text-brand transition-colors">
                                        Iniciar Sesión
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Información de la Empresa */}
                        <div>
                            <h3 className={`text-lg font-semibold mb-4 ${
                                darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                                Sobre nosotros
                            </h3>
                            <Link
                                href="/desarrolladores"
                                className="inline-flex items-center gap-1 text-sm font-bold tracking-wide hover:text-brand transition-colors mb-3"
                            >
                                <span className="text-brand">Equipo</span>
                                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>de desarrollo</span>
                            </Link>
                            <p className={`text-sm leading-relaxed ${
                                darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                                Fundada en 2009 como Arrcuss Comercial de S de RL de CV, ahora NXT.IT, 
                                nació como un proyecto emprendedor para democratizar la creciente necesidad 
                                por equipo de cómputo y electrónica de las PYMES.
                            </p>
                        </div>

                        {/* Redes Sociales / Información Adicional */}
                        <div>
                            <h3 className={`text-lg font-semibold mb-4 ${
                                darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                                Información
                            </h3>
                            <div className={`space-y-2 text-sm ${
                                darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                                <p>
                                    <span className="font-semibold">Misión:</span> Incrementar las capacidades 
                                    de nuestros clientes mediante innovadoras soluciones de software, hardware 
                                    y tecnología de consumo.
                                </p>
                                <p>
                                    <span className="font-semibold">Visión:</span> Ser una empresa reconocida 
                                    por su liderazgo en el mercado de Tecnologías de la Información.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Copyright */}
                    <div className={`mt-8 pt-8 border-t text-center text-sm ${
                        darkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-600'
                    }`}>
                        <p>&copy; {new Date().getFullYear()} NXT.IT. Todos los derechos reservados.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

