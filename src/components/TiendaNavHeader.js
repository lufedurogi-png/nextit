'use client'

import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/auth'
import SearchBar from '@/components/SearchBar'
import { useCarrito } from '@/lib/carrito'
import { useFavoritos } from '@/lib/favoritos'
import { useCotizacion } from '@/lib/cotizaciones'
import { useProductosByClaves } from '@/hooks/useProductosChunked'
import IconoNavegacion from '@/components/IconoNavegacion'

/**
 * Fila «Modo cotización»: ayuda al pasar el ratón (desktop) o con «?» (móvil). Sin recuadro extra; texto y viñetas esmeralda / aviso ámbar.
 */
function CotizacionModoConAyuda({ darkMode, modoActivo, onToggle, showTapHintButton }) {
    const [hoverAyuda, setHoverAyuda] = useState(false)
    const [ayudaTap, setAyudaTap] = useState(false)
    const mostrarAyuda = showTapHintButton ? ayudaTap : hoverAyuda

    const filaBtn = `min-w-0 flex-1 flex items-center justify-between px-4 py-2 text-sm transition-colors text-left ${
        darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-brand' : 'text-gray-700 hover:bg-gray-100 hover:text-brand'
    }`

    return (
        <div
            className={`relative border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
            onMouseEnter={() => {
                if (!showTapHintButton) setHoverAyuda(true)
            }}
            onMouseLeave={() => {
                if (!showTapHintButton) setHoverAyuda(false)
            }}
        >
            <div className="flex w-full items-stretch">
                <button type="button" onClick={onToggle} className={filaBtn}>
                    <span>Modo cotización</span>
                    <span className={`shrink-0 pl-2 ${modoActivo ? 'text-brand font-medium' : darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {modoActivo ? 'Activado' : 'Desactivado'}
                    </span>
                </button>
                {showTapHintButton && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            setAyudaTap((v) => !v)
                        }}
                        aria-expanded={ayudaTap}
                        aria-label={ayudaTap ? 'Ocultar ayuda del modo cotización' : 'Ver ayuda del modo cotización'}
                        className={`shrink-0 px-3 text-sm font-bold tabular-nums border-l transition-colors ${
                            darkMode
                                ? 'border-gray-600 text-emerald-400 hover:bg-gray-700'
                                : 'border-gray-200 text-emerald-700 hover:bg-gray-100'
                        }`}
                    >
                        ?
                    </button>
                )}
            </div>
            {mostrarAyuda && (
                <div className={`px-3 py-2.5 border-t ${darkMode ? 'border-gray-600/70' : 'border-gray-200'}`}>
                    {!modoActivo ? (
                        <>
                            <p className={`text-xs font-semibold mb-1.5 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Cómo funciona</p>
                            <ul className="space-y-1.5">
                                <li className={`flex gap-2 text-[11px] leading-snug ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-sm bg-emerald-500" aria-hidden />
                                    <span>
                                        Abre la <strong className={darkMode ? 'text-gray-100' : 'text-gray-900'}>ficha del producto</strong>, elige cantidad y pulsa{' '}
                                        <span className="font-semibold text-brand">Cotizar</span>.
                                    </span>
                                </li>
                                <li className={`flex gap-2 text-[11px] leading-snug ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-sm bg-emerald-500" aria-hidden />
                                    <span>
                                        Revisa lo agregado en <strong className={darkMode ? 'text-gray-100' : 'text-gray-900'}>Mis cotizaciones</strong> (enlace abajo).
                                    </span>
                                </li>
                                <li className={`flex gap-2 text-[11px] leading-snug ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-sm bg-emerald-500" aria-hidden />
                                    <span>Con el modo activo, comparar en rejillas queda desactivado.</span>
                                </li>
                            </ul>
                        </>
                    ) : (
                        <>
                            <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>Si lo desactivas</p>
                            <p className={`text-[11px] leading-snug ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                Ya no verás el botón <span className="font-semibold text-brand">Cotizar</span> en las fichas de producto hasta que vuelvas a activar el modo.
                            </p>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

/**
 * Barra de navegación de la tienda: logo, toggle oscuro, Favoritos, Carrito; enlaces Tienda/Inicio según ruta.
 * Prefetch de datos de favoritos y carrito para que al abrir esas vistas carguen al instante.
 * @param {() => void} [onToggleLeftSidebar] — Móvil: abre/cierra el panel izquierdo (filtros/categorías). Opcional.
 */
export default function TiendaNavHeader({ darkMode, setDarkMode, onToggleLeftSidebar }) {
    const pathname = usePathname() || ''
    const esAreaTienda = pathname === '/' || pathname.startsWith('/tienda')
    const mostrarLinkTiendaBarra = pathname !== '/'
    const mostrarLinkInicioBarra = !esAreaTienda
    const mobileStickyNavRef = useRef(null)
    const { user, logout } = useAuth({ middleware: 'guest' })
    const [userDropdownOpen, setUserDropdownOpen] = useState(false)
    const [cotizacionesMenuOpen, setCotizacionesMenuOpen] = useState(false)
    const { modoActivo: modoCotizacionActivo, toggleModo: toggleModoCotizacion } = useCotizacion(user)
    const [hasToken, setHasToken] = useState(false)
    useEffect(() => {
        setHasToken(typeof window !== 'undefined' && !!localStorage.getItem('auth_token'))
    }, [])
    const isLogged = !!user || hasToken
    const { items: cartItems } = useCarrito(isLogged)
    const cartCount = (cartItems || []).reduce((s, i) => s + (Number(i.cantidad) || 0), 0)
    const { claves: favoritosClaves } = useFavoritos(isLogged)
    const favoritosCount = favoritosClaves?.length ?? 0

    const cartKeys = (cartItems || []).map((i) => i.clave)

    useProductosByClaves(isLogged ? [] : cartKeys, 'cart-productos')

    useLayoutEffect(() => {
        const el = mobileStickyNavRef.current
        if (!el || typeof window === 'undefined') return undefined
        const apply = () => {
            if (!window.matchMedia('(max-width: 767px)').matches) {
                document.documentElement.style.removeProperty('--tienda-header-height')
                return
            }
            const raw = Math.ceil(el.getBoundingClientRect().height)
            const h = raw > 0 ? raw : 88
            document.documentElement.style.setProperty('--tienda-header-height', `${h}px`)
        }
        apply()
        const ro = new ResizeObserver(apply)
        ro.observe(el)
        const mq = window.matchMedia('(max-width: 767px)')
        mq.addEventListener('change', apply)
        return () => {
            ro.disconnect()
            mq.removeEventListener('change', apply)
            document.documentElement.style.removeProperty('--tienda-header-height')
        }
    }, [darkMode, user])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (userDropdownOpen && !e.target.closest('.tienda-nav-user-dropdown')) {
                setUserDropdownOpen(false)
            }
            if (cotizacionesMenuOpen && !e.target.closest('[data-cotiz-menu-root]')) {
                setCotizacionesMenuOpen(false)
            }
        }
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [userDropdownOpen, cotizacionesMenuOpen])

    useEffect(() => {
        if (!cotizacionesMenuOpen) return undefined
        const onKey = (e) => {
            if (e.key === 'Escape') setCotizacionesMenuOpen(false)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [cotizacionesMenuOpen])

    const toggleDark = () => {
        setDarkMode(!darkMode)
    }

    const pill = `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
        darkMode ? 'bg-tienda-elevated/90 text-gray-200 ring-1 ring-white/[0.06] hover:bg-tienda-elevated' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }`
    const pillSm = `inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
        darkMode ? 'bg-tienda-elevated/90 text-gray-200 ring-1 ring-white/[0.06] hover:bg-tienda-elevated' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }`

    return (
        <>
        <header
            ref={mobileStickyNavRef}
            className={`z-50 border-b transition-colors duration-300 max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:z-[60] max-md:shadow-md md:sticky md:top-0 ${
                darkMode ? 'border-gray-800/60 bg-tienda-canvas/95 backdrop-blur-md' : 'border-gray-200 bg-white/95 backdrop-blur-sm'
            }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="hidden md:flex items-center justify-between h-16 gap-4">
                    <Link href="/" className="flex items-center shrink-0">
                        <Image src="/Imagenes/logo_en.png" alt="Todo para oficina" width={120} height={40} className="h-8 w-auto" />
                    </Link>
                    <div className="flex-1 max-w-md">
                        <SearchBar darkMode={darkMode} />
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                        <div className="flex items-center space-x-2">
                            <div className="relative w-5 h-5">
                                <Image
                                    src="/Imagenes/icon_modo.webp"
                                    alt="Modo"
                                    width={20}
                                    height={20}
                                    className={`object-contain transition-all duration-300 ${darkMode ? 'brightness-0 invert' : ''}`}
                                />
                            </div>
                            <button
                                onClick={toggleDark}
                                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
                                    darkMode ? 'bg-gray-600' : 'bg-gray-300'
                                }`}
                                aria-label="Cambiar tema"
                            >
                                <span className={`inline-block h-5 w-5 rounded-full bg-white transition-transform duration-300 ${darkMode ? 'translate-x-8' : 'translate-x-1'}`} />
                            </button>
                            <span className={`text-xs font-medium ${darkMode ? 'text-brand' : 'text-gray-500'}`}>
                                {darkMode ? 'Oscuro' : 'Claro'}
                            </span>
                        </div>
                        {user && (
                            <Link
                                href="/favoritos"
                                className={`flex items-center gap-1.5 transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-brand' : 'text-gray-700 hover:text-brand'}`}
                                aria-label="Favoritos"
                            >
                                <Image
                                    src="/Imagenes/icon_favoritos.png"
                                    alt="Favoritos"
                                    width={22}
                                    height={22}
                                    className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`}
                                />
                                <span>Favoritos</span>
                                {favoritosCount > 0 && (
                                    <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-brand text-white text-xs font-semibold">
                                        {favoritosCount > 99 ? '99+' : favoritosCount}
                                    </span>
                                )}
                            </Link>
                        )}
                        <Link
                            href="/tienda/carrito"
                            className={`flex items-center gap-1.5 transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-brand' : 'text-gray-700 hover:text-brand'}`}
                            aria-label="Carrito"
                        >
                            <Image
                                src="/Imagenes/icon_carrito.png"
                                alt="Carrito"
                                width={22}
                                height={22}
                                className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`}
                            />
                            <span>Carrito</span>
                            {cartCount > 0 && (
                                <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-brand text-white text-xs font-semibold">
                                    {cartCount > 99 ? '99+' : cartCount}
                                </span>
                            )}
                        </Link>
                        <div className="relative hidden md:block" data-cotiz-menu-root>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setCotizacionesMenuOpen((o) => {
                                        const next = !o
                                        if (next) setUserDropdownOpen(false)
                                        return next
                                    })
                                }}
                                className={`inline-flex items-center gap-1.5 transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-brand' : 'text-gray-700 hover:text-brand'}`}
                                aria-expanded={cotizacionesMenuOpen}
                                aria-haspopup="true"
                                aria-label="Menú de cotizaciones"
                            >
                                <Image
                                    src="/Imagenes/icon_pedidos.png"
                                    alt=""
                                    width={22}
                                    height={22}
                                    className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`}
                                />
                                <span>Mis cotizaciones</span>
                                <svg className={`w-4 h-4 transition-transform ${cotizacionesMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {cotizacionesMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-[25]" onClick={() => setCotizacionesMenuOpen(false)} aria-hidden />
                                    <div
                                        role="menu"
                                        className={`absolute right-0 mt-2 w-56 overflow-visible rounded-lg shadow-lg border z-[30] py-0 ${darkMode ? 'bg-tienda-elevated border-gray-700' : 'bg-white border-gray-200'}`}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <CotizacionModoConAyuda
                                            darkMode={darkMode}
                                            modoActivo={modoCotizacionActivo}
                                            onToggle={toggleModoCotizacion}
                                            showTapHintButton={false}
                                        />
                                        <Link
                                            href="/tienda/cotizaciones"
                                            onClick={() => setCotizacionesMenuOpen(false)}
                                            className={`flex items-center px-4 py-2 text-sm transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-brand' : 'text-gray-700 hover:bg-gray-100 hover:text-brand'}`}
                                            role="menuitem"
                                        >
                                            <Image src="/Imagenes/icon_pedidos.png" alt="" width={20} height={20} className={`mr-3 object-contain shrink-0 ${darkMode ? 'brightness-0 invert' : ''}`} />
                                            Mis cotizaciones
                                        </Link>
                                        <Link
                                            href="/dashboard?tab=cotizaciones"
                                            onClick={() => setCotizacionesMenuOpen(false)}
                                            className={`flex items-center px-4 py-2 text-sm transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-brand' : 'text-gray-700 hover:bg-gray-100 hover:text-brand'}`}
                                            role="menuitem"
                                        >
                                            <Image src="/Imagenes/icon_historia.webp" alt="" width={20} height={20} className={`mr-3 object-contain shrink-0 ${darkMode ? 'brightness-0 invert' : ''}`} />
                                            Historial de cotizaciones
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>
                        {mostrarLinkTiendaBarra && (
                            <Link href="/" className={`transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-brand' : 'text-gray-700 hover:text-brand'}`}>
                                Tienda
                            </Link>
                        )}
                        {mostrarLinkInicioBarra && (
                            <Link href="/" className={`transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-brand' : 'text-gray-700 hover:text-brand'}`}>
                                Inicio
                            </Link>
                        )}
                        {user ? (
                            <div className="relative tienda-nav-user-dropdown">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUserDropdownOpen(!userDropdownOpen)
                                        if (!userDropdownOpen) setCotizacionesMenuOpen(false)
                                    }}
                                    className={`flex items-center space-x-2 transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-brand' : 'text-gray-700 hover:text-brand'}`}
                                >
                                    <span>Tienda: {user?.name || user?.email}</span>
                                    <svg className={`w-4 h-4 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {userDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setUserDropdownOpen(false)} aria-hidden />
                                        <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border z-20 ${darkMode ? 'bg-tienda-elevated border-gray-700' : 'bg-white border-gray-200'}`}>
                                            <div className="py-1">
                                                <Link
                                                    href="/dashboard"
                                                    onClick={() => setUserDropdownOpen(false)}
                                                    className={`flex items-center px-4 py-2 text-sm transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-brand' : 'text-gray-700 hover:bg-gray-100 hover:text-brand'}`}
                                                >
                                                    <Image src="/Imagenes/icon_home.webp" alt="" width={20} height={20} className={`mr-3 object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                                    Home
                                                </Link>
                                                <Link
                                                    href="/dashboard"
                                                    onClick={() => setUserDropdownOpen(false)}
                                                    className={`flex items-center px-4 py-2 text-sm transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-brand' : 'text-gray-700 hover:bg-gray-100 hover:text-brand'}`}
                                                >
                                                    <Image src="/Imagenes/icon_pedidos.png" alt="" width={20} height={20} className={`mr-3 object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                                    Mis pedidos
                                                </Link>
                                                <Link
                                                    href="/favoritos"
                                                    onClick={() => setUserDropdownOpen(false)}
                                                    className={`flex items-center px-4 py-2 text-sm transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-brand' : 'text-gray-700 hover:bg-gray-100 hover:text-brand'}`}
                                                >
                                                    <Image src="/Imagenes/icon_favoritos.png" alt="" width={20} height={20} className={`mr-3 object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                                    Favoritos
                                                </Link>
                                                <button
                                                    onClick={() => {
                                                        setUserDropdownOpen(false)
                                                        logout()
                                                    }}
                                                    className={`w-full flex items-center px-4 py-2 text-sm transition-colors text-left ${darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-brand' : 'text-gray-700 hover:bg-gray-100 hover:text-brand'}`}
                                                >
                                                    <Image src="/Imagenes/icon_cerrar_sesion.webp" alt="" width={20} height={20} className={`mr-3 object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                                    Cerrar
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <Link href="/login" className={`transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-brand' : 'text-gray-700 hover:text-brand'}`}>
                                Iniciar sesión
                            </Link>
                        )}
                    </div>
                </div>

                {/* Móvil: barra + cuenta + buscador (altura total la mide el <header> ref para --tienda-header-height) */}
                <div className="md:hidden">
                    <div
                        className={`-mx-4 px-4 py-2 sm:-mx-6 sm:px-6 ${
                            darkMode ? 'bg-tienda-canvas/95 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md'
                        }`}
                    >
                        <div className="flex items-center gap-1 min-w-0">
                            {typeof onToggleLeftSidebar === 'function' ? (
                                <button
                                    type="button"
                                    onClick={onToggleLeftSidebar}
                                    className={`shrink-0 rounded-xl p-2 transition-colors ${darkMode ? 'hover:bg-tienda-elevated' : 'hover:bg-gray-100'}`}
                                    aria-label="Abrir o cerrar panel lateral"
                                >
                                    <IconoNavegacion darkMode={darkMode} />
                                </button>
                            ) : (
                                <span className="w-11 shrink-0" aria-hidden />
                            )}
                            <div className={`flex shrink-0 items-center gap-1 rounded-lg px-1 py-0.5 ${darkMode ? 'bg-tienda-elevated/50' : 'bg-gray-100/80'}`}>
                                <Image
                                    src="/Imagenes/icon_modo.webp"
                                    alt=""
                                    width={16}
                                    height={16}
                                    className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`}
                                />
                                <button
                                    type="button"
                                    onClick={toggleDark}
                                    className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-colors ${
                                        darkMode ? 'bg-gray-600' : 'bg-gray-300'
                                    }`}
                                    aria-label="Cambiar tema"
                                >
                                    <span
                                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                                            darkMode ? 'translate-x-5' : 'translate-x-0.5'
                                        }`}
                                    />
                                </button>
                            </div>
                            <Link href="/" className="flex min-w-0 flex-1 justify-center px-1">
                                <Image
                                    src="/Imagenes/logo_en.png"
                                    alt="Todo para oficina"
                                    width={108}
                                    height={36}
                                    className="h-7 w-auto max-w-[min(100%,180px)] sm:h-8"
                                />
                            </Link>
                            {user ? (
                                <button
                                    type="button"
                                    onClick={() => logout()}
                                    className={`shrink-0 rounded-xl p-2 transition-colors ${darkMode ? 'hover:bg-tienda-elevated' : 'hover:bg-gray-100'}`}
                                    aria-label="Salir"
                                >
                                    <Image
                                        src="/Imagenes/icon_cerrar_sesion.webp"
                                        alt=""
                                        width={22}
                                        height={22}
                                        className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`}
                                    />
                                </button>
                            ) : (
                                <span className="w-11 shrink-0" aria-hidden />
                            )}
                        </div>

                        {user && (
                            <>
                                <p
                                    className={`mt-1.5 truncate text-center text-[10px] font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}
                                >
                                    Cuenta · {user?.name || user?.email}
                                </p>
                                <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
                                    <Link href="/dashboard" className={pillSm}>
                                        <Image src="/Imagenes/icon_pedidos.png" alt="" width={14} height={14} className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                        Pedidos
                                    </Link>
                                    <Link href="/favoritos" className={pillSm}>
                                        <Image src="/Imagenes/icon_favoritos.png" alt="" width={14} height={14} className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                        Favoritos
                                        {favoritosCount > 0 && (
                                            <span className="rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
                                                {favoritosCount > 99 ? '99+' : favoritosCount}
                                            </span>
                                        )}
                                    </Link>
                                    <Link href="/tienda/carrito" className={pillSm}>
                                        <Image src="/Imagenes/icon_carrito.png" alt="" width={14} height={14} className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                        Carrito
                                        {cartCount > 0 && (
                                            <span className="rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
                                                {cartCount > 99 ? '99+' : cartCount}
                                            </span>
                                        )}
                                    </Link>
                                    <button
                                        type="button"
                                        data-cotiz-menu-root
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setCotizacionesMenuOpen((o) => !o)
                                        }}
                                        className={pillSm}
                                        aria-expanded={cotizacionesMenuOpen}
                                        aria-label="Cotizaciones"
                                    >
                                        <Image src="/Imagenes/icon_pedidos.png" alt="" width={14} height={14} className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                        Cotizaciones
                                    </button>
                                </div>
                            </>
                        )}

                        {!user && (
                            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
                                <Link href="/tienda/carrito" className={pillSm}>
                                    <Image src="/Imagenes/icon_carrito.png" alt="" width={14} height={14} className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                    Carrito
                                    {cartCount > 0 && (
                                        <span className="rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
                                            {cartCount > 99 ? '99+' : cartCount}
                                        </span>
                                    )}
                                </Link>
                                <button
                                    type="button"
                                    data-cotiz-menu-root
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setCotizacionesMenuOpen((o) => !o)
                                    }}
                                    className={pillSm}
                                    aria-expanded={cotizacionesMenuOpen}
                                    aria-label="Cotizaciones"
                                >
                                    <Image src="/Imagenes/icon_pedidos.png" alt="" width={14} height={14} className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                    Cotizaciones
                                </button>
                                <Link href="/login" className={pillSm}>
                                    Iniciar sesión
                                </Link>
                            </div>
                        )}
                        <div className="pt-3 pb-1">
                            <SearchBar darkMode={darkMode} className="max-w-none w-full" />
                        </div>
                    </div>
                </div>
            </div>
            {cotizacionesMenuOpen && (
                <div className="md:hidden">
                    <div className="fixed inset-0 z-[61] bg-black/40" onClick={() => setCotizacionesMenuOpen(false)} aria-hidden />
                    <div
                        data-cotiz-menu-root
                        role="menu"
                        className={`fixed z-[62] left-1/2 top-[calc(var(--tienda-header-height,88px)+8px)] w-56 max-w-[calc(100vw-2rem)] max-h-[min(78dvh,22rem)] -translate-x-1/2 overflow-y-auto overscroll-contain rounded-lg shadow-lg border py-1 ${darkMode ? 'bg-tienda-elevated border-gray-700' : 'bg-white border-gray-200'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <CotizacionModoConAyuda
                            darkMode={darkMode}
                            modoActivo={modoCotizacionActivo}
                            onToggle={toggleModoCotizacion}
                            showTapHintButton
                        />
                        <Link
                            href="/tienda/cotizaciones"
                            onClick={() => setCotizacionesMenuOpen(false)}
                            className={`flex items-center px-4 py-2 text-sm transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-brand' : 'text-gray-700 hover:bg-gray-100 hover:text-brand'}`}
                            role="menuitem"
                        >
                            <Image src="/Imagenes/icon_pedidos.png" alt="" width={20} height={20} className={`mr-3 object-contain shrink-0 ${darkMode ? 'brightness-0 invert' : ''}`} />
                            Mis cotizaciones
                        </Link>
                        <Link
                            href="/dashboard?tab=cotizaciones"
                            onClick={() => setCotizacionesMenuOpen(false)}
                            className={`flex items-center px-4 py-2 text-sm transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-brand' : 'text-gray-700 hover:bg-gray-100 hover:text-brand'}`}
                            role="menuitem"
                        >
                            <Image src="/Imagenes/icon_historia.webp" alt="" width={20} height={20} className={`mr-3 object-contain shrink-0 ${darkMode ? 'brightness-0 invert' : ''}`} />
                            Historial de cotizaciones
                        </Link>
                    </div>
                </div>
            )}
        </header>
        {/* Reserva espacio en el flujo: el header es fixed en móvil y no ocupa altura */}
        <div
            className="md:hidden w-full shrink-0"
            style={{ height: 'var(--tienda-header-height, 88px)' }}
            aria-hidden
        />
        </>
    )
}
