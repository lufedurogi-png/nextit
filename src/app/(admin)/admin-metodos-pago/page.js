'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import axios from '@/lib/axios'

const METHOD_ICON = {
    paypal: '/Imagenes/PayPal.png',
    mercadopago: '/Imagenes/mercado%20pago.png',
    tarjeta: '/Imagenes/icons_metodosdepago.png',
}

export default function AdminMetodosPagoPage() {
    const [darkMode, setDarkMode] = useState(true)
    const [loading, setLoading] = useState(true)
    const [savingCode, setSavingCode] = useState(null)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [methods, setMethods] = useState([])
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        setDarkMode(JSON.parse(localStorage.getItem('darkMode') ?? 'true'))
    }, [])

    useEffect(() => {
        const onDarkModeChange = (e) => setDarkMode(!!e.detail)
        window.addEventListener('darkModeChange', onDarkModeChange)
        return () => window.removeEventListener('darkModeChange', onDarkModeChange)
    }, [])

    const loadMethods = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const { data } = await axios.get('/admin/metodos-pago')
            setMethods(Array.isArray(data?.data) ? data.data : [])
        } catch (e) {
            setError(e?.response?.data?.message || 'No se pudo cargar la configuración de métodos de pago.')
            setMethods([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadMethods()
    }, [loadMethods])

    const canToggle = useMemo(() => password.trim().length > 0, [password])
    const getInputClass = (hasValue) => darkMode
        ? `w-full rounded-lg border px-3 py-2.5 pr-12 text-sm transition-colors ${
            hasValue
                ? 'bg-[#E5EBFD] border-gray-600 text-gray-900'
                : 'bg-tienda-canvas border-gray-600 text-white'
        }`
        : `w-full rounded-lg border px-3 py-2.5 pr-12 text-sm transition-colors ${
            hasValue
                ? 'bg-[#E5EBFD] border-gray-300 text-gray-900'
                : 'bg-white border-gray-300 text-gray-900'
        }`

    const handleToggle = async (code, current) => {
        if (!canToggle || savingCode) return
        setError('')
        setMessage('')
        setSavingCode(code)
        try {
            const { data } = await axios.put(`/admin/metodos-pago/${code}`, {
                active: !current,
                password: password.trim(),
            })
            setMethods(Array.isArray(data?.data) ? data.data : [])
            setMessage(data?.message || 'Configuración actualizada.')
            setPassword('')
        } catch (e) {
            setError(e?.response?.data?.message || 'No se pudo actualizar el método.')
        } finally {
            setSavingCode(null)
        }
    }

    const activeCount = methods.filter((m) => !!m.active).length
    const inactiveCount = Math.max(0, methods.length - activeCount)
    const panelShell = darkMode
        ? 'rounded-2xl overflow-hidden border-2 border-emerald-900/40 bg-tienda-elevated shadow-xl'
        : 'rounded-2xl overflow-hidden border-2 border-emerald-200/90 bg-white shadow-xl'
    const panelHead = darkMode
        ? 'bg-emerald-600/25 border-b-2 border-emerald-500/40'
        : 'bg-emerald-100 border-b-2 border-emerald-300'

    return (
        <div className="space-y-6">
            <div className={panelShell}>
                <div className={`px-5 py-4 ${panelHead}`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`rounded-xl p-2.5 ${darkMode ? 'bg-emerald-700/35 ring-1 ring-emerald-400/40' : 'bg-white ring-1 ring-emerald-300'}`}>
                            <Image
                                src="/Imagenes/icons_metodosdepago.png"
                                alt=""
                                width={30}
                                height={30}
                                className={darkMode ? 'brightness-0 invert' : undefined}
                            />
                        </div>
                        <div>
                            <h1 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Métodos de pago</h1>
                            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Controla qué opciones aparecen en los modales de checkout.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/60' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                            Activos: {activeCount}
                        </span>
                        <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-amber-900/30 text-amber-300 border border-amber-700/60' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            Inactivos: {inactiveCount}
                        </span>
                    </div>
                </div>
                </div>
            </div>

            {message && (
                <div className={`rounded-lg border px-4 py-3 text-sm ${darkMode ? 'border-emerald-700 bg-emerald-900/30 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                    {message}
                </div>
            )}
            {error && (
                <div className={`rounded-lg border px-4 py-3 text-sm ${darkMode ? 'border-red-800 bg-red-950/40 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.65fr_1fr]">
                <div className={panelShell}>
                    <div className={`px-5 py-3.5 ${panelHead}`}>
                        <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Lista de métodos</h2>
                            <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Los cambios aplican al carrito y cotizaciones.
                            </p>
                        </div>
                    </div>
                    </div>
                    {loading ? (
                        <div className="p-5">
                            <div className={`rounded-xl border p-6 text-sm ${darkMode ? 'bg-tienda-canvas/60 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                Cargando métodos de pago...
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 p-5">
                            {methods.map((method) => {
                                const active = !!method.active
                                const busy = savingCode === method.code
                                return (
                                    <div
                                        key={method.code}
                                        className={`rounded-xl border-2 p-4 transition-all ${
                                            darkMode
                                                ? active
                                                    ? 'bg-tienda-canvas/70 border-emerald-600/60'
                                                    : 'bg-tienda-canvas/40 border-amber-500/50'
                                                : active
                                                    ? 'bg-emerald-50/40 border-emerald-300'
                                                    : 'bg-amber-50/40 border-amber-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`h-14 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden />
                                                <div className={`rounded-lg p-2 ${darkMode ? 'bg-tienda-elevated ring-1 ring-gray-700' : 'bg-white ring-1 ring-gray-200'}`}>
                                                    <Image
                                                        src={METHOD_ICON[method.code] || '/Imagenes/icons_metodosdepago.png'}
                                                        alt=""
                                                        width={38}
                                                        height={26}
                                                        className={`object-contain ${
                                                            darkMode && method.code === 'tarjeta' ? 'brightness-0 invert' : ''
                                                        }`}
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{method.label}</p>
                                                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{method.description}</p>
                                                    <p className={`mt-1 text-xs font-semibold ${active ? 'text-emerald-500' : (darkMode ? 'text-amber-400' : 'text-amber-600')}`}>
                                                        {active ? 'Activo' : 'Inactivo'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    disabled={!canToggle || busy}
                                                    onClick={() => handleToggle(method.code, active)}
                                                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                                                        active ? 'bg-emerald-600' : 'bg-gray-400'
                                                    } disabled:opacity-60`}
                                                    aria-label={`Cambiar estado de ${method.label}`}
                                                >
                                                    <span
                                                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                                            active ? 'translate-x-8' : 'translate-x-1'
                                                        }`}
                                                    />
                                                </button>
                                                {busy && <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Guardando...</span>}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className={panelShell}>
                        <div className={`px-5 py-3.5 ${panelHead}`}>
                            <h2 className={`text-base font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                Seguridad de cambios
                            </h2>
                            <p className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Para activar o desactivar un método, confirma tu contraseña de administrador.
                            </p>
                        </div>
                        <div className="p-5">
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Contraseña del administrador
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={getInputClass(password.trim().length > 0)}
                                    placeholder="Ingresa tu contraseña"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                                >
                                    <Image
                                        src={showPassword ? '/Imagenes/icon_ojo_cerrado.png' : '/Imagenes/icon_ojo_abierto.png'}
                                        alt=""
                                        width={22}
                                        height={22}
                                        className="object-contain"
                                    />
                                </button>
                            </div>
                            <div className={`mt-3 rounded-lg border-2 px-3 py-2 text-xs ${canToggle
                                ? darkMode
                                    ? 'border-emerald-700/70 bg-emerald-900/20 text-emerald-300'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : darkMode
                                    ? 'border-gray-700 bg-tienda-canvas/70 text-gray-400'
                                    : 'border-gray-200 bg-gray-50 text-gray-600'
                            }`}>
                                {canToggle
                                    ? 'Contraseña capturada. Ya puedes usar los interruptores de la lista.'
                                    : 'Escribe tu contraseña para habilitar los interruptores.'}
                            </div>
                        </div>
                    </div>

                    <div className={panelShell}>
                        <div className={`px-5 py-3.5 ${panelHead}`}>
                            <h3 className={`text-sm font-bold uppercase tracking-wide ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                Alcance
                            </h3>
                        </div>
                        <div className="p-5">
                            <ul className={`space-y-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Checkout de carrito</li>
                                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Checkout de cotizaciones en tienda</li>
                                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Checkout de cotizaciones en dashboard</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

