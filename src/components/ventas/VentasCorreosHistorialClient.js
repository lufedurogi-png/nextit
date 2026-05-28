'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAdminTheme } from '@/contexts/AdminThemeContext'
import { fetchVentasCorreoHistorial, fetchVentasCorreoHistorialDetalle } from '@/lib/ventasCorreosApi'

const card = 'rounded-2xl border border-violet-100 bg-white p-4 sm:p-5 shadow-sm dark:border-violet-900/40 dark:bg-[#1a1628]/80'
const ghostBtn =
    'rounded-xl border border-violet-200 px-3 py-2 text-sm font-medium text-violet-900 transition hover:bg-violet-50 dark:border-violet-800/60 dark:text-violet-100 dark:hover:bg-white/5 disabled:opacity-50'

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
                darkMode ? 'border-violet-800/60 bg-[#0f0d14]' : 'border-violet-200 bg-white'
            }`}
        >
            <div
                className={`border-b px-4 py-3 ${
                    darkMode ? 'border-violet-900/50 bg-[#1a1628]' : 'border-violet-100 bg-violet-50/80'
                }`}
            >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                    Vista del correo enviado
                </p>
                <p className="mt-1 text-sm font-semibold text-violet-950 dark:text-white">{detalle.asunto}</p>
            </div>

            <div className={`px-4 py-5 sm:px-6 ${darkMode ? 'text-violet-100' : 'text-gray-800'}`}>
                <div
                    className={`correo-cuerpo-vista text-sm leading-relaxed break-words [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_img]:mx-auto [&_p]:mb-2 ${
                        darkMode ? '[&_a]:text-violet-300' : '[&_a]:text-violet-700'
                    }`}
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            </div>

            {(detalle.adjuntos?.length || 0) > 0 && (
                <div
                    className={`border-t px-4 py-3 ${
                        darkMode ? 'border-violet-900/50 bg-[#12101a]/80' : 'border-violet-100 bg-gray-50'
                    }`}
                >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400 mb-2">
                        Archivos adjuntos al correo
                    </p>
                    <ul className="flex flex-wrap gap-2">
                        {detalle.adjuntos.map((a) => (
                            <li
                                key={a.id}
                                className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                                    darkMode ? 'border-violet-800/60 bg-[#1a1628]' : 'border-violet-200 bg-white'
                                }`}
                            >
                                <span className="text-violet-500" aria-hidden>
                                    📎
                                </span>
                                <span className="font-medium truncate max-w-[12rem]">{a.nombre}</span>
                                <span className="text-violet-500/70">{formatBytes(a.tamano_bytes)}</span>
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
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)
    const [detalleId, setDetalleId] = useState(null)
    const [detalle, setDetalle] = useState(null)
    const [detalleLoading, setDetalleLoading] = useState(false)

    const loadLista = useCallback(async (p = 1) => {
        setLoadError(null)
        setLoading(true)
        try {
            const data = await fetchVentasCorreoHistorial(p, 10)
            setEnvios(data.envios || [])
            setMeta({
                current_page: data.current_page ?? p,
                last_page: data.last_page ?? 1,
                total: data.total ?? 0,
            })
            setPage(data.current_page ?? p)
        } catch (e) {
            setLoadError(e?.response?.data?.message || e?.message || 'No se pudo cargar el historial.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadLista(1)
    }, [loadLista])

    const abrirDetalle = async (id) => {
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

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-violet-950 dark:text-white">Historial de correos</h1>
                    <p className="text-sm text-violet-800/70 dark:text-violet-200/60 mt-1">
                        Revisa cómo se envió cada mensaje, con imágenes y adjuntos.
                    </p>
                </div>
                <Link href="/ventas-correos" className={`${ghostBtn} inline-flex items-center gap-2`}>
                    ← Nuevo envío
                </Link>
            </div>

            {loadError && (
                <div className={`${card} border-red-200 dark:border-red-900/50`}>
                    <p className="text-sm text-red-700 dark:text-red-200">{loadError}</p>
                    <button type="button" className={`${ghostBtn} mt-3`} onClick={() => loadLista(page)}>
                        Reintentar
                    </button>
                </div>
            )}

            <section className={card}>
                {loading ? (
                    <p className="text-sm text-center py-10 text-violet-600/80 dark:text-violet-300/70">Cargando historial…</p>
                ) : envios.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-sm text-violet-700/80 dark:text-violet-300/70">Aún no has enviado correos desde ventas.</p>
                        <Link
                            href="/ventas-correos"
                            className="inline-block mt-4 text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300"
                        >
                            Ir a redactar correo
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {envios.map((envio) => {
                            const abierto = detalleId === envio.id
                            const ok = (envio.enviados_count || 0) > 0
                            return (
                                <article
                                    key={envio.id}
                                    className={`rounded-xl border transition-colors ${
                                        abierto
                                            ? 'border-violet-300 bg-violet-50/50 dark:border-violet-700 dark:bg-violet-950/20'
                                            : 'border-violet-100 dark:border-violet-900/50 hover:border-violet-200 dark:hover:border-violet-800'
                                    }`}
                                >
                                    <button
                                        type="button"
                                        className="flex w-full flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 text-left"
                                        onClick={() => abrirDetalle(envio.id)}
                                        aria-expanded={abierto}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-violet-950 dark:text-white truncate">{envio.asunto}</p>
                                            <p className="text-xs text-violet-700/70 dark:text-violet-300/60 mt-0.5">
                                                {formatFechaHora(envio.fecha)}
                                            </p>
                                            {envio.cuerpo_preview && (
                                                <p className="text-sm text-gray-600 dark:text-violet-200/60 mt-2 line-clamp-2">
                                                    {envio.cuerpo_preview}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                                                <span className="rounded-lg px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200">
                                                    {envio.imagenes_inline.length} img
                                                </span>
                                            )}
                                            {(envio.adjuntos?.length || 0) > 0 && (
                                                <span className="rounded-lg px-2 py-1 text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                                                    {envio.adjuntos.length} adjunto(s)
                                                </span>
                                            )}
                                            <span
                                                className={`text-violet-500 transition-transform ${abierto ? 'rotate-180' : ''}`}
                                                aria-hidden
                                            >
                                                ▼
                                            </span>
                                        </div>
                                    </button>

                                    {abierto && (
                                        <div className="border-t border-violet-100 dark:border-violet-900/50 px-4 pb-5 pt-4 space-y-5">
                                            {detalleLoading ? (
                                                <p className="text-sm text-violet-600/80 dark:text-violet-300/70">
                                                    Cargando detalle…
                                                </p>
                                            ) : detalle ? (
                                                <>
                                                    <VistaCorreoEnviado detalle={detalle} darkMode={darkMode} />

                                                    <div>
                                                        <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-700/80 dark:text-violet-300/70 mb-2">
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
                                                                        <span className="font-medium text-violet-900 dark:text-violet-100">
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
                                                </>
                                            ) : null}
                                        </div>
                                    )}
                                </article>
                            )
                        })}
                    </div>
                )}

                {!loading && meta.last_page > 1 && (
                    <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-violet-100 dark:border-violet-900/40">
                        <button type="button" className={ghostBtn} disabled={page <= 1} onClick={() => loadLista(page - 1)}>
                            Anterior
                        </button>
                        <span className="text-xs text-violet-700/80 dark:text-violet-300/60">
                            Página {meta.current_page} de {meta.last_page} ({meta.total} envíos)
                        </span>
                        <button
                            type="button"
                            className={ghostBtn}
                            disabled={page >= meta.last_page}
                            onClick={() => loadLista(page + 1)}
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </section>
        </div>
    )
}
