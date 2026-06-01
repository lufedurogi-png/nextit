'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import SwitchToggle from '@/components/SwitchToggle'
import VentasCorreosHistorialPaginacion from '@/components/ventas/VentasCorreosHistorialPaginacion'
import VentasFancySelect from '@/components/ventas/VentasFancySelect'
import { useAdminTheme } from '@/contexts/AdminThemeContext'
import { useDebounce } from '@/hooks/useDebounce'
import {
    fetchVentasPipelineList,
    fetchVentasPipelineResumen,
    updateVentasPipeline,
} from '@/lib/ventasPipelineApi'

const ETAPAS = [
    { key: 'nuevo', label: 'Nuevo' },
    { key: 'contactado', label: 'Contactado' },
    { key: 'seguimiento', label: 'Seguimiento' },
    { key: 'negociacion', label: 'Negociación' },
    { key: 'ganado', label: 'Ganado' },
    { key: 'perdido', label: 'Perdido' },
]

const ETAPA_DOT = {
    nuevo: 'bg-violet-400',
    contactado: 'bg-sky-400',
    seguimiento: 'bg-amber-400',
    negociacion: 'bg-orange-400',
    ganado: 'bg-emerald-400',
    perdido: 'bg-rose-400',
}

const ETAPA_COLUMN = {
    nuevo: 'from-violet-500/15 to-transparent border-violet-300/40 dark:border-violet-700/50',
    contactado: 'from-sky-500/15 to-transparent border-sky-300/40 dark:border-sky-800/50',
    seguimiento: 'from-amber-500/15 to-transparent border-amber-300/40 dark:border-amber-800/50',
    negociacion: 'from-orange-500/15 to-transparent border-orange-300/40 dark:border-orange-800/50',
    ganado: 'from-emerald-500/15 to-transparent border-emerald-300/40 dark:border-emerald-800/50',
    perdido: 'from-rose-500/15 to-transparent border-rose-300/40 dark:border-rose-800/50',
}

const PRIORIDAD_DOT = { alta: 'bg-rose-400', media: 'bg-amber-400', baja: 'bg-emerald-400' }

const moneyFmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 })

function fmtMoney(n) {
    return moneyFmt.format(Number(n || 0))
}

function etapaOptions(includeAll = false) {
    const base = ETAPAS.map((e) => ({
        value: e.key,
        label: e.label,
        dotClass: ETAPA_DOT[e.key],
    }))
    if (!includeAll) return base
    return [{ value: '', label: 'Todas las etapas', dotClass: 'bg-violet-300' }, ...base]
}

function prioridadOptions(includeAll = false) {
    const base = [
        { value: 'alta', label: 'Alta', dotClass: PRIORIDAD_DOT.alta },
        { value: 'media', label: 'Media', dotClass: PRIORIDAD_DOT.media },
        { value: 'baja', label: 'Baja', dotClass: PRIORIDAD_DOT.baja },
    ]
    if (!includeAll) return base
    return [{ value: '', label: 'Todas las prioridades', dotClass: 'bg-violet-300' }, ...base]
}

