'use client'

import { useEffect, useState } from 'react'
import { usePortafolioTheme } from '@/components/portafolio/PortafolioTheme'

const LINKS = [
    { id: 'trabajo', label: 'Trabajo' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'proceso', label: 'Proceso' },
    { id: 'enfoque', label: 'Enfoque' },
    { id: 'contacto', label: 'Contacto' },
]

function ThemeIcon({ theme }) {
    if (theme === 'dark') {
        return (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="1.5" />
                <path
                    d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.05 5.05l1.56 1.56M17.39 17.39l1.56 1.56M5.05 18.95l1.56-1.56M17.39 6.61l1.56-1.56"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="square"
                />
            </svg>
        )
    }

    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
                d="M19.5 13.2A7.6 7.6 0 0 1 10.8 4.5 7.7 7.7 0 1 0 19.5 13.2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export default function PortafolioNav() {
    const [active, setActive] = useState('')
    const [scrolled, setScrolled] = useState(false)
    const { theme, toggleTheme } = usePortafolioTheme()

    useEffect(() => {
        const onScroll = () => {
            setScrolled(window.scrollY > 24)
            const mid = window.scrollY + window.innerHeight * 0.35
            let current = ''
            for (const link of LINKS) {
                const el = document.getElementById(link.id)
                if (!el) continue
                if (el.offsetTop <= mid) current = link.id
            }
            setActive(current)
        }
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <header
            className={`fixed inset-x-0 top-0 z-50 transition-[background,border-color,backdrop-filter] duration-400 ${
                scrolled
                    ? 'border-b border-[var(--pf-line)] backdrop-blur-md'
                    : 'border-b border-transparent bg-transparent'
            }`}
            style={scrolled ? { background: 'var(--pf-nav-scrolled)' } : undefined}>
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:h-16 sm:px-8">
                <a
                    href="#inicio"
                    className="pf-mono group flex items-center gap-2.5 text-[11px] tracking-[0.22em] text-[var(--pf-ink)]">
                    <span className="pf-glyph-dot inline-block shrink-0" aria-hidden />
                    <span className="font-medium uppercase">Fernando</span>
                    <span className="hidden text-[var(--pf-mute)] sm:inline">
                        Durán
                    </span>
                </a>

                <nav
                    aria-label="Secciones del portafolio"
                    className="flex items-center gap-3 sm:gap-6">
                    {LINKS.map(link => (
                        <a
                            key={link.id}
                            href={`#${link.id}`}
                            data-active={active === link.id}
                            className="pf-nav-link pf-mono hidden text-[10px] uppercase tracking-[0.18em] text-[var(--pf-mute)] transition-colors hover:text-[var(--pf-ink)] sm:inline">
                            {link.label}
                        </a>
                    ))}

                    <button
                        type="button"
                        className="pf-theme-btn"
                        onClick={toggleTheme}
                        aria-label={
                            theme === 'dark'
                                ? 'Cambiar a modo claro'
                                : 'Cambiar a modo oscuro'
                        }
                        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
                        <ThemeIcon theme={theme} />
                    </button>

                    <a
                        href="#contacto"
                        className="pf-mono pf-cta inline-flex items-center border border-[var(--pf-line-strong)] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--pf-ink)] transition-colors hover:border-[var(--pf-signal)] hover:text-[var(--pf-signal)]">
                        Disponible
                    </a>
                </nav>
            </div>
        </header>
    )
}
