'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAdminTheme } from '@/contexts/AdminThemeContext'
import { useVentasInboxPendientes } from '@/hooks/useVentasInboxPendientes'
import { fetchCalendarioTareas } from '@/lib/ventasCalendarioApi'
import { formatTareaVence, tasksForToday, tasksOverdue, tasksThisWeek } from '@/lib/ventasCalendarioTareas'
import { fetchVentasPipelineList, fetchVentasPipelineResumen } from '@/lib/ventasPipelineApi'
import { fetchVentasReportesResumen } from '@/lib/ventasReportesApi'

const moneyFmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

function fmtMoney(n) {
    return moneyFmt.format(Number(n || 0))
}

function diffLabel(current, previous, suffix = '') {
    const c = Number(current || 0)
    const p = Number(previous || 0)
    if (!p && !c) return `Sin cambio${suffix}`
    if (!p) return `Nuevo periodo${suffix}`
    const pct = ((c - p) / p) * 100
    const sign = pct >= 0 ? '+' : ''
    return `${sign}${pct.toFixed(0)}% vs. mes anterior${suffix}`
}

const ETAPA_LABEL = {
    nuevo: 'Nuevo',
    contactado: 'Contactado',
    seguimiento: 'Seguimiento',
    negociacion: 'Negociación',
    ganado: 'Ganado',
    perdido: 'Perdido',
}

const ETAPA_DOT = {
    nuevo: 'bg-violet-400',
    contactado: 'bg-sky-400',
    seguimiento: 'bg-amber-400',
    negociacion: 'bg-orange-400',
    ganado: 'bg-emerald-400',
    perdido: 'bg-rose-400',
}

const QUICK_LINKS = [
    { href: '/ventas-inbox', label: 'Bandeja', desc: 'Chat con clientes' },
    { href: '/ventas-pipeline', label: 'Pipeline', desc: 'Mover oportunidades' },
    { href: '/ventas-tareas', label: 'Pendientes', desc: 'Tareas del día' },
    { href: '/ventas-cotizaciones', label: 'Cotizaciones', desc: 'Crear y editar' },
    { href: '/ventas-pedidos', label: 'Pedidos', desc: 'Seguimiento de ventas' },
    { href: '/ventas-reportes', label: 'Reportes', desc: 'KPIs del periodo' },
]

