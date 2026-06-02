'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
    createCalendarioTarea,
    deleteCalendarioTarea,
    fetchCalendarioTareas,
} from '@/lib/ventasCalendarioApi'
import {
    formatTareaVence,
    sortTareasByDateTime,
    tasksForToday,
    tasksInNext48Hours,
    tasksOverdue,
    tasksThisWeek,
    toISODate,
} from '@/lib/ventasCalendarioTareas'
import VentasCorreosHistorialPaginacion from '@/components/ventas/VentasCorreosHistorialPaginacion'
import { useAdminTheme } from '@/contexts/AdminThemeContext'

const card =
    'rounded-2xl border border-orange-100 bg-white shadow-sm dark:border-orange-900/40 dark:bg-[#262626]/80 overflow-hidden'
const inputCls =
    'w-full rounded-xl border border-orange-100 bg-orange-50/50 px-3 py-2 text-sm dark:border-orange-800 dark:bg-[#202020] dark:text-orange-100'
const ghostBtn =
    'rounded-xl border border-orange-200 px-3 py-1.5 text-xs font-medium text-orange-900 transition hover:bg-orange-50 dark:border-orange-700 dark:text-orange-100 dark:hover:bg-white/5 disabled:opacity-50'
const brandBtn =
    'rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50'
const brandStyle = { background: 'linear-gradient(90deg, #FF8000, #e67300)' }

const FILTROS = [
    { id: 'hoy', label: 'Hoy', border: 'border-sky-200' },
    { id: 'semana', label: 'Esta semana', border: 'border-orange-200' },
    { id: '48h', label: 'Próximas 48 h', border: 'border-amber-200' },
    { id: 'vencidas', label: 'Vencidas', border: 'border-rose-200' },
    { id: 'todas', label: 'Todas', border: 'border-slate-200' },
]

const PER_PAGE = 10

function filtrarTareas(tareas, filtro, now) {
    switch (filtro) {
        case 'hoy':
            return tasksForToday(tareas, now)
        case 'semana':
            return tasksThisWeek(tareas, now)
        case '48h':
            return tasksInNext48Hours(tareas, now).map(({ _sort, ...t }) => t)
        case 'vencidas':
            return tasksOverdue(tareas, now)
        default:
            return sortTareasByDateTime(tareas)
    }
}

