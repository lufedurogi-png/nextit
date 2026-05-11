'use client'

import { useCallback, useEffect, useState } from 'react'
import axios from '@/lib/axios'
import { useAdminDarkMode } from '@/hooks/useAdminDarkMode'

function money(n) {
    const v = Number(n) || 0
    return v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const METHOD_LABEL = {
    paypal: 'PayPal',
    mercadopago: 'Mercado Pago',
    tarjeta: 'Tarjeta',
    promocional: 'Promocional',
}

function MethodsTable({ rows, darkMode, loading }) {
    if (loading) {
        return (
            <div className={`rounded-2xl border px-6 py-16 text-center text-sm ${darkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                Cargando movimientos…
            </div>
        )
    }
    if (!rows?.length) {
        return (
            <div className={`rounded-2xl border px-6 py-16 text-center text-sm ${darkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                Sin movimientos en este periodo.
            </div>
        )
    }
    return (
        <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-inner dark:border-white/10">
            <table className="min-w-full text-sm">
                <thead>
                    <tr className={darkMode ? 'bg-gradient-to-r from-emerald-900/50 to-slate-900/80 text-emerald-100/90' : 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white'}>
                        <th className="px-4 py-3 text-left font-bold tracking-wide">Método</th>
                        <th className="px-4 py-3 text-right font-bold">Usuarios</th>
                        <th className="px-4 py-3 text-right font-bold">Cargos</th>
                        <th className="px-4 py-3 text-right font-bold">Comisión est.</th>
                        <th className="px-4 py-3 text-right font-bold">Neto USD ~</th>
                        <th className="px-4 py-3 text-right font-bold">Neto MXN ~</th>
                    </tr>
                </thead>
                <tbody className={darkMode ? 'divide-y divide-white/5 bg-slate-950/40' : 'divide-y divide-slate-100 bg-white'}>
                    {rows.map((row, i) => (
                        <tr
                            key={row.code}
                            className={
                                darkMode
                                    ? i % 2 === 0
                                        ? 'bg-white/[0.02] hover:bg-emerald-950/30'
                                        : 'hover:bg-emerald-950/30'
                                    : i % 2 === 0
                                      ? 'bg-slate-50/80 hover:bg-emerald-50'
                                      : 'hover:bg-emerald-50'
                            }
                        >
                            <td className="px-4 py-3">
                                <span className="font-bold text-emerald-600 dark:text-emerald-300">{METHOD_LABEL[row.code] || row.code}</span>
                                <p className={`mt-0.5 max-w-md text-[11px] leading-snug ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{row.fee_rule_note}</p>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums">{row.distinct_users}</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums">{row.transactions}</td>
                            <td className="px-4 py-3 text-right tabular-nums">${money(row.processor_fees_estimate)}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-emerald-700 dark:text-emerald-200">${money(row.net_approx_usd)}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-emerald-700 dark:text-emerald-200">${money(row.net_approx_mxn)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default function AdminPlanGananciasPage() {
    const darkMode = useAdminDarkMode()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [reports, setReports] = useState([])
    const [reportsOpen, setReportsOpen] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const { data: body } = await axios.get('/admin/plan-pagos/resumen-mes')
            if (body?.success) setData(body.data)
            else setError('Respuesta inválida')
        } catch (e) {
            setError(e?.response?.data?.message || 'No se pudo cargar el resumen')
        } finally {
            setLoading(false)
        }
    }, [])

    const loadReports = useCallback(async () => {
        try {
            const { data: body } = await axios.get('/admin/plan-pagos/informes')
            if (body?.success && Array.isArray(body.data)) setReports(body.data)
        } catch {
            /* ignore */
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        loadReports()
    }, [loadReports])

    const methods = Array.isArray(data?.methods) ? data.methods : []
    const totals = data?.totals

    const shell = darkMode
        ? 'rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/50 shadow-2xl shadow-black/40'
        : 'rounded-[1.75rem] border border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/40 to-white shadow-xl shadow-emerald-900/5'

    return (
        <div className="mx-auto max-w-[1600px] space-y-8 pb-10">
            <div
                className={`relative overflow-hidden rounded-[1.75rem] border px-6 py-8 sm:px-10 ${
                    darkMode
                        ? 'border-emerald-500/20 bg-gradient-to-br from-emerald-900/30 via-slate-900 to-slate-950'
                        : 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-sky-50/60'
                }`}
            >
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/10" />
                <div className="relative">
                    <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-600 dark:text-emerald-400">Finanzas</p>
                    <h1 className={`mt-2 text-3xl font-extrabold sm:text-4xl ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        Ganancias por método · Plan Pro
                    </h1>
                    <p className={`mt-3 max-w-2xl text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        La tabla superior muestra solo el <strong className="text-emerald-700 dark:text-emerald-300">mes calendario en curso</strong>. Cada mes
                        cerrado se archiva en el informe histórico: el backend lo genera solo cuando corresponde (por ejemplo al cargar esta página o cuando un
                        usuario autenticado consulta su suscripción Pro). No hace falta que ejecutes comandos en la terminal ni que declares tareas cron en el
                        servidor.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                load()
                                loadReports()
                            }}
                            className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/25 transition hover:bg-emerald-500"
                        >
                            Actualizar datos
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                loadReports()
                                setReportsOpen(true)
                            }}
                            className={`rounded-2xl border-2 px-5 py-2.5 text-sm font-extrabold transition ${
                                darkMode
                                    ? 'border-white/20 text-white hover:bg-white/10'
                                    : 'border-emerald-300 text-emerald-900 hover:bg-emerald-100/60'
                            }`}
                        >
                            Informe de ganancias
                        </button>
                    </div>
                </div>
            </div>

            {error ? (
                <div className="rounded-2xl border border-red-300/60 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                    {error}
                </div>
            ) : null}

            <div className={shell}>
                <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Vista mensual</p>
                        <h2 className={`mt-1 text-xl font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {loading ? 'Cargando…' : data?.labels?.title || 'Mes en curso'}
                        </h2>
                        {data?.labels?.note ? <p className={`mt-2 max-w-3xl text-xs leading-relaxed sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{data.labels.note}</p> : null}
                    </div>
                    {totals ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:text-right">
                            <div className={`rounded-xl px-4 py-2 ${darkMode ? 'bg-black/25 ring-1 ring-white/10' : 'bg-white/80 ring-1 ring-emerald-100'}`}>
                                <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Neto USD ~</p>
                                <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">${money(totals.net_approx_usd)}</p>
                            </div>
                            <div className={`rounded-xl px-4 py-2 ${darkMode ? 'bg-black/25 ring-1 ring-white/10' : 'bg-white/80 ring-1 ring-emerald-100'}`}>
                                <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Neto MXN ~</p>
                                <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">${money(totals.net_approx_mxn)}</p>
                            </div>
                            <div className={`rounded-xl px-4 py-2 ${darkMode ? 'bg-black/25 ring-1 ring-white/10' : 'bg-white/80 ring-1 ring-amber-100'}`}>
                                <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Comisiones est.</p>
                                <p className="text-lg font-black text-amber-700 dark:text-amber-300">${money(totals.processor_fees_estimate)}</p>
                            </div>
                        </div>
                    ) : null}
                </div>
                <div className="p-5 sm:p-7">
                    <MethodsTable rows={methods} darkMode={darkMode} loading={loading} />
                    {data?.fx_note ? (
                        <p className={`mt-4 text-center text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{data.fx_note}</p>
                    ) : null}
                </div>
            </div>

            <div
                className={`rounded-2xl border px-5 py-4 text-sm ${
                    darkMode ? 'border-sky-500/20 bg-sky-950/30 text-sky-100/90' : 'border-sky-200 bg-sky-50 text-sky-950'
                }`}
            >
                <p className="font-bold">Cierre automático (sin cron)</p>
                <p className="mt-1 text-xs opacity-90">
                    Los informes de meses ya terminados se rellenan en la base de datos en cuanto el servidor atiende ciertas peticiones normales de la app. Si en
                    algún momento no hubiera tráfico durante mucho tiempo, basta con entrar aquí o usar la app con usuarios logueados; solo en casos excepcionales
                    podrías ejecutar a mano <code className="rounded bg-black/20 px-1.5 py-0.5 text-[11px]">php artisan plan:archive-monthly-revenue</code>.
                </p>
            </div>

            {reportsOpen ? (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal>
                    <div
                        className={`max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[1.5rem] border shadow-2xl ${
                            darkMode ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white'
                        }`}
                    >
                        <div className={`flex items-center justify-between gap-3 border-b px-6 py-4 ${darkMode ? 'border-white/10 bg-emerald-950/40' : 'border-emerald-100 bg-emerald-50/80'}`}>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Histórico</p>
                                <h3 className={`text-lg font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Informe de ganancias por mes</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReportsOpen(false)}
                                className={`rounded-xl border px-4 py-2 text-sm font-bold ${darkMode ? 'border-white/20 text-white hover:bg-white/10' : 'border-slate-300 text-slate-800 hover:bg-slate-100'}`}
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className="max-h-[calc(90vh-5rem)] overflow-y-auto p-5 sm:p-6">
                            {reports.length === 0 ? (
                                <p className={`py-12 text-center text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Aún no hay meses cerrados archivados. Aparecerán al terminar el primer mes con movimientos.
                                </p>
                            ) : (
                                <div className="space-y-6">
                                    {reports.map((r) => {
                                        const p = r.payload || {}
                                        const m = Array.isArray(p.methods) ? p.methods : []
                                        const t = p.totals || {}
                                        return (
                                            <div
                                                key={`${r.year}-${r.month}`}
                                                className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-white/10 bg-slate-950/50' : 'border-slate-200 bg-slate-50/80'}`}
                                            >
                                                <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${darkMode ? 'bg-white/[0.04]' : 'bg-white'}`}>
                                                    <p className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                        {r.year}-{String(r.month).padStart(2, '0')}
                                                    </p>
                                                    <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                                        Registrado {r.created_at ? new Date(r.created_at).toLocaleString('es-MX') : '—'}
                                                    </p>
                                                </div>
                                                <div className="p-4">
                                                    <MethodsTable rows={m} darkMode={darkMode} loading={false} />
                                                    {t && Object.keys(t).length ? (
                                                        <p className={`mt-3 text-center text-xs font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>
                                                            Totales: USD ${money(t.net_approx_usd)} · MXN ${money(t.net_approx_mxn)} · Comisiones ${money(t.processor_fees_estimate)}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
