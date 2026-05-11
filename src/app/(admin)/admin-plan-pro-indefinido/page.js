'use client'

import { useCallback, useEffect, useState } from 'react'
import axios from '@/lib/axios'
import { useAdminDarkMode } from '@/hooks/useAdminDarkMode'

export default function AdminPlanProIndefinidoPage() {
    const darkMode = useAdminDarkMode()
    const [q, setQ] = useState('')
    const [rowPasswords, setRowPasswords] = useState({})
    const [searchRows, setSearchRows] = useState([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [indefRows, setIndefRows] = useState([])
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [busyKey, setBusyKey] = useState('')

    const loadIndef = useCallback(async () => {
        try {
            const { data } = await axios.get('/admin/plan-pro/indefinidos')
            if (data?.success) setIndefRows(data.data)
        } catch {
            setIndefRows([])
        }
    }, [])

    useEffect(() => {
        loadIndef()
    }, [loadIndef])

    const runSearch = useCallback(async () => {
        if (q.trim().length < 2) {
            setSearchRows([])
            setSearchLoading(false)
            return
        }
        setSearchLoading(true)
        setError('')
        try {
            const { data } = await axios.get('/admin/plan-pro/indefinidos/buscar', {
                params: { q: q.trim() },
            })
            if (data?.success) setSearchRows(data.data)
            else setSearchRows([])
        } catch (e) {
            setSearchRows([])
            setError(e?.response?.data?.message || 'Error en la búsqueda')
        } finally {
            setSearchLoading(false)
        }
    }, [q])

    useEffect(() => {
        const t = setTimeout(() => {
            void runSearch()
        }, 300)
        return () => clearTimeout(t)
    }, [q, runSearch])

    const setRowPassword = (userId, value) => {
        setRowPasswords((prev) => ({ ...prev, [userId]: value }))
    }

    const act = async (key, relativePath, userId) => {
        const p = String(rowPasswords[userId] || '').trim()
        if (!p) {
            setError('Escribe la contraseña en la fila del usuario.')
            return
        }
        setBusyKey(key)
        setMessage('')
        setError('')
        try {
            const { data } = await axios.post(`/admin/plan-pro/usuarios/${userId}/${relativePath}`, { password: p })
            if (data?.success) setMessage(data.message || 'Listo.')
            else setError(data?.message || 'No se aplicó')
            setRowPassword(userId, '')
            await loadIndef()
            await runSearch()
        } catch (e) {
            setError(e?.response?.data?.message || 'Error')
        } finally {
            setBusyKey('')
        }
    }

    const fmt = (iso) => {
        if (!iso) return '—'
        const d = new Date(iso)
        return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
    }

    const card = darkMode
        ? 'rounded-2xl border border-amber-500/15 bg-gradient-to-br from-slate-900 to-slate-950 shadow-xl shadow-black/30'
        : 'rounded-2xl border border-amber-200/80 bg-white shadow-xl shadow-amber-900/5'

    return (
        <div className="mx-auto max-w-[1500px] space-y-8 pb-10">

            {message ? (
                <div className="rounded-2xl border border-emerald-400/40 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                    {message}
                </div>
            ) : null}
            {error ? (
                <div className="rounded-2xl border border-red-300/60 bg-red-50 px-5 py-3 text-sm font-semibold text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                    {error}
                </div>
            ) : null}

            <div className={card}>
                <div className={`border-b px-6 py-4 ${darkMode ? 'border-white/10' : 'border-amber-100'}`}>
                    <h2 className={`text-lg font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Buscar usuario</h2>
                    <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>Mínimo 2 caracteres (nombre o correo).</p>
                </div>
                <div className="p-6">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Ej. maria o @dominio…"
                        className={`w-full max-w-lg rounded-xl border px-4 py-3 text-sm outline-none ring-amber-500/25 transition focus:ring-2 ${
                            darkMode ? 'border-white/15 bg-black/25 text-white' : 'border-slate-200 bg-slate-50'
                        }`}
                    />
                    <div className="mt-6 overflow-x-auto rounded-xl border border-white/10 dark:border-white/10">
                        <table className="min-w-full text-sm">
                            <thead className={darkMode ? 'bg-black/40 text-amber-100/80' : 'bg-amber-100/90 text-amber-950'}>
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold">Nombre</th>
                                    <th className="px-4 py-3 text-left font-bold">Correo</th>
                                    <th className="px-4 py-3 text-left font-bold">Estado</th>
                                    <th className="px-4 py-3 text-left font-bold">Contraseña admin</th>
                                    <th className="px-4 py-3 text-right font-bold">Acción</th>
                                </tr>
                            </thead>
                            <tbody className={darkMode ? 'divide-y divide-white/5 bg-slate-950/30' : 'divide-y divide-slate-100 bg-white'}>
                                {q.trim().length < 2 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                                            Escribe al menos 2 caracteres.
                                        </td>
                                    </tr>
                                ) : searchLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                                            Buscando…
                                        </td>
                                    </tr>
                                ) : searchRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                                            Sin resultados.
                                        </td>
                                    </tr>
                                ) : (
                                    searchRows.map((u) => (
                                        <tr key={u.id} className={darkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-amber-50/50'}>
                                            <td className="px-4 py-3 font-semibold">{u.name}</td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.email}</td>
                                            <td className="px-4 py-3 text-xs font-medium">
                                                {u.pro_subscription_indefinite
                                                    ? u.pro_subscription_indefinite_paused
                                                        ? 'Indefinido (pausado)'
                                                        : 'Indefinido activo'
                                                    : 'Sin indefinido'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="password"
                                                    autoComplete="off"
                                                    value={rowPasswords[u.id] || ''}
                                                    onChange={(e) => setRowPassword(u.id, e.target.value)}
                                                    placeholder="Contraseña"
                                                    className={`w-full min-w-44 rounded-lg border px-3 py-2 text-xs ${
                                                        darkMode ? 'border-white/15 bg-black/30 text-white' : 'border-slate-200 bg-white text-slate-900'
                                                    }`}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {!u.pro_subscription_indefinite || u.pro_subscription_indefinite_paused ? (
                                                    <button
                                                        type="button"
                                                        disabled={busyKey !== ''}
                                                        onClick={() => act(`grant-${u.id}`, 'indefinido', u.id)}
                                                        className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1.5 text-xs font-extrabold text-white shadow disabled:opacity-50"
                                                    >
                                                        {busyKey === `grant-${u.id}` ? '…' : u.pro_subscription_indefinite_paused ? 'Restaurar' : 'Pro indefinido'}
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-400">Ya activo</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className={card}>
                <div className={`border-b px-6 py-4 ${darkMode ? 'border-white/10' : 'border-amber-100'}`}>
                    <h2 className={`text-lg font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Cuentas con Pro indefinido</h2>
                    <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>Pausar congela el acceso Pro; quitar elimina el beneficio especial.</p>
                </div>
                <div className="overflow-x-auto p-6">
                    <table className="min-w-full text-sm">
                        <thead className={darkMode ? 'bg-black/40 text-amber-100/80' : 'bg-amber-100/90 text-amber-950'}>
                            <tr>
                                <th className="px-4 py-3 text-left font-bold">Usuario</th>
                                <th className="px-4 py-3 text-left font-bold">Correo</th>
                                <th className="px-4 py-3 text-left font-bold">Desde</th>
                                <th className="px-4 py-3 text-left font-bold">Estado</th>
                                <th className="px-4 py-3 text-left font-bold">Contraseña admin</th>
                                <th className="px-4 py-3 text-right font-bold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className={darkMode ? 'divide-y divide-white/5' : 'divide-y divide-slate-100'}>
                            {indefRows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                        Nadie con Pro indefinido.
                                    </td>
                                </tr>
                            ) : (
                                indefRows.map((u) => (
                                    <tr key={u.id} className={darkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-amber-50/40'}>
                                        <td className="px-4 py-3 font-semibold">{u.name}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.email}</td>
                                        <td className="px-4 py-3 tabular-nums">{fmt(u.since)}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                                    u.paused
                                                        ? darkMode
                                                            ? 'bg-amber-900/50 text-amber-200'
                                                            : 'bg-amber-100 text-amber-900'
                                                        : darkMode
                                                          ? 'bg-emerald-900/50 text-emerald-200'
                                                          : 'bg-emerald-100 text-emerald-900'
                                                }`}
                                            >
                                                {u.paused ? 'Pausado' : 'Activo'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="password"
                                                autoComplete="off"
                                                value={rowPasswords[u.id] || ''}
                                                onChange={(e) => setRowPassword(u.id, e.target.value)}
                                                placeholder="Contraseña"
                                                className={`w-full min-w-44 rounded-lg border px-3 py-2 text-xs ${
                                                    darkMode ? 'border-white/15 bg-black/30 text-white' : 'border-slate-200 bg-white text-slate-900'
                                                }`}
                                            />
                                        </td>
                                        <td className="space-x-2 px-4 py-3 text-right">
                                            {!u.paused ? (
                                                <button
                                                    type="button"
                                                    disabled={busyKey !== ''}
                                                    onClick={() => act(`pause-${u.id}`, 'indefinido/pausar', u.id)}
                                                    className="rounded-lg border border-amber-400/60 px-2 py-1 text-xs font-bold text-amber-800 dark:text-amber-200"
                                                >
                                                    Pausar
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={busyKey !== ''}
                                                    onClick={() => act(`resume-${u.id}`, 'indefinido/reanudar', u.id)}
                                                    className="rounded-lg border border-emerald-500/50 px-2 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-200"
                                                >
                                                    Reanudar
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                disabled={busyKey !== ''}
                                                onClick={() => act(`remove-${u.id}`, 'indefinido/quitar', u.id)}
                                                className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white"
                                            >
                                                Quitar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