export default function VentasDashboardPage() {
    const { darkMode } = useAdminTheme()
    const { count: inboxPendientes } = useVentasInboxPendientes()
    const [loading, setLoading] = useState(true)
    const [pipeline, setPipeline] = useState(null)
    const [reportes, setReportes] = useState(null)
    const [recientes, setRecientes] = useState([])
    const [tareas, setTareas] = useState([])

    const panel = darkMode
        ? 'rounded-2xl border border-violet-900/40 bg-[#1a1628]/90 shadow-lg shadow-black/20'
        : 'rounded-2xl border border-violet-100 bg-white shadow-md shadow-violet-900/5'

    useEffect(() => {
        let mounted = true
        setLoading(true)
        Promise.all([
            fetchVentasPipelineResumen({ preview: 1 }),
            fetchVentasReportesResumen({ period: 'mes' }),
            fetchVentasPipelineList({ per_page: 5, page: 1 }),
            fetchCalendarioTareas().catch(() => []),
        ])
            .then(([pipe, rep, list, tareasRaw]) => {
                if (!mounted) return
                setPipeline(pipe)
                setReportes(rep)
                setRecientes(list.items || [])
                setTareas(tareasRaw)
            })
            .finally(() => {
                if (mounted) setLoading(false)
            })
        return () => {
            mounted = false
        }
    }, [])

    const totales = pipeline?.totales || {}
    const etapas = pipeline?.etapas || []
    const kpi = reportes?.kpis?.current || {}
    const kpiPrev = reportes?.kpis?.previous || {}

    const abiertas = useMemo(() => {
        return etapas
            .filter((e) => !['ganado', 'perdido'].includes(e.etapa))
            .reduce((s, e) => s + (e.count || 0), 0)
    }, [etapas])

    const embudo = useMemo(() => {
        const activas = etapas.filter((e) => !['ganado', 'perdido'].includes(e.etapa))
        const maxMonto = Math.max(...activas.map((e) => e.monto || 0), 1)
        return activas.map((e) => ({
            key: e.etapa,
            label: ETAPA_LABEL[e.etapa] || e.label || e.etapa,
            monto: e.monto || 0,
            count: e.count || 0,
            pct: Math.round(((e.monto || 0) / maxMonto) * 100),
            dot: ETAPA_DOT[e.etapa] || 'bg-violet-400',
        }))
    }, [etapas])

    const tareasHoy = useMemo(() => tasksForToday(tareas).slice(0, 4), [tareas])
    const tareasSemana = useMemo(() => tasksThisWeek(tareas).slice(0, 6), [tareas])
    const tareasVencidas = useMemo(() => tasksOverdue(tareas).length, [tareas])

    const origenCotizaciones = useMemo(() => {
        const crm = Number(kpi.cotizaciones_ventas || 0)
        const tienda = Number(kpi.cotizaciones_tienda || 0)
        const total = crm + tienda || 1
        return [
            { label: 'Cotizaciones CRM', pct: Math.round((crm / total) * 100), count: crm, color: 'bg-violet-500' },
            { label: 'Cotizaciones tienda', pct: Math.round((tienda / total) * 100), count: tienda, color: 'bg-fuchsia-400' },
        ]
    }, [kpi])

    const cards = [
        {
            label: 'Pipeline activo',
            value: fmtMoney(totales.monto_pipeline),
            sub: `${abiertas} oportunidades abiertas`,
            tone: 'from-violet-600 to-indigo-500',
            href: '/ventas-pipeline',
        },
        {
            label: 'Cotizaciones del mes',
            value: String(kpi.cotizaciones_ventas ?? 0),
            sub: diffLabel(kpi.cotizaciones_ventas, kpiPrev.cotizaciones_ventas),
            tone: 'from-fuchsia-500 to-violet-600',
            href: '/ventas-cotizaciones',
        },
        {
            label: 'Mensajes sin contestar',
            value: String(inboxPendientes || 0),
            sub: inboxPendientes > 0 ? 'Revisar bandeja' : 'Bandeja al día',
            tone: 'from-rose-500 to-violet-600',
            href: '/ventas-inbox',
            alert: inboxPendientes > 0,
        },
        {
            label: 'Pedidos vinculados',
            value: String(kpi.pedidos ?? 0),
            sub: `Ticket ${fmtMoney(kpi.ticket_promedio)} · cierre ${Number(kpi.tasa_cierre_pct || 0).toFixed(0)}%`,
            tone: 'from-indigo-500 to-violet-600',
            href: '/ventas-pedidos',
        },
    ]

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-violet-950'}`}>Resumen comercial</h1>
                    <p className={`mt-1 text-sm ${darkMode ? 'text-violet-200/60' : 'text-violet-800/70'}`}>Cargando tu panel…</p>
                </div>
                <div className={`${panel} p-10 text-center text-sm ${darkMode ? 'text-violet-300/70' : 'text-violet-600'}`}>
                    Obteniendo datos de pipeline, reportes y tareas…
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-violet-950'}`}>
                        Resumen comercial
                    </h1>
                    <p className={`mt-1 text-sm ${darkMode ? 'text-violet-200/60' : 'text-violet-800/70'}`}>
                        Tu día en un vistazo: pipeline, mensajes, cotizaciones y pendientes.
                    </p>
                </div>
                {(totales.vencidas > 0 || tareasVencidas > 0) && (
                    <div
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                            darkMode ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-100 text-rose-700'
                        }`}
                    >
                        {totales.vencidas > 0 ? `${totales.vencidas} seguimiento(s) vencido(s)` : ''}
                        {totales.vencidas > 0 && tareasVencidas > 0 ? ' · ' : ''}
                        {tareasVencidas > 0 ? `${tareasVencidas} tarea(s) atrasada(s)` : ''}
                    </div>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((k) => (
                    <Link
                        key={k.label}
                        href={k.href}
                        className={`${panel} group block overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${
                            k.alert ? (darkMode ? 'ring-1 ring-rose-500/40' : 'ring-1 ring-rose-200') : ''
                        }`}
                    >
                        <div className={`mb-4 h-1 w-full rounded-full bg-gradient-to-r ${k.tone}`} />
                        <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-violet-300/80' : 'text-violet-600/80'}`}>
                            {k.label}
                        </p>
                        <p className={`mt-1 text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{k.value}</p>
                        <p className={`mt-2 text-xs ${darkMode ? 'text-violet-400/70' : 'text-gray-500'}`}>{k.sub}</p>
                        <p className="mt-3 text-xs font-semibold text-violet-600 opacity-0 transition group-hover:opacity-100 dark:text-violet-300">
                            Ir a {k.label.split(' ')[0]} →
                        </p>
                    </Link>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className={`${panel} p-5 lg:col-span-2`}>
                    <div className="mb-4 flex items-center justify-between gap-2">
                        <h2 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Embudo activo</h2>
                        <Link href="/ventas-pipeline" className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-300">
                            Ver pipeline
                        </Link>
                    </div>
                    {embudo.length === 0 ? (
                        <p className={`text-sm ${darkMode ? 'text-violet-300/70' : 'text-gray-500'}`}>Aún no hay oportunidades en el embudo.</p>
                    ) : (
                        <div className="space-y-3">
                            {embudo.map((s) => (
                                <div key={s.key}>
                                    <div className="mb-1 flex justify-between text-xs">
                                        <span className={`flex items-center gap-2 ${darkMode ? 'text-violet-200/80' : 'text-gray-600'}`}>
                                            <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                                            {s.label}
                                            <span className={darkMode ? 'text-violet-400/60' : 'text-gray-400'}>({s.count})</span>
                                        </span>
                                        <span className={`font-semibold ${darkMode ? 'text-violet-200' : 'text-violet-800'}`}>{fmtMoney(s.monto)}</span>
                                    </div>
                                    <div className={`h-2.5 overflow-hidden rounded-full ${darkMode ? 'bg-violet-950/60' : 'bg-violet-100'}`}>
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-[#5b4d7a] to-[#9b8ac8] transition-all"
                                            style={{ width: `${Math.max(8, s.pct)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={`${panel} p-5`}>
                    <h2 className={`mb-4 font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Cotizaciones del mes</h2>
                    <div className="flex flex-col items-center gap-4">
                        <div
                            className={`relative flex h-36 w-36 items-center justify-center rounded-full border-[10px] ${
                                darkMode ? 'border-violet-800' : 'border-violet-200'
                            }`}
                        >
                            <div className="text-center">
                                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-violet-900'}`}>
                                    {(kpi.cotizaciones_ventas || 0) + (kpi.cotizaciones_tienda || 0)}
                                </p>
                                <p className={`text-[10px] ${darkMode ? 'text-violet-400' : 'text-gray-500'}`}>Total</p>
                            </div>
                        </div>
                        <ul className="w-full space-y-2 text-xs">
                            {origenCotizaciones.map((o) => (
                                <li key={o.label} className="flex items-center justify-between">
                                    <span className={`flex items-center gap-2 ${darkMode ? 'text-violet-200/80' : 'text-gray-600'}`}>
                                        <span className={`h-2 w-2 rounded-full ${o.color}`} />
                                        {o.label}
                                    </span>
                                    <span className={`font-semibold ${darkMode ? 'text-violet-100' : 'text-violet-900'}`}>
                                        {o.count} ({o.pct}%)
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <p className={`text-center text-xs ${darkMode ? 'text-violet-400/70' : 'text-gray-500'}`}>
                            Monto cotizado: {fmtMoney(kpi.monto_cotizado)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className={`${panel} p-5`}>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Oportunidades recientes</h2>
                        <Link href="/ventas-pipeline" className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-300">
                            Ver todas
                        </Link>
                    </div>
                    {recientes.length === 0 ? (
                        <p className={`text-sm ${darkMode ? 'text-violet-300/70' : 'text-gray-500'}`}>Sin cotizaciones recientes.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className={`border-b text-left text-xs ${darkMode ? 'border-violet-900/40 text-violet-300/60' : 'border-violet-100 text-gray-500'}`}>
                                    <th className="pb-2">Oportunidad</th>
                                    <th className="pb-2">Cliente</th>
                                    <th className="pb-2">Etapa</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? 'divide-violet-900/30' : 'divide-violet-50'}`}>
                                {recientes.map((r) => (
                                    <tr key={r.id}>
                                        <td className="py-2.5">
                                            <p className={`font-medium ${darkMode ? 'text-violet-100' : 'text-violet-900'}`}>{r.titulo}</p>
                                            <p className={`text-xs ${darkMode ? 'text-violet-400' : 'text-gray-500'}`}>{fmtMoney(r.monto)}</p>
                                        </td>
                                        <td className={`py-2.5 ${darkMode ? 'text-violet-200/80' : 'text-gray-600'}`}>{r.cliente}</td>
                                        <td className="py-2.5">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    darkMode ? 'bg-violet-600/25 text-violet-100' : 'bg-violet-100 text-violet-800'
                                                }`}
                                            >
                                                <span className={`h-1.5 w-1.5 rounded-full ${ETAPA_DOT[r.pipeline_etapa] || 'bg-violet-400'}`} />
                                                {r.pipeline_etapa_label || ETAPA_LABEL[r.pipeline_etapa]}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className={`${panel} p-5`}>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Agenda de la semana</h2>
                        <Link href="/ventas-calendario" className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-300">
                            Calendario
                        </Link>
                    </div>
                    {tareasHoy.length > 0 ? (
                        <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-violet-300/80' : 'text-violet-600'}`}>
                            Hoy ({tareasHoy.length})
                        </p>
                    ) : null}
                    <ul className="space-y-2 text-sm">
                        {(tareasHoy.length ? tareasHoy : tareasSemana).slice(0, 5).map((t) => (
                            <li
                                key={t.id}
                                className={`flex gap-3 rounded-xl border px-3 py-2.5 ${
                                    darkMode ? 'border-violet-900/40 bg-[#12101a]/60' : 'border-violet-50 bg-violet-50/50'
                                }`}
                            >
                                <span className={`w-20 shrink-0 text-xs font-bold ${darkMode ? 'text-violet-300' : 'text-violet-600'}`}>
                                    {formatTareaVence(t)}
                                </span>
                                <p className={`min-w-0 flex-1 font-medium ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{t.text}</p>
                            </li>
                        ))}
                        {tareasSemana.length === 0 && tareasHoy.length === 0 ? (
                            <li className={`py-4 text-center text-sm ${darkMode ? 'text-violet-300/70' : 'text-gray-500'}`}>
                                No hay tareas esta semana.{' '}
                                <Link href="/ventas-tareas" className="font-semibold text-violet-600 hover:underline dark:text-violet-300">
                                    Crear pendiente
                                </Link>
                            </li>
                        ) : null}
                    </ul>
                </div>
            </div>

            <div className={`${panel} p-5`}>
                <h2 className={`mb-4 font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Accesos rápidos</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {QUICK_LINKS.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className={`rounded-xl border px-4 py-3 transition hover:-translate-y-0.5 ${
                                darkMode
                                    ? 'border-violet-800/50 bg-[#12101a]/50 hover:border-violet-600/60 hover:bg-violet-900/20'
                                    : 'border-violet-100 bg-violet-50/40 hover:border-violet-300 hover:bg-violet-50'
                            }`}
                        >
                            <p className={`font-semibold ${darkMode ? 'text-violet-100' : 'text-violet-900'}`}>{l.label}</p>
                            <p className={`mt-0.5 text-xs ${darkMode ? 'text-violet-400/70' : 'text-gray-500'}`}>{l.desc}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
