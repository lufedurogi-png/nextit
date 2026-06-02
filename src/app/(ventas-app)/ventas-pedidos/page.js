'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import axios from '@/lib/axios'
import { getPaginationWindow } from '@/lib/pagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useAdminTheme } from '@/contexts/AdminThemeContext'

const card =
    'rounded-2xl border border-orange-100 bg-white shadow-sm dark:border-orange-900/40 dark:bg-[#262626]/80 overflow-hidden'

const PER_PAGE_OPTIONS = [5, 10, 25, 50, 100]

const METODO_PAGO_FILTRO_OPTIONS = [
    { value: 'todos', label: 'Todos' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'MercadoPago', label: 'Mercado Pago' },
    { value: 'Transferencia', label: 'Transferencia' },
    { value: 'Tarjeta', label: 'Tarjeta' },
    { value: 'Efectivo', label: 'Efectivo' },
]

const ESTATUS_PEDIDO_DEF = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'enviado', label: 'Enviado' },
    { value: 'completado', label: 'Completado' },
    { value: 'cancelado', label: 'Cancelado' },
]

const ESTATUS_PEDIDO_FILTRO = [{ value: 'todos', label: 'Todos' }, ...ESTATUS_PEDIDO_DEF]

const ESTATUS_KEYS = new Set(ESTATUS_PEDIDO_DEF.map((o) => o.value))

