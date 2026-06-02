'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdminTheme } from '@/contexts/AdminThemeContext'
import VentasCorreoHistorialFiltrosFecha from '@/components/ventas/VentasCorreoHistorialFiltrosFecha'
import VentasCorreosHistorialPaginacion from '@/components/ventas/VentasCorreosHistorialPaginacion'
import {
    deleteVentasCorreoHistorial,
    fetchVentasCorreoHistorial,
    fetchVentasCorreoHistorialDetalle,
} from '@/lib/ventasCorreosApi'

const PER_PAGE = 6

const card = 'rounded-2xl border border-orange-100 bg-white p-4 sm:p-5 shadow-sm dark:border-orange-900/40 dark:bg-[#262626]/80'
const ghostBtn =
    'rounded-xl border border-orange-200 px-3 py-2 text-sm font-medium text-orange-900 transition hover:bg-orange-50 dark:border-orange-800/60 dark:text-orange-100 dark:hover:bg-white/5 disabled:opacity-50'
const dangerBtn =
    'rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30 disabled:opacity-50'

function formatFechaHora(iso) {
    if (!iso) return '—'
    try {
        return new Date(iso).toLocaleString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    } catch {
        return '—'
    }
}

function formatBytes(n) {
    const b = Number(n) || 0
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function VistaCorreoEnviado({ detalle, darkMode }) {
    const html = detalle.cuerpo_html_vista || detalle.cuerpo || ''

    return (
        <div
            className={`overflow-hidden rounded-xl border shadow-inner ${
                darkMode ? 'border-orange-800/60 bg-[#0f0d14]' : 'border-orange-200 bg-white'
            }`}
        >
            <div
                className={`border-b px-4 py-3 ${
                    darkMode ? 'border-orange-900/50 bg-[#262626]' : 'border-orange-100 bg-orange-50/80'
                }`}
            >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-500 dark:text-orange-400">
                    Vista del correo enviado
                </p>
                <p className="mt-1 text-sm font-semibold text-orange-950 dark:text-white">{detalle.asunto}</p>
            </div>

            <div className={`px-4 py-5 sm:px-6 ${darkMode ? 'text-orange-100' : 'text-gray-800'}`}>
                <div
                    className={`correo-cuerpo-vista text-sm leading-relaxed break-words [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_img]:mx-auto [&_p]:mb-2 ${
                        darkMode ? '[&_a]:text-orange-300' : '[&_a]:text-orange-700'
                    }`}
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            </div>

            {(detalle.adjuntos?.length || 0) > 0 && (
                <div
                    className={`border-t px-4 py-3 ${
                        darkMode ? 'border-orange-900/50 bg-[#202020]/80' : 'border-orange-100 bg-gray-50'
                    }`}
                >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400 mb-2">
                        Archivos adjuntos al correo
                    </p>
                    <ul className="flex flex-wrap gap-2">
                        {detalle.adjuntos.map((a) => (
                            <li
                                key={a.id}
                                className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                                    darkMode ? 'border-orange-800/60 bg-[#262626]' : 'border-orange-200 bg-white'
                                }`}
                            >
                                <span className="text-orange-500" aria-hidden>
                                    📎
                                </span>
                                <span className="font-medium truncate max-w-[12rem] sm:max-w-md xl:max-w-none">{a.nombre}</span>
                                <span className="text-orange-500/70">{formatBytes(a.tamano_bytes)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

export default function VentasCorreosHistorialClient() {
    const { darkMode } = useAdminTheme()
    const [envios, setEnvios] = useState([])
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, per_page: PER_PAGE })
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)
    const [detalleId, setDetalleId] = useState(null)
    const [detalle, setDetalle] = useState(null)
    const [detalleLoading, setDetalleLoading] = useState(false)

    const [busqueda, setBusqueda] = useState('')
    const [busquedaAplicada, setBusquedaAplicada] = useState('')
    const [filtroAnio, setFiltroAnio] = useState('')
    const [filtroMes, setFiltroMes] = useState('')
    const [filtroDia, setFiltroDia] = useState('')

    const [confirmDeleteId, setConfirmDeleteId] = useState(null)
    const [eliminandoId, setEliminandoId] = useState(null)
    const [status, setStatus] = useState(null)

    const inputCls = `w-full rounded-xl border px-3 py-2 text-sm transition-colors ${
        darkMode
            ? 'border-orange-800/60 bg-[#202020] text-orange-50 placeholder:text-orange-400/40'
            : 'border-orange-100 bg-white text-gray-900 placeholder:text-gray-400'
    }`
    useEffect(() => {
        const t = setTimeout(() => setBusquedaAplicada(busqueda.trim()), 400)
        return () => clearTimeout(t)
    }, [busqueda])

    const loadLista = useCallback(
        async (p = 1) => {
            setLoadError(null)
            setLoading(true)
            try {
                const data = await fetchVentasCorreoHistorial({
                    page: p,
                    perPage: PER_PAGE,
                    q: busquedaAplicada,
                    anio: filtroAnio,
                    mes: filtroMes,
                    dia: filtroDia,
                })
                setEnvios(data.envios || [])
                setMeta({
                    current_page: data.current_page ?? p,
                    last_page: data.last_page ?? 1,
                    total: data.total ?? 0,
                    per_page: data.per_page ?? PER_PAGE,
                })
                setPage(data.current_page ?? p)
            } catch (e) {
                setLoadError(e?.response?.data?.message || e?.message || 'No se pudo cargar el historial.')
            } finally {
                setLoading(false)
            }
        },
        [busquedaAplicada, filtroAnio, filtroMes, filtroDia],
    )

    useEffect(() => {
        loadLista(1)
    }, [loadLista])

    const limpiarFiltros = () => {
        setBusqueda('')
        setBusquedaAplicada('')
        setFiltroAnio('')
        setFiltroMes('')
        setFiltroDia('')
    }

    const hayFiltros = busqueda !== '' || filtroAnio !== '' || filtroMes !== '' || filtroDia !== ''

    const abrirDetalle = async (id) => {
        if (confirmDeleteId === id) return
        if (detalleId === id) {
            setDetalleId(null)
            setDetalle(null)
            return
        }
        setDetalleId(id)
        setDetalleLoading(true)
        setDetalle(null)
        try {
            const row = await fetchVentasCorreoHistorialDetalle(id)
            setDetalle(row)
        } catch (e) {
            setDetalle(null)
            setLoadError(e?.response?.data?.message || e?.message || 'No se pudo cargar el detalle.')
        } finally {
            setDetalleLoading(false)
        }
    }

    const ejecutarEliminar = async (id) => {
        setEliminandoId(id)
        setStatus(null)
        try {
            const res = await deleteVentasCorreoHistorial(id)
            setStatus({ type: 'ok', text: res.message || 'Envío eliminado.' })
            if (detalleId === id) {
                setDetalleId(null)
                setDetalle(null)
            }
            setConfirmDeleteId(null)
            const nextPage = envios.length <= 1 && page > 1 ? page - 1 : page
            await loadLista(nextPage)
        } catch (e) {
            setStatus({ type: 'err', text: e?.response?.data?.message || e?.message || 'No se pudo eliminar.' })
        } finally {
            setEliminandoId(null)
        }
    }

    const rangoTexto = useMemo(() => {
        if (meta.total === 0) return 'Sin resultados'
        const desde = (meta.current_page - 1) * meta.per_page + 1
        const hasta = Math.min(meta.current_page * meta.per_page, meta.total)
        return `Mostrando ${desde}–${hasta} de ${meta.total}`
    }, [meta])

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-orange-950 dark:text-white">Historial de correos</h1>
                    <p className="text-sm text-orange-800/70 dark:text-orange-200/60 mt-1">
                        Revisa cómo se envió cada mensaje, con imágenes y adjuntos.
                    </p>
                </div>
                <Link href="/ventas-correos" className={`${ghostBtn} inline-flex items-center gap-2 shrink-0`}>
                    ← Nuevo envío
                </Link>
            </div>

            {status && (
                <div
                    className={`rounded-xl border px-4 py-3 text-sm ${
                        status.type === 'ok'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100'
                            : 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100'
                    }`}
                    role="status"
                >
                    {status.text}
                </div>
            )}

            <section className={`${card} space-y-4`}>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,9rem))_auto] md:items-end">
                    <div className="min-w-0 sm:col-span-2 md:col-span-1">
                        <label htmlFor="historial-buscar" className="block text-xs font-medium text-orange-800/80 dark:text-orange-300/70 mb-1">
                            Buscar
                        </label>
                        <input
                            id="historial-buscar"
                            type="search"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Asunto, mensaje o correo…"
                            className={inputCls}
                        />
                    </div>

                    <VentasCorreoHistorialFiltrosFecha
                        darkMode={darkMode}
                        anio={filtroAnio}
                        mes={filtroMes}
                        dia={filtroDia}
                        onAnioChange={(v) => {
                            setFiltroAnio(v)
                            if (v === '') {
                                setFiltroMes('')
                                setFiltroDia('')
                            }
                        }}
                        onMesChange={(v) => {
                            setFiltroMes(v)
                            setFiltroDia('')
                        }}
                        onDiaChange={setFiltroDia}
                    />

                    <div className="flex items-end sm:col-span-2 md:col-span-1">
                        <button
                            type="button"
                            className={`${ghostBtn} w-full`}
                            onClick={limpiarFiltros}
                            disabled={!hayFiltros}
                        >
                            Limpiar
                        </button>
                    </div>
                </div>
            </section>

            {loadError && (
                <div className={`${card} border-red-200 dark:border-red-900/50`}>
                    <p className="text-sm text-red-700 dark:text-red-200">{loadError}</p>
                    <button type="button" className={`${ghostBtn} mt-3`} onClick={() => loadLista(page)}>
                        Reintentar
                    </button>
                </div>
            )}

            <section className={card}>
                {!loading && meta.total > 0 && (
                    <p className="text-xs text-orange-700/80 dark:text-orange-300/60 mb-4">{rangoTexto}</p>
                )}

                {loading ? (
                    <p className="text-sm text-center py-10 text-orange-600/80 dark:text-orange-300/70">Cargando historial…</p>
                ) : envios.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-sm text-orange-700/80 dark:text-orange-300/70">
                            {hayFiltros || busquedaAplicada
                                ? 'No hay envíos que coincidan con los filtros.'
                                : 'Aún no has enviado correos desde ventas.'}
                        </p>
                        {hayFiltros ? (
                            <button type="button" className="inline-block mt-4 text-sm font-semibold text-orange-700 hover:underline dark:text-orange-300" onClick={limpiarFiltros}>
                                Quitar filtros
                            </button>
                        ) : (
                            <Link
                                href="/ventas-correos"
                                className="inline-block mt-4 text-sm font-semibold text-orange-700 hover:underline dark:text-orange-300"
                            >
                                Ir a redactar correo
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {envios.map((envio) => {
                            const abierto = detalleId === envio.id
                            const ok = (envio.enviados_count || 0) > 0
                            const confirmando = confirmDeleteId === envio.id
                            return (
                                <article
                                    key={envio.id}
                                    className={`rounded-xl border transition-colors ${
                                        confirmando
                                            ? 'border-red-300 bg-red-50/30 dark:border-red-900/50 dark:bg-red-950/15'
                                            : abierto
                                              ? 'border-orange-300 bg-orange-50/50 dark:border-orange-700 dark:bg-orange-950/20'
                                              : 'border-orange-100 dark:border-orange-900/50 hover:border-orange-200 dark:hover:border-orange-800'
                                    }`}
                                >
                                    <div className="flex w-full flex-col gap-2 md:flex-row md:items-stretch">
                                        <button
                                            type="button"
                                            className="flex flex-1 flex-col gap-3 p-4 text-left md:flex-row md:items-center md:gap-6 min-w-0"
                                            onClick={() => abrirDetalle(envio.id)}
                                            aria-expanded={abierto}
                                            disabled={confirmando}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-orange-950 dark:text-white truncate">{envio.asunto}</p>
                                                <p className="text-xs text-orange-700/70 dark:text-orange-300/60 mt-0.5">
                                                    {formatFechaHora(envio.fecha)}
                                                </p>
                                                {envio.cuerpo_preview && (
                                                    <p className="text-sm text-gray-600 dark:text-orange-200/60 mt-2 line-clamp-2 md:line-clamp-1 xl:line-clamp-none xl:max-w-4xl">
                                                        {envio.cuerpo_preview}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 shrink-0 md:justify-end">
                                                <span
                                                    className={`rounded-lg px-2 py-1 text-xs font-medium ${
                                                        ok
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200'
                                                    }`}
                                                >
                                                    {envio.enviados_count} enviado(s)
                                                </span>
                                                {envio.fallidos_count > 0 && (
                                                    <span className="rounded-lg px-2 py-1 text-xs font-medium bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                                                        {envio.fallidos_count} fallido(s)
                                                    </span>
                                                )}
                                                {(envio.imagenes_inline?.length || 0) > 0 && (
                                                    <span className="rounded-lg px-2 py-1 text-xs font-medium bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-200">
                                                        {envio.imagenes_inline.length} img
                                                    </span>
                                                )}
                                                {(envio.adjuntos?.length || 0) > 0 && (
                                                    <span className="rounded-lg px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">
                                                        {envio.adjuntos.length} adjunto(s)
                                                    </span>
                                                )}
                                                <span
                                                    className={`text-orange-500 transition-transform ${abierto ? 'rotate-180' : ''}`}
                                                    aria-hidden
                                                >
                                                    ▼
                                                </span>
                                            </div>
                                        </button>
                                        {!confirmando && (
                                            <div className="flex items-center justify-end px-4 pb-4 md:px-0 md:pb-0 md:pr-4 md:items-center">
                                                <button
                                                    type="button"
                                                    className={`${dangerBtn} text-xs`}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setConfirmDeleteId(envio.id)
                                                        setStatus(null)
                                                    }}
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {confirmando && (
                                        <div
                                            className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/25"
                                            role="region"
                                            aria-label="Confirmar eliminación"
                                        >
                                            <p className="text-sm font-medium text-red-900 dark:text-red-100">
                                                ¿Eliminar este envío del historial?
                                            </p>
                                            <p className="text-xs text-red-800/80 dark:text-red-200/70 mt-1">
                                                Se borrará el registro, destinatarios y archivos guardados. No se puede deshacer.
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <button
                                                    type="button"
                                                    className={`${dangerBtn} text-sm font-semibold`}
                                                    disabled={eliminandoId === envio.id}
                                                    onClick={() => ejecutarEliminar(envio.id)}
                                                >
                                                    {eliminandoId === envio.id ? 'Eliminando…' : 'Sí, eliminar'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={ghostBtn}
                                                    disabled={eliminandoId === envio.id}
                                                    onClick={() => setConfirmDeleteId(null)}
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {abierto && !confirmando && (
                                        <div className="border-t border-orange-100 dark:border-orange-900/50 px-4 pb-5 pt-4">
                                            {detalleLoading ? (
                                                <p className="text-sm text-orange-600/80 dark:text-orange-300/70">Cargando detalle…</p>
                                            ) : detalle ? (
                                                <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(280px,22rem)] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
                                                    <VistaCorreoEnviado detalle={detalle} darkMode={darkMode} />

                                                    <div className="md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-7rem)] md:overflow-y-auto">
                                                        <h3 className="text-xs font-semibold uppercase tracking-wide text-orange-700/80 dark:text-orange-300/70 mb-2">
                                                            Destinatarios ({detalle.destinatarios?.length || 0})
                                                        </h3>
                                                        <ul className="space-y-1.5">
                                                            {(detalle.destinatarios || []).map((d, i) => (
                                                                <li
                                                                    key={`${d.email}-${i}`}
                                                                    className={`rounded-lg px-3 py-2.5 text-sm ${
                                                                        d.estado === 'enviado'
                                                                            ? 'bg-emerald-50/80 dark:bg-emerald-950/20'
                                                                            : 'bg-red-50/80 dark:bg-red-950/20'
                                                                    }`}
                                                                >
                                                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                                                        <span className="font-medium text-orange-900 dark:text-orange-100 break-all">
                                                                            {d.nombre ? `${d.nombre} · ` : ''}
                                                                            {d.email}
                                                                        </span>
                                                                        <span
                                                                            className={`text-xs font-semibold shrink-0 ${
                                                                                d.estado === 'enviado'
                                                                                    ? 'text-emerald-700 dark:text-emerald-300'
                                                                                    : 'text-red-700 dark:text-red-300'
                                                                            }`}
                                                                        >
                                                                            {d.estado === 'enviado' ? 'Enviado' : 'Fallido'}
                                                                        </span>
                                                                    </div>
                                                                    {d.estado !== 'enviado' && d.error_mensaje && (
                                                                        <p className="mt-1 text-xs text-red-600/90 dark:text-red-300/80">
                                                                            {d.error_mensaje}
                                                                        </p>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}
                                </article>
                            )
                        })}
                    </div>
                )}

                <VentasCorreosHistorialPaginacion
                    darkMode={darkMode}
                    currentPage={meta.current_page}
                    lastPage={meta.last_page}
                    onPageChange={(p) => loadLista(p)}
                />
            </section>
        </div>
    )
}
