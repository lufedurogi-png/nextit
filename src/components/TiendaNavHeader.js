'use client'

import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/auth'
import SearchBar from '@/components/SearchBar'
import { useCarrito } from '@/lib/carrito'
import { useFavoritos } from '@/lib/favoritos'
import { useProductosByClaves } from '@/hooks/useProductosChunked'
import IconoNavegacion from '@/components/IconoNavegacion'

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
        }
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [userDropdownOpen])

    const toggleDark = () => {
        const next = !darkMode
        setDarkMode(next)
        localStorage.setItem('darkMode', JSON.stringify(next))
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('darkModeChange', { detail: next }))
        }
    }

    const pill = `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
        darkMode ? 'bg-gray-800/80 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }`
    const pillSm = `inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
        darkMode ? 'bg-gray-800/80 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }`

    return (
        <>
        <header
            ref={mobileStickyNavRef}
            className={`z-50 border-b transition-colors duration-300 max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:z-[60] max-md:shadow-md md:sticky md:top-0 ${
                darkMode ? 'bg-gray-900/95 backdrop-blur-sm border-gray-800' : 'bg-white/95 backdrop-blur-sm border-gray-200'
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
                                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#FF8000] focus:ring-offset-2 ${
                                    darkMode ? 'bg-[#2b4e94]' : 'bg-gray-300'
                                }`}
                                aria-label="Cambiar tema"
                            >
                                <span className={`inline-block h-5 w-5 rounded-full bg-white transition-transform duration-300 ${darkMode ? 'translate-x-8' : 'translate-x-1'}`} />
                            </button>
                            <span className={`text-xs font-medium ${darkMode ? 'text-[#FF8000]' : 'text-gray-500'}`}>
                                {darkMode ? 'Oscuro' : 'Claro'}
                            </span>
                        </div>
                        {user && (
                            <Link
                                href="/favoritos"
                                className={`flex items-center gap-1.5 transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-[#FF8000]' : 'text-gray-700 hover:text-[#FF8000]'}`}
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
                                    <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#FF8000] text-white text-xs font-semibold">
                                        {favoritosCount > 99 ? '99+' : favoritosCount}
                                    </span>
                                )}
                            </Link>
                        )}
                        <Link
                            href="/tienda/carrito"
                            className={`flex items-center gap-1.5 transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-[#FF8000]' : 'text-gray-700 hover:text-[#FF8000]'}`}
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
                                <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#FF8000] text-white text-xs font-semibold">
                                    {cartCount > 99 ? '99+' : cartCount}
                                </span>
                            )}
                        </Link>
                        {mostrarLinkTiendaBarra && (
                            <Link href="/" className={`transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-[#FF8000]' : 'text-gray-700 hover:text-[#FF8000]'}`}>
                                Tienda
                            </Link>
                        )}
                        {mostrarLinkInicioBarra && (
                            <Link href="/" className={`transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-[#FF8000]' : 'text-gray-700 hover:text-[#FF8000]'}`}>
                                Inicio
                            </Link>
                        )}
                        {user ? (
                            <div className="relative tienda-nav-user-dropdown">
                                <button
                                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                    className={`flex items-center space-x-2 transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-[#FF8000]' : 'text-gray-700 hover:text-[#FF8000]'}`}
                                >
                                    <span>Tienda: {user?.name || user?.email}</span>
                                    <svg className={`w-4 h-4 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {userDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setUserDropdownOpen(false)} aria-hidden />
                                        <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border z-20 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                            <div className="py-1">
                                                <Link
                                                    href="/dashboard"
                                                    onClick={() => setUserDropdownOpen(false)}
                                                    className={`flex items-center px-4 py-2 text-sm transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-[#FF8000]' : 'text-gray-700 hover:bg-gray-100 hover:text-[#FF8000]'}`}
                                                >
                                                    <Image src="/Imagenes/icon_home.webp" alt="" width={20} height={20} className={`mr-3 object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                                    Home
                                                </Link>
                                                <Link
                                                    href="/dashboard"
                                                    onClick={() => setUserDropdownOpen(false)}
                                                    className={`flex items-center px-4 py-2 text-sm transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-[#FF8000]' : 'text-gray-700 hover:bg-gray-100 hover:text-[#FF8000]'}`}
                                                >
                                                    <Image src="/Imagenes/icon_pedidos.png" alt="" width={20} height={20} className={`mr-3 object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                                    Mis pedidos
                                                </Link>
                                                <Link
                                                    href="/favoritos"
                                                    onClick={() => setUserDropdownOpen(false)}
                                                    className={`flex items-center px-4 py-2 text-sm transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-[#FF8000]' : 'text-gray-700 hover:bg-gray-100 hover:text-[#FF8000]'}`}
                                                >
                                                    <Image src="/Imagenes/icon_favoritos.png" alt="" width={20} height={20} className={`mr-3 object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                                    Favoritos
                                                </Link>
                                                <button
                                                    onClick={() => {
                                                        setUserDropdownOpen(false)
                                                        logout()
                                                    }}
                                                    className={`w-full flex items-center px-4 py-2 text-sm transition-colors text-left ${darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-[#FF8000]' : 'text-gray-700 hover:bg-gray-100 hover:text-[#FF8000]'}`}
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
                            <Link href="/login" className={`transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-[#FF8000]' : 'text-gray-700 hover:text-[#FF8000]'}`}>
                                Iniciar sesión
                            </Link>
                        )}
                    </div>
                </div>

                {/* Móvil: barra + cuenta + buscador (altura total la mide el <header> ref para --tienda-header-height) */}
                <div className="md:hidden">
                    <div
                        className={`-mx-4 px-4 py-2 sm:-mx-6 sm:px-6 ${
                            darkMode ? 'bg-gray-900/95 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md'
                        }`}
                    >
                        <div className="flex items-center gap-1 min-w-0">
                            {typeof onToggleLeftSidebar === 'function' ? (
                                <button
                                    type="button"
                                    onClick={onToggleLeftSidebar}
                                    className={`shrink-0 rounded-xl p-2 transition-colors ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                                    aria-label="Abrir o cerrar panel lateral"
                                >
                                    <IconoNavegacion darkMode={darkMode} />
                                </button>
                            ) : (
                                <span className="w-11 shrink-0" aria-hidden />
                            )}
                            <div className={`flex shrink-0 items-center gap-1 rounded-lg px-1 py-0.5 ${darkMode ? 'bg-gray-800/50' : 'bg-gray-100/80'}`}>
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
                                        darkMode ? 'bg-[#2b4e94]' : 'bg-gray-300'
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
                                    className={`shrink-0 rounded-xl p-2 transition-colors ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
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
                                            <span className="rounded-full bg-[#FF8000] px-1 text-[10px] font-semibold text-white">
                                                {favoritosCount > 99 ? '99+' : favoritosCount}
                                            </span>
                                        )}
                                    </Link>
                                    <Link href="/tienda/carrito" className={pillSm}>
                                        <Image src="/Imagenes/icon_carrito.png" alt="" width={14} height={14} className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                        Carrito
                                        {cartCount > 0 && (
                                            <span className="rounded-full bg-[#FF8000] px-1 text-[10px] font-semibold text-white">
                                                {cartCount > 99 ? '99+' : cartCount}
                                            </span>
                                        )}
                                    </Link>
                                </div>
                            </>
                        )}

                        {!user && (
                            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
                                <Link href="/tienda/carrito" className={pillSm}>
                                    <Image src="/Imagenes/icon_carrito.png" alt="" width={14} height={14} className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                    Carrito
                                    {cartCount > 0 && (
                                        <span className="rounded-full bg-[#FF8000] px-1 text-[10px] font-semibold text-white">
                                            {cartCount > 99 ? '99+' : cartCount}
                                        </span>
                                    )}
                                </Link>
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
