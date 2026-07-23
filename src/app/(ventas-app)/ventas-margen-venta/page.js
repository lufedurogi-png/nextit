'use client'

import { useAdminTheme } from '@/contexts/AdminThemeContext'

import { useCallback, useEffect, useMemo, useState } from 'react'
import NextImage from 'next/image'
import axios from '@/lib/axios'

function PasswordField({ id, value, onChange, show, onToggle, darkMode, autoComplete, getInputClass }) {
    const has = value.trim().length > 0
    return (
        <div className="relative">
            <input
                id={id}
                type={show ? 'text' : 'password'}
                autoComplete={autoComplete || 'current-password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`${getInputClass(has)} pr-12 w-full`}
            />
            <button
                type="button"
                onClick={onToggle}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
                <NextImage
                    src={show ? '/Imagenes/icon_ojo_cerrado.png' : '/Imagenes/icon_ojo_abierto.png'}
                    alt=""
                    width={22}
                    height={22}
                    className="object-contain"
                />
            </button>
        </div>
    )
}

/** Spinner: esmeralda intenso; interior sin caja; flechas negras (claro) / esmeralda claro (oscuro) */
function PorcentajeSpinner({ value, onChange, disabled, darkMode }) {
    const [focused, setFocused] = useState(false)
    const has = String(value).length > 0 || focused
    const boxClass = darkMode
        ? `flex min-w-0 w-full flex-1 items-stretch overflow-hidden rounded-xl border-2 transition-all ${has ? 'border-orange-500 bg-[#E5EBFD] shadow-sm shadow-black/20' : 'border-gray-600 bg-gray-700/50'}`
        : `flex min-w-0 w-full flex-1 items-stretch overflow-hidden rounded-xl border-2 transition-all ${has ? 'border-orange-600 bg-[#E5EBFD] shadow-sm shadow-orange-900/10' : 'border-gray-300 bg-white'}`

    const arrowFill = darkMode ? 'text-orange-400' : 'text-gray-900'

    const step = () => {
        const n = parseFloat(value)
        if (Number.isNaN(n)) return 0
        return n
    }

    const inc = () => {
        const n = step()
        onChange(String(Math.round((n + 0.5) * 100) / 100))
    }
    const dec = () => {
        const n = step()
        onChange(String(Math.round((n - 0.5) * 100) / 100))
    }

    const stepperBg = has ? 'bg-[#E5EBFD]' : darkMode ? 'bg-gray-700/50' : 'bg-white'

    return (
        <div className={boxClass}>
            <div className="w-2 shrink-0 bg-orange-600" aria-hidden />
            <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 bg-inherit">
                <span className={`text-lg font-bold select-none ${has ? 'text-orange-800' : darkMode ? 'text-orange-400' : 'text-orange-700'}`}>#</span>
                <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    disabled={disabled}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onChange={(e) => {
                        const t = e.target.value.replace(',', '.')
                        if (t === '' || t === '-') {
                            onChange(t)
                            return
                        }
                        if (/^-?\d*\.?\d{0,2}$/.test(t)) onChange(t)
                    }}
                    className={`min-w-0 flex-1 border-0 bg-transparent text-lg font-semibold tabular-nums shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none ${has ? 'text-gray-900 placeholder:text-gray-500' : darkMode ? 'text-white placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'}`}
                    placeholder="0"
                />
                <span className={`shrink-0 text-sm font-semibold ${has ? 'text-gray-900' : darkMode ? 'text-gray-400' : 'text-gray-600'}`}>%</span>
            </div>
            <div className={`flex w-11 shrink-0 flex-col border-l-2 ${darkMode ? 'border-orange-600/40' : 'border-orange-600/35'} ${stepperBg}`}>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={inc}
                    className={`flex flex-1 items-center justify-center py-1.5 transition-colors ${darkMode ? 'hover:bg-orange-600/10' : 'hover:bg-orange-600/5'} disabled:opacity-40`}
                    aria-label="Aumentar porcentaje"
                >
                    <svg className={`h-4 w-4 ${arrowFill}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                </button>
                <div className={`h-px ${darkMode ? 'bg-orange-600/35' : 'bg-orange-600/25'}`} />
                <button
                    type="button"
                    disabled={disabled}
                    onClick={dec}
                    className={`flex flex-1 items-center justify-center py-1.5 transition-colors ${darkMode ? 'hover:bg-orange-600/10' : 'hover:bg-orange-600/5'} disabled:opacity-40`}
                    aria-label="Disminuir porcentaje"
                >
                    <svg className={`h-4 w-4 rotate-180 ${arrowFill}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    )
}

export default function AdminMargenVentaPage() {
    const { darkMode } = useAdminTheme()
    const [porcentaje, setPorcentaje] = useState('')
    const [cargando, setCargando] = useState(true)
    const [errorCarga, setErrorCarga] = useState('')

    const [pwdActualizar, setPwdActualizar] = useState('')
    const [showPwdActualizar, setShowPwdActualizar] = useState(false)
    const [pwdReset, setPwdReset] = useState('')
    const [showPwdReset, setShowPwdReset] = useState(false)

    const [guardando, setGuardando] = useState(false)
    const [reseteando, setReseteando] = useState(false)
    const [mensaje, setMensaje] = useState('')
    const [error, setError] = useState('')

    const getInputClass = (hasValue) => (darkMode
        ? `px-4 py-2.5 rounded-lg border text-sm transition-colors focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 ${hasValue ? 'bg-[#E5EBFD] border-gray-600 text-gray-900' : 'bg-gray-700/80 border-gray-600 text-white'}`
        : `px-4 py-2.5 rounded-lg border text-sm transition-colors focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 ${hasValue ? 'bg-[#E5EBFD] border-gray-300 text-gray-900' : 'bg-white border-gray-300 text-gray-900'}`)

    const filterLabelClass = darkMode ? 'text-gray-400 block mb-1.5 text-sm font-medium' : 'text-gray-600 block mb-1.5 text-sm font-medium'

    const cargar = useCallback(async () => {
        setCargando(true)
        setErrorCarga('')
        try {
            const { data } = await axios.get('/admin/margen-venta')
            const p = data?.data?.porcentaje
            if (typeof p === 'number') setPorcentaje(String(p))
            else setPorcentaje('0')
        } catch (e) {
            setErrorCarga(e?.response?.data?.message || e.message || 'No se pudo cargar la configuración.')
        } finally {
            setCargando(false)
        }
    }, [])

    useEffect(() => {
        cargar()
    }, [cargar])

    const puedeActualizar = useMemo(() => {
        const n = parseFloat(porcentaje.replace(',', '.'))
        return !guardando && pwdActualizar.trim().length > 0 && !Number.isNaN(n) && n >= -99.99 && n <= 999.99
    }, [guardando, pwdActualizar, porcentaje])

    const puedeReset = useMemo(() => !reseteando && pwdReset.trim().length > 0, [reseteando, pwdReset])

    const handleActualizar = async () => {
        if (!puedeActualizar) return
        setError('')
        setMensaje('')
        setGuardando(true)
        try {
            const n = parseFloat(porcentaje.replace(',', '.'))
            const { data } = await axios.put('/admin/margen-venta', {
                password: pwdActualizar,
                porcentaje: n,
            })
            setMensaje(data?.message || 'Guardado.')
            setPwdActualizar('')
            if (typeof data?.data?.porcentaje === 'number') setPorcentaje(String(data.data.porcentaje))
        } catch (e) {
            setError(e?.response?.data?.message || 'No se pudo actualizar el margen.')
        } finally {
            setGuardando(false)
        }
    }

    const handleReset = async () => {
        if (!puedeReset) return
        setError('')
        setMensaje('')
        setReseteando(true)
        try {
            const { data } = await axios.post('/admin/margen-venta/reset', { password: pwdReset })
            setMensaje(data?.message || 'Margen en 0%.')
            setPwdReset('')
            setPorcentaje('0')
        } catch (e) {
            setError(e?.response?.data?.message || 'No se pudo restablecer el margen.')
        } finally {
            setReseteando(false)
        }
    }

    const cardShell = darkMode ? 'rounded-xl overflow-hidden border-2 shadow-xl bg-tienda-elevated border-orange-900/40' : 'rounded-xl overflow-hidden border-2 shadow-xl bg-white border-orange-200/80'
    const cardHeader = darkMode ? 'bg-orange-600/30 border-b-2 border-orange-500/40' : 'bg-orange-100 border-b-2 border-orange-300'

    return (
        <div className="w-full space-y-8">
            <div className="flex items-center gap-4">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${darkMode ? 'bg-orange-600/25 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
                    <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden>
                        <path d="M3 3v18h18" />
                        <path d="M7 12l4-4 4 4 4-6" />
                        <path d="M21 9v6" />
                    </svg>
                </span>
                <div>
                    <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                        Margen global de venta
                    </h1>
                    <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Ajusta el porcentaje sobre el precio base del catálogo; la tienda, carrito y documentos usarán ese precio de venta.
                    </p>
                </div>
            </div>

            {errorCarga && (
                <div className={`rounded-lg border px-4 py-3 text-sm ${darkMode ? 'border-red-800 bg-red-950/50 text-red-200' : 'border-red-200 bg-red-50 text-red-800'}`}>
                    {errorCarga}
                </div>
            )}

            {mensaje && (
                <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${darkMode ? 'border-orange-500/40 bg-orange-500/15 text-orange-200' : 'border-orange-200 bg-orange-50 text-orange-900'}`}>
                    <svg className="w-5 h-5 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {mensaje}
                </div>
            )}
            {error && (
                <div className={`rounded-lg border px-4 py-3 text-sm ${darkMode ? 'border-red-800 bg-red-950/50 text-red-200' : 'border-red-200 bg-red-50 text-red-800'}`}>
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:gap-8 lg:grid-cols-2 lg:items-stretch w-full">
                {/* Siempre primero: izquierda en escritorio, arriba en móvil */}
                <div className={`${cardShell} flex flex-col`}>
                    <div className={`px-5 py-4 ${cardHeader}`}>
                        <div className="flex items-center gap-3">
                            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${darkMode ? 'bg-orange-600/35 text-orange-200' : 'bg-orange-200/80 text-orange-800'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                                </svg>
                            </span>
                            <h2 className={`text-lg font-bold ${darkMode ? 'text-orange-100' : 'text-orange-900'}`}>Aplicar margen</h2>
                        </div>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                        <p className={`text-sm mb-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Valores positivos suben el precio de venta; negativos lo reducen. Rango permitido: <strong className={darkMode ? 'text-gray-300' : 'text-gray-800'}>-99,99</strong> a <strong className={darkMode ? 'text-gray-300' : 'text-gray-800'}>999,99</strong>.
                        </p>
                        <div className="space-y-2 mb-5">
                            <label htmlFor="margen-pct" className={filterLabelClass}>Porcentaje de margen</label>
                            <PorcentajeSpinner
                                value={cargando ? '' : porcentaje}
                                onChange={setPorcentaje}
                                disabled={cargando || guardando}
                                darkMode={darkMode}
                            />
                        </div>
                        <div className="space-y-2 mb-6">
                            <label htmlFor="pwd-margen" className={filterLabelClass}>Tu contraseña</label>
                            <PasswordField
                                id="pwd-margen"
                                value={pwdActualizar}
                                onChange={setPwdActualizar}
                                show={showPwdActualizar}
                                onToggle={() => setShowPwdActualizar((s) => !s)}
                                darkMode={darkMode}
                                getInputClass={getInputClass}
                            />
                        </div>
                        <button
                            type="button"
                            disabled={!puedeActualizar}
                            onClick={handleActualizar}
                            className={`mt-auto w-full rounded-lg py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                darkMode
                                    ? '!bg-orange-600 hover:!bg-orange-500 shadow-orange-900/40'
                                    : '!bg-orange-700 hover:!bg-orange-800 shadow-orange-900/20'
                            }`}
                        >
                            {guardando ? 'Actualizando…' : 'Actualizar margen global'}
                        </button>
                    </div>
                </div>

                <div className={`${cardShell} flex flex-col`}>
                    <div className={`px-5 py-4 ${cardHeader}`}>
                        <div className="flex items-center gap-3">
                            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${darkMode ? 'bg-orange-600/35 text-orange-200' : 'bg-orange-200/80 text-orange-800'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </span>
                            <h2 className={`text-lg font-bold ${darkMode ? 'text-orange-100' : 'text-orange-900'}`}>Volver al precio base</h2>
                        </div>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                        <p className={`text-sm mb-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Pone el margen en <strong className={darkMode ? 'text-gray-300' : 'text-gray-800'}>0&nbsp;%</strong>. Los precios mostrados coincidirán con el precio guardado en base de datos, sin ajuste por margen.
                        </p>
                        <div className="space-y-2 mb-6 flex-1">
                            <label htmlFor="pwd-reset" className={filterLabelClass}>Tu contraseña</label>
                            <PasswordField
                                id="pwd-reset"
                                value={pwdReset}
                                onChange={setPwdReset}
                                show={showPwdReset}
                                onToggle={() => setShowPwdReset((s) => !s)}
                                darkMode={darkMode}
                                getInputClass={getInputClass}
                            />
                        </div>
                        <button
                            type="button"
                            disabled={!puedeReset}
                            onClick={handleReset}
                            className={`w-full rounded-lg py-3 text-sm font-bold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                darkMode
                                    ? 'border-2 border-orange-400/60 text-orange-200 hover:bg-orange-600/20'
                                    : 'border-2 border-orange-700 text-orange-900 hover:bg-orange-50'
                            }`}
                        >
                            {reseteando ? 'Procesando…' : 'Regresar porcentaje a precio base'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
