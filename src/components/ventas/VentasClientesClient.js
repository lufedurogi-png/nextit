'use client'

import { useCallback, useEffect, useState, Fragment } from 'react'
import Link from 'next/link'
import { formatHistorialFecha } from '@/lib/chatApi'
import {
    fetchVentasClientesCrm,
    fetchVentasClientesTienda,
    fetchVentasClientesCrmCotizaciones,
    fetchVentasClientesCrmCotizacionDetalle,
    fetchVentasClientesTiendaCotizaciones,
    fetchVentasClientesTiendaCotizacionDetalle,
    downloadVentasClientesCotizacionPdf,
} from '@/lib/ventasClientesApi'
import { downloadCotizacionPdf } from '@/lib/cotizacionPdf'
import VentasCorreosHistorialPaginacion from '@/components/ventas/VentasCorreosHistorialPaginacion'
import VentasFichaDetalleModal from '@/components/ventas/VentasFichaDetalleModal'
import { useAdminTheme } from '@/contexts/AdminThemeContext'

const card =
    'rounded-2xl border border-orange-100 bg-white shadow-sm dark:border-orange-900/40 dark:bg-[#262626]/80 overflow-hidden'
const inputCls =
    'w-full min-w-[200px] flex-1 rounded-xl border border-orange-100 bg-orange-50/50 px-3 py-2 text-sm dark:border-orange-800 dark:bg-[#202020] dark:text-orange-100'
const ghostBtn =
    'rounded-xl border border-orange-200 px-3 py-1.5 text-xs font-medium text-orange-900 transition hover:bg-orange-50 dark:border-orange-700 dark:text-orange-100 dark:hover:bg-white/5 disabled:opacity-50'
const brandBtn =
    'rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50'
const brandStyle = { background: 'linear-gradient(90deg, #FF8000, #e67300)' }

const TAB_EMPTY = {
    q: '',
    qAplicado: '',
    page: 1,
    rows: [],
    meta: {},
    loading: true,
    error: null,
}

function fmtMoney(n) {
    if (n == null || Number.isNaN(Number(n))) return '—'
    return Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function clienteKey(row) {
    if (row.cliente_user_id) return `u-${row.cliente_user_id}`
    return `i-${row.invitado_email || row.email || row.name}`
}

function BarraFiltros({ label, q, setQ, onBuscar, onLimpiar, puedeLimpiar }) {
    return (
        <div className="border-b border-orange-100 px-4 py-3 dark:border-orange-900/40 bg-orange-50/30 dark:bg-orange-950/20">
            <p className="text-xs font-semibold uppercase text-orange-700/80 dark:text-orange-300/70 mb-2">{label}</p>
            <div className="flex flex-wrap items-center gap-2">
                <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onBuscar()}
                    placeholder="Buscar por nombre o email…"
                    className={inputCls}
                />
                <button type="button" onClick={onBuscar} className={ghostBtn}>
                    Buscar
                </button>
                {puedeLimpiar && (
                    <button type="button" onClick={onLimpiar} className={ghostBtn}>
                        Limpiar
                    </button>
                )}
            </div>
        </div>
    )
}

function SeparadorPaginacion({ darkMode, page, meta, onPageChange, loading }) {
    if (loading || !meta?.total) return null
    const lastPage = Math.max(1, meta.last_page ?? 1)
    if (lastPage <= 1) return null
    return (
        <div className="border-t border-orange-100 px-4 py-4 dark:border-orange-900/40">
            <VentasCorreosHistorialPaginacion
                darkMode={darkMode}
                currentPage={page}
                lastPage={lastPage}
                onPageChange={onPageChange}
            />
        </div>
    )
}

