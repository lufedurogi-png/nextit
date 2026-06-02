'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAdminTheme } from '@/contexts/AdminThemeContext'
import { fetchVentasReportesResumen } from '@/lib/ventasReportesApi'
import VentasCorreosHistorialPaginacion from '@/components/ventas/VentasCorreosHistorialPaginacion'

const cardBase = 'rounded-2xl border p-5 shadow-sm'
const moneyFmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 })

function fmtMoney(n) {
    return moneyFmt.format(Number(n || 0))
}

function fmtPct(n) {
    return `${Number(n || 0).toFixed(1)}%`
}

function diffPct(current, previous) {
    const c = Number(current || 0)
    const p = Number(previous || 0)
    if (!p) return c ? 100 : 0
    return ((c - p) / p) * 100
}

function KpiCard({ darkMode, title, value, prevValue }) {
    const d = diffPct(value, prevValue)
    const positive = d >= 0
    const container = `${cardBase} ${darkMode ? 'border-orange-900/40 bg-[#262626]/80' : 'border-orange-100 bg-white'}`
    return (
        <div className={container}>
            <p className={`text-xs font-medium uppercase tracking-wide ${darkMode ? 'text-orange-300/80' : 'text-orange-600/80'}`}>{title}</p>
            <p className={`mt-2 text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</p>
            <p className={`mt-1 text-xs ${darkMode ? 'text-orange-200/60' : 'text-gray-500'}`}>Periodo anterior: {prevValue}</p>
            <p className={`mt-2 text-sm font-semibold ${positive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {positive ? '+' : ''}
                {d.toFixed(1)}%
            </p>
        </div>
    )
}

export default function VentasReportesPage() {
    const { darkMode } = useAdminTheme()
    const [period, setPeriod] = useState('mes')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [data, setData] = useState(null)
    const [pageDetalle, setPageDetalle] = useState(1)
    const [pageClientes, setPageClientes] = useState(1)
    const [pageProductos, setPageProductos] = useState(1)
    const perPageDetalle = 10
    const perPageTop = 5

    useEffect(() => {
        let mounted = true
        setLoading(true)
        setError('')
        fetchVentasReportesResumen({ period })
            .then((res) => {
                if (!mounted) return
                setData(res)
                setPageDetalle(1)
                setPageClientes(1)
                setPageProductos(1)
            })
            .catch(() => {
                if (!mounted) return
                setError('No fue posible cargar el reporte.')
            })
            .finally(() => {
                if (!mounted) return
                setLoading(false)
            })
        return () => {
            mounted = false
        }
    }, [period])

    const rows = data?.detalle || []
    const kCurrent = data?.kpis?.current || {}
    const kPrev = data?.kpis?.previous || {}
    const topClientes = data?.top_clientes || []
    const topProductos = data?.top_productos || []
    const detalleLastPage = Math.max(1, Math.ceil(rows.length / perPageDetalle))
    const clientesLastPage = Math.max(1, Math.ceil(topClientes.length / perPageTop))
    const productosLastPage = Math.max(1, Math.ceil(topProductos.length / perPageTop))
    const paginatedRows = useMemo(
        () => rows.slice((pageDetalle - 1) * perPageDetalle, pageDetalle * perPageDetalle),
        [rows, pageDetalle],
    )
    const paginatedClientes = useMemo(
        () => topClientes.slice((pageClientes - 1) * perPageTop, pageClientes * perPageTop),
        [topClientes, pageClientes],
    )
    const paginatedProductos = useMemo(
        () => topProductos.slice((pageProductos - 1) * perPageTop, pageProductos * perPageTop),
        [topProductos, pageProductos],
    )
    const panel = `${cardBase} ${darkMode ? 'border-orange-900/40 bg-[#262626]/80' : 'border-orange-100 bg-white'}`

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-orange-950'}`}>Reporte comercial operativo</h1>
                    <p className={`mt-1 text-sm ${darkMode ? 'text-orange-200/60' : 'text-orange-800/70'}`}>
                        Cotizaciones, conversiones y desempeño comercial en tiempo real.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {[
                        ['mes', 'Mes'],
                        ['trimestre', 'Trimestre'],
                        ['anio', 'Año'],
                    ].map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setPeriod(key)}
                            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                                period === key
                                    ? 'bg-orange-600 text-white'
                                    : darkMode
                                      ? 'border border-orange-700 text-orange-200 hover:bg-orange-900/40'
                                      : 'border border-orange-200 text-orange-800 hover:bg-orange-50'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className={panel}>Cargando reporte...</div>
            ) : error ? (
                <div className={`${panel} text-rose-500`}>{error}</div>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                        <KpiCard darkMode={darkMode} title="Cotizaciones creadas" value={kCurrent.cotizaciones_ventas || 0} prevValue={kPrev.cotizaciones_ventas || 0} />
                        <KpiCard darkMode={darkMode} title="Tasa de cierre" value={fmtPct(kCurrent.tasa_cierre_pct)} prevValue={fmtPct(kPrev.tasa_cierre_pct)} />
                        <KpiCard darkMode={darkMode} title="Monto cotizado" value={fmtMoney(kCurrent.monto_cotizado)} prevValue={fmtMoney(kPrev.monto_cotizado)} />
                        <KpiCard darkMode={darkMode} title="Ticket promedio" value={fmtMoney(kCurrent.ticket_promedio)} prevValue={fmtMoney(kPrev.ticket_promedio)} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className={panel}>
                            <h2 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-200' : 'text-orange-900'}`}>Top clientes por monto</h2>
                            <div className="space-y-2">
                                {topClientes.length === 0 ? (
                                    <p className={darkMode ? 'text-orange-300/70' : 'text-gray-500'}>Sin datos en el periodo.</p>
                                ) : (
                                    paginatedClientes.map((c) => (
                                        <div key={c.key} className={`rounded-xl border px-3 py-2 ${darkMode ? 'border-orange-900/40' : 'border-orange-100'}`}>
                                            <div className="flex items-center justify-between gap-3">
                                                <p className={`truncate text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{c.name}</p>
                                                <p className="text-sm font-bold text-orange-500">{fmtMoney(c.monto)}</p>
                                            </div>
                                            <p className={`text-xs ${darkMode ? 'text-orange-300/70' : 'text-gray-500'}`}>{c.cotizaciones} cotizaciones</p>
                                        </div>
                                    ))
                                )}
                            </div>
                            <VentasCorreosHistorialPaginacion
                                darkMode={darkMode}
                                currentPage={pageClientes}
                                lastPage={clientesLastPage}
                                onPageChange={setPageClientes}
                                compact
                            />
                        </div>

                        <div className={panel}>
                            <h2 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-200' : 'text-orange-900'}`}>Top productos cotizados</h2>
                            <div className="space-y-2">
                                {topProductos.length === 0 ? (
                                    <p className={darkMode ? 'text-orange-300/70' : 'text-gray-500'}>Sin datos en el periodo.</p>
                                ) : (
                                    paginatedProductos.map((p) => (
                                        <div key={p.clave} className={`rounded-xl border px-3 py-2 ${darkMode ? 'border-orange-900/40' : 'border-orange-100'}`}>
                                            <div className="flex items-center justify-between gap-3">
                                                <p className={`truncate text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{p.nombre}</p>
                                                <p className="text-sm font-bold text-orange-500">{fmtMoney(p.monto)}</p>
                                            </div>
                                            <p className={`text-xs ${darkMode ? 'text-orange-300/70' : 'text-gray-500'}`}>
                                                Clave {p.clave} · {p.cantidad} piezas
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                            <VentasCorreosHistorialPaginacion
                                darkMode={darkMode}
                                currentPage={pageProductos}
                                lastPage={productosLastPage}
                                onPageChange={setPageProductos}
                                compact
                            />
                        </div>
                    </div>

                    <div className={panel}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <h2 className={`text-sm font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-200' : 'text-orange-900'}`}>Detalle operativo</h2>
                            <button
                                type="button"
                                className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500"
                                onClick={() => {
                                    const header = ['folio', 'cliente', 'email', 'total', 'fecha', 'pedido_folio', 'pedido_monto']
                                    const csv = [
                                        header.join(','),
                                        ...rows.map((r) =>
                                            [
                                                r.folio,
                                                `"${(r.cliente || '').replaceAll('"', '""')}"`,
                                                `"${(r.email || '').replaceAll('"', '""')}"`,
                                                r.total ?? 0,
                                                r.fecha ?? '',
                                                r.pedido_folio ?? '',
                                                r.pedido_monto ?? '',
                                            ].join(','),
                                        ),
                                    ].join('\n')
                                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                                    const url = URL.createObjectURL(blob)
                                    const link = document.createElement('a')
                                    link.href = url
                                    link.download = `ventas-reporte-${period}.csv`
                                    link.click()
                                    URL.revokeObjectURL(url)
                                }}
                            >
                                Exportar CSV
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className={darkMode ? 'text-orange-200/80' : 'text-orange-900'}>
                                        <th className="px-3 py-2 text-left">Folio</th>
                                        <th className="px-3 py-2 text-left">Cliente</th>
                                        <th className="px-3 py-2 text-left">Monto</th>
                                        <th className="px-3 py-2 text-left">Fecha</th>
                                        <th className="px-3 py-2 text-left">Pedido vinculado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className={`px-3 py-6 text-center ${darkMode ? 'text-orange-300/70' : 'text-gray-500'}`}>
                                                Sin registros en el periodo.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedRows.map((r, idx) => (
                                            <tr key={`${r.folio}-${idx}`} className={`border-t ${darkMode ? 'border-orange-900/30' : 'border-orange-100'}`}>
                                                <td className="px-3 py-2 font-medium">{r.folio}</td>
                                                <td className="px-3 py-2">{r.cliente}</td>
                                                <td className="px-3 py-2">{fmtMoney(r.total)}</td>
                                                <td className="px-3 py-2">{new Date(r.fecha).toLocaleString('es-MX')}</td>
                                                <td className="px-3 py-2">{r.pedido_folio ? `${r.pedido_folio} (${fmtMoney(r.pedido_monto)})` : '—'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <VentasCorreosHistorialPaginacion
                            darkMode={darkMode}
                            currentPage={pageDetalle}
                            lastPage={detalleLastPage}
                            onPageChange={setPageDetalle}
                            compact
                        />
                    </div>
                </>
            )}
        </div>
    )
}

