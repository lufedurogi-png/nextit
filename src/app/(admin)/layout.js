'use client'

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { useMobileLeftDrawerSwipe } from '@/hooks/useMobileLeftDrawerSwipe'
import IconoNavegacion from '@/components/IconoNavegacion'
import BrandLogo from '@/components/BrandLogo'
import { getStoredAdminDarkMode, persistAdminTheme } from '@/lib/appTheme'
import { applyAdminDocumentTheme, restoreClientDocumentTheme } from '@/lib/themeDocument'

const navItems = [
    { href: '/admin-home', label: 'Inicio', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/admin-respaldo', label: 'Respaldo BD', icon: 'M12 8c-3.314 0-6 1.343-6 3v2c0 1.657 2.686 3 6 3s6-1.343 6-3v-2c0-1.657-2.686-3-6-3zm0 8c-3.314 0-6-1.343-6-3v3c0 1.657 2.686 3 6 3s6-1.343 6-3v-3c0-1.657-2.686-3-6-3zm0 5c-3.314 0-6-1.343-6-3v3c0 1.657 2.686 3 6 3s6-1.343 6-3v-3c0-1.657-2.686-3-6-3z' },
    { href: '/admin-catalogo-franquicias', label: 'Catálogo de franquicias', icon: 'M4 7h16M4 12h10M4 17h16' },
    { href: '/admin-uso-escaner-ia', label: 'Uso escáner IA', icon: 'M11 17a1 1 0 102 0v-4a1 1 0 10-2 0v4zm-4 0a1 1 0 102 0V9a1 1 0 10-2 0v8zm8 0a1 1 0 102 0v-6a1 1 0 10-2 0v6M4 21h16' },
    { href: '/admin-metodos-pago', label: 'Métodos pago', iconImage: '/Imagenes/icons_metodosdepago.png' },
    {
        href: '/admin-plan-pro',
        label: 'Plan Pro',
        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    { href: '/admin-plan-pro-usuarios', label: 'Usuarios Plan Pro', icon: 'M17 20h5V4H2v16h5m10 0v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2m12 0H7m8-10a3 3 0 11-6 0 3 3 0 016 0z' },
    { href: '/admin-plan-ganancias', label: 'Ganancias plan Pro', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { href: '/admin-plan-comentarios-promo', label: 'Comentarios promo Pro', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { href: '/admin-plan-pro-indefinido', label: 'Pro indefinido', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
    { href: '/admin-gestion-usuarios', label: 'Gestionar usuarios', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
]

export default function AdminLayout({ children }) {
    const pathname = usePathname()
    const router = useRouter()
    const { user, logout } = useAdminAuth({ middleware: 'auth' })
    const [darkMode, setDarkMode] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [adminMenuOpen, setAdminMenuOpen] = useState(false)
    const adminMenuRef = useRef(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    useLayoutEffect(() => {
        if (!mounted) return
        const initial = getStoredAdminDarkMode()
        setDarkMode(initial)
        applyAdminDocumentTheme(initial)
    }, [mounted])

    useEffect(() => {
        if (!mounted) return
        const token = localStorage.getItem('auth_token')
        const isAdmin = localStorage.getItem('auth_admin')
        if (!token || !isAdmin) {
            router.push('/admin-login')
        }
    }, [mounted, router])

    useEffect(() => {
        return () => {
            restoreClientDocumentTheme()
        }
    }, [])

    useEffect(() => {
        if (!mounted) return
        const onToggle = (e) => {
            const v = !!e.detail
            setDarkMode(v)
            applyAdminDocumentTheme(v)
        }
        window.addEventListener('darkModeChange', onToggle)
        return () => window.removeEventListener('darkModeChange', onToggle)
    }, [mounted])

    const commitAdminTheme = useCallback((next) => {
        setDarkMode(next)
        persistAdminTheme(next)
        applyAdminDocumentTheme(next)
    }, [])

    useEffect(() => {
        function handleClickOutside(event) {
            if (adminMenuRef.current && !adminMenuRef.current.contains(event.target)) {
                setAdminMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (!mobileSidebarOpen) return undefined
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = previousOverflow
        }
    }, [mobileSidebarOpen])

    const openMobileSidebar = useCallback(() => setMobileSidebarOpen(true), [])

    const { edgeStripProps, drawerTouchProps } = useMobileLeftDrawerSwipe({
        isOpen: mobileSidebarOpen,
        onOpen: openMobileSidebar,
        onClose: () => setMobileSidebarOpen(false),
        enabled: true,
    })

    useEffect(() => {
        setMobileSidebarOpen(false)
    }, [pathname])

    // Mostrar "Cargando..." solo después de montar para evitar hydration mismatch (server no tiene user/localStorage)
    if (mounted && !user && typeof window !== 'undefined' && localStorage.getItem('auth_token')) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Cargando...</div>
    }

    const mobilePill = `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
        darkMode ? 'bg-gray-700/80 text-gray-200' : 'bg-gray-100 text-gray-800'
    }`

    return (
        <div className={`min-h-screen flex transition-colors ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
            {!mobileSidebarOpen && (
                <div className="fixed left-0 top-0 bottom-0 z-[36] w-9 md:hidden" aria-hidden {...edgeStripProps} />
            )}
            {/* Sidebar */}
            {mobileSidebarOpen && (
                <button
                    type="button"
                    aria-label="Cerrar navegación"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="fixed inset-0 z-30 bg-black/50 md:hidden"
                />
            )}
            <aside
                className={`fixed left-0 top-0 z-40 h-screen transition-all duration-300 flex flex-col ${
                sidebarOpen ? 'w-64' : 'w-20'
            } ${darkMode ? 'bg-gray-800 border-r border-gray-700' : 'bg-white border-r border-gray-200'} ${
                mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } md:translate-x-0`}
                {...drawerTouchProps}
            >
                <div className={`flex items-center justify-between h-16 px-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                        {sidebarOpen ? (
                            <BrandLogo dark={darkMode} compact className="shrink min-w-0" />
                        ) : (
                            <BrandLogo dark={darkMode} compact className="shrink-0 mx-auto" />
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setSidebarOpen((s) => !s)}
                        className={`hidden md:inline-flex p-2 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
                <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const active = pathname === item.href
                        const gananciaClass =
                            item.gananciaIcon && !active
                                ? darkMode
                                    ? ''
                                    : 'text-emerald-600'
                                : ''
                        return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
                                active
                                    ? 'bg-emerald-600 text-white'
                                    : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {item.gananciaIcon ? (
                                <span className={`w-5 h-5 shrink-0 inline-flex items-center justify-center ${gananciaClass}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden>
                                        <path d="M3 3v18h18" />
                                        <path d="M7 12l4-4 4 4 4-6" />
                                        <path d="M21 9v6" />
                                    </svg>
                                </span>
                            ) : item.iconImage ? (
                                active ? (
                                    <span
                                        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-emerald-950/55 p-0.5 ring-1 ring-emerald-400/25"
                                        aria-hidden
                                    >
                                        <Image
                                            src={item.iconImage}
                                            alt=""
                                            width={20}
                                            height={20}
                                            className="h-5 w-5 object-contain"
                                            style={{
                                                filter:
                                                    'brightness(0) saturate(100%) invert(84%) sepia(31%) saturate(638%) hue-rotate(93deg)',
                                            }}
                                        />
                                    </span>
                                ) : (
                                    <Image
                                        src={item.iconImage}
                                        alt=""
                                        width={20}
                                        height={20}
                                        className={`h-5 w-5 shrink-0 object-contain ${
                                            darkMode ? 'brightness-0 invert opacity-80' : 'opacity-90'
                                        }`}
                                    />
                                )
                            ) : (
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                                </svg>
                            )}
                            {sidebarOpen && <span>{item.label}</span>}
                        </Link>
                        )
                    })}
                </nav>
            </aside>

            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ml-0 ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
                {/* Barra superior tipo Laravel */}
                <header className={`sticky top-0 z-30 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0 min-h-14 px-3 md:px-6 py-2 md:py-0 border-b shrink-0 ${
                    darkMode ? 'bg-gray-800/95 border-gray-700 backdrop-blur' : 'bg-white/95 border-gray-200 backdrop-blur'
                }`}>
                    <button
                        type="button"
                        onClick={() => setMobileSidebarOpen((s) => !s)}
                        className={`md:hidden inline-flex items-center justify-center self-start rounded-xl p-2 ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                        aria-label="Abrir navegación lateral"
                    >
                        <IconoNavegacion darkMode={darkMode} />
                    </button>
                    {/* Esquina derecha: modo oscuro/claro + Admin */}
                    <div className="hidden md:flex flex-1 items-center justify-end gap-2 md:gap-4">
                        {/* Interruptor modo oscuro / claro */}
                        <div className="flex items-center gap-3">
                            <span className={`flex h-8 w-8 items-center justify-center rounded-full border ${darkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-300 bg-gray-100'}`}>
                                <Image src="/Imagenes/icon_modo.webp" alt="" width={16} height={16} className="w-4 h-4 object-contain" />
                            </span>
                            <button
                                type="button"
                                onClick={() => commitAdminTheme(!darkMode)}
                                className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                                    darkMode ? 'bg-emerald-600' : 'bg-gray-300'
                                }`}
                                aria-label="Modo oscuro / claro"
                            >
                                <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300 ${
                                        darkMode ? 'translate-x-8' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                            <span className={`hidden sm:inline text-sm font-medium min-w-[3.5rem] ${darkMode ? 'text-amber-400/90' : 'text-gray-500'}`}>
                                {darkMode ? 'Oscuro' : 'Claro'}
                            </span>
                        </div>

                        {/* Admin: [nombre] con menú desplegable */}
                        <div className="relative" ref={adminMenuRef}>
                        <button
                            type="button"
                            onClick={() => setAdminMenuOpen((o) => !o)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                                darkMode ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-800 hover:bg-gray-100'
                            }`}
                        >
                            <span className="text-sm">
                                <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Admin: </span>
                                <span className="font-medium">{user?.name || user?.nombre || 'Admin'}</span>
                            </span>
                            <svg className={`w-4 h-4 transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {adminMenuOpen && (
                            <div className={`absolute right-0 top-full mt-1 min-w-[180px] rounded-lg border shadow-lg overflow-hidden ${
                                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                            }`}>
                                <button
                                    type="button"
                                    onClick={() => { setAdminMenuOpen(false); logout() }}
                                    className={`flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium transition-colors ${
                                        darkMode ? 'text-red-400 hover:bg-gray-700/50' : 'text-red-600 hover:bg-red-50'
                                    }`}
                                >
                                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Cerrar sesión
                                </button>
                            </div>
                        )}
                        </div>
                    </div>

                    {/* Móvil: controles siempre visibles bajo el botón lateral (sticky), sin desplegable */}
                    <div
                        className={`md:hidden flex w-full flex-wrap items-center gap-2 border-t pt-2 md:border-0 md:pt-0 ${
                            darkMode ? 'border-gray-700/40' : 'border-gray-200'
                        }`}
                    >
                        <div className={`flex flex-wrap items-center gap-2 ${mobilePill}`}>
                            <Image src="/Imagenes/icon_modo.webp" alt="" width={16} height={16} className="w-4 h-4 object-contain" />
                            <button
                                type="button"
                                onClick={() => commitAdminTheme(!darkMode)}
                                className={`relative inline-flex h-6 w-12 shrink-0 items-center rounded-full transition-colors ${
                                    darkMode ? 'bg-emerald-600' : 'bg-gray-300'
                                }`}
                                aria-label="Modo oscuro / claro"
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                        darkMode ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                            <span className={`text-xs ${darkMode ? 'text-amber-400/90' : 'text-gray-500'}`}>{darkMode ? 'Oscuro' : 'Claro'}</span>
                        </div>
                        <span className={`${mobilePill} max-w-[min(100%,14rem)] truncate`}>
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Admin: </span>
                            <span className="font-medium">{user?.name || user?.nombre || 'Admin'}</span>
                        </span>
                        <button
                            type="button"
                            onClick={() => logout()}
                            className={`${mobilePill} text-red-400 hover:bg-red-950/30`}
                        >
                            Salir
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-3 md:p-6 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