function HistorialCotizaciones({ darkMode, tab, cliente, expanded, onVerCotizacion }) {
    const [rows, setRows] = useState([])
    const [meta, setMeta] = useState({})
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const cargar = useCallback(async () => {
        if (!expanded || !cliente) return
        setLoading(true)
        setError(null)
        try {
            if (tab === 'crm') {
                const res = await fetchVentasClientesCrmCotizaciones(cliente, { page })
                setRows(res.rows)
                setMeta(res.meta)
            } else {
                const res = await fetchVentasClientesTiendaCotizaciones(cliente.cliente_user_id, { page })
                setRows(res.rows)
                setMeta(res.meta)
            }
        } catch (err) {
            setRows([])
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [tab, cliente, page, expanded])

    useEffect(() => {
        if (expanded) {
            setPage(1)
        }
    }, [expanded, cliente])

    useEffect(() => {
        if (expanded) cargar()
    }, [expanded, cargar])

    if (!expanded) return null

    return (
        <tr className="bg-orange-50/40 dark:bg-orange-950/20">
            <td colSpan={7} className="px-4 py-3">
                <p className="text-xs font-semibold uppercase text-orange-700/80 dark:text-orange-300/70 mb-2">
                    Cotizaciones
                </p>
                {loading ? (
                    <p className="text-sm text-orange-600/70 dark:text-orange-300/60">Cargando…</p>
                ) : error ? (
                    <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
                ) : rows.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-orange-300/50">Sin cotizaciones.</p>
                ) : (
                    <ul className="space-y-1.5">
                        {rows.map((c) => (
                            <li
                                key={`${c.tipo}-${c.id}`}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-100 bg-white px-3 py-2 dark:border-orange-800/40 dark:bg-[#202020]/60"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-orange-950 dark:text-orange-100">{c.folio}</p>
                                    <p className="text-xs text-gray-500 dark:text-orange-400/60">
                                        {formatHistorialFecha(c.created_at)} · {fmtMoney(c.total)}
                                    </p>
                                </div>
                                <button type="button" onClick={() => onVerCotizacion(c)} className={ghostBtn}>
                                    Ver detalle
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                {!loading && meta?.total > 0 && (
                    <div className="mt-3 border-t border-orange-100 pt-3 dark:border-orange-800/40">
                        <VentasCorreosHistorialPaginacion
                            compact
                            darkMode={darkMode}
                            currentPage={page}
                            lastPage={Math.max(1, meta.last_page ?? 1)}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </td>
        </tr>
    )
}

function TablaClientes({
    tab,
    estado,
    darkMode,
    expandedKey,
    onToggleHistorial,
    onVerCotizacion,
    emptyMessage,
}) {
    const { rows, loading } = estado

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
                <thead>
                    <tr className="bg-orange-50/90 text-left text-xs font-semibold text-orange-900 dark:bg-orange-950/50 dark:text-orange-100">
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3 text-center">Cotizaciones</th>
                        <th className="px-4 py-3">Última</th>
                        <th className="px-4 py-3 text-right">Total cotizado</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-orange-50 dark:divide-orange-900/30">
                    {loading ? (
                        <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-orange-600/70 dark:text-orange-300/60">
                                Cargando clientes…
                            </td>
                        </tr>
                    ) : rows.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-orange-300/50">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        rows.map((row) => {
                            const key = clienteKey(row)
                            const expanded = expandedKey === key
                            return (
                                <Fragment key={key}>
                                    <tr className="hover:bg-orange-50/30 dark:hover:bg-white/[0.02]">
                                        <td className="px-4 py-3 font-medium text-orange-900 dark:text-orange-100">
                                            {row.name || '—'}
                                            {row.telefono && (
                                                <p className="text-xs font-normal text-gray-500 dark:text-orange-400/60">
                                                    {row.telefono}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-orange-700/80 dark:text-orange-300/70">{row.email || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-600/25 dark:text-orange-100">
                                                {tab === 'crm'
                                                    ? row.kind === 'invitado'
                                                        ? 'Prospecto'
                                                        : 'Cliente tienda'
                                                    : 'Perfil tienda'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center font-semibold">{row.cotizaciones_count ?? 0}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-orange-300/70">
                                            {formatHistorialFecha(row.ultima_cotizacion_at)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                                            {fmtMoney(row.total_cotizado)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => onToggleHistorial(row)}
                                                    className={ghostBtn}
                                                >
                                                    {expanded ? 'Ocultar' : 'Ver cotizaciones'}
                                                </button>
                                                {row.puede_chat && row.cliente_user_id && (
                                                    <Link
                                                        href={`/ventas-inbox?cliente=${row.cliente_user_id}`}
                                                        className={`${brandBtn} inline-flex items-center`}
                                                        style={brandStyle}
                                                    >
                                                        Chat
                                                    </Link>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    <HistorialCotizaciones
                                        darkMode={darkMode}
                                        tab={tab}
                                        cliente={row}
                                        expanded={expanded}
                                        onVerCotizacion={(cot) => onVerCotizacion(row, cot)}
                                    />
                                </Fragment>
                            )
                        })
                    )}
                </tbody>
            </table>
        </div>
    )
}

export default function VentasClientesClient() {
    const { darkMode } = useAdminTheme()
    const [tab, setTab] = useState('crm')
    const [crm, setCrm] = useState({ ...TAB_EMPTY })
    const [tienda, setTienda] = useState({ ...TAB_EMPTY })
    const [expandedCrm, setExpandedCrm] = useState(null)
    const [expandedTienda, setExpandedTienda] = useState(null)

    const [modalOpen, setModalOpen] = useState(false)
    const [modalTitulo, setModalTitulo] = useState('')
    const [modalDetalle, setModalDetalle] = useState(null)
    const [modalLoading, setModalLoading] = useState(false)
    const [modalClienteId, setModalClienteId] = useState(null)
    const [pdfLoading, setPdfLoading] = useState(false)

    const cargarTab = useCallback(async (tabKey, page, qAplicado, setter) => {
        setter((s) => ({ ...s, loading: true, error: null }))
        try {
            const fetcher = tabKey === 'crm' ? fetchVentasClientesCrm : fetchVentasClientesTienda
            const res = await fetcher({ page, q: qAplicado })
            setter((s) => ({
                ...s,
                rows: res.rows,
                meta: res.meta,
                loading: false,
                page,
            }))
        } catch (err) {
            setter((s) => ({ ...s, rows: [], loading: false, error: err.message }))
        }
    }, [])

    useEffect(() => {
        cargarTab('crm', crm.page, crm.qAplicado, setCrm)
    }, [crm.page, crm.qAplicado, cargarTab])

    useEffect(() => {
        cargarTab('tienda', tienda.page, tienda.qAplicado, setTienda)
    }, [tienda.page, tienda.qAplicado, cargarTab])

    const patchCrm = (patch) => setCrm((s) => ({ ...s, ...patch }))
    const patchTienda = (patch) => setTienda((s) => ({ ...s, ...patch }))

    const buscarCrm = () => {
        setExpandedCrm(null)
        patchCrm({ page: 1, qAplicado: crm.q.trim() })
    }
    const limpiarCrm = () => {
        setExpandedCrm(null)
        patchCrm({ q: '', qAplicado: '', page: 1 })
    }
    const buscarTienda = () => {
        setExpandedTienda(null)
        patchTienda({ page: 1, qAplicado: tienda.q.trim() })
    }
    const limpiarTienda = () => {
        setExpandedTienda(null)
        patchTienda({ q: '', qAplicado: '', page: 1 })
    }

    const abrirCotizacion = async (tabKey, cliente, cot) => {
        setModalOpen(true)
        setModalTitulo(cot.folio)
        setModalDetalle(null)
        setModalLoading(true)
        setModalClienteId(cliente.cliente_user_id ?? null)
        try {
            let detalle
            if (tabKey === 'crm' || cot.tipo === 'ventas') {
                detalle = await fetchVentasClientesCrmCotizacionDetalle(cot.id)
            } else {
                detalle = await fetchVentasClientesTiendaCotizacionDetalle(cliente.cliente_user_id, cot.id)
            }
            setModalDetalle(detalle)
            setModalTitulo(detalle.folio || cot.folio)
        } catch {
            setModalOpen(false)
        } finally {
            setModalLoading(false)
        }
    }

    const handleModalPdf = async () => {
        if (!modalDetalle) return
        setPdfLoading(true)
        try {
            if (modalDetalle.tipo === 'tienda' && modalClienteId) {
                await downloadVentasClientesCotizacionPdf(modalClienteId, modalDetalle)
            } else {
                await downloadCotizacionPdf(
                    modalDetalle.items ?? [],
                    modalDetalle.total,
                    `Cotizacion_${modalDetalle.folio || modalDetalle.id}.pdf`,
                    modalDetalle.folio || modalDetalle.id,
                )
            }
        } finally {
            setPdfLoading(false)
        }
    }

    const estadoActivo = tab === 'crm' ? crm : tienda

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold text-orange-950 dark:text-white">Historial de cotizaciones</h1>
                <p className="text-sm text-orange-800/70 dark:text-orange-200/60 mt-1">
                    Contactos con historial de cotizaciones CRM o desde la tienda.
                </p>
            </div>

            <div className={card}>
                <div className="flex flex-wrap gap-2 border-b border-orange-100 px-4 py-3 dark:border-orange-900/40">
                    <button
                        type="button"
                        onClick={() => setTab('crm')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            tab === 'crm'
                                ? 'bg-orange-600 text-white'
                                : 'border border-orange-200 text-orange-800 dark:border-orange-700 dark:text-orange-200 hover:bg-orange-50 dark:hover:bg-white/5'
                        }`}
                    >
                        Cotizaciones CRM
                        {!crm.loading && crm.meta?.total != null && (
                            <span className="ml-1.5 opacity-80">({crm.meta.total})</span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('tienda')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            tab === 'tienda'
                                ? 'bg-orange-600 text-white'
                                : 'border border-orange-200 text-orange-800 dark:border-orange-700 dark:text-orange-200 hover:bg-orange-50 dark:hover:bg-white/5'
                        }`}
                    >
                        Cotizaciones tienda
                        {!tienda.loading && tienda.meta?.total != null && (
                            <span className="ml-1.5 opacity-80">({tienda.meta.total})</span>
                        )}
                    </button>
                </div>

                {tab === 'crm' && (
                    <>
                        <BarraFiltros
                            label="Filtrar clientes CRM"
                            q={crm.q}
                            setQ={(q) => patchCrm({ q })}
                            onBuscar={buscarCrm}
                            onLimpiar={limpiarCrm}
                            puedeLimpiar={Boolean(crm.q || crm.qAplicado)}
                        />
                        {crm.error && (
                            <div className="px-4 py-3 text-sm text-rose-600 dark:text-rose-400 border-b border-orange-100 dark:border-orange-900/40">
                                {crm.error}
                                <button
                                    type="button"
                                    onClick={() => cargarTab('crm', crm.page, crm.qAplicado, setCrm)}
                                    className={`${ghostBtn} ml-2`}
                                >
                                    Reintentar
                                </button>
                            </div>
                        )}
                        <TablaClientes
                            tab="crm"
                            estado={crm}
                            darkMode={darkMode}
                            expandedKey={expandedCrm}
                            onToggleHistorial={(row) =>
                                setExpandedCrm((k) => (k === clienteKey(row) ? null : clienteKey(row)))
                            }
                            onVerCotizacion={(cliente, cot) => abrirCotizacion('crm', cliente, cot)}
                            emptyMessage="Aún no hay clientes en tus cotizaciones CRM."
                        />
                        <SeparadorPaginacion
                            darkMode={darkMode}
                            page={crm.page}
                            meta={crm.meta}
                            loading={crm.loading}
                            onPageChange={(p) => {
                                setExpandedCrm(null)
                                patchCrm({ page: p })
                            }}
                        />
                    </>
                )}

                {tab === 'tienda' && (
                    <>
                        <BarraFiltros
                            label="Filtrar clientes tienda"
                            q={tienda.q}
                            setQ={(q) => patchTienda({ q })}
                            onBuscar={buscarTienda}
                            onLimpiar={limpiarTienda}
                            puedeLimpiar={Boolean(tienda.q || tienda.qAplicado)}
                        />
                        {tienda.error && (
                            <div className="px-4 py-3 text-sm text-rose-600 dark:text-rose-400 border-b border-orange-100 dark:border-orange-900/40">
                                {tienda.error}
                                <button
                                    type="button"
                                    onClick={() => cargarTab('tienda', tienda.page, tienda.qAplicado, setTienda)}
                                    className={`${ghostBtn} ml-2`}
                                >
                                    Reintentar
                                </button>
                            </div>
                        )}
                        <TablaClientes
                            tab="tienda"
                            estado={tienda}
                            darkMode={darkMode}
                            expandedKey={expandedTienda}
                            onToggleHistorial={(row) =>
                                setExpandedTienda((k) => (k === clienteKey(row) ? null : clienteKey(row)))
                            }
                            onVerCotizacion={(cliente, cot) => abrirCotizacion('tienda', cliente, cot)}
                            emptyMessage="Ningún cliente ha cotizado desde su perfil en la tienda."
                        />
                        <SeparadorPaginacion
                            darkMode={darkMode}
                            page={tienda.page}
                            meta={tienda.meta}
                            loading={tienda.loading}
                            onPageChange={(p) => {
                                setExpandedTienda(null)
                                patchTienda({ page: p })
                            }}
                        />
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
        </div>
    )
}
