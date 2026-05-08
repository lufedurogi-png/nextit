'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from '@/lib/axios'
import { useAdminDarkMode } from '@/hooks/useAdminDarkMode'

export default function AdminPlanProPage() {
    const darkMode = useAdminDarkMode()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [proPrice, setProPrice] = useState('')
    const [proCurrency, setProCurrency] = useState('MXN')
    const [billingDays, setBillingDays] = useState('30')
    const [features, setFeatures] = useState([])
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const { data } = await axios.get('/admin/plan-pro')
            if (data?.success && data?.data) {
                const d = data.data
                setProPrice(String(d.pro_price ?? ''))
                setProCurrency((d.pro_currency || 'MXN').toUpperCase())
                setBillingDays(String(d.billing_period_days ?? 30))
                setFeatures(Array.isArray(d.features) ? d.features.map((t) => String(t)) : [])
            } else {
                setError('Respuesta inválida del servidor.')
            }
        } catch (e) {
            setError(e?.response?.data?.message || 'No se pudo cargar la configuración del plan.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const canSave = useMemo(() => password.trim().length > 0 && !saving, [password, saving])

    const getInputClass = (hasValue) =>
        darkMode
            ? `w-full rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  hasValue ? 'bg-[#E5EBFD] border-gray-600 text-gray-900' : 'bg-gray-900 border-gray-600 text-white'
              }`
            : `w-full rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  hasValue ? 'bg-[#E5EBFD] border-gray-300 text-gray-900' : 'bg-white border-gray-300 text-gray-900'
              }`

    const addFeature = () => setFeatures((prev) => [...prev, ''])

    const removeFeature = (idx) => setFeatures((prev) => prev.filter((_, i) => i !== idx))

    const moveFeature = (idx, dir) => {
        setFeatures((prev) => {
            const j = idx + dir
            if (j < 0 || j >= prev.length) return prev
            const copy = [...prev]
            ;[copy[idx], copy[j]] = [copy[j], copy[idx]]
            return copy
        })
    }

    const save = async () => {
        if (!canSave) return
        setError('')
        setMessage('')
        setSaving(true)
        try {
            const priceNum = Number(String(proPrice).replace(',', '.'))
            const daysNum = parseInt(String(billingDays).trim(), 10)
            const payload = {
                password: password.trim(),
                pro_price: priceNum,
                pro_currency: proCurrency.trim().toUpperCase(),
                billing_period_days: daysNum,
                features: features.map((f) => f.trim()).filter(Boolean),
            }
            const { data } = await axios.put('/admin/plan-pro', payload)
            if (data?.success) {
                setMessage(data.message || 'Guardado.')
                setPassword('')
                if (data?.data) {
                    setProPrice(String(data.data.pro_price ?? ''))
                    setProCurrency((data.data.pro_currency || 'MXN').toUpperCase())
                    setBillingDays(String(data.data.billing_period_days ?? 30))
                    const next = data.data.features
                    setFeatures(Array.isArray(next) && next.length ? next : [''])
                }
            } else {
                setError(data?.message || 'No se pudo guardar.')
            }
        } catch (e) {
            const errs = e?.response?.data?.errors
            setError(
                e?.response?.data?.message ||
                    (errs && typeof errs === 'object' ? Object.values(errs).flat().filter(Boolean).join(' ') : null) ||
                    'Error al guardar.'
            )
        } finally {
            setSaving(false)
        }
    }

    const panelShell = darkMode
        ? 'rounded-2xl overflow-hidden border-2 border-emerald-900/40 bg-gray-800 shadow-xl'
        : 'rounded-2xl overflow-hidden border-2 border-emerald-200/90 bg-white shadow-xl'
    const panelHead = darkMode
        ? 'bg-emerald-600/25 border-b-2 border-emerald-500/40'
        : 'bg-emerald-100 border-b-2 border-emerald-300'

    return (
        <div className="space-y-6">
            <div className={panelShell}>
                <div className={`px-5 py-4 ${panelHead}`}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Plan Pro Coleccionista</h1>
                            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Precio, duración del cobro y lista de beneficios que verán los usuarios en <strong className="font-extrabold">Planes</strong>. El importe
                                guardado es el que usan Mercado Pago, PayPal y la tarjeta simulada.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {message ? (
                <div className={`rounded-lg border px-4 py-3 text-sm ${darkMode ? 'border-emerald-700 bg-emerald-900/30 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                    {message}
                </div>
            ) : null}
            {error ? (
                <div className={`rounded-lg border px-4 py-3 text-sm ${darkMode ? 'border-red-800 bg-red-950/40 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
                    {error}
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.65fr_1fr]">
                <div className={panelShell}>
                    <div className={`px-5 py-3.5 ${panelHead}`}>
                        <h2 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Precio y periodo</h2>
                    </div>
                    <div className="space-y-4 p-5">
                        {loading ? (
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cargando…</p>
                        ) : (
                            <>
                                <div>
                                    <label className={`mb-1.5 block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Precio (número)</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={proPrice}
                                        onChange={(e) => setProPrice(e.target.value)}
                                        className={getInputClass(proPrice.length > 0)}
                                        placeholder="99.00"
                                    />
                                </div>
                                <div>
                                    <label className={`mb-1.5 block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Moneda (ISO 4217, 3 letras)</label>
                                    <input
                                        type="text"
                                        value={proCurrency}
                                        onChange={(e) => setProCurrency(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))}
                                        maxLength={3}
                                        className={getInputClass(proCurrency.length > 0)}
                                        placeholder="MXN"
                                    />
                                    <p className={`mt-1 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Ej.: MXN, USD, EUR…</p>
                                </div>
                                <div>
                                    <label className={`mb-1.5 block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Duración del plan (días entre cobros)
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={3650}
                                        value={billingDays}
                                        onChange={(e) => setBillingDays(e.target.value)}
                                        className={getInputClass(billingDays.length > 0)}
                                    />
                                    <p className={`mt-1 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Ej.: 7 = una semana, 30 = un mes.</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className={panelShell}>
                    <div className={`px-5 py-3.5 ${panelHead}`}>
                        <h2 className={`text-base font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Confirmación</h2>
                        <p className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Contraseña de administrador para guardar cambios.</p>
                    </div>
                    <div className="p-5">
                        <label className={`mb-2 block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Contraseña</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={getInputClass(password.trim().length > 0)}
                                placeholder="Tu contraseña"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-xs text-gray-500 hover:opacity-80"
                            >
                                {showPassword ? 'Ocultar' : 'Ver'}
                            </button>
                        </div>
                        <button
                            type="button"
                            disabled={!canSave}
                            onClick={save}
                            className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-extrabold text-white transition ${
                                canSave ? 'bg-emerald-600 hover:bg-emerald-500' : 'cursor-not-allowed bg-gray-500 opacity-60'
                            }`}
                        >
                            {saving ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                    </div>
                </div>
            </div>

            <div className={panelShell}>
                <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 ${panelHead}`}>
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Beneficios del plan Pro</h2>
                    <button
                        type="button"
                        onClick={addFeature}
                        disabled={loading}
                        className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                            darkMode ? 'bg-emerald-700 text-white hover:bg-emerald-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        } disabled:opacity-50`}
                    >
                        + Agregar beneficio
                    </button>
                </div>
                <div className="space-y-3 p-5">
                    {loading ? (
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cargando…</p>
                    ) : (
                        features.map((text, idx) => (
                            <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                                <div className="flex min-w-0 flex-1 gap-2">
                                    <span
                                        className={`mt-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                            darkMode ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        {idx + 1}
                                    </span>
                                    <input
                                        value={text}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            setFeatures((prev) => prev.map((p, i) => (i === idx ? v : p)))
                                        }}
                                        className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm ${
                                            darkMode ? 'border-gray-600 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'
                                        }`}
                                        placeholder="Texto del beneficio"
                                    />
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-1 sm:pt-0.5">
                                    <button
                                        type="button"
                                        disabled={idx === 0}
                                        onClick={() => moveFeature(idx, -1)}
                                        className={`rounded-lg border px-2 py-1 text-xs font-bold ${
                                            darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                        } disabled:opacity-40`}
                                    >
                                        ↑
                                    </button>
                                    <button
                                        type="button"
                                        disabled={idx >= features.length - 1}
                                        onClick={() => moveFeature(idx, 1)}
                                        className={`rounded-lg border px-2 py-1 text-xs font-bold ${
                                            darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                        } disabled:opacity-40`}
                                    >
                                        ↓
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeFeature(idx)}
                                        className={`rounded-lg border px-2 py-1 text-xs font-bold ${
                                            darkMode ? 'border-red-800 text-red-300 hover:bg-red-950/40' : 'border-red-200 text-red-700 hover:bg-red-50'
                                        }`}
                                    >
                                        Quitar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                    {!loading && features.length === 0 ? (
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No hay renglones. Pulsa &quot;Agregar beneficio&quot;.</p>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
