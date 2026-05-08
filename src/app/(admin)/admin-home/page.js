'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { downloadInformeActividad } from '@/lib/adminReportPdf'
import { swrFetcher } from '@/lib/swrFetcher'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as LineTooltip,
    ResponsiveContainer as LineResponsive,
    Legend as LineLegend,
} from 'recharts'
import { useAdminDarkMode } from '@/hooks/useAdminDarkMode'

const swrConfig = { revalidateOnFocus: false, dedupingInterval: 60000 }

const TIPO_COLORS = { admin: '#059669', cliente: '#3b82f6', vendedor: '#f59e0b' }
const TIPO_NAMES = { 1: 'Admin', 2: 'Cliente', 3: 'Vendedor' }

function hora12(hora24) {
    const h = Number(hora24)
    if (h === 0) return '12:00 am'
    if (h === 12) return '12:00 pm'
    if (h < 12) return `${h}:00 am`
    return `${h - 12}:00 pm`
}

function ActividadTooltip({ active, payload, label, darkMode = true }) {
    if (!active || !payload?.length || !label) return null
    const row = payload[0]?.payload
    if (!row) return null
    const shell = darkMode
        ? 'rounded-lg border border-gray-600 bg-gray-800 p-3 shadow-xl text-sm min-w-[200px]'
        : 'rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-sm min-w-[200px]'
    const titleCls = darkMode ? 'font-semibold text-gray-200 mb-2' : 'font-semibold text-gray-900 mb-2'
    const subCls = darkMode ? 'flex flex-wrap gap-x-3 gap-y-0.5 text-gray-400' : 'flex flex-wrap gap-x-3 gap-y-0.5 text-gray-600'
    const borderFoot = darkMode ? 'mt-2 pt-2 border-t border-gray-600 flex gap-3 text-xs' : 'mt-2 pt-2 border-t border-gray-200 flex gap-3 text-xs'
    return (
        <div className={shell}>
            <p className={titleCls}>{label}</p>
            <div className="space-y-1.5">
                <p className={`font-medium ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Registros: {row.registros}</p>
                {(row.registros_admin > 0 || row.registros_cliente > 0 || row.registros_vendedor > 0) && (
                    <div className={subCls}>
                        {row.registros_admin > 0 && <span style={{ color: TIPO_COLORS.admin }}>Admin {row.registros_admin}</span>}
                        {row.registros_cliente > 0 && <span style={{ color: TIPO_COLORS.cliente }}>Cliente {row.registros_cliente}</span>}
                        {row.registros_vendedor > 0 && <span style={{ color: TIPO_COLORS.vendedor }}>Vendedor {row.registros_vendedor}</span>}
                    </div>
                )}
                <p className={`font-medium mt-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Inicios de sesión: {row.logins}</p>
                {(row.logins_admin > 0 || row.logins_cliente > 0 || row.logins_vendedor > 0) && (
                    <div className={subCls}>
                        {row.logins_admin > 0 && <span style={{ color: TIPO_COLORS.admin }}>Admin {row.logins_admin}</span>}
                        {row.logins_cliente > 0 && <span style={{ color: TIPO_COLORS.cliente }}>Cliente {row.logins_cliente}</span>}
                        {row.logins_vendedor > 0 && <span style={{ color: TIPO_COLORS.vendedor }}>Vendedor {row.logins_vendedor}</span>}
                    </div>
                )}
            </div>
            <div className={borderFoot}>
                <span style={{ color: TIPO_COLORS.admin }}>● Admin</span>
                <span style={{ color: TIPO_COLORS.cliente }}>● Cliente</span>
                <span style={{ color: TIPO_COLORS.vendedor }}>● Vendedor</span>
            </div>
        </div>
    )
}

function EventosTooltip({ active, payload, label, darkMode = true }) {
    if (!active || !payload?.length) return null
    const p = payload[0]?.payload
    if (!p) return null
    const tipoLabel = TIPO_NAMES[p.tipo] || 'Usuario'
    const colorKey = tipoLabel.toLowerCase()
    const shell = darkMode
        ? 'rounded-lg border border-gray-600 bg-gray-800 p-2 shadow-xl text-sm'
        : 'rounded-lg border border-gray-200 bg-white p-2 shadow-lg text-sm'
    const line1 = darkMode ? 'text-gray-200' : 'text-gray-800'
    return (
        <div className={shell}>
            <p className={line1}>Día {p.dia} · {hora12(p.hora)}</p>
            <p style={{ color: TIPO_COLORS[colorKey] || '#9ca3af' }}>{tipoLabel} · {p.evento === 'registro' ? 'Registro' : 'Inicio de sesión'}</p>
        </div>
    )
}

export default function AdminHome() {
    const darkMode = useAdminDarkMode()

    const { data: actividad = [], isLoading: loadingAct } = useSWR(
        '/admin/stats/actividad-usuarios',
        swrFetcher,
        swrConfig
    )
    const { data: eventos = [], isLoading: loadingEv } = useSWR(
        '/admin/stats/actividad-eventos',
        swrFetcher,
        swrConfig
    )

    const loading = loadingAct || loadingEv

    const actividadData = actividad.map((r) => ({
        ...r,
        mes: r.mes,
        registros: Number(r.registros) || 0,
        logins: Number(r.logins) || 0,
    }))

    const eventosOrdenados = [...eventos].sort((a, b) => a.dia - b.dia || a.hora - b.hora)
    const datosLineas = eventosOrdenados.map((e) => ({
        dia: e.dia,
        hora: e.hora,
        tipo: e.tipo,
        evento: e.evento,
        admin: e.tipo === 1 ? e.hora : null,
        cliente: e.tipo === 2 ? e.hora : null,
        vendedor: e.tipo === 3 ? e.hora : null,
    }))

    const SkeletonChart = () => (
        <div className="flex items-center justify-center min-h-[320px] w-full">
            <div className={`animate-pulse rounded-lg h-80 w-full ${darkMode ? 'bg-gray-600/30' : 'bg-gray-200'}`} />
        </div>
    )

    return (
        <div className="w-full max-w-[1600px] mx-auto space-y-8">
            <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Inicio</h1>
                <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Actividad de usuarios según registros en la base de datos y uso de sesión (tokens Sanctum).
                </p>
            </div>

            <div className={`w-full rounded-xl overflow-hidden shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className={`px-5 py-3.5 ${darkMode ? 'bg-emerald-600/30 border-b border-emerald-500/40' : 'bg-emerald-50 border-b border-emerald-200'}`}>
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>Actividad de usuarios</h2>
                    <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-emerald-700/80'}`}>
                        Últimos 31 días (día del periodo vs. hora) o resumen por mes si no hay eventos detallados.
                    </p>
                </div>
                <div className="p-4 sm:p-6 w-full">
                    {loading ? (
                        <SkeletonChart />
                    ) : eventos.length > 0 ? (
                        <div className="w-full min-h-[380px] h-[min(52vh,520px)]">
                            <LineResponsive width="100%" height="100%">
                                <LineChart data={datosLineas} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                                    <XAxis
                                        dataKey="dia"
                                        name="Día"
                                        type="number"
                                        domain={[1, 31]}
                                        stroke={darkMode ? '#9ca3af' : '#6b7280'}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <YAxis
                                        name="Hora"
                                        type="number"
                                        domain={[0, 24]}
                                        stroke={darkMode ? '#9ca3af' : '#6b7280'}
                                        tick={{ fontSize: 10 }}
                                        allowDecimals={false}
                                        tickFormatter={hora12}
                                    />
                                    <LineTooltip content={(props) => <EventosTooltip {...props} darkMode={darkMode} />} cursor={{ strokeDasharray: '3 3' }} />
                                    <LineLegend />
                                    <Line type="monotone" dataKey="admin" name="Admin" stroke={TIPO_COLORS.admin} strokeWidth={2} connectNulls={false} dot={{ fill: TIPO_COLORS.admin, r: 4 }} />
                                    <Line type="monotone" dataKey="cliente" name="Cliente" stroke={TIPO_COLORS.cliente} strokeWidth={2} connectNulls={false} dot={{ fill: TIPO_COLORS.cliente, r: 4 }} />
                                    <Line type="monotone" dataKey="vendedor" name="Vendedor" stroke={TIPO_COLORS.vendedor} strokeWidth={2} connectNulls={false} dot={{ fill: TIPO_COLORS.vendedor, r: 4 }} />
                                </LineChart>
                            </LineResponsive>
                        </div>
                    ) : actividadData.length > 0 ? (
                        <div className="w-full min-h-[360px] h-[min(48vh,480px)]">
                            <LineResponsive width="100%" height="100%">
                                <LineChart data={actividadData} margin={{ top: 12, right: 24, left: 8, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                                    <XAxis dataKey="mes" stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fontSize: 12 }} />
                                    <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fontSize: 12 }} allowDecimals={false} />
                                    <LineTooltip content={(props) => <ActividadTooltip {...props} darkMode={darkMode} />} />
                                    <LineLegend />
                                    <Line type="monotone" dataKey="registros" name="Registros" stroke="#10b981" strokeWidth={2} dot={{ fill: '#059669', r: 4 }} />
                                    <Line type="monotone" dataKey="logins" name="Inicios de sesión" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#2563eb', r: 4 }} />
                                </LineChart>
                            </LineResponsive>
                            <p className={`text-center text-sm mt-3 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                Resumen por mes (no hay eventos con hora en los últimos 31 días; los inicios de sesión usan la última actividad del token).
                            </p>
                        </div>
                    ) : (
                        <p className={`py-16 text-center ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>No hay datos de actividad aún.</p>
                    )}
                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={() => downloadInformeActividad(actividadData, eventos)}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all border ${darkMode ? 'border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/20' : 'border-emerald-500 text-emerald-600 hover:bg-emerald-50'}`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Descargar informe PDF
                        </button>
                    </div>
                </div>
            </div>

            <div className={`rounded-xl overflow-hidden shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className={`px-5 py-3.5 ${darkMode ? 'bg-emerald-600/30 border-b border-emerald-500/40' : 'bg-emerald-50 border-b border-emerald-200'}`}>
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>Resumen y accesos</h2>
                    <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-emerald-700/80'}`}>Métricas recientes e inicio rápido</p>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`rounded-xl p-5 border ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50'}`}>
                        <div className="flex items-center gap-2 mb-4">
                            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            </span>
                            <p className={`text-xs uppercase tracking-wider font-medium ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>Últimos 31 días</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <div className={`rounded-lg border-2 ${darkMode ? 'border-emerald-500/50 bg-gray-700/50' : 'border-emerald-200 bg-emerald-50/50'} px-4 py-3 min-w-[100px]`}>
                                <p className={`text-2xl font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>{eventos.filter((e) => e.evento === 'registro').length}</p>
                                <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Registros</p>
                            </div>
                            {eventos.some((e) => e.evento === 'login') && (
                                <div className={`rounded-lg border-2 ${darkMode ? 'border-blue-500/50 bg-gray-700/50' : 'border-blue-200 bg-blue-50/50'} px-4 py-3 min-w-[100px]`}>
                                    <p className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>{eventos.filter((e) => e.evento === 'login').length}</p>
                                    <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Inicios de sesión</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={`rounded-xl p-5 border ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50'}`}>
                        <div className="flex items-center gap-2 mb-4">
                            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </span>
                            <p className={`text-xs uppercase tracking-wider font-medium ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>Acciones rápidas</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Link
                                href="/admin-mensajes"
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 border-2 ${darkMode ? 'border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                Mensajería
                            </Link>
                            <Link
                                href="/admin-publicidad"
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 border-2 ${darkMode ? 'border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                                Publicidad
                            </Link>
                            <Link
                                href="/admin-pedidos"
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 border-2 ${darkMode ? 'border-gray-600 text-gray-300 hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10' : 'border-gray-300 text-gray-700 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                Pedidos
                            </Link>
                            <Link
                                href="/admin-productos-manuales"
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 border-2 ${darkMode ? 'border-gray-600 text-gray-300 hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10' : 'border-gray-300 text-gray-700 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8 4-8-4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                Productos manuales
                            </Link>
                            <Link
                                href="/admin-gestion-usuarios"
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 border-2 ${darkMode ? 'border-gray-600 text-gray-300 hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10' : 'border-gray-300 text-gray-700 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                Gestionar usuarios
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
