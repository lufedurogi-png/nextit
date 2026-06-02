'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useVentasAuth } from '@/hooks/useVentasAuth'
import { useVentasInboxPendientes } from '@/hooks/useVentasInboxPendientes'
import { useAdminTheme } from '@/contexts/AdminThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import VentasGlobalSearch from '@/components/ventas/VentasGlobalSearch'

const navItems = [
    { href: '/ventas-dashboard', label: 'Resumen', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { href: '/ventas-pipeline', label: 'Pipeline', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2' },
    { href: '/ventas-tareas', label: 'Pendientes', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { href: '/ventas-calendario', label: 'Calendario', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { href: '/ventas-inbox', label: 'Chats', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { href: '/ventas-clientes', label: 'Historial de cotizaciones', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { href: '/ventas-cotizaciones', label: 'Nueva cotización', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { href: '/ventas-correos', label: 'Correos', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { href: '/ventas-correos-historial', label: 'Historial correos', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { href: '/ventas-pedidos', label: 'Historial de pedidos', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
    { href: '/ventas-reportes', label: 'Reportes', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { href: '/ventas-catalogo', label: 'Catálogo', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
]

const INBOX_HREF = '/ventas-inbox'

function NavBadge({ count, collapsed }) {
    if (!count || count <= 0) return null
    const label = count > 99 ? '99+' : String(count)
    const cls =
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-none text-white shadow-sm'
    if (collapsed) {
        return (
            <span className={`absolute -top-1.5 -right-1.5 ${cls}`} aria-hidden>
                {label}
            </span>
        )
    }
    return (
        <span className={`ml-auto shrink-0 ${cls}`} aria-label={`${label} mensajes sin contestar`}>
            {label}
        </span>
    )
}

export default function VentasChrome({ children }) {
    const pathname = usePathname()
    const router = useRouter()
    const { darkMode, setDarkMode } = useAdminTheme()
    const { user, logout } = useVentasAuth({ middleware: 'auth' })
    const [gateOk, setGateOk] = useState(false)
    const { count: inboxPendientes, refresh: refreshInboxPendientes } = useVentasInboxPendientes({ enabled: gateOk })
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [userMenu, setUserMenu] = useState(false)
    const menuRef = useRef(null)

    useEffect(() => {
        const ok =
            typeof window !== 'undefined' &&
            localStorage.getItem('auth_token') &&
            localStorage.getItem('auth_ventas') === 'true'
        if (!ok) {
            router.replace('/ventas-login')
            return
        }
        setGateOk(true)
    }, [router])

    useEffect(() => {
        if (gateOk) refreshInboxPendientes()
    }, [pathname, gateOk, refreshInboxPendientes])

    useEffect(() => {
        const fn = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenu(false)
        }
        document.addEventListener('click', fn)
        return () => document.removeEventListener('click', fn)
    }, [])

    let displayName = 'Vendedor'
    if (user?.name) displayName = user.name
    else if (typeof window !== 'undefined') {
        try {
            const raw = localStorage.getItem('auth_user')
            if (raw) displayName = JSON.parse(raw)?.name || displayName
        } catch (_) {}
    }

    if (!gateOk) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#1c1c1c] text-orange-200 gap-3">
                <div className="h-10 w-10 rounded-full border-2 border-orange-400/30 border-t-orange-400 animate-spin" />
                <p className="text-sm">Comprobando sesión…</p>
            </div>
        )
    }

    const isInbox = pathname === '/ventas-inbox' || pathname.startsWith('/ventas-inbox/')

    return (
        <div className="h-dvh flex min-h-0 bg-[#f5f5f5] text-gray-900 dark:bg-tienda-canvas dark:text-gray-100">
            {mobileMenuOpen && (
                <button
                    type="button"
                    className="fixed inset-0 z-30 bg-black/40 md:hidden"
                    aria-label="Cerrar menú"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r transition-transform duration-300 md:static md:translate-x-0 ${
                    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                } w-60 border-orange-200/80 bg-white/95 dark:border-orange-950/50 dark:bg-[#262626]/95 backdrop-blur-md ${
                    sidebarCollapsed ? 'md:w-16' : 'md:w-60'
                }`}
            >
                <div className="h-16 flex items-center gap-2 px-4 border-b border-orange-100 dark:border-orange-900/40">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#FF8000] to-[#e67300] flex items-center justify-center text-white font-bold text-xs shrink-0">
                        V
                    </div>
                    {!sidebarCollapsed && <span className="font-semibold text-orange-950 dark:text-orange-100 truncate">Ventas</span>}
                </div>
                <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                    {navItems.map((item) => {
                        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                        const showInboxBadge = item.href === INBOX_HREF && inboxPendientes > 0
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                                    active
                                        ? 'bg-orange-100 text-orange-900 dark:bg-orange-600/25 dark:text-orange-100'
                                        : 'text-gray-600 hover:bg-orange-50 dark:text-orange-200/70 dark:hover:bg-white/5'
                                }`}
                                title={
                                    sidebarCollapsed
                                        ? showInboxBadge
                                            ? `${item.label} (${inboxPendientes} sin contestar)`
                                            : item.label
                                        : undefined
                                }
                            >
                                <span className="relative shrink-0">
                                    <svg className="w-5 h-5 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                                    </svg>
                                    {showInboxBadge && sidebarCollapsed && (
                                        <NavBadge count={inboxPendientes} collapsed />
                                    )}
                                </span>
                                {!sidebarCollapsed && (
                                    <>
                                        <span className="truncate">{item.label}</span>
                                        {showInboxBadge && <NavBadge count={inboxPendientes} collapsed={false} />}
                                    </>
                                )}
                            </Link>
                        )
                    })}
                </nav>
                <div className="p-2 border-t border-orange-100 dark:border-orange-900/40 hidden md:block">
                    <button
                        type="button"
                        onClick={() => setSidebarCollapsed((o) => !o)}
                        className="w-full rounded-lg py-2 text-xs text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-white/5"
                    >
                        {sidebarCollapsed ? '»' : '« Contraer'}
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 min-h-0 md:pl-0">
                <header className="h-16 shrink-0 flex items-center justify-between gap-4 px-4 sm:px-6 border-b border-orange-100 bg-white/90 dark:border-orange-900/40 dark:bg-[#262626]/80 backdrop-blur">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            className="md:hidden p-2 rounded-lg text-orange-800 dark:text-orange-200 hover:bg-orange-50 dark:hover:bg-white/10"
                            onClick={() => setMobileMenuOpen(true)}
                            aria-label="Abrir menú"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <div className="min-w-0 flex-1 max-w-md">
                            <VentasGlobalSearch darkMode={darkMode} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0" ref={menuRef}>
                        <div
                            className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-medium ${
                                darkMode ? 'bg-[#333333]/80 text-orange-100/90' : 'bg-orange-50 text-orange-900'
                            }`}
                        >
                            <span className="hidden md:inline">Tema</span>
                            <ThemeToggle variant="brand" dark={darkMode} onToggle={() => setDarkMode((d) => !d)} />
                        </div>
                        <div className="sm:hidden">
                            <ThemeToggle variant="brand" dark={darkMode} onToggle={() => setDarkMode((d) => !d)} />
                        </div>
                        <span className="hidden sm:inline text-sm text-orange-900/70 dark:text-orange-200/80 truncate max-w-[10rem]">{displayName}</span>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setUserMenu((v) => !v)}
                                className="flex items-center gap-2 rounded-xl border border-orange-100 dark:border-orange-800/60 px-2 py-1.5 hover:bg-orange-50 dark:hover:bg-white/5"
                            >
                                <span className="h-8 w-8 rounded-full bg-gradient-to-br from-[#FF8000] to-[#e67300] text-white text-xs font-bold flex items-center justify-center">
                                    {displayName.charAt(0).toUpperCase()}
                                </span>
                            </button>
                            {userMenu && (
                                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-orange-100 bg-white py-1 shadow-xl dark:border-orange-800 dark:bg-[#262626] z-50">
                                    <button
                                        type="button"
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 dark:hover:bg-white/10"
                                        onClick={() => logout()}
                                    >
                                        Cerrar sesión
                                    </button>
                                    <Link href="/" className="block px-4 py-2 text-sm hover:bg-orange-50 dark:hover:bg-white/10" onClick={() => setUserMenu(false)}>
                                        Ir a la tienda
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <main
                    className={`flex-1 p-4 sm:p-6 ${
                        isInbox ? 'flex flex-col min-h-0 overflow-hidden' : 'overflow-auto'
                    }`}
                >
                    {children}
                </main>
            </div>
        </div>
    )
}