function normalizeEstatusKey(raw) {
    const k = String(raw || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
    return ESTATUS_KEYS.has(k) ? k : 'pendiente'
}

function estatusLabel(raw) {
    const k = normalizeEstatusKey(raw)
    return ESTATUS_PEDIDO_DEF.find((o) => o.value === k)?.label ?? raw ?? '—'
}

function montoFmt(n) {
    if (n == null || Number.isNaN(Number(n))) return '—'
    return Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function PagoBadge({ estado, darkMode }) {
    const e = String(estado || '').toLowerCase()
    const base = 'inline-flex px-2 py-0.5 rounded-md text-xs font-medium border'

    if (e === 'pagado') {
        return (
            <span className={`${base} ${darkMode ? 'bg-orange-500/15 text-orange-300 border-orange-500/40' : 'bg-orange-50 text-orange-800 border-orange-200'}`}>
                Pagado
            </span>
        )
    }
    if (e === 'reembolsado') {
        return (
            <span className={`${base} ${darkMode ? 'bg-amber-500/15 text-amber-300 border-amber-500/40' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                Reembolsado
            </span>
        )
    }
    return (
        <span className={`${base} ${darkMode ? 'bg-slate-500/15 text-slate-300 border-slate-500/40' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
            Pendiente
        </span>
    )
}

export default function VentasPedidosPage() {
    const { darkMode } = useAdminTheme()

    const [fechaDesde, setFechaDesde] = useState('')
    const [fechaHasta, setFechaHasta] = useState('')
    const [pagoFiltro, setPagoFiltro] = useState('todos')
    const [metodoPagoFiltro, setMetodoPagoFiltro] = useState('todos')
    const [estatusFiltro, setEstatusFiltro] = useState('todos')
    const [folioBusqueda, setFolioBusqueda] = useState('')
    const [clienteBusqueda, setClienteBusqueda] = useState('')
    const debouncedCliente = useDebounce(clienteBusqueda, 400)

    const [registrosPorPagina, setRegistrosPorPagina] = useState(10)
    const [paginaActual, setPaginaActual] = useState(1)

    const [pedidosData, setPedidosData] = useState({
        pedidos: [],
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
    })
    const [loadingPedidos, setLoadingPedidos] = useState(true)
    const [downloadingPdfId, setDownloadingPdfId] = useState(null)
    const [detallePedidoId, setDetallePedidoId] = useState(null)
    const [detallePedido, setDetallePedido] = useState(null)
    const [loadingDetalle, setLoadingDetalle] = useState(false)

    const [updatingEstatusId, setUpdatingEstatusId] = useState(null)

    const filterInputBase =
        'w-full min-w-0 px-3 py-2 rounded-lg border text-sm transition focus:outline-none focus:ring-2'
    const filterInputClass = (active = false) =>
        darkMode
            ? `${filterInputBase} ${active ? 'bg-tienda-elevated border-orange-600/60 focus:ring-orange-400/40 text-gray-100' : 'bg-tienda-canvas/70 border-gray-600 focus:ring-orange-400/25 text-gray-100'}`
            : `${filterInputBase} ${active ? 'bg-white border-orange-300/80 focus:ring-orange-400/30 text-gray-900' : 'bg-white border-gray-300 focus:ring-orange-400/20 text-gray-900'}`

    const headCellMutedClass = darkMode ? 'text-gray-300' : 'text-slate-800'
    const rowMutedClass = darkMode ? 'text-gray-500' : 'text-gray-600'

    const fetchPedidos = useCallback(
        async (silent = false) => {
            if (!silent) setLoadingPedidos(true)
            try {
                const params = new URLSearchParams()
                if (fechaDesde) params.set('fecha_desde', fechaDesde)
                if (fechaHasta) params.set('fecha_hasta', fechaHasta)
                if (pagoFiltro !== 'todos') params.set('pago', pagoFiltro)
                if (metodoPagoFiltro !== 'todos') params.set('metodo_pago', metodoPagoFiltro)
                if (estatusFiltro !== 'todos') params.set('estatus', estatusFiltro)
                if (folioBusqueda.trim()) params.set('folio', folioBusqueda.trim())
                if (debouncedCliente.trim()) params.set('cliente', debouncedCliente.trim())
                params.set('per_page', registrosPorPagina)
                params.set('page', paginaActual)

                const { data } = await axios.get(`/admin/pedidos?${params}`)
                if (data?.success && data?.data) {
                    setPedidosData({
                        pedidos: data.data.pedidos || [],
                        total: data.data.total ?? 0,
                        per_page: data.data.per_page ?? registrosPorPagina,
                        current_page: data.data.current_page ?? 1,
                        last_page: data.data.last_page ?? 1,
                    })
                } else {
                    setPedidosData({ pedidos: [], total: 0, per_page: registrosPorPagina, current_page: 1, last_page: 1 })
                }
            } catch {
                setPedidosData({ pedidos: [], total: 0, per_page: registrosPorPagina, current_page: 1, last_page: 1 })
            } finally {
                if (!silent) setLoadingPedidos(false)
            }
        },
        [
            fechaDesde,
            fechaHasta,
            pagoFiltro,
            metodoPagoFiltro,
            estatusFiltro,
            folioBusqueda,
            debouncedCliente,
            registrosPorPagina,
            paginaActual,
        ],
    )

    useEffect(() => {
        fetchPedidos()
    }, [fetchPedidos])

    useEffect(() => {
        setPaginaActual(1)
    }, [fechaDesde, fechaHasta, pagoFiltro, metodoPagoFiltro, estatusFiltro, folioBusqueda, debouncedCliente, registrosPorPagina])

    useEffect(() => {
        if (detallePedidoId == null) {
            setDetallePedido(null)
            setLoadingDetalle(false)
            return
        }
        setLoadingDetalle(true)
        axios
            .get(`/admin/pedidos/${detallePedidoId}`)
            .then(({ data }) => {
                if (data?.success && data?.data) setDetallePedido(data.data)
                else setDetallePedido(null)
            })
            .catch(() => setDetallePedido(null))
            .finally(() => setLoadingDetalle(false))
    }, [detallePedidoId])

    const handleDescargarPdf = async (id, folio) => {
        setDownloadingPdfId(id)
        try {
            const { data } = await axios.get(`/admin/pedidos/${id}/pdf`, { responseType: 'blob' })
            const url = URL.createObjectURL(new Blob([data]))
            const a = document.createElement('a')
            a.href = url
            a.download = `pedido-${folio}.pdf`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            /* noop */
        } finally {
            setDownloadingPdfId(null)
        }
    }

    const handleEstatusChange = async (pedidoId, nuevoEstatus) => {
        setUpdatingEstatusId(pedidoId)
        try {
            const { data } = await axios.patch(`/admin/pedidos/${pedidoId}/estatus`, { estatus_pedido: nuevoEstatus })
            if (data?.success) {
                setPedidosData((prev) => ({
                    ...prev,
                    pedidos: prev.pedidos.map((p) => (p.id === pedidoId ? { ...p, estatus_pedido: nuevoEstatus } : p)),
                }))
                setDetallePedido((d) => (d && d.id === pedidoId ? { ...d, estatus_pedido: nuevoEstatus } : d))
            } else {
                await fetchPedidos(true)
            }
        } finally {
            setUpdatingEstatusId(null)
        }
    }

    const { pedidos, total, current_page, last_page } = pedidosData

    const rowSelectClass = darkMode
        ? 'w-full max-w-[220px] px-2 py-1.5 text-sm rounded-lg border bg-tienda-canvas/70 border-gray-600 text-gray-100 focus:ring-2 focus:ring-orange-500/40 disabled:opacity-50'
        : 'w-full max-w-[220px] px-2 py-1.5 text-sm rounded-lg border bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-orange-500/30 disabled:opacity-50'

    const activePill = darkMode ? 'bg-orange-600/15 text-orange-300 border-orange-500/30' : 'bg-orange-100 text-orange-800 border-orange-200'

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-orange-950 dark:text-white">Historial de pedidos</h1>
                    <p className="text-sm text-orange-800/70 dark:text-orange-200/60 mt-1">Consulta y seguimiento de pedidos.</p>
                </div>
            </div>

            <div className={card}>
                <div className={`px-5 py-4 border-b ${darkMode ? 'border-orange-900/30 bg-orange-600/15' : 'border-orange-100 bg-orange-50/70'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span
                                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                                    darkMode ? 'bg-orange-500/30 text-orange-300' : 'bg-orange-100 text-orange-700'
                                }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3"
                                    />
                                </svg>
                            </span>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Listado de pedidos</h2>
                        </div>

                        {!loadingPedidos && (
                            <span className={`text-sm font-medium px-3 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                                {total} pedido{total !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className={`w-full text-sm border-collapse min-w-[1120px] ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        <thead>
                            <tr className={darkMode ? 'border-b-2 border-orange-900/30 bg-orange-950/30' : 'border-b-2 border-orange-100 bg-orange-50/60'}>
                                <th className={`align-top px-2 py-3.5 border-r border-orange-100/50 dark:border-orange-900/30 w-[1%] min-w-[200px] max-w-[280px]`}>
                                    <div className={`text-xs font-bold ${headCellMutedClass} mb-2`}>Fecha</div>
                                    <div className="grid grid-cols-2 gap-x-2 w-full min-w-0">
                                        <div className="min-w-0">
                                            <div className="mb-1 flex items-center gap-1 justify-start text-[11px] font-bold uppercase tracking-wide text-orange-700/80 dark:text-orange-200/70">
                                                Desde
                                            </div>
                                            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className={filterInputClass(!!fechaDesde)} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="mb-1 flex items-center gap-1 justify-end text-[11px] font-bold uppercase tracking-wide text-orange-700/80 dark:text-orange-200/70">
                                                Hasta
                                            </div>
                                            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className={filterInputClass(!!fechaHasta)} />
                                        </div>
                                    </div>
                                </th>

                                <th className={`align-top px-3 py-3.5 border-r border-orange-100/50 dark:border-orange-900/30 min-w-[108px]`}>
                                    <div className="text-xs font-bold text-orange-950 dark:text-orange-100 mb-2">Folio</div>
                                    <input
                                        type="text"
                                        placeholder="Buscar…"
                                        value={folioBusqueda}
                                        onChange={(e) => setFolioBusqueda(e.target.value)}
                                        className={filterInputClass(!!folioBusqueda.trim())}
                                    />
                                </th>

                                <th className={`align-top px-3 py-3.5 border-r border-orange-100/50 dark:border-orange-900/30 min-w-[148px]`}>
                                    <div className="text-xs font-bold text-orange-950 dark:text-orange-100 mb-2">Cliente</div>
                                    <input
                                        type="text"
                                        placeholder="Nombre o email"
                                        value={clienteBusqueda}
                                        onChange={(e) => setClienteBusqueda(e.target.value)}
                                        className={filterInputClass(!!clienteBusqueda.trim())}
                                    />
                                </th>

                                <th className={`align-top px-3 py-3.5 border-r border-orange-100/50 dark:border-orange-900/30 w-[76px]`}>
                                    <div className="text-xs font-bold text-orange-950 dark:text-orange-100 mb-2 text-right">Monto</div>
                                </th>

                                <th className={`align-top px-3 py-3.5 border-r border-orange-100/50 dark:border-orange-900/30 min-w-[128px]`}>
                                    <div className="text-xs font-bold text-orange-950 dark:text-orange-100 mb-2">Método pago</div>
                                    <select value={metodoPagoFiltro} onChange={(e) => setMetodoPagoFiltro(e.target.value)} className={filterInputClass(metodoPagoFiltro !== 'todos')}>
                                        {METODO_PAGO_FILTRO_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                </th>

                                <th className={`align-top px-3 py-3.5 border-r border-orange-100/50 dark:border-orange-900/30 min-w-[118px]`}>
                                    <div className="text-xs font-bold text-orange-950 dark:text-orange-100 mb-2">Pago</div>
                                    <select value={pagoFiltro} onChange={(e) => setPagoFiltro(e.target.value)} className={filterInputClass(pagoFiltro !== 'todos')}>
                                        <option value="todos">Todos</option>
                                        <option value="pagado">Pagado</option>
                                        <option value="pendiente">Pendiente</option>
                                        <option value="reembolsado">Reembolsado</option>
                                    </select>
                                </th>

                                <th className={`align-top px-3 py-3.5 border-r border-orange-100/50 dark:border-orange-900/30 min-w-[168px]`}>
                                    <div className="text-xs font-bold text-orange-950 dark:text-orange-100 mb-2">Estatus</div>
                                    <select value={estatusFiltro} onChange={(e) => setEstatusFiltro(e.target.value)} className={filterInputClass(estatusFiltro !== 'todos')}>
                                        {ESTATUS_PEDIDO_FILTRO.map((o) => (
                                            <option key={o.value} value={o.value}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                </th>

                                <th className={`align-top px-3 py-3.5 border-r border-orange-100/50 dark:border-orange-900/30 min-w-[120px]`}>
                                    <div className="text-xs font-bold text-orange-950 dark:text-orange-100 mb-2 text-left">Envío</div>
                                </th>

                                <th className={`align-top px-3 py-3.5`}>
                                    <div className="text-xs font-bold text-orange-950 dark:text-orange-100 mb-2 text-right">Acciones</div>
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {loadingPedidos ? (
                                <tr>
                                    <td colSpan={9} className={`px-4 py-12 text-center ${rowMutedClass}`}>
                                        <div className="flex flex-col items-center gap-3">
                                            <svg className="animate-spin h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" aria-hidden>
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Cargando pedidos…
                                        </div>
                                    </td>
                                </tr>
                            ) : pedidos.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className={`px-4 py-12 text-center ${rowMutedClass}`}>No hay pedidos con los filtros aplicados.</td>
                                </tr>
                            ) : (
                                pedidos.map((pedido, i) => (
                                    <tr
                                        key={pedido.id}
                                        className={`border-b transition-colors ${
                                            darkMode ? `hover:bg-gray-700/25 border-orange-900/20` : `hover:bg-orange-50/30 border-orange-100/60`
                                        } ${i % 2 === 1 ? (darkMode ? 'bg-tienda-elevated/35' : 'bg-orange-50/20') : ''}`}
                                    >
                                        <td className={`py-3 px-4 border-r border-orange-100/60 dark:border-orange-900/30 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                            {pedido.fecha}
                                        </td>
                                        <td className={`py-3 px-4 border-r border-orange-100/60 dark:border-orange-900/30 font-medium ${darkMode ? 'text-orange-200' : 'text-orange-900'}`}>
                                            {pedido.folio}
                                        </td>
                                        <td className={`py-3 px-4 border-r border-orange-100/60 dark:border-orange-900/30 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{pedido.user_name || '—'}</span>
                                                {pedido.user_email && <span className={`text-xs ${rowMutedClass}`}>{pedido.user_email}</span>}
                                            </div>
                                        </td>

                                        <td className={`py-3 px-4 border-r border-orange-100/60 dark:border-orange-900/30 text-right font-semibold text-orange-500`}>
                                            $ {montoFmt(pedido.monto)}
                                        </td>

                                        <td className={`py-3 px-4 border-r border-orange-100/60 dark:border-orange-900/30 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                            {pedido.metodo_pago}
                                        </td>

                                        <td className={`py-3 px-4 border-r border-orange-100/60 dark:border-orange-900/30`}>
                                            <PagoBadge estado={pedido.estado_pago} darkMode={darkMode} />
                                        </td>

                                        <td className={`py-3 px-4 border-r border-orange-100/60 dark:border-orange-900/30 align-middle`}>
                                            <select
                                                value={normalizeEstatusKey(pedido.estatus_pedido)}
                                                disabled={updatingEstatusId === pedido.id}
                                                onChange={(e) => handleEstatusChange(pedido.id, e.target.value)}
                                                className={rowSelectClass}
                                                aria-label={`Cambiar estatus del pedido ${pedido.folio}`}
                                            >
                                                {ESTATUS_PEDIDO_DEF.map((o) => (
                                                    <option key={o.value} value={o.value}>
                                                        {o.label}
                                                    </option>
                                                ))}
                                            </select>
                                            {updatingEstatusId === pedido.id && <span className={`ml-2 text-xs ${rowMutedClass}`}>Guardando…</span>}
                                        </td>

                                        <td className={`py-3 px-3 border-r border-orange-100/60 dark:border-orange-900/30 align-middle text-center`}>
                                            <div className="flex flex-col items-center gap-1">
                                                {pedido.envio != null && Number(pedido.envio.costo_envio) > 0 ? (
                                                    <span className="text-xs font-semibold tabular-nums text-orange-400">
                                                        $ {Number(pedido.envio.costo_envio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                    </span>
                                                ) : pedido.envio != null ? (
                                                    <span className={`text-xs ${rowMutedClass}`}>$ 0.00</span>
                                                ) : (
                                                    <span className={`text-xs ${rowMutedClass}`}>—</span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2 justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDescargarPdf(pedido.id, pedido.folio)}
                                                    disabled={!!downloadingPdfId}
                                                    className="p-2 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 transition-colors disabled:opacity-50"
                                                    title="Descargar PDF"
                                                >
                                                    <Image src="/Imagenes/icon_descarga.webp" alt="PDF" width={18} height={18} className="brightness-0 invert opacity-90" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDetallePedidoId(pedido.id)}
                                                    className="p-2 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 transition-colors"
                                                    title="Ver detalle"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {last_page >= 1 && (
                    <div
                        className={`px-5 py-4 flex flex-wrap items-center justify-between gap-4 border-t ${
                            darkMode ? 'border-orange-900/30' : 'border-orange-100/70'
                        }`}
                    >
                        <p className={`text-sm ${rowMutedClass}`}>
                            Página {current_page} de {Math.max(1, last_page)}
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPaginaActual(1)}
                                disabled={current_page === 1}
                                className={`min-w-[2.5rem] h-10 px-3 rounded-lg text-sm font-semibold disabled:opacity-50 ${
                                    darkMode
                                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                ««
                            </button>

                            {(() => {
                                const totalP = Math.max(1, last_page)
                                const { windowPages, showEllipsis, showLastPage } = getPaginationWindow(current_page, totalP)
                                return (
                                    <>
                                        {windowPages.map((num) => (
                                            <button
                                                key={num}
                                                type="button"
                                                onClick={() => setPaginaActual(num)}
                                                className={`min-w-[2.5rem] h-10 px-3 rounded-lg text-sm font-semibold ${
                                                    num === current_page
                                                        ? 'bg-orange-600 text-white'
                                                        : darkMode
                                                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }`}
                                            >
                                                {num}
                                            </button>
                                        ))}
                                        {showEllipsis && <span className={`px-2 ${rowMutedClass}`}>…</span>}
                                        {showLastPage && totalP > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setPaginaActual(totalP)}
                                                className={`min-w-[2.5rem] h-10 px-3 rounded-lg text-sm font-semibold ${
                                                    current_page === totalP
                                                        ? 'bg-orange-600 text-white'
                                                        : darkMode
                                                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }`}
                                            >
                                                {totalP}
                                            </button>
                                        )}
                                    </>
                                )
                            })()}

                            <button
                                type="button"
                                onClick={() => setPaginaActual(last_page)}
                                disabled={current_page === last_page}
                                className={`min-w-[2.5rem] h-10 px-3 rounded-lg text-sm font-semibold disabled:opacity-50 ${
                                    darkMode
                                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                »»
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {detallePedidoId != null && (
                <>
                    <div className="fixed inset-0 z-[62] bg-black/60 backdrop-blur-sm" onClick={() => setDetallePedidoId(null)} aria-hidden />
                    <div className={`fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 z-[63] w-[94%] sm:max-w-xl rounded-2xl shadow-2xl overflow-hidden sm:-translate-x-1/2 sm:-translate-y-1/2 flex flex-col ${
                        darkMode ? 'bg-tienda-elevated border border-gray-700' : 'bg-white border border-gray-200'
                    }`}>
                        <div className={`shrink-0 flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'bg-orange-600/20 border-orange-500/30' : 'bg-orange-50 border-orange-200'}`}>
                            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Pedido {detallePedido?.folio ?? '…'}</h3>
                            <button
                                type="button"
                                onClick={() => setDetallePedidoId(null)}
                                className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                                aria-label="Cerrar"
                            >
                                <span className="text-xl leading-none">×</span>
                            </button>
                        </div>

                        <div className={`p-5 sm:p-6 overflow-y-auto flex-1 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {!detallePedido ? (
                                <div className="flex items-center justify-center py-10">
                                    <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>{loadingDetalle ? 'Cargando…' : 'No disponible'}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className={`rounded-xl p-4 ${darkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-100 border border-gray-200'}`}>
                                        <p className="text-xs font-semibold uppercase tracking-wider mb-1">{'Cliente'}</p>
                                        <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{detallePedido.user_name || '—'}</p>
                                        {detallePedido.user_email && <p className={`text-sm ${rowMutedClass}`}>{detallePedido.user_email}</p>}
                                    </div>

                                    <div className={`grid grid-cols-2 gap-3 rounded-xl p-4 ${darkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-100 border border-gray-200'}`}>
                                        <div>
                                            <p className={`text-xs font-medium uppercase tracking-wider mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Fecha</p>
                                            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{detallePedido.fecha}</p>
                                        </div>
                                        <div>
                                            <p className={`text-xs font-medium uppercase tracking-wider mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Monto</p>
                                            <p className="font-semibold text-orange-500">$ {montoFmt(detallePedido.monto)}</p>
                                        </div>
                                        <div>
                                            <p className={`text-xs font-medium uppercase tracking-wider mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Método de pago</p>
                                            <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{detallePedido.metodo_pago}</p>
                                        </div>
                                        <div>
                                            <p className={`text-xs font-medium uppercase tracking-wider mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Estado</p>
                                            <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                {detallePedido.estado_pago} · {estatusLabel(detallePedido.estatus_pedido)}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <p className={`font-semibold mb-2 text-sm uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Productos</p>
                                        <div className={`rounded-xl border overflow-hidden ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                            <table className="w-full text-sm">
                                                <thead className={darkMode ? 'bg-gray-700/60' : 'bg-gray-100'}>
                                                    <tr>
                                                        <th className={`px-3 py-2 text-left text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Producto</th>
                                                        <th className={`px-3 py-2 text-center text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Cant.</th>
                                                        <th className={`px-3 py-2 text-right text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody className={darkMode ? 'divide-y divide-gray-600' : 'divide-y divide-gray-200'}>
                                                    {(detallePedido.items || []).map((it, idx) => (
                                                        <tr key={it.id ?? idx} className={darkMode ? 'bg-tienda-elevated/40' : 'bg-white'}>
                                                            <td className={`px-3 py-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                                {it.nombre_producto}
                                                            </td>
                                                            <td className={`px-3 py-2 text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{it.cantidad}</td>
                                                            <td className={`px-3 py-2 text-right font-medium text-orange-500`}>$ {montoFmt(it.subtotal)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleDescargarPdf(detallePedido.id ?? detallePedidoId, detallePedido.folio)}
                                        disabled={!!downloadingPdfId}
                                        className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-colors disabled:opacity-50 ${darkMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-orange-600 hover:bg-orange-700'}`}
                                    >
                                        Descargar PDF
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
