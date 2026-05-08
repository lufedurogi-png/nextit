'use client'

import useSWR from 'swr'
import { swrFetcher } from '@/lib/swrFetcher'
import { useAdminDarkMode } from '@/hooks/useAdminDarkMode'

const swrConfig = { revalidateOnFocus: false, dedupingInterval: 30000 }

function fmtDate(iso) {
    if (!iso) return '-'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export default function AdminPlanProUsuariosPage() {
    const darkMode = useAdminDarkMode()
    const { data: users = [], isLoading } = useSWR('/admin/plan-pro/usuarios-activos', swrFetcher, swrConfig)

    const panelClass = darkMode
        ? 'rounded-2xl border border-gray-700 bg-gray-800 shadow-xl shadow-black/25'
        : 'rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5'

    const badgeClass = (kind) => {
        if (kind === 'method') {
            return darkMode
                ? 'inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300'
                : 'inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'
        }
        if (kind === 'time') {
            return darkMode
                ? 'inline-flex items-center rounded-full border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-300'
                : 'inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700'
        }
        return darkMode
            ? 'inline-flex items-center rounded-full border border-gray-600 bg-gray-700/70 px-2.5 py-1 text-xs font-semibold text-gray-200'
            : 'inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700'
    }

    return (
        <div className="w-full max-w-[1600px] mx-auto space-y-5">
            <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Usuarios con Plan Pro activo</h1>
                <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Lista de usuarios que pagaron Plan Pro y el tiempo restante de su suscripción.
                </p>
            </div>

            <div className={panelClass}>
                <div className={`px-5 py-4 border-b ${darkMode ? 'bg-emerald-600/15 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className={`text-sm font-semibold ${darkMode ? 'text-emerald-200' : 'text-emerald-800'}`}>
                            {isLoading ? 'Cargando...' : `Usuarios Pro activos: ${users.length}`}
                        </p>
                        {!isLoading && (
                            <span className={badgeClass()}>
                                Actualizado en tiempo real
                            </span>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className={darkMode ? 'bg-gray-900/90 text-gray-300' : 'bg-gray-100 text-gray-700'}>
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">Usuario</th>
                                <th className="px-4 py-3 text-left font-semibold">Correo</th>
                                <th className="px-4 py-3 text-left font-semibold">Método pago</th>
                                <th className="px-4 py-3 text-left font-semibold">Inicio</th>
                                <th className="px-4 py-3 text-left font-semibold">Vence</th>
                                <th className="px-4 py-3 text-right font-semibold">Días restantes</th>
                                <th className="px-4 py-3 text-left font-semibold">Tiempo restante</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td className="px-4 py-6 text-center" colSpan={7}>Cargando usuarios Pro...</td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td className="px-4 py-6 text-center" colSpan={7}>No hay usuarios con plan activo en este momento.</td>
                                </tr>
                            ) : users.map((u) => (
                                <tr
                                    key={u.id}
                                    className={`border-t transition-colors ${
                                        darkMode
                                            ? 'border-gray-700 hover:bg-gray-700/30'
                                            : 'border-gray-200 hover:bg-emerald-50/40'
                                    }`}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                                                darkMode ? 'bg-emerald-900/50 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {(u.name || '?').slice(0, 1).toUpperCase()}
                                            </span>
                                            <span className="font-medium">{u.name}</span>
                                        </div>
                                    </td>
                                    <td className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{u.email}</td>
                                    <td className="px-4 py-3">
                                        <span className={badgeClass('method')}>{u.payment_method || 'N/D'}</span>
                                    </td>
                                    <td className="px-4 py-3">{fmtDate(u.started_at)}</td>
                                    <td className="px-4 py-3">{fmtDate(u.ends_at)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>{u.days_remaining}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={badgeClass('time')}>{u.time_remaining || '-'}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
