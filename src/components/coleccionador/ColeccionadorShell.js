'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function IconHome({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function IconCamera({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 7h4l2-2h4l2 2h4a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="13" r="3.5" />
        </svg>
    )
}

function IconCards({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="5" width="13" height="16" rx="2" />
            <rect x="8" y="3" width="13" height="16" rx="2" opacity="0.85" />
        </svg>
    )
}

function IconUser({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20v-1a7 7 0 0114 0v1" strokeLinecap="round" />
        </svg>
    )
}

function IconUsers({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M16 21v-1a4 4 0 00-4-4H5a4 4 0 00-4 4v1" strokeLinecap="round" />
            <circle cx="8.5" cy="10" r="3" />
            <path d="M23 21v-1a4 4 0 00-3-3.87" strokeLinecap="round" />
            <path d="M16 3.13a3 3 0 010 5.74" strokeLinecap="round" />
        </svg>
    )
}

const nav = [
    { href: '/dashboard', label: 'Inicio', Icon: IconHome },
    { href: '/scan', label: 'Escanear', Icon: IconCamera },
    { href: '/collection', label: 'Cartas', Icon: IconCards },
    { href: '/comunidad', label: 'Comunidad', Icon: IconUsers },
    { href: '/perfil', label: 'Perfil', Icon: IconUser },
]

export default function ColeccionadorShell({ children }) {
    const pathname = usePathname()

    return (
        <div className="min-h-screen bg-slate-100 app-bg-pattern font-sans">
            <main className="relative z-0 pb-24 md:pb-0 md:ml-64">{children}</main>

            <aside
                className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-[60] md:w-64 md:flex-col md:border-r md:border-slate-200 md:bg-white/95 md:backdrop-blur md:px-3 md:py-4 theme-dark:md:border-slate-800 theme-dark:md:bg-slate-950/95"
                aria-label="Navegación principal"
            >
                <div className="px-3 pb-4 border-b border-slate-200 theme-dark:border-slate-800">
                    <p className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[#8f6f11]">Navegacion</p>
                    <h2 className="mt-1 text-xl font-extrabold text-blue-950 theme-dark:text-slate-50">Vistas</h2>
                </div>
                <nav className="mt-3 flex flex-col gap-1 px-1">
                    {nav.map(({ href, label, Icon }) => {
                        const active = pathname === href
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition md:duration-200 ${
                                    active
                                        ? 'bg-amber-500 text-white shadow-[0_8px_18px_rgba(245,158,11,0.35)] theme-dark:bg-[#c9a227] theme-dark:text-[#0b1b3c]'
                                        : 'text-slate-600 hover:bg-slate-200/80 hover:text-blue-950 theme-dark:text-slate-300 theme-dark:hover:bg-slate-800 theme-dark:hover:text-white'
                                }`}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span>{label}</span>
                                <span className="ml-auto font-bold opacity-70">&gt;</span>
                            </Link>
                        )
                    })}
                </nav>
            </aside>

            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur bottom-nav-shell md:hidden nav-entrance">
                <div className="grid grid-cols-5 text-[11px] font-semibold px-2 py-1">
                    {nav.map(({ href, label, Icon }) => {
                        const active = pathname === href
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`nav-item relative py-2 text-center ${active ? 'text-blue-950 is-active' : 'text-slate-500'}`}
                            >
                                <span
                                    className={`nav-icon-wrap mx-auto block w-11 h-11 rounded-full ${
                                        active ? 'bg-[#c9a227] shadow-lg' : ''
                                    } grid place-items-center`}
                                >
                                    <Icon className="mx-auto h-5 w-5" />
                                </span>
                                <span className="block mt-1">{label}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
