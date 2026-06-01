'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatHistorialFecha } from '@/lib/chatApi'
import {
    fetchVentasFichaCliente,
    fetchVentasFichaComentarios,
    crearVentasFichaComentario,
    fetchVentasFichaPedidos,
    fetchVentasFichaPedidoDetalle,
    fetchVentasFichaCotizaciones,
    fetchVentasFichaCotizacionDetalle,
    downloadVentasFichaPedidoPdf,
    downloadVentasFichaCotizacionPdf,
} from '@/lib/ventasChatFichaApi'
import VentasCorreosHistorialPaginacion from '@/components/ventas/VentasCorreosHistorialPaginacion'
import VentasFichaDetalleModal from '@/components/ventas/VentasFichaDetalleModal'
import { useAdminTheme } from '@/contexts/AdminThemeContext'

const purpleBtn =
    'rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50'
const purpleStyle = { background: 'linear-gradient(90deg, #5b4d7a, #8b7cb8)' }
const inputCls =
    'w-full rounded-lg border border-violet-100 bg-violet-50/50 px-2.5 py-1.5 text-xs dark:border-violet-800 dark:bg-[#12101a] dark:text-violet-100'

function Seccion({ title, children }) {
    return (
        <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-violet-400/60">{title}</p>
            {children}
        </div>
    )
}

function PaginacionFicha({ darkMode, meta, page, setPage }) {
    if (!meta?.last_page || meta.last_page <= 1) return null
    return (
        <div className="pt-1">
            <VentasCorreosHistorialPaginacion
                compact
                darkMode={darkMode}
                currentPage={page}
                lastPage={meta.last_page}
                onPageChange={setPage}
            />
        </div>
    )
}

