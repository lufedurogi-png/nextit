'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createCalendarioTarea, deleteCalendarioTarea, fetchCalendarioTareas } from '@/lib/ventasCalendarioApi'
import {
    addDays,
    calendarMonthGrid,
    startOfWeekMonday,
    tasksForDateISO,
    tasksInNext48Hours,
    toISODate,
} from '@/lib/ventasCalendarioTareas'

const card = 'rounded-2xl border border-violet-100 bg-white p-4 shadow-sm dark:border-violet-900/40 dark:bg-[#1a1628]/80'
const purpleBtn =
    'rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-violet-400/40'
const purpleStyle = { background: 'linear-gradient(90deg, #5b4d7a, #8b7cb8)' }

const diasCortos = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function formatDayHeader(d) {
    return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatMonthYear(d) {
    return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
}

function format48hLine(t) {
    const [y, mo, da] = t.dateISO.split('-').map(Number)
    const d = new Date(y, mo - 1, da)
    const fecha = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
    if (t.time && String(t.time).trim()) {
        return { primary: `${fecha} · ${t.time}`, secondary: t.text }
    }
    return { primary: `${fecha} · día completo`, secondary: t.text }
}

export default function VentasCalendarioPage() {
    const [tareas, setTareas] = useState([])
    const [calendarOpen, setCalendarOpen] = useState(false)
    const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()))
    const [visibleMonth, setVisibleMonth] = useState(() => {
        const n = new Date()
        return new Date(n.getFullYear(), n.getMonth(), 1)
    })
    const [draftDateISO, setDraftDateISO] = useState(() => toISODate(new Date()))
    const [draftTime, setDraftTime] = useState('')
    const [draftText, setDraftText] = useState('')
    const [tick, setTick] = useState(0)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)
    const [saving, setSaving] = useState(false)

    const refreshTareas = useCallback(async () => {
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
        refreshTareas()
    }, [refreshTareas])

    useEffect(() => {
        const id = setInterval(() => setTick((x) => x + 1), 60_000)
        return () => clearInterval(id)
    }, [])

    const weekDays = useMemo(() => {
        const days = []
        for (let i = 0; i < 7; i++) {
            days.push(addDays(weekStart, i))
        }
        return days
    }, [weekStart])

    const gridCells = useMemo(() => calendarMonthGrid(visibleMonth), [visibleMonth])

    const proximas48 = useMemo(() => {
        void tick
        return tasksInNext48Hours(tareas, new Date())
    }, [tareas, tick])

    const isSameDay = (a, b) => toISODate(a) === toISODate(b)

    const goMonth = (delta) => {
        setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
    }

    const selectCalendarDay = (d) => {
        setVisibleMonth(new Date(d.getFullYear(), d.getMonth(), 1))
        setWeekStart(startOfWeekMonday(d))
        setDraftDateISO(toISODate(d))
    }

    const goWeek = (delta) => {
        setWeekStart((w) => addDays(w, delta * 7))
    }

    const irSemanaActual = () => {
        const now = new Date()
        setWeekStart(startOfWeekMonday(now))
        setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1))
        setDraftDateISO(toISODate(now))
    }

    const agregarPendiente = async () => {
        const text = draftText.trim()
        if (!text || saving) return
        let time = draftTime.trim() || null
        if (time && !/^\d{2}:\d{2}$/.test(time)) {
            const m = time.match(/^(\d{1,2}):(\d{2})$/)
            if (m) {
                time = `${String(m[1]).padStart(2, '0')}:${m[2]}`
            }
        }
        setSaving(true)
        setLoadError(null)
        try {
            const created = await createCalendarioTarea({
                fecha: draftDateISO,
                hora: time || undefined,
                texto: text,
            })
            setTareas((prev) => [...prev, created])
            setDraftText('')
            setDraftTime('')
        } catch (e) {
            setLoadError(e?.response?.data?.message || e?.message || 'No se pudo guardar el pendiente.')
        } finally {
            setSaving(false)
        }
    }

    const eliminarTarea = async (id) => {
        setLoadError(null)
        try {
            await deleteCalendarioTarea(id)
            setTareas((prev) => prev.filter((t) => t.id !== id))
        } catch (e) {
            setLoadError(e?.response?.data?.message || e?.message || 'No se pudo eliminar.')
        }
    }

    const monthLabel = formatMonthYear(visibleMonth)

    return (
        <div className="space-y-6">
            {loadError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
                    {loadError}
                    <button
                        type="button"
                        onClick={() => void refreshTareas()}
                        className="ml-3 font-semibold underline"
                    >
                        Reintentar
                    </button>
                </div>
            )}
            {loading && (
                <div className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-violet-700 dark:border-violet-700 dark:border-t-violet-200" />
                    Cargando pendientes…
                </div>
            )}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-violet-950 dark:text-white">Calendario</h1>
                    <p className="text-sm text-violet-800/70 dark:text-violet-200/60 mt-1">
                        Abre el calendario para elegir mes, semana y agregar pendientes debajo del grid. Las tarjetas muestran la semana seleccionada; al final, lo próximo a 48 horas. Todo se guarda en tu cuenta.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setCalendarOpen((o) => !o)}
                    className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-900 shadow-sm hover:bg-violet-50 dark:border-violet-700 dark:bg-[#1a1628] dark:text-violet-100 dark:hover:bg-violet-900/20"
                >
                    {calendarOpen ? 'Ocultar calendario' : 'Mostrar calendario'}
                </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-100 bg-white px-4 py-3 shadow-sm dark:border-violet-900/40 dark:bg-[#1a1628]/80">
                <p className="text-xs text-violet-800/80 dark:text-violet-200/70">
                    Semana mostrada:{' '}
                    <span className="font-semibold text-violet-950 dark:text-white">
                        {formatDayHeader(weekDays[0])} — {formatDayHeader(weekDays[6])}
                    </span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => goWeek(-1)} className="rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-medium dark:border-violet-700">
                        Semana anterior
                    </button>
                    <button type="button" onClick={irSemanaActual} className={`${purpleBtn} text-xs`} style={purpleStyle}>
                        Semana actual
                    </button>
                    <button type="button" onClick={() => goWeek(1)} className="rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-medium dark:border-violet-700">
                        Semana siguiente
                    </button>
                </div>
            </div>

            {calendarOpen && (
                <div className="w-full rounded-2xl border border-violet-100 bg-white p-4 shadow-sm dark:border-violet-900/40 dark:bg-[#1a1628]/90 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 pb-4 dark:border-violet-800/50">
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                aria-label="Mes anterior"
                                onClick={() => goMonth(-1)}
                                className="rounded-lg border border-violet-200 px-2 py-1 text-sm dark:border-violet-700"
                            >
                                ◀
                            </button>
                            <span className="min-w-[10rem] text-center text-sm font-semibold capitalize text-violet-950 dark:text-white">{monthLabel}</span>
                            <button
                                type="button"
                                aria-label="Mes siguiente"
                                onClick={() => goMonth(1)}
                                className="rounded-lg border border-violet-200 px-2 py-1 text-sm dark:border-violet-700"
                            >
                                ▶
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300/90 sm:text-xs">
                        {diasCortos.map((d) => (
                            <div key={d} className="py-1">
                                {d}
                            </div>
                        ))}
                    </div>
                    <div className="mt-1 grid grid-cols-7 gap-1">
                        {gridCells.map((cell) => {
                            const iso = toISODate(cell)
                            const inMonth = cell.getMonth() === visibleMonth.getMonth()
                            const inSelectedWeek = weekDays.some((wd) => toISODate(wd) === iso)
                            const isToday = iso === toISODate(new Date())
                            return (
                                <button
                                    key={iso + cell.getTime()}
                                    type="button"
                                    onClick={() => selectCalendarDay(cell)}
                                    className={`relative min-h-[2.25rem] rounded-lg border text-sm transition sm:min-h-[2.75rem] ${
                                        inSelectedWeek
                                            ? 'border-violet-400 bg-violet-100/80 font-semibold text-violet-950 dark:border-violet-500 dark:bg-violet-600/25 dark:text-white'
                                            : 'border-violet-100 bg-violet-50/30 text-gray-800 dark:border-violet-900/40 dark:bg-[#12101a]/60 dark:text-violet-100'
                                    } ${!inMonth ? 'opacity-40' : ''} ${isToday ? 'ring-2 ring-amber-400/70 ring-offset-1 dark:ring-offset-[#1a1628]' : ''}`}
                                >
                                    <span className="absolute inset-0 flex items-center justify-center">{cell.getDate()}</span>
                                </button>
                            )
                        })}
                    </div>

                    <div className="mt-6 border-t border-violet-100 pt-5 dark:border-violet-800/50">
                        <div className="rounded-xl bg-violet-50/60 p-4 dark:bg-[#12101a]/55">
                            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300/80">Nuevo pendiente</p>
                            <p className="mt-1 text-xs text-gray-600 dark:text-violet-200/60">
                                Día seleccionado:{' '}
                                <span className="font-medium text-violet-900 dark:text-violet-100">
                                    {draftDateISO
                                        ? new Date(draftDateISO + 'T12:00:00').toLocaleDateString('es-MX', {
                                              weekday: 'long',
                                              day: 'numeric',
                                              month: 'long',
                                              year: 'numeric',
                                          })
                                        : '—'}
                                </span>
                            </p>
                            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                                <div className="sm:w-40">
                                    <label htmlFor="pend-fecha" className="block text-xs font-medium text-violet-800 dark:text-violet-200/80">
                                        Día
                                    </label>
                                    <input
                                        id="pend-fecha"
                                        type="date"
                                        value={draftDateISO}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            setDraftDateISO(v)
                                            if (v) setWeekStart(startOfWeekMonday(new Date(v + 'T12:00:00')))
                                        }}
                                        className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm dark:border-violet-700 dark:bg-[#1a1628]"
                                    />
                                </div>
                                <div className="sm:w-36">
                                    <label htmlFor="pend-hora" className="block text-xs font-medium text-violet-800 dark:text-violet-200/80">
                                        Hora (opcional)
                                    </label>
                                    <input
                                        id="pend-hora"
                                        type="time"
                                        value={draftTime}
                                        onChange={(e) => setDraftTime(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm dark:border-violet-700 dark:bg-[#1a1628]"
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <label htmlFor="pend-texto" className="block text-xs font-medium text-violet-800 dark:text-violet-200/80">
                                        Tarea
                                    </label>
                                    <input
                                        id="pend-texto"
                                        type="text"
                                        value={draftText}
                                        onChange={(e) => setDraftText(e.target.value)}
                                        placeholder="Describe el pendiente…"
                                        className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm dark:border-violet-700 dark:bg-[#1a1628]"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') void agregarPendiente()
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void agregarPendiente()}
                                    disabled={saving}
                                    className={`${purpleBtn} shrink-0 sm:mb-0.5 disabled:opacity-50`}
                                    style={purpleStyle}
                                >
                                    {saving ? 'Guardando…' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h2 className="mb-3 text-sm font-semibold text-violet-900 dark:text-violet-100">Pendientes por día</h2>
                <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                    {weekDays.map((d) => {
                        const iso = toISODate(d)
                        const list = tasksForDateISO(tareas, iso)
                        const hoy = isSameDay(d, new Date())
                        return (
                            <div
                                key={iso}
                                className={`${card} flex w-[min(100%,11rem)] shrink-0 flex-col sm:w-36 md:w-40 ${hoy ? 'ring-2 ring-violet-400/50 dark:ring-violet-500/40' : ''}`}
                            >
                                <p className="border-b border-violet-100 pb-2 text-center text-xs font-bold uppercase tracking-wide text-violet-600 dark:border-violet-800/50 dark:text-violet-300">
                                    {formatDayHeader(d)}
                                </p>
                                <ul className="mt-2 max-h-[220px] min-h-[4rem] space-y-2 overflow-y-auto pr-0.5 text-sm">
                                    {list.length === 0 && <li className="text-center text-xs text-gray-400 dark:text-violet-400/50">Sin pendientes</li>}
                                    {list.map((ev) => (
                                        <li
                                            key={ev.id}
                                            className="group relative rounded-lg border border-violet-100 bg-violet-50/60 px-2 py-1.5 dark:border-violet-800/50 dark:bg-[#12101a]/80"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => void eliminarTarea(ev.id)}
                                                className="absolute right-1 top-1 rounded p-0.5 text-[10px] text-violet-400 opacity-0 transition hover:bg-rose-100 hover:text-rose-700 group-hover:opacity-100 dark:hover:bg-rose-900/40 dark:hover:text-rose-200"
                                                aria-label="Eliminar"
                                            >
                                                ✕
                                            </button>
                                            {ev.time ? (
                                                <p className="pr-5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">{ev.time}</p>
                                            ) : (
                                                <p className="pr-5 text-[10px] font-medium uppercase text-violet-500/80 dark:text-violet-400/70">Sin hora</p>
                                            )}
                                            <p className="mt-0.5 text-xs leading-snug text-gray-800 dark:text-gray-100">{ev.text}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className={card}>
                <h2 className="font-semibold text-gray-900 dark:text-white">Próximas 48 horas</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-violet-300/50">Solo pendientes que caen dentro de la ventana desde ahora (se actualiza cada minuto).</p>
                <ul className="mt-4 max-h-[280px] space-y-2 overflow-y-auto text-sm">
                    {proximas48.length === 0 && (
                        <li className="rounded-lg border border-dashed border-violet-200 px-3 py-6 text-center text-sm text-gray-500 dark:border-violet-800 dark:text-violet-300/50">
                            No hay pendientes en las próximas 48 horas.
                        </li>
                    )}
                    {proximas48.map((t) => {
                        const { primary, secondary } = format48hLine(t)
                        return (
                            <li
                                key={t.id}
                                className="flex flex-col gap-1 rounded-lg border border-violet-100 px-3 py-2 dark:border-violet-800/50 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <span className="shrink-0 text-violet-700 dark:text-violet-300 font-medium">{primary}</span>
                                <span className="min-w-0 text-gray-600 dark:text-violet-200/80">{secondary}</span>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    )
}
