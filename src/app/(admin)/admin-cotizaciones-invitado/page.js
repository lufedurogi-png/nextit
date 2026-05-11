'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import axios from '@/lib/axios'
import { getPaginationWindow } from '@/lib/pagination'
import { formatPrecio } from '@/lib/productos'
import { useDebounce } from '@/hooks/useDebounce'
import {
    adminMainCardClass,
    adminTableShellClass,
    adminColumnTitleClass,
    adminColumnTitleDotClass,
    adminPageIconWrapClass,
    adminPageTitleClass,
    adminPageSubtitleClass,
    adminTitleAccentBarClass,
    adminFilterSelectClass,
    adminFilterInputClass,
} from '@/lib/adminUi'

const PER_PAGE = 4
const REFRESH_MS = 60_000

function fechaLegible(iso) {
    if (!iso) return '—'
    try {
        const d = new Date(iso)
        return d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
    } catch {
        return iso
    }
}

export default function AdminCotizacionesInvitadoPage() {
    const [darkMode, setDarkMode] = useState(true)
    const [loading, setLoading] = useState(true)
    const [tableRefreshing, setTableRefreshing] = useState(false)
    const [lista, setLista] = useState([])
    const [total, setTotal] = useState(0)
    const [paginaActual, setPaginaActual] = useState(1)
    const [lastPage, setLastPage] = useState(1)
    const [detallePorId, setDetallePorId] = useState({})
    const detalleRef = useRef({})
    const [modalId, setModalId] = useState(null)
    const [cargandoDetalleModal, setCargandoDetalleModal] = useState(false)
    const [downloadingPdfId, setDownloadingPdfId] = useState(null)
    const [emailsLista, setEmailsLista] = useState([])
    const [filtroEmail, setFiltroEmail] = useState('')
    const [fechaDesde, setFechaDesde] = useState('')
    const [fechaHasta, setFechaHasta] = useState('')
    const [folioInput, setFolioInput] = useState('')
    const folioDebounced = useDebounce(folioInput, 400)
    const paginaRef = useRef(paginaActual)

    useEffect(() => {
        detalleRef.current = detallePorId
    }, [detallePorId])

    useEffect(() => {
        paginaRef.current = paginaActual
    }, [paginaActual])

    useEffect(() => {
        setDarkMode(JSON.parse(localStorage.getItem('darkMode') ?? 'true'))
    }, [])
    useEffect(() => {
        const onDarkModeChange = (e) => setDarkMode(!!e.detail)
        window.addEventListener('darkModeChange', onDarkModeChange)
        return () => window.removeEventListener('darkModeChange', onDarkModeChange)
    }, [])

    const buildQueryParams = useCallback(
        (page) => {
            const params = { page, per_page: PER_PAGE }
            if (filtroEmail.trim()) params.email = filtroEmail.trim()
            if (fechaDesde) params.fecha_desde = fechaDesde
            if (fechaHasta) params.fecha_hasta = fechaHasta
            const f = folioDebounced.trim()
            if (f) params.folio = f
            return params
        },
        [filtroEmail, fechaDesde, fechaHasta, folioDebounced]
    )

    const fetchLista = useCallback(
        async (silent = false) => {
            if (!silent) setLoading(true)
            else setTableRefreshing(true)
            const page = paginaRef.current
            try {
                const { data } = await axios.get('/admin/cotizaciones-invitado', {
                    params: buildQueryParams(page),
                })
                if (data?.success && data?.data) {
                    setLista(data.data.cotizaciones || [])
                    setTotal(data.data.total ?? 0)
                    setLastPage(data.data.last_page ?? 1)
                } else {
                    setLista([])
                }
            } catch {
                if (!silent) setLista([])
            } finally {
                if (!silent) setLoading(false)
                else setTableRefreshing(false)
            }
        },
        [paginaActual, buildQueryParams]
    )

    useEffect(() => {
        axios
            .get('/admin/cotizaciones-invitado/emails')
            .then(({ data }) => {
                if (data?.success && data?.data?.emails) setEmailsLista(data.data.emails)
            })
            .catch(() => setEmailsLista([]))
    }, [])

    useEffect(() => {
        paginaRef.current = 1
        setPaginaActual(1)
    }, [filtroEmail, fechaDesde, fechaHasta, folioDebounced])

    useEffect(() => {
        fetchLista(false)
    }, [fetchLista])

    useEffect(() => {
        const id = window.setInterval(() => {
            fetchLista(true)
        }, REFRESH_MS)
        return () => window.clearInterval(id)
    }, [fetchLista])

    const abrirModalProductos = async (id) => {
        setModalId(id)
        if (detalleRef.current[id]?.items) {
            setCargandoDetalleModal(false)
            return
        }
        setCargandoDetalleModal(true)
        try {
            const { data } = await axios.get(`/admin/cotizaciones-invitado/${id}`)
            if (data?.success && data?.data) {
                setDetallePorId((prev) => ({ ...prev, [id]: data.data }))
            }
        } catch {
            setDetallePorId((prev) => ({ ...prev, [id]: { items: [], total: 0, error: true } }))
        } finally {
            setCargandoDetalleModal(false)
        }
    }

    const cerrarModal = () => {
        setModalId(null)
    }

    const handleDescargarPdf = async (id) => {
        setDownloadingPdfId(id)
        try {
            const { data } = await axios.get(`/admin/cotizaciones-invitado/${id}/pdf`, { responseType: 'blob' })
            const url = URL.createObjectURL(new Blob([data]))
            const a = document.createElement('a')
            a.href = url
            a.download = `cotizacion-invitado-${id}.pdf`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            // silencioso
        } finally {
            setDownloadingPdfId(null)
        }
    }

    const columnTitle = (label) => (
        <div className={`${adminColumnTitleClass(darkMode)} inline-flex items-center`}>
            <span className={adminColumnTitleDotClass(darkMode)} aria-hidden />
            {label}
        </div>
    )

    const filaModo = (i) =>
        darkMode ? (i % 2 === 0 ? 'bg-tienda-canvas/55' : 'bg-tienda-elevated/40') : i % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'

    /** Bordes visibles tipo cuadrícula (hoja de cálculo) */
    const gridTh = darkMode
        ? 'border border-emerald-800/70 bg-tienda-elevated/95 text-emerald-200'
        : 'border border-emerald-300 bg-emerald-50 text-emerald-900'
    const gridTd = darkMode ? 'border border-gray-600/90' : 'border border-gray-300'
    const gridTdModalTh = darkMode
        ? 'border border-emerald-800/70 bg-tienda-elevated/95'
        : 'border border-emerald-200 bg-emerald-50'
    const gridTdModal = darkMode ? 'border border-gray-600/90' : 'border border-gray-200'

    const detalleModal = modalId != null ? detallePorId[modalId] : null
    const rowModal = lista.find((r) => r.id === modalId)

    /** Fondo y texto cuando el filtro tiene valor (misma apariencia en tema claro/oscuro de la página). */
    const filtroConValorCls = '!bg-[#E5EBFD] !text-gray-900 placeholder:!text-gray-600 !border-slate-400/80'

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-wrap items-start gap-4">
                <div className={adminPageIconWrapClass(darkMode)}>
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <div className="min-w-0 flex-1">
                    <h1 className={adminPageTitleClass(darkMode)}>Cotizaciones por correo de clientes invitados</h1>
                    <div className={adminTitleAccentBarClass(darkMode)} aria-hidden />
                    <p className={adminPageSubtitleClass(darkMode)}>
                        Listado de cotizaciones enviadas por correo a quienes no tenían cuenta. Los datos coinciden con el PDF enviado.
                    </p>
                </div>
            </div>

            <div className={`${adminMainCardClass(darkMode)} relative`}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4 border-emerald-500/15 dark:border-emerald-500/20">
                    <div className="flex flex-wrap items-center gap-3">
                        {columnTitle('Registros')}
                        <span className={`text-sm ${darkMode ? 'text-emerald-200/80' : 'text-emerald-800/90'}`}>
                            Total: {total} · Página {paginaActual} de {lastPage || 1}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        {tableRefreshing && (
                            <span className={`inline-flex items-center gap-1.5 ${darkMode ? 'text-emerald-400/90' : 'text-emerald-700'}`}>
                                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" aria-hidden />
                                Actualizando tabla…
                            </span>
                        )}
                        <span className={darkMode ? 'text-gray-500' : 'text-gray-500'} title="La tabla se actualiza sola cada minuto">
                            Auto-actualización: 1 min
                        </span>
                    </div>
                </div>

                <div className={`relative ${adminTableShellClass(darkMode)}`}>
                    {loading && (
                        <div className={`absolute inset-0 z-10 flex items-center justify-center rounded-xl ${darkMode ? 'bg-tienda-canvas/70' : 'bg-white/80'}`}>
                            <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Cargando…</p>
                        </div>
                    )}
                    <table className="table-fixed w-full min-w-[800px] text-sm border-collapse border border-emerald-900/40 dark:border-emerald-800/50">
                        <colgroup>
                            <col className="w-[13%]" />
                            <col className="w-[39%]" />
                            <col className="w-[28%]" />
                            <col className="w-[20%]" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th className={`px-3 py-3 text-left font-bold uppercase tracking-wide text-xs ${gridTh}`}>
                                    Folio
                                </th>
                                <th className={`px-3 py-3 text-left font-bold uppercase tracking-wide text-xs ${gridTh}`}>
                                    Correo electrónico
                                </th>
                                <th className={`px-3 py-3 text-left font-bold uppercase tracking-wide text-xs whitespace-nowrap ${gridTh}`}>
                                    Fecha y hora
                                </th>
                                <th className={`px-3 py-3 text-left font-bold uppercase tracking-wide text-xs ${gridTh}`}>
                                    Acciones
                                </th>
                            </tr>
                            <tr>
                                <th className={`px-3 py-2 align-top min-w-0 overflow-hidden ${gridTh}`}>
                                    <label className={`sr-only`} htmlFor="filtro-folio-cot-inv">
                                        Buscar folio
                                    </label>
                                    <input
                                        id="filtro-folio-cot-inv"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        placeholder="Buscar…"
                                        value={folioInput}
                                        onChange={(e) => setFolioInput(e.target.value)}
                                        className={`${adminFilterInputClass(darkMode, false, 'w-full min-w-0 max-w-full box-border text-xs py-1.5')} ${folioInput.trim() ? filtroConValorCls : ''}`}
                                    />
                                </th>
                                <th className={`px-3 py-2 align-top min-w-0 overflow-hidden ${gridTh}`}>
                                    <label className={`sr-only`} htmlFor="filtro-email-cot-inv">
                                        Filtrar por correo
                                    </label>
                                    <select
                                        id="filtro-email-cot-inv"
                                        value={filtroEmail}
                                        onChange={(e) => setFiltroEmail(e.target.value)}
                                        className={`${adminFilterSelectClass(filtroEmail ? false : darkMode, false, 'w-full max-w-full text-xs py-1.5 min-w-0')} ${filtroEmail ? filtroConValorCls : ''}`}
                                    >
                                        <option value="">Todos</option>
                                        {emailsLista.map((em) => (
                                            <option key={em} value={em}>
                                                {em}
                                            </option>
                                        ))}
                                    </select>
                                </th>
                                <th className={`px-3 py-2 align-top ${gridTh}`}>
                                    <div className="flex flex-row items-end gap-1.5">
                                        <div className="min-w-0 flex-1 max-w-[min(100%,9.25rem)]">
                                            <span className={`block text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${darkMode ? 'text-emerald-400/90' : 'text-emerald-800'}`}>
                                                Desde
                                            </span>
                                            <input
                                                type="date"
                                                value={fechaDesde}
                                                onChange={(e) => setFechaDesde(e.target.value)}
                                                className={`${adminFilterInputClass(darkMode, false, 'w-full min-w-0 max-w-full text-xs py-1')} ${fechaDesde ? `${filtroConValorCls} admin-date-input-filled` : darkMode ? 'admin-date-input-dark' : ''}`}
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1 max-w-[min(100%,9.25rem)]">
                                            <span className={`block text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${darkMode ? 'text-emerald-400/90' : 'text-emerald-800'}`}>
                                                Hasta
                                            </span>
                                            <input
                                                type="date"
                                                value={fechaHasta}
                                                onChange={(e) => setFechaHasta(e.target.value)}
                                                className={`${adminFilterInputClass(darkMode, false, 'w-full min-w-0 max-w-full text-xs py-1')} ${fechaHasta ? `${filtroConValorCls} admin-date-input-filled` : darkMode ? 'admin-date-input-dark' : ''}`}
                                            />
                                        </div>
                                    </div>
                                </th>
                                <th className={`px-3 py-2 ${gridTh}`} aria-hidden />
                            </tr>
                        </thead>
                        <tbody>
                            {!loading && lista.length === 0 && (
                                <tr>
                                    <td colSpan={4} className={`px-4 py-12 text-center ${gridTd} ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        No hay cotizaciones registradas.
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                lista.map((row, i) => (
                                    <tr
                                        key={row.id}
                                        className={`${filaModo(i)} transition-colors ${
                                            darkMode ? 'hover:bg-emerald-950/25' : 'hover:bg-emerald-50/70'
                                        }`}
                                    >
                                        <td className={`px-3 py-3.5 align-middle tabular-nums font-semibold ${gridTd} ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>
                                            {row.folio ?? row.id}
                                        </td>
                                        <td className={`px-3 py-3.5 align-middle ${gridTd} ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                            <span className="font-medium break-all">{row.email}</span>
                                        </td>
                                        <td className={`px-3 py-3.5 align-middle whitespace-nowrap tabular-nums ${gridTd} ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {fechaLegible(row.fecha)}
                                        </td>
                                        <td className={`px-3 py-3.5 align-top text-left ${gridTd}`}>
                                            <div className="flex flex-col gap-2 items-start">
                                                <button
                                                    type="button"
                                                    onClick={() => abrirModalProductos(row.id)}
                                                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border shadow-sm transition-colors ${
                                                        darkMode
                                                            ? 'border-emerald-600/80 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-900/40'
                                                            : 'border-emerald-400 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                                                    }`}
                                                >
                                                    <svg className="w-4 h-4 shrink-0 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    Ver productos
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={downloadingPdfId === row.id}
                                                    onClick={() => handleDescargarPdf(row.id)}
                                                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border shadow-sm transition-colors disabled:opacity-60 ${
                                                        darkMode
                                                            ? 'border-gray-500 bg-tienda-elevated/80 text-gray-100 hover:bg-gray-700'
                                                            : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <Image src="/Imagenes/icon_descarga.webp" alt="" width={14} height={14} className={darkMode ? 'brightness-0 invert opacity-90' : ''} />
                                                    {downloadingPdfId === row.id ? 'Descargando…' : 'Descargar cotización'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                {lastPage > 1 &&
                    (() => {
                        const totalP = lastPage
                        const { windowPages, showEllipsis, showLastPage } = getPaginationWindow(paginaActual, totalP)
                        const btnPagina = (num) => (
                            <button
                                key={num}
                                type="button"
                                onClick={() => setPaginaActual(num)}
                                className={`min-w-[2.5rem] h-10 px-3 rounded-lg font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent ${
                                    num === paginaActual
                                        ? 'bg-emerald-600 text-white shadow-md focus:ring-emerald-500'
                                        : darkMode
                                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600 focus:ring-gray-500'
                                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300 focus:ring-gray-400'
                                }`}
                            >
                                {num}
                            </button>
                        )
                        return (
                            <div className="mt-4 pb-4 flex flex-wrap items-center justify-center gap-2">
                                {totalP > 1 && paginaActual > 1 && (
                                    <button
                                        key="first"
                                        type="button"
                                        onClick={() => setPaginaActual(1)}
                                        className={`min-w-[2.5rem] h-10 px-3 rounded-lg font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                            darkMode
                                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300'
                                        }`}
                                        title="Primera página"
                                    >
                                        &laquo;&laquo;
                                    </button>
                                )}
                                {windowPages.map((num) => btnPagina(num))}
                                {showEllipsis && (
                                    <span
                                        className={`min-w-[2.5rem] h-10 px-2 flex items-center justify-center rounded-lg text-sm ${
                                            darkMode ? 'text-gray-400' : 'text-gray-500'
                                        }`}
                                    >
                                        ...
                                    </span>
                                )}
                                {showLastPage && totalP > 7 && btnPagina(totalP)}
                                {totalP > 1 && paginaActual < totalP && (
                                    <button
                                        key="last"
                                        type="button"
                                        onClick={() => setPaginaActual(totalP)}
                                        className={`min-w-[2.5rem] h-10 px-3 rounded-lg font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                            darkMode
                                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300'
                                        }`}
                                        title="Última página"
                                    >
                                        &raquo;&raquo;
                                    </button>
                                )}
                            </div>
                        )
                    })()}
            </div>

            {/* Modal productos */}
            {modalId != null && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={cerrarModal} aria-hidden />
                    <div
                        className={`fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 sm:max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${
                            darkMode ? 'bg-tienda-elevated border border-gray-700' : 'bg-white border border-gray-200'
                        }`}
                    >
                        <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-emerald-600/25 border-b border-emerald-500/30">
                            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Productos de la cotización</h3>
                            <button
                                type="button"
                                onClick={cerrarModal}
                                className="p-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 transition-colors"
                                aria-label="Cerrar"
                            >
                                <span className="text-xl leading-none">×</span>
                            </button>
                        </div>
                        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
                            {(rowModal || detalleModal) && (
                                <div className={`rounded-xl p-4 mb-4 ${darkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-100 border border-gray-200'}`}>
                                    <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Folio</p>
                                    <p className={`font-semibold tabular-nums ${darkMode ? 'text-white' : 'text-gray-900'}`}>{rowModal?.folio ?? rowModal?.id ?? detalleModal?.folio ?? detalleModal?.id ?? '—'}</p>
                                    <p className={`text-xs font-semibold uppercase tracking-wider mt-3 mb-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Correo</p>
                                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{rowModal?.email ?? detalleModal?.email ?? '—'}</p>
                                    <p className={`text-xs font-semibold uppercase tracking-wider mt-3 mb-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Fecha</p>
                                    <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{fechaLegible(rowModal?.fecha ?? detalleModal?.fecha)}</p>
                                </div>
                            )}
                            {cargandoDetalleModal && (
                                <div className="flex items-center justify-center py-12">
                                    <span className={`inline-flex items-center gap-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                                        Cargando productos…
                                    </span>
                                </div>
                            )}
                            {!cargandoDetalleModal && detalleModal?.error && (
                                <p className="text-red-400 text-sm text-center py-8">No se pudo cargar el detalle.</p>
                            )}
                            {!cargandoDetalleModal && detalleModal && !detalleModal.error && (
                                <>
                                    <div className={`rounded-xl overflow-hidden ${darkMode ? 'border border-gray-600' : 'border border-gray-300'}`}>
                                        <table className="w-full text-sm border-collapse">
                                            <thead>
                                                <tr>
                                                    <th className={`px-3 py-2.5 text-left text-xs font-bold uppercase ${darkMode ? 'text-emerald-200' : 'text-emerald-900'} ${gridTdModalTh}`}>Producto</th>
                                                    <th className={`px-3 py-2.5 text-center w-16 text-xs font-bold uppercase ${darkMode ? 'text-emerald-200' : 'text-emerald-900'} ${gridTdModalTh}`}>Cant.</th>
                                                    <th className={`px-3 py-2.5 text-right w-28 text-xs font-bold uppercase ${darkMode ? 'text-emerald-200' : 'text-emerald-900'} ${gridTdModalTh}`}>P. unit.</th>
                                                    <th className={`px-3 py-2.5 text-right w-28 text-xs font-bold uppercase ${darkMode ? 'text-emerald-200' : 'text-emerald-900'} ${gridTdModalTh}`}>Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(detalleModal.items || []).map((it, idx) => (
                                                    <tr key={idx} className={darkMode ? 'bg-tienda-elevated/50' : 'bg-white'}>
                                                        <td className={`px-3 py-2.5 ${gridTdModal} ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                            {it.nombre_producto}
                                                            {it.clave ? <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}> ({it.clave})</span> : null}
                                                        </td>
                                                        <td className={`px-3 py-2.5 text-center ${gridTdModal} ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{it.cantidad}</td>
                                                        <td className={`px-3 py-2.5 text-right tabular-nums ${gridTdModal} ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{formatPrecio(it.precio_unitario)}</td>
                                                        <td className={`px-3 py-2.5 text-right font-semibold text-emerald-500 tabular-nums ${gridTdModal}`}>{formatPrecio(it.subtotal)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className={`mt-4 text-right text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                        Total: <span className="text-emerald-500">{formatPrecio(detalleModal.total)}</span>
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