export default function VentasPipelinePage() {
    const { darkMode } = useAdminTheme()
    const [resumen, setResumen] = useState(null)
    const [items, setItems] = useState([])
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 })
    const [loading, setLoading] = useState(true)
    const [loadingTable, setLoadingTable] = useState(true)
    const [error, setError] = useState('')
    const [q, setQ] = useState('')
    const [etapa, setEtapa] = useState('')
    const [prioridad, setPrioridad] = useState('')
    const [soloVencidas, setSoloVencidas] = useState(false)
    const [page, setPage] = useState(1)
    const [savingId, setSavingId] = useState(null)
    const [motivoModal, setMotivoModal] = useState(null)
    const debouncedQ = useDebounce(q, 400)

    const panel = darkMode
        ? 'rounded-2xl border border-violet-900/40 bg-[#1a1628]/90 shadow-lg shadow-black/20'
        : 'rounded-2xl border border-violet-100 bg-white shadow-md shadow-violet-900/5'

    const inputCls = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-violet-500/35 ${
        darkMode
            ? 'border-violet-800/60 bg-[#12101a]/90 text-white placeholder:text-violet-400/50'
            : 'border-violet-200 bg-white text-gray-900 placeholder:text-violet-400/70'
    }`

    const loadResumen = useCallback(async () => {
        try {
            setResumen(await fetchVentasPipelineResumen({ preview: 5 }))
        } catch {
            //
        }
    }, [])

    const loadTable = useCallback(async () => {
        setLoadingTable(true)
        setError('')
        try {
            const { items: rows, meta: m } = await fetchVentasPipelineList({
                q: debouncedQ || undefined,
                etapa: etapa || undefined,
                prioridad: prioridad || undefined,
                vencidas: soloVencidas ? 1 : undefined,
                page,
                per_page: 10,
            })
            setItems(rows)
            setMeta(m)
        } catch {
            setError('No fue posible cargar el pipeline.')
        } finally {
            setLoadingTable(false)
        }
    }, [debouncedQ, etapa, prioridad, soloVencidas, page])

    useEffect(() => {
        setLoading(true)
        loadResumen().finally(() => setLoading(false))
    }, [loadResumen])

    useEffect(() => {
        loadTable()
    }, [loadTable])

    useEffect(() => {
        setPage(1)
    }, [debouncedQ, etapa, prioridad, soloVencidas])

    const refreshAll = async () => {
        await Promise.all([loadResumen(), loadTable()])
    }

    const applyEtapa = async (id, nuevaEtapa, motivo = '') => {
        if (nuevaEtapa === 'perdido' && !motivo.trim()) {
            setMotivoModal({ id, etapa: nuevaEtapa })
            return
        }
        setSavingId(id)
        try {
            await updateVentasPipeline(id, {
                pipeline_etapa: nuevaEtapa,
                ...(nuevaEtapa === 'perdido' ? { pipeline_motivo_perdida: motivo.trim() } : {}),
            })
            setMotivoModal(null)
            await refreshAll()
        } catch (e) {
            alert(e?.response?.data?.message || 'No se pudo actualizar la etapa.')
        } finally {
            setSavingId(null)
        }
    }

    const applyPrioridad = async (id, nuevaPrioridad) => {
        setSavingId(id)
        try {
            await updateVentasPipeline(id, { pipeline_prioridad: nuevaPrioridad })
            await refreshAll()
        } catch {
            alert('No se pudo actualizar la prioridad.')
        } finally {
            setSavingId(null)
        }
    }

    const etapasMap = useMemo(
        () => Object.fromEntries((resumen?.etapas || []).map((e) => [e.etapa, e])),
        [resumen],
    )
    const totales = resumen?.totales || {}

    const kpiCards = [
        { label: 'Oportunidades', value: totales.oportunidades ?? 0, sub: 'en tu cartera' },
        { label: 'Monto pipeline', value: fmtMoney(totales.monto_pipeline), sub: 'sin perdidas' },
        { label: 'Seguimientos vencidos', value: totales.vencidas ?? 0, sub: 'requieren acción', alert: (totales.vencidas ?? 0) > 0 },
    ]

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-violet-950'}`}>
                        Pipeline comercial
                    </h1>
                    <p className={`mt-1 text-sm ${darkMode ? 'text-violet-200/60' : 'text-violet-800/70'}`}>
                        Gestiona oportunidades desde cotización hasta cierre.
                    </p>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                {kpiCards.map((k) => (
                    <div
                        key={k.label}
                        className={`${panel} p-4 ${k.alert ? (darkMode ? 'ring-1 ring-rose-500/40' : 'ring-1 ring-rose-200') : ''}`}
                    >
                        <p className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-violet-300/70' : 'text-violet-600/90'}`}>
                            {k.label}
                        </p>
                        <p className={`mt-1 text-2xl font-bold ${k.alert ? 'text-rose-500' : darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {k.value}
                        </p>
                        <p className={`mt-0.5 text-xs ${darkMode ? 'text-violet-400/70' : 'text-gray-500'}`}>{k.sub}</p>
                    </div>
                ))}
            </div>

            <div className={`${panel} p-4`}>
                <p className={`mb-3 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-violet-300/80' : 'text-violet-700'}`}>
                    Filtros
                </p>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="md:col-span-2 xl:col-span-2">
                        <label className={`mb-1.5 block text-[11px] font-semibold uppercase tracking-wide ${darkMode ? 'text-violet-300/70' : 'text-violet-600/90'}`}>
                            Buscar
                        </label>
                        <div className="relative">
                            <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-violet-400' : 'text-violet-500'}`}>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
                                </svg>
                            </span>
                            <input
                                type="search"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Folio, cliente o comentario…"
                                className={`${inputCls} pl-10`}
                            />
                        </div>
                    </div>
                    <VentasFancySelect
                        label="Etapa"
                        value={etapa}
                        onChange={setEtapa}
                        options={etapaOptions(true)}
                        darkMode={darkMode}
                    />
                    <VentasFancySelect
                        label="Prioridad"
                        value={prioridad}
                        onChange={setPrioridad}
                        options={prioridadOptions(true)}
                        darkMode={darkMode}
                    />
                </div>
                <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 ${darkMode ? 'border-violet-900/40' : 'border-violet-100'}`}>
                    <div className="flex items-center gap-3">
                        <SwitchToggle
                            checked={soloVencidas}
                            onChange={setSoloVencidas}
                            darkMode={darkMode}
                            aria-label="Solo vencidas"
                        />
                        <span className={`text-sm font-medium ${darkMode ? 'text-violet-100' : 'text-violet-900'}`}>Solo vencidas</span>
                    </div>
                    {(etapa || prioridad || q || soloVencidas) && (
                        <button
                            type="button"
                            onClick={() => {
                                setQ('')
                                setEtapa('')
                                setPrioridad('')
                                setSoloVencidas(false)
                            }}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                darkMode ? 'bg-violet-900/50 text-violet-200 hover:bg-violet-800/60' : 'bg-violet-100 text-violet-800 hover:bg-violet-200'
                            }`}
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className={`${panel} p-8 text-center text-sm ${darkMode ? 'text-violet-300/70' : 'text-violet-600'}`}>
                    Cargando embudo…
                </div>
            ) : (
                <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory">
                    {ETAPAS.map((st) => {
                        const block = etapasMap[st.key] || { count: 0, monto: 0, items: [] }
                        const active = etapa === st.key
                        const colAccent = ETAPA_COLUMN[st.key] || ETAPA_COLUMN.nuevo
                        return (
                            <div
                                key={st.key}
                                className={`flex min-h-[380px] w-[min(100%,260px)] shrink-0 snap-start flex-col rounded-2xl border bg-gradient-to-b ${colAccent} ${
                                    active ? 'ring-2 ring-violet-500/50' : ''
                                } ${darkMode ? 'bg-[#1a1628]/70' : 'bg-violet-50/40'}`}
                            >
                                <button
                                    type="button"
                                    onClick={() => setEtapa(active ? '' : st.key)}
                                    className={`sticky top-0 z-10 rounded-t-2xl border-b px-3 py-3 text-left backdrop-blur-sm ${
                                        darkMode ? 'border-violet-900/50 bg-[#1f1930]/90' : 'border-violet-200/80 bg-white/80'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`h-2.5 w-2.5 rounded-full ${ETAPA_DOT[st.key]}`} />
                                        <h2 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{st.label}</h2>
                                    </div>
                                    <p className={`mt-1 text-xs font-medium ${darkMode ? 'text-violet-300/80' : 'text-violet-700/90'}`}>
                                        {fmtMoney(block.monto)} · {block.count} opp.
                                    </p>
                                </button>
                                <div className="flex flex-1 flex-col gap-2 p-2">
                                    {(block.items || []).map((it) => (
                                        <div
                                            key={it.id}
                                            className={`group rounded-xl border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                                                darkMode
                                                    ? 'border-violet-800/50 bg-[#221c36] hover:border-violet-600/60'
                                                    : 'border-violet-100 bg-white hover:border-violet-300'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm font-medium leading-snug ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    {it.titulo}
                                                </p>
                                                <span
                                                    className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${PRIORIDAD_DOT[it.pipeline_prioridad] || PRIORIDAD_DOT.media}`}
                                                />
                                            </div>
                                            <p className={`mt-1 truncate text-xs ${darkMode ? 'text-violet-300/60' : 'text-gray-500'}`}>{it.cliente}</p>
                                            <p className="mt-2 text-xs font-bold text-violet-600 dark:text-violet-300">{fmtMoney(it.monto)}</p>
                                            {it.vencida ? (
                                                <span className="mt-2 inline-block rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-500">
                                                    Vencida
                                                </span>
                                            ) : null}
                                        </div>
                                    ))}
                                    {block.count > (block.items?.length || 0) ? (
                                        <button
                                            type="button"
                                            onClick={() => setEtapa(st.key)}
                                            className={`rounded-xl border border-dashed py-2.5 text-xs font-semibold transition ${
                                                darkMode
                                                    ? 'border-violet-700 text-violet-300 hover:bg-violet-900/30'
                                                    : 'border-violet-300 text-violet-700 hover:bg-violet-100/80'
                                            }`}
                                        >
                                            Ver todas ({block.count})
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <div className={`${panel} overflow-hidden`}>
                <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 ${darkMode ? 'border-violet-900/40 bg-violet-950/20' : 'border-violet-100 bg-violet-50/50'}`}>
                    <h2 className={`text-sm font-semibold uppercase tracking-wide ${darkMode ? 'text-violet-200' : 'text-violet-900'}`}>
                        Tabla operativa
                    </h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${darkMode ? 'bg-violet-900/60 text-violet-200' : 'bg-violet-100 text-violet-800'}`}>
                        {meta.total ?? 0} registros
                    </span>
                </div>

                <div className="p-4">
                    {error ? <p className="mb-3 text-sm text-rose-500">{error}</p> : null}
                    {loadingTable ? (
                        <p className={`py-8 text-center text-sm ${darkMode ? 'text-violet-300/70' : 'text-gray-500'}`}>Cargando oportunidades…</p>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-xl border border-violet-100 dark:border-violet-900/40">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className={darkMode ? 'bg-violet-950/40 text-violet-200/90' : 'bg-violet-50 text-violet-900'}>
                                            {['Oportunidad', 'Cliente', 'Monto', 'Etapa', 'Prioridad', 'Próximo contacto', 'Acciones'].map((h) => (
                                                <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className={`px-3 py-10 text-center ${darkMode ? 'text-violet-300/70' : 'text-gray-500'}`}>
                                                    Sin oportunidades con estos filtros.
                                                </td>
                                            </tr>
                                        ) : (
                                            items.map((row) => (
                                                <tr
                                                    key={row.id}
                                                    className={`border-t transition ${
                                                        darkMode
                                                            ? 'border-violet-900/30 hover:bg-violet-900/20'
                                                            : 'border-violet-50 hover:bg-violet-50/60'
                                                    } ${row.vencida ? (darkMode ? 'bg-rose-950/20' : 'bg-rose-50/40') : ''}`}
                                                >
                                                    <td className="px-3 py-3">
                                                        <p className="font-medium">{row.titulo}</p>
                                                        <p className={`text-xs ${darkMode ? 'text-violet-400' : 'text-gray-500'}`}>{row.folio}</p>
                                                        {row.vencida ? (
                                                            <span className="mt-1 inline-block rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-500">
                                                                Vencida
                                                            </span>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <p>{row.cliente}</p>
                                                        <p className={`text-xs ${darkMode ? 'text-violet-400' : 'text-gray-500'}`}>{row.email || '—'}</p>
                                                    </td>
                                                    <td className="px-3 py-3 font-bold text-violet-700 dark:text-violet-300">{fmtMoney(row.monto)}</td>
                                                    <td className="px-3 py-3">
                                                        <VentasFancySelect
                                                            compact
                                                            value={row.pipeline_etapa}
                                                            disabled={savingId === row.id}
                                                            onChange={(v) => applyEtapa(row.id, v)}
                                                            options={etapaOptions(false)}
                                                            darkMode={darkMode}
                                                            className="min-w-[9.5rem]"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <VentasFancySelect
                                                            compact
                                                            value={row.pipeline_prioridad}
                                                            disabled={savingId === row.id}
                                                            onChange={(v) => applyPrioridad(row.id, v)}
                                                            options={prioridadOptions(false)}
                                                            darkMode={darkMode}
                                                            className="min-w-[7.5rem]"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <input
                                                            type="datetime-local"
                                                            className={`${inputCls} min-w-[11rem] py-1.5 text-xs`}
                                                            defaultValue={
                                                                row.pipeline_fecha_proximo_contacto
                                                                    ? row.pipeline_fecha_proximo_contacto.slice(0, 16)
                                                                    : ''
                                                            }
                                                            onBlur={async (e) => {
                                                                const v = e.target.value
                                                                setSavingId(row.id)
                                                                try {
                                                                    await updateVentasPipeline(row.id, {
                                                                        pipeline_fecha_proximo_contacto: v ? new Date(v).toISOString() : null,
                                                                    })
                                                                    await refreshAll()
                                                                } catch {
                                                                    alert('No se pudo guardar la fecha.')
                                                                } finally {
                                                                    setSavingId(null)
                                                                }
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {row.cliente_user_id ? (
                                                                <Link
                                                                    href={`/ventas-inbox?cliente=${row.cliente_user_id}`}
                                                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                                                        darkMode
                                                                            ? 'bg-violet-800/50 text-violet-100 hover:bg-violet-700/60'
                                                                            : 'bg-violet-100 text-violet-800 hover:bg-violet-200'
                                                                    }`}
                                                                >
                                                                    Chat
                                                                </Link>
                                                            ) : null}
                                                            <Link
                                                                href="/ventas-cotizaciones"
                                                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                                                    darkMode
                                                                        ? 'bg-violet-800/50 text-violet-100 hover:bg-violet-700/60'
                                                                        : 'bg-violet-100 text-violet-800 hover:bg-violet-200'
                                                                }`}
                                                            >
                                                                Cotizaciones
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <VentasCorreosHistorialPaginacion
                                darkMode={darkMode}
                                currentPage={meta.current_page || page}
                                lastPage={meta.last_page || 1}
                                onPageChange={setPage}
                                compact
                            />
                        </>
                    )}
                </div>
            </div>

            {motivoModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${darkMode ? 'border-violet-800 bg-[#1a1628]' : 'border-violet-100 bg-white'}`}>
                        <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Motivo de pérdida</h3>
                        <p className={`mt-1 text-sm ${darkMode ? 'text-violet-300/70' : 'text-gray-500'}`}>
                            Obligatorio para mover la oportunidad a <strong>Perdido</strong>.
                        </p>
                        <input
                            type="text"
                            className={`${inputCls} mt-4`}
                            placeholder="Ej. Precio, competencia, sin respuesta…"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    applyEtapa(motivoModal.id, motivoModal.etapa, e.currentTarget.value)
                                }
                            }}
                            id="motivo-perdida-input"
                        />
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setMotivoModal(null)}
                                className={`rounded-xl px-4 py-2 text-sm font-medium ${darkMode ? 'text-violet-200 hover:bg-violet-900/40' : 'text-violet-800 hover:bg-violet-50'}`}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/20 hover:bg-violet-500"
                                onClick={() => {
                                    const el = document.getElementById('motivo-perdida-input')
                                    applyEtapa(motivoModal.id, motivoModal.etapa, el?.value || '')
                                }}
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
