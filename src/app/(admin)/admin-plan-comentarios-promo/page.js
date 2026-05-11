'use client'

import { useCallback, useEffect, useState } from 'react'
import axios from '@/lib/axios'
import { useAdminDarkMode } from '@/hooks/useAdminDarkMode'

export default function AdminPlanComentariosPromoPage() {
    const darkMode = useAdminDarkMode()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [pageData, setPageData] = useState(null)

    const load = useCallback(async (page = 1) => {
        setLoading(true)
        setError('')
        try {
            const { data } = await axios.get(`/admin/plan-promo/comentarios?page=${page}&per_page=25`)
            if (data?.success) setPageData(data.data)
            else setError('Respuesta inválida')
        } catch (e) {
            setError(e?.response?.data?.message || 'No se pudieron cargar los comentarios')
            setPageData(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load(1)
    }, [load])

    const items = Array.isArray(pageData?.data) ? pageData.data : []
    const last = pageData?.last_page ?? 1
    const current = pageData?.current_page ?? 1
    const total = pageData?.total ?? 0

    return (
        <div className="mx-auto max-w-[1400px] space-y-8 pb-10">
            <div
                className={`relative overflow-hidden rounded-[1.75rem] border px-6 py-8 sm:px-10 ${
                    darkMode
                        ? 'border-violet-500/20 bg-gradient-to-br from-violet-950/40 via-slate-900 to-slate-950'
                        : 'border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/50'
                }`}
            >
                <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-fuchsia-500/15 blur-3xl" />
                <div className="relative">
                    <p className="text-xs font-black uppercase tracking-[0.28em] text-violet-600 dark:text-violet-300">Voz del usuario</p>
                    <h1 className={`mt-2 text-3xl font-extrabold sm:text-4xl ${darkMode ? 'text-white' : 'text-slate-900'}`}>Comentarios promo Pro</h1>
                    <p className={`mt-3 max-w-xl text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Mensajes enviados desde la promoción gratuita del plan Pro.
                    </p>
                    <div className="mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold text-violet-700 dark:border-violet-500/30 dark:text-violet-200">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-violet-500" />
                        {loading ? 'Sincronizando…' : `${total} mensaje(s) en total`}
                    </div>
                </div>
            </div>

            {error ? (
                <div className="rounded-2xl border border-red-300/60 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                    {error}
                </div>
            ) : null}

            <div className="space-y-4">
                {loading && items.length === 0 ? (
                    <div
                        className={`rounded-2xl border px-8 py-20 text-center text-sm font-medium ${
                            darkMode ? 'border-white/10 bg-slate-900/60 text-slate-400' : 'border-slate-200 bg-white text-slate-600'
                        }`}
                    >
                        Cargando comentarios…
                    </div>
                ) : null}
                {!loading && items.length === 0 ? (
                    <div
                        className={`rounded-2xl border px-8 py-20 text-center text-sm ${
                            darkMode ? 'border-white/10 bg-slate-900/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                    >
                        Aún no hay comentarios. Cuando un usuario envíe feedback desde /planes, aparecerá aquí.
                    </div>
                ) : null}
                {items.map((row) => {
                    const initial = (row.user?.name || row.user?.email || '?').slice(0, 1).toUpperCase()
                    const when = row.created_at ? new Date(row.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

                    return (
                        <article
                            key={row.id}
                            className={`group overflow-hidden rounded-2xl border shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl ${
                                darkMode
                                    ? 'border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 ring-1 ring-white/5'
                                    : 'border-slate-200/90 bg-white ring-1 ring-slate-100'
                            }`}
                        >
                            <div className={`flex gap-4 border-b px-5 py-4 ${darkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50/80'}`}>
                                <div
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-white shadow-inner ${
                                        darkMode ? 'bg-gradient-to-br from-violet-600 to-fuchsia-700' : 'bg-gradient-to-br from-violet-500 to-fuchsia-600'
                                    }`}
                                >
                                    {initial}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={`truncate font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{row.user?.name || 'Usuario'}</p>
                                    <p className={`truncate text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{row.user?.email || '—'}</p>
                                </div>
                                <time className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${darkMode ? 'bg-black/30 text-violet-200' : 'bg-violet-100 text-violet-800'}`}>
                                    {when}
                                </time>
                            </div>
                            <div className={`px-5 py-5 text-sm leading-relaxed ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                <p className="whitespace-pre-wrap">{row.body}</p>
                            </div>
                        </article>
                    )
                })}
            </div>

            {last > 1 ? (
                <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                        type="button"
                        disabled={current <= 1 || loading}
                        onClick={() => load(current - 1)}
                        className="rounded-2xl border-2 border-violet-300/60 px-5 py-2 text-sm font-extrabold text-violet-800 transition hover:bg-violet-50 disabled:opacity-40 dark:border-violet-500/40 dark:text-violet-200 dark:hover:bg-violet-950/40"
                    >
                        Anterior
                    </button>
                    <span className={`text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {current} / {last}
                    </span>
                    <button
                        type="button"
                        disabled={current >= last || loading}
                        onClick={() => load(current + 1)}
                        className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-extrabold text-white shadow-lg disabled:opacity-40"
                    >
                        Siguiente
                    </button>
                </div>
            ) : null}
        </div>
    )
}
