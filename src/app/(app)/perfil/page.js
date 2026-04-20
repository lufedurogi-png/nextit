'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/auth'
import { useEffect, useState } from 'react'
import { getStoredDarkMode, applyThemeToDocument, persistTheme, broadcastThemeChange } from '@/lib/appTheme'
import PageFade from '@/components/coleccionador/PageFade'

export default function PerfilPage() {
    const { user, logout } = useAuth({})
    const [dark, setDark] = useState(false)

    useEffect(() => {
        setDark(getStoredDarkMode())
    }, [])

    useEffect(() => {
        const onEvent = (e) => {
            if (typeof e.detail === 'boolean') setDark(e.detail)
        }
        const onStorage = (ev) => {
            if (ev.key === 'darkMode' && ev.newValue !== null) {
                try {
                    setDark(JSON.parse(ev.newValue))
                } catch {
                    // ignorar
                }
            }
        }
        window.addEventListener('darkModeChange', onEvent)
        window.addEventListener('storage', onStorage)
        return () => {
            window.removeEventListener('darkModeChange', onEvent)
            window.removeEventListener('storage', onStorage)
        }
    }, [])

    const toggleTheme = () => {
        const next = !getStoredDarkMode()
        applyThemeToDocument(next)
        persistTheme(next)
        broadcastThemeChange(next)
        setDark(next)
    }

    return (
        <PageFade>
            <div className="relative mx-auto max-w-2xl px-4 pb-12 pt-4">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_22px_70px_rgba(2,6,23,0.12)] theme-dark:border-slate-700 theme-dark:bg-slate-900"
                >
                    <div className="relative h-44 overflow-hidden bg-[linear-gradient(120deg,#0b1b3c_0%,#1d4ed8_55%,#c9a227_160%)]">
                        <div className="foil-back-pattern absolute inset-0 opacity-40 mix-blend-screen" />
                        <motion.div
                            className="absolute -left-24 top-0 h-56 w-56 rounded-full bg-white/15 blur-3xl"
                            animate={{ x: [0, 18, 0], y: [0, -10, 0] }}
                            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <div className="absolute right-4 top-4 rounded-full border border-white/25 bg-black/20 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.25em] text-white">
                            Coleccionador Pass
                        </div>
                    </div>

                    <div className="relative px-5 pb-6 -mt-14">
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                            className="mx-auto flex h-28 w-28 items-center justify-center rounded-[1.35rem] border-[5px] border-white bg-slate-100 shadow-[0_18px_45px_rgba(2,6,23,0.22)] theme-dark:border-slate-800 theme-dark:bg-slate-800"
                        >
                            <svg
                                className="h-14 w-14 opacity-85 text-slate-600 theme-dark:text-slate-200"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden
                            >
                                <circle cx="12" cy="8" r="3.5" />
                                <path d="M5 20v-1a7 7 0 0114 0v1" strokeLinecap="round" />
                            </svg>
                        </motion.div>

                        <div className="mt-4 text-center">
                            <p className="text-[0.72rem] font-bold uppercase tracking-[0.28em] text-slate-500 theme-dark:text-slate-400">Perfil verificado</p>
                            <h1 className="font-playfair mt-2 text-3xl font-extrabold text-slate-900 theme-dark:text-slate-50">{user?.name || '—'}</h1>
                            <p className="mt-1 text-sm text-slate-600 theme-dark:text-slate-300">{user?.email || '—'}</p>
                        </div>

                        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                            {[
                                { k: 'Nivel', v: 'Gold', hint: 'demo' },
                                { k: 'Racha', v: '7 días', hint: 'local' },
                                { k: 'Album', v: '2026', hint: 'Mundial' },
                            ].map((x) => (
                                <div
                                    key={x.k}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 theme-dark:border-slate-700 theme-dark:bg-slate-950/40"
                                >
                                    <p className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-500 theme-dark:text-slate-400">{x.k}</p>
                                    <p className="mt-1 text-lg font-black text-slate-900 theme-dark:text-slate-50">{x.v}</p>
                                    <p className="mt-1 text-[0.62rem] font-semibold text-slate-400">{x.hint}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 theme-dark:border-slate-700 theme-dark:bg-slate-950/30">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-bold text-slate-900 theme-dark:text-slate-50">Modo nocturno</p>
                                    <p className="text-xs text-slate-500 theme-dark:text-slate-400">Se guarda en el navegador, igual que en login.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={toggleTheme}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 theme-dark:border-slate-600 theme-dark:bg-slate-800 theme-dark:text-slate-200"
                                >
                                    {dark ? (
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                            <circle cx="12" cy="12" r="4" />
                                            <path
                                                d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                    ) : (
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                    <span>{dark ? 'Desactivar' : 'Activar'}</span>
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <Link
                                href="/planes"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#c9a227] px-4 py-3 text-sm font-extrabold text-[#0b1b3c] shadow-md transition hover:brightness-105 active:scale-[0.99]"
                            >
                                Mejorar plan
                            </Link>
                            <button
                                type="button"
                                onClick={() => logout()}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition active:scale-[0.99] theme-logout-btn theme-dark:border-red-900/50"
                            >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                    <path
                                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </PageFade>
    )
}