export default function VentasTareasClient() {
    const { darkMode } = useAdminTheme()
    const [tareas, setTareas] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)
    const [filtro, setFiltro] = useState('semana')
    const [page, setPage] = useState(1)
    const [formOpen, setFormOpen] = useState(false)
    const [draftDate, setDraftDate] = useState(() => toISODate(new Date()))
    const [draftTime, setDraftTime] = useState('')
    const [draftText, setDraftText] = useState('')
    const [saving, setSaving] = useState(false)
    const [eliminandoId, setEliminandoId] = useState(null)
    const [tick, setTick] = useState(0)

    const now = useMemo(() => new Date(), [tick])

    const refresh = useCallback(async () => {
        setLoadError(null)
        setLoading(true)
        try {
            const list = await fetchCalendarioTareas()
            setTareas(list)
        } catch (e) {
            setLoadError(e?.response?.data?.message || e?.message || 'No se pudieron cargar los pendientes.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    useEffect(() => {
        const id = setInterval(() => setTick((x) => x + 1), 60_000)
        return () => clearInterval(id)
    }, [])

    useEffect(() => {
        setPage(1)
    }, [filtro])

    const conteos = useMemo(
        () => ({
            hoy: tasksForToday(tareas, now).length,
            semana: tasksThisWeek(tareas, now).length,
            '48h': tasksInNext48Hours(tareas, now).length,
            vencidas: tasksOverdue(tareas, now).length,
            todas: tareas.length,
        }),
        [tareas, now],
    )

    const filtradas = useMemo(() => filtrarTareas(tareas, filtro, now), [tareas, filtro, now])

    const lastPage = Math.max(1, Math.ceil(filtradas.length / PER_PAGE))
    const paginaActual = Math.min(page, lastPage)
    const filas = filtradas.slice((paginaActual - 1) * PER_PAGE, paginaActual * PER_PAGE)

    const agregar = async () => {
        const text = draftText.trim()
        if (!text || saving) return
        let time = draftTime.trim() || null
        if (time && !/^\d{2}:\d{2}$/.test(time)) {
            const m = time.match(/^(\d{1,2}):(\d{2})$/)
            if (m) time = `${String(m[1]).padStart(2, '0')}:${m[2]}`
        }
        setSaving(true)
        setLoadError(null)
        try {
            const created = await createCalendarioTarea({
                fecha: draftDate,
                hora: time || undefined,
                texto: text,
            })
            setTareas((prev) => [...prev, created])
            setDraftText('')
            setDraftTime('')
            setFormOpen(false)
        } catch (e) {
            setLoadError(e?.response?.data?.message || e?.message || 'No se pudo guardar el pendiente.')
        } finally {
            setSaving(false)
        }
    }

    const eliminar = async (id) => {
        if (eliminandoId) return
        setEliminandoId(id)
        setLoadError(null)
        try {
            await deleteCalendarioTarea(id)
            setTareas((prev) => prev.filter((t) => t.id !== id))
        } catch (e) {
            setLoadError(e?.response?.data?.message || e?.message || 'No se pudo eliminar.')
        } finally {
            setEliminandoId(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-orange-950 dark:text-white">Pendientes</h1>
                    <p className="text-sm text-orange-800/70 dark:text-orange-200/60 mt-1">
                        Lista operativa de tus recordatorios (mismos datos que el calendario).
                    </p>
                </div>
                <Link
                    href="/ventas-calendario"
                    className={`${ghostBtn} inline-flex items-center text-sm px-4 py-2`}
                >
                    Ver en calendario
                </Link>
            </div>

            {loadError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
                    {loadError}
                    <button type="button" onClick={() => void refresh()} className="ml-3 font-semibold underline">
                        Reintentar
                    </button>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                {FILTROS.map(({ id, label, border }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setFiltro(id)}
                        className={`${card} border-t-4 ${border} p-4 text-left transition ${
                            filtro === id ? 'ring-2 ring-orange-400/50' : 'hover:bg-orange-50/40 dark:hover:bg-white/[0.02]'
                        }`}
                    >
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-orange-300/60">
                            {label}
                        </p>
                        <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                            {loading ? '—' : conteos[id]}
                        </p>
                    </button>
                ))}
            </div>

            <div className={card}>
                <div className="border-b border-orange-100 px-5 py-4 dark:border-orange-900/40 flex flex-wrap gap-2 justify-between items-center">
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                        {FILTROS.find((f) => f.id === filtro)?.label ?? 'Tareas'}
                    </h2>
                    <button
                        type="button"
                        onClick={() => setFormOpen((o) => !o)}
                        className={brandBtn}
                        style={brandStyle}
                    >
                        {formOpen ? 'Cancelar' : '+ Nueva tarea'}
                    </button>
                </div>

                {formOpen && (
                    <div className="border-b border-orange-100 px-5 py-4 dark:border-orange-900/40 bg-orange-50/30 dark:bg-orange-950/20 space-y-3">
                        <p className="text-xs font-semibold uppercase text-orange-700/80 dark:text-orange-300/70">
                            Nueva tarea
                        </p>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <label className="block text-xs text-orange-800/80 dark:text-orange-200/70">
                                Fecha
                                <input
                                    type="date"
                                    value={draftDate}
                                    onChange={(e) => setDraftDate(e.target.value)}
                                    className={`${inputCls} mt-1`}
                                />
                            </label>
                            <label className="block text-xs text-orange-800/80 dark:text-orange-200/70">
                                Hora (opcional)
                                <input
                                    type="time"
                                    value={draftTime}
                                    onChange={(e) => setDraftTime(e.target.value)}
                                    className={`${inputCls} mt-1`}
                                />
                            </label>
                            <label className="block text-xs text-orange-800/80 dark:text-orange-200/70 sm:col-span-1">
                                Descripción
                                <input
                                    type="text"
                                    value={draftText}
                                    onChange={(e) => setDraftText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && agregar()}
                                    placeholder="Ej. Llamar al cliente…"
                                    maxLength={2000}
                                    className={`${inputCls} mt-1`}
                                />
                            </label>
                        </div>
                        <button
                            type="button"
                            onClick={() => void agregar()}
                            disabled={saving || !draftText.trim()}
                            className={brandBtn}
                            style={brandStyle}
                        >
                            {saving ? 'Guardando…' : 'Guardar tarea'}
                        </button>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                        <thead>
                            <tr className="bg-orange-50/80 text-left text-xs font-semibold text-orange-900 dark:bg-orange-950/40 dark:text-orange-200">
                                <th className="px-4 py-3">Tarea</th>
                                <th className="px-4 py-3">Vence</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-orange-50 dark:divide-orange-900/30">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-orange-600/70 dark:text-orange-300/60">
                                        Cargando pendientes…
                                    </td>
                                </tr>
                            ) : filas.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-orange-300/50">
                                        No hay tareas en este filtro.
                                    </td>
                                </tr>
                            ) : (
                                filas.map((t) => {
                                    const vencida = t.dateISO < toISODate(now)
                                    return (
                                        <tr key={t.id} className="hover:bg-orange-50/40 dark:hover:bg-white/[0.02]">
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 max-w-md">
                                                {t.text}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={
                                                        vencida
                                                            ? 'text-rose-600 dark:text-rose-400 font-medium'
                                                            : 'text-gray-600 dark:text-orange-300/70'
                                                    }
                                                >
                                                    {formatTareaVence(t, now)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => void eliminar(t.id)}
                                                    disabled={eliminandoId === t.id}
                                                    className={ghostBtn}
                                                >
                                                    {eliminandoId === t.id ? '…' : 'Eliminar'}
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && filtradas.length > PER_PAGE && (
                    <div className="border-t border-orange-100 px-4 py-4 dark:border-orange-900/40">
                        <VentasCorreosHistorialPaginacion
                            darkMode={darkMode}
                            currentPage={paginaActual}
                            lastPage={lastPage}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