export default function VentasFichaRapida({ clienteId, clienteFallback }) {
    const { darkMode } = useAdminTheme()
    const [cliente, setCliente] = useState(null)
    const [loadingCliente, setLoadingCliente] = useState(false)

    const [comentarioNuevo, setComentarioNuevo] = useState('')
    const [comentarios, setComentarios] = useState([])
    const [comMeta, setComMeta] = useState({})
    const [comPage, setComPage] = useState(1)
    const [comFiltro, setComFiltro] = useState('')
    const [comFiltroAplicado, setComFiltroAplicado] = useState('')
    const [loadingCom, setLoadingCom] = useState(false)
    const [guardandoCom, setGuardandoCom] = useState(false)
    const [errorCom, setErrorCom] = useState(null)

    const [pedidos, setPedidos] = useState([])
    const [pedMeta, setPedMeta] = useState({})
    const [pedPage, setPedPage] = useState(1)
    const [pedFolio, setPedFolio] = useState('')
    const [pedEstatus, setPedEstatus] = useState('todos')
    const [loadingPed, setLoadingPed] = useState(false)

    const [cotizaciones, setCotizaciones] = useState([])
    const [cotMeta, setCotMeta] = useState({})
    const [cotPage, setCotPage] = useState(1)
    const [cotFiltro, setCotFiltro] = useState('')
    const [cotTipo, setCotTipo] = useState('todos')
    const [loadingCot, setLoadingCot] = useState(false)

    const [modalOpen, setModalOpen] = useState(false)
    const [modalTitulo, setModalTitulo] = useState('')
    const [modalDetalle, setModalDetalle] = useState(null)
    const [modalLoading, setModalLoading] = useState(false)
    const [pdfLoading, setPdfLoading] = useState(false)
    const [modalKind, setModalKind] = useState(null)

    const cargarCliente = useCallback(async (id) => {
        if (!id) {
            setCliente(null)
            return
        }
        setLoadingCliente(true)
        try {
            const data = await fetchVentasFichaCliente(id)
            setCliente(data)
        } catch {
            setCliente(clienteFallback ? { ...clienteFallback } : null)
        } finally {
            setLoadingCliente(false)
        }
    }, [clienteFallback])

    const cargarComentarios = useCallback(async () => {
        if (!clienteId) return
        setLoadingCom(true)
        setErrorCom(null)
        try {
            const { rows, meta } = await fetchVentasFichaComentarios(clienteId, {
                page: comPage,
                q: comFiltroAplicado,
            })
            setComentarios(rows)
            setComMeta(meta)
        } catch (err) {
            setComentarios([])
            setErrorCom(err.message)
        } finally {
            setLoadingCom(false)
        }
    }, [clienteId, comPage, comFiltroAplicado])

    const cargarPedidos = useCallback(async () => {
        if (!clienteId) return
        setLoadingPed(true)
        try {
            const { rows, meta } = await fetchVentasFichaPedidos(clienteId, {
                page: pedPage,
                folio: pedFolio,
                estatus: pedEstatus,
            })
            setPedidos(rows)
            setPedMeta(meta)
        } catch {
            setPedidos([])
        } finally {
            setLoadingPed(false)
        }
    }, [clienteId, pedPage, pedFolio, pedEstatus])

    const cargarCotizaciones = useCallback(async () => {
        if (!clienteId) return
        setLoadingCot(true)
        try {
            const { rows, meta } = await fetchVentasFichaCotizaciones(clienteId, {
                page: cotPage,
                q: cotFiltro,
                tipo: cotTipo,
            })
            setCotizaciones(rows)
            setCotMeta(meta)
        } catch {
            setCotizaciones([])
        } finally {
            setLoadingCot(false)
        }
    }, [clienteId, cotPage, cotFiltro, cotTipo])

    useEffect(() => {
        setComPage(1)
        setPedPage(1)
        setCotPage(1)
        setComentarioNuevo('')
        setComFiltro('')
        setComFiltroAplicado('')
        cargarCliente(clienteId)
    }, [clienteId, cargarCliente])

    useEffect(() => {
        cargarComentarios()
    }, [cargarComentarios])

    useEffect(() => {
        cargarPedidos()
    }, [cargarPedidos])

    useEffect(() => {
        cargarCotizaciones()
    }, [cargarCotizaciones])

    const handleGuardarComentario = async () => {
        const texto = comentarioNuevo.trim()
        if (!clienteId || !texto || guardandoCom) return
        setGuardandoCom(true)
        setErrorCom(null)
        try {
            await crearVentasFichaComentario(clienteId, texto)
            setComentarioNuevo('')
            setComPage(1)
            const { rows, meta } = await fetchVentasFichaComentarios(clienteId, { page: 1, q: comFiltroAplicado })
            setComentarios(rows)
            setComMeta(meta)
        } catch (err) {
            setErrorCom(err.message)
        } finally {
            setGuardandoCom(false)
        }
    }

    const abrirPedido = async (row) => {
        setModalOpen(true)
        setModalKind('pedido')
        setModalTitulo(`Pedido ${row.folio}`)
        setModalDetalle(null)
        setModalLoading(true)
        try {
            const det = await fetchVentasFichaPedidoDetalle(clienteId, row.id)
            setModalDetalle(det)
        } catch {
            setModalDetalle(null)
        } finally {
            setModalLoading(false)
        }
    }

    const abrirCotizacion = async (row) => {
        setModalOpen(true)
        setModalKind('cotizacion')
        setModalTitulo(`Cotización ${row.folio}`)
        setModalDetalle(null)
        setModalLoading(true)
        try {
            const det = await fetchVentasFichaCotizacionDetalle(clienteId, row.tipo, row.id)
            setModalDetalle(det)
        } catch {
            setModalDetalle(null)
        } finally {
            setModalLoading(false)
        }
    }

    const handleModalPdf = async () => {
        if (!modalDetalle || !clienteId) return
        setPdfLoading(true)
        try {
            if (modalKind === 'pedido') {
                await downloadVentasFichaPedidoPdf(clienteId, modalDetalle.id, modalDetalle.folio)
            } else {
                await downloadVentasFichaCotizacionPdf(clienteId, modalDetalle)
            }
        } catch {
            //
        } finally {
            setPdfLoading(false)
        }
    }

    if (!clienteId) {
        return (
            <p className="text-xs text-violet-700/70 dark:text-violet-300/60 p-4 shrink-0">
                Selecciona un cliente para ver su ficha.
            </p>
        )
    }

    const activo = cliente || clienteFallback
    const initial = (activo?.name || activo?.email || '?').charAt(0).toUpperCase()

    return (
        <>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-5 text-sm">
                {loadingCliente && !activo ? (
                    <p className="text-xs text-violet-700/70 dark:text-violet-300/60">Cargando ficha…</p>
                ) : (
                    <>
                        <div className="flex flex-col items-center text-center">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-200 to-violet-400 dark:from-violet-700 dark:to-violet-500 mb-2 flex items-center justify-center text-xl font-bold text-white">
                                {initial}
                            </div>
                            <p className="font-semibold">{activo?.name || '—'}</p>
                            <p className="text-xs text-violet-700 dark:text-violet-300/70">{activo?.email || '—'}</p>
                            {activo?.telefono && <p className="text-xs text-gray-500 mt-1">{activo.telefono}</p>}
                        </div>

                        <Seccion title="Comentarios">
                            <input
                                type="search"
                                value={comFiltro}
                                onChange={(e) => setComFiltro(e.target.value)}
                                onBlur={() => {
                                    setComPage(1)
                                    setComFiltroAplicado(comFiltro.trim())
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setComPage(1)
                                        setComFiltroAplicado(comFiltro.trim())
                                    }
                                }}
                                placeholder="Filtrar comentarios…"
                                className={inputCls}
                            />
                            <textarea
                                value={comentarioNuevo}
                                onChange={(e) => setComentarioNuevo(e.target.value)}
                                rows={3}
                                maxLength={5000}
                                placeholder="Nuevo comentario (solo tú lo ves)…"
                                className={`${inputCls} resize-none`}
                            />
                            {errorCom && <p className="text-xs text-rose-600 dark:text-rose-400">{errorCom}</p>}
                            <button
                                type="button"
                                onClick={handleGuardarComentario}
                                disabled={guardandoCom || !comentarioNuevo.trim()}
                                className={`${purpleBtn} w-full`}
                                style={purpleStyle}
                            >
                                {guardandoCom ? 'Guardando…' : 'Agregar comentario'}
                            </button>
                            {loadingCom ? (
                                <p className="text-xs text-violet-600/70">Cargando…</p>
                            ) : comentarios.length === 0 ? (
                                <p className="text-xs text-gray-500 dark:text-violet-300/50">Sin comentarios aún.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {comentarios.map((c) => (
                                        <li
                                            key={c.id}
                                            className="rounded-xl border border-violet-100 bg-violet-50/40 p-2 text-xs dark:border-violet-800/50 dark:bg-[#12101a]/60"
                                        >
                                            <p className="whitespace-pre-wrap text-gray-700 dark:text-violet-100/90">{c.body}</p>
                                            <p className="mt-1 text-[10px] text-gray-400 dark:text-violet-400/50">
                                                {formatHistorialFecha(c.created_at)}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <PaginacionFicha darkMode={darkMode} meta={comMeta} page={comPage} setPage={setComPage} />
                        </Seccion>

                        <Seccion title="Pedidos">
                            <div className="flex flex-col gap-1.5">
                                <input
                                    type="search"
                                    value={pedFolio}
                                    onChange={(e) => {
                                        setPedFolio(e.target.value)
                                        setPedPage(1)
                                    }}
                                    placeholder="Filtrar por folio…"
                                    className={inputCls}
                                />
                                <select
                                    value={pedEstatus}
                                    onChange={(e) => {
                                        setPedEstatus(e.target.value)
                                        setPedPage(1)
                                    }}
                                    className={inputCls}
                                >
                                    <option value="todos">Todos los estatus</option>
                                    <option value="Preparación">Preparación</option>
                                    <option value="En ruta">En ruta</option>
                                    <option value="Entregado">Entregado</option>
                                    <option value="Cancelado">Cancelado</option>
                                </select>
                            </div>
                            {loadingPed ? (
                                <p className="text-xs text-violet-600/70">Cargando…</p>
                            ) : pedidos.length === 0 ? (
                                <p className="text-xs text-gray-500 dark:text-violet-300/50">Sin pedidos.</p>
                            ) : (
                                <ul className="space-y-1.5">
                                    {pedidos.map((p) => (
                                        <li
                                            key={p.id}
                                            className="flex items-center justify-between gap-2 rounded-lg border border-violet-100 px-2 py-1.5 dark:border-violet-800/40"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-medium truncate">{p.folio}</p>
                                                <p className="text-[10px] text-gray-500 dark:text-violet-400/60">
                                                    {formatHistorialFecha(p.created_at)}
                                                    {p.estatus_pedido ? ` · ${p.estatus_pedido}` : ''}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => abrirPedido(p)}
                                                className="shrink-0 rounded-lg border border-violet-200 px-2 py-1 text-[10px] font-semibold text-violet-800 dark:border-violet-700 dark:text-violet-200 hover:bg-violet-50 dark:hover:bg-white/5"
                                            >
                                                Ver
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <PaginacionFicha darkMode={darkMode} meta={pedMeta} page={pedPage} setPage={setPedPage} />
                        </Seccion>

                        <Seccion title="Cotizaciones">
                            <div className="flex flex-col gap-1.5">
                                <input
                                    type="search"
                                    value={cotFiltro}
                                    onChange={(e) => {
                                        setCotFiltro(e.target.value)
                                        setCotPage(1)
                                    }}
                                    placeholder="Filtrar por folio…"
                                    className={inputCls}
                                />
                                <select
                                    value={cotTipo}
                                    onChange={(e) => {
                                        setCotTipo(e.target.value)
                                        setCotPage(1)
                                    }}
                                    className={inputCls}
                                >
                                    <option value="todos">Tienda y ventas</option>
                                    <option value="tienda">Solo tienda</option>
                                    <option value="ventas">Solo ventas</option>
                                </select>
                            </div>
                            {loadingCot ? (
                                <p className="text-xs text-violet-600/70">Cargando…</p>
                            ) : cotizaciones.length === 0 ? (
                                <p className="text-xs text-gray-500 dark:text-violet-300/50">Sin cotizaciones.</p>
                            ) : (
                                <ul className="space-y-1.5">
                                    {cotizaciones.map((c) => (
                                        <li
                                            key={`${c.tipo}-${c.id}`}
                                            className="flex items-center justify-between gap-2 rounded-lg border border-violet-100 px-2 py-1.5 dark:border-violet-800/40"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-medium truncate">{c.folio}</p>
                                                <p className="text-[10px] text-gray-500 dark:text-violet-400/60">
                                                    {c.tipo === 'ventas' ? 'Ventas' : 'Tienda'} ·{' '}
                                                    {formatHistorialFecha(c.created_at)}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => abrirCotizacion(c)}
                                                className="shrink-0 rounded-lg border border-violet-200 px-2 py-1 text-[10px] font-semibold text-violet-800 dark:border-violet-700 dark:text-violet-200 hover:bg-violet-50 dark:hover:bg-white/5"
                                            >
                                                Ver
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <PaginacionFicha darkMode={darkMode} meta={cotMeta} page={cotPage} setPage={setCotPage} />
                        </Seccion>
                    </>
                )}
            </div>

            <VentasFichaDetalleModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                darkMode={darkMode}
                loading={modalLoading}
                detalle={modalDetalle}
                titulo={modalTitulo}
                onPdf={modalDetalle ? handleModalPdf : null}
                pdfLoading={pdfLoading}
            />
        </>
    )
}
