'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import axios from '@/lib/axios'
import { swrFetcher } from '@/lib/swrFetcher'
import { useAdminDarkMode } from '@/hooks/useAdminDarkMode'
import { downloadInformeUsoEscanerMensual } from '@/lib/adminReportPdf'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts'

const swrConfig = { revalidateOnFocus: false, dedupingInterval: 30000 }

function moneyUsd(value) {
    return Number(value || 0).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

function moneyMxn(value) {
    return Number(value || 0).toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

function ChartTooltip({ active, payload, label, darkMode }) {
    if (!active || !payload?.length) return null

    return (
        <div className={`rounded-lg border px-3 py-2 text-sm shadow-lg ${
            darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-200 bg-white text-gray-900'
        }`}>
            <p className="font-semibold">Día {label}</p>
            <p className="text-blue-500">Gratis: {payload?.[0]?.value ?? 0}</p>
            <p className="text-orange-500">De pago: {payload?.[1]?.value ?? 0}</p>
        </div>
    )
}

export default function AdminUsoEscanerIaPage() {
    const darkMode = useAdminDarkMode()
    const now = new Date()
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [year, setYear] = useState(now.getFullYear())
    const [search, setSearch] = useState('')
    const [savingUserId, setSavingUserId] = useState(null)

    const queryBase = `year=${year}&month=${month}`
    const { data: overview, isLoading: loadingOverview, mutate: mutateOverview } = useSWR(
        `/admin/scan-usage/overview?${queryBase}`,
        swrFetcher,
        swrConfig
    )
    const { data: historyData, isLoading: loadingHistory } = useSWR(
        `/admin/scan-usage/history?year=${year}`,
        swrFetcher,
        swrConfig
    )
    const usersKey = `/admin/scan-usage/users?${queryBase}${search ? `&search=${encodeURIComponent(search)}` : ''}`
    const { data: usersData, isLoading: loadingUsers, mutate: mutateUsers } = useSWR(
        usersKey,
        swrFetcher,
        swrConfig
    )

    const period = overview?.period ?? { month_label: 'Mes actual' }
    const totals = overview?.totals ?? { total_scans: 0, free_scans: 0, paid_scans: 0, cost_usd: 0, cost_mxn: 0 }
    const freeLimit = Number(overview?.free_limit || 1000)
    const barMax = Math.max(freeLimit, Number(totals.total_scans || 0), 1)
    const freeBar = Math.min(Number(totals.free_scans || 0), freeLimit)
    const paidBar = Math.max(Number(totals.paid_scans || 0), 0)
    const freeWidth = (freeBar / barMax) * 100
    const paidWidth = (paidBar / barMax) * 100

    const dailyData = useMemo(() => overview?.daily ?? [], [overview])
    const historyRows = historyData?.rows ?? []
    const years = historyData?.years ?? [year]
    const users = usersData?.users ?? []

    const totalMonthUsersScans = users.reduce((acc, u) => acc + Number(u.scans_this_month || 0), 0)

    const cardClass = darkMode
        ? 'rounded-2xl border border-gray-700 bg-gray-800/90 shadow-lg shadow-black/30'
        : 'rounded-2xl border border-gray-200 bg-white shadow-md shadow-gray-900/5'

    async function toggleUserScanner(user) {
        try {
            setSavingUserId(user.id)
            await axios.patch(`/admin/scan-usage/users/${user.id}/scanner`, {
                scanner_enabled: !user.scanner_enabled,
            })
            await Promise.all([mutateUsers(), mutateOverview()])
        } finally {
            setSavingUserId(null)
        }
    }

    return (
        <div className="w-full max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className={`text-2xl font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Uso de escáner IA</h1>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Control mensual de consultas gratuitas, consultas de pago y costo acumulado.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value))}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                            darkMode ? 'bg-gray-900 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                    >
                        {Array.from({ length: 12 }).map((_, i) => (
                            <option key={i + 1} value={i + 1}>Mes {i + 1}</option>
                        ))}
                    </select>
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                            darkMode ? 'bg-gray-900 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                    >
                        {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <section className={`${cardClass} p-5 md:p-6`}>
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    1) Consumo mensual y costo ({period.month_label})
                </h2>
                <div className={`mt-4 rounded-xl border p-4 ${darkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className={`relative h-5 overflow-hidden rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div className="absolute left-0 top-0 h-full bg-blue-500" style={{ width: `${freeWidth}%` }} />
                        <div className="absolute top-0 h-full bg-orange-500" style={{ left: `${freeWidth}%`, width: `${paidWidth}%` }} />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className={`rounded-lg border p-3 ${darkMode ? 'border-blue-500/30 bg-blue-950/20' : 'border-blue-200 bg-blue-50'}`}>
                            <p className={`text-xs uppercase ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Consultas gratis usadas</p>
                            <p className={`text-xl font-bold ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                                {totals.free_scans} / {freeLimit}
                            </p>
                        </div>
                        <div className={`rounded-lg border p-3 ${darkMode ? 'border-orange-500/30 bg-orange-950/20' : 'border-orange-200 bg-orange-50'}`}>
                            <p className={`text-xs uppercase ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>Consultas de pago</p>
                            <p className={`text-xl font-bold ${darkMode ? 'text-orange-200' : 'text-orange-800'}`}>{totals.paid_scans}</p>
                        </div>
                        <div className={`rounded-lg border p-3 ${darkMode ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-emerald-200 bg-emerald-50'}`}>
                            <p className={`text-xs uppercase ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Costo acumulado MXN</p>
                            <p className={`text-xl font-bold ${darkMode ? 'text-emerald-200' : 'text-emerald-800'}`}>{moneyMxn(totals.cost_mxn)}</p>
                        </div>
                        <div className={`rounded-lg border p-3 ${darkMode ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-emerald-200 bg-emerald-50'}`}>
                            <p className={`text-xs uppercase ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Costo acumulado USD</p>
                            <p className={`text-xl font-bold ${darkMode ? 'text-emerald-200' : 'text-emerald-800'}`}>{moneyUsd(totals.cost_usd)}</p>
                        </div>
                    </div>
                    <p className={`mt-3 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Total de consultas del mes: <span className="font-semibold">{totals.total_scans}</span> ·
                        Reinicio automático al cambiar de mes según fecha/hora del servidor.
                    </p>
                </div>
            </section>

            <section className={`${cardClass} p-5 md:p-6`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <h2 className={`text-lg font-semibold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        2) Consultas por día del mes
                    </h2>
                    <button
                        type="button"
                        onClick={() => downloadInformeUsoEscanerMensual(historyRows, year)}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                            darkMode ? 'border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/20' : 'border-emerald-500 text-emerald-700 hover:bg-emerald-50'
                        }`}
                    >
                        Descargar informe PDF del año
                    </button>
                </div>
                <div className="mt-4 h-[360px]">
                    {loadingOverview ? (
                        <div className={`h-full w-full animate-pulse rounded-lg ${darkMode ? 'bg-gray-700/40' : 'bg-gray-200'}`} />
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyData} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                                <XAxis dataKey="day" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                                <YAxis allowDecimals={false} stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                                <Tooltip content={(props) => <ChartTooltip {...props} darkMode={darkMode} />} />
                                <Legend />
                                <Line type="monotone" dataKey="free_scans" name="Gratis" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                                <Line type="monotone" dataKey="paid_scans" name="De pago" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
                <p className={`mt-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Azul: consultas dentro del tramo gratis · Naranja: consultas que ya generan costo.
                </p>
            </section>

            <section className={`${cardClass} p-5 md:p-6`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <h2 className={`text-lg font-semibold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        3) Uso por usuario (mes actual seleccionado)
                    </h2>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nombre o correo"
                        className={`w-full md:w-80 rounded-lg border px-3 py-2 text-sm ${
                            darkMode ? 'bg-gray-900 border-gray-600 text-gray-100 placeholder:text-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'
                        }`}
                    />
                </div>
                <div className={`mt-4 rounded-xl border overflow-x-auto ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <table className="min-w-full text-sm">
                        <thead className={darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'}>
                            <tr>
                                <th className="px-3 py-2 text-left">Usuario</th>
                                <th className="px-3 py-2 text-left">Correo</th>
                                <th className="px-3 py-2 text-right">Consultas del mes</th>
                                <th className="px-3 py-2 text-center">Control escáner</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingUsers ? (
                                <tr><td className="px-3 py-4" colSpan={4}>Cargando usuarios...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td className="px-3 py-4" colSpan={4}>No hay usuarios para este filtro.</td></tr>
                            ) : users.map((u) => (
                                <tr key={u.id} className={darkMode ? 'border-t border-gray-700' : 'border-t border-gray-200'}>
                                    <td className="px-3 py-2">{u.name}</td>
                                    <td className={`px-3 py-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{u.email}</td>
                                    <td className="px-3 py-2 text-right font-semibold">{u.scans_this_month}</td>
                                    <td className="px-3 py-2 text-center">
                                        <button
                                            type="button"
                                            disabled={savingUserId === u.id}
                                            onClick={() => toggleUserScanner(u)}
                                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                                u.scanner_enabled
                                                    ? (darkMode ? 'bg-rose-900/40 text-rose-300 hover:bg-rose-900/60' : 'bg-rose-100 text-rose-700 hover:bg-rose-200')
                                                    : (darkMode ? 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/60' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200')
                                            }`}
                                        >
                                            {savingUserId === u.id ? 'Guardando...' : (u.scanner_enabled ? 'Pausar' : 'Reanudar')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className={`mt-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Consultas sumadas en el mes: <span className="font-semibold">{totalMonthUsersScans}</span>
                </p>
            </section>

            {(loadingOverview || loadingHistory) && (
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Cargando métricas del periodo...
                </p>
            )}
        </div>
    )
}
