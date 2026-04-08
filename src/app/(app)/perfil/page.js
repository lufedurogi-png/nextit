'use client'

import { useAuth } from '@/hooks/auth'
import { useEffect, useState } from 'react'
import { getStoredDarkMode, applyThemeToDocument, persistTheme, broadcastThemeChange } from '@/lib/appTheme'

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
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden theme-dark:bg-slate-900 theme-dark:border-slate-700">
                <div className="h-36 bg-[linear-gradient(120deg,#0b1b3c,#12306b)]" />
                <div className="px-5 pb-5 -mt-12">
                    <div className="h-24 w-24 rounded-full border-4 border-white bg-slate-100 shadow flex items-center justify-center theme-dark:border-slate-800 theme-dark:bg-slate-800">
                        <svg
                            className="h-12 w-12 opacity-80 text-slate-600 theme-dark:text-slate-300"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden
                        >
                            <circle cx="12" cy="8" r="3.5" />
                            <path d="M5 20v-1a7 7 0 0114 0v1" strokeLinecap="round" />
                        </svg>
                    </div>

                    <div className="mt-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 theme-dark:text-slate-400">Perfil</p>
                        <h1 className="text-2xl font-extrabold text-slate-900 theme-dark:text-slate-50">{user?.name || '—'}</h1>
                        <p className="text-slate-600 theme-dark:text-slate-300">{user?.email || '—'}</p>
                    </div>

                    <div className="mt-5 rounded-2xl border border-slate-200 p-4 theme-dark:border-slate-700">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-slate-900 theme-dark:text-slate-50">Modo nocturno</p>
                                <p className="text-xs text-slate-500 theme-dark:text-slate-400">
                                    Mismo interruptor que en login y registro (se guarda en el navegador)
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 theme-dark:border-slate-600 theme-dark:bg-slate-800 theme-dark:text-slate-200"
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

                    <button
                        type="button"
                        onClick={() => logout()}
                        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition active:scale-[0.99] theme-logout-btn theme-dark:border-red-900/50"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </section>
        </div>
    )
}
