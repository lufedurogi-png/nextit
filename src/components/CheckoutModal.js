'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import axios from '@/lib/axios'
import { cotizarEnvio } from '@/lib/carrito'
import { formatPrecio } from '@/lib/productos'

const DEFAULT_PAYMENT_FLAGS = {
    paypal: true,
    mercadopago: true,
    tarjeta: true,
}

/** Texto de ventana de entrega a partir de fechas YYYY-MM-DD de la API. */
function textoEntregaEstimada(q) {
    if (!q) return ''
    const fmt = (s) => {
        if (!s) return null
        try {
            return new Date(`${s}T12:00:00`).toLocaleDateString('es-MX', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
            })
        } catch {
            return s
        }
    }
    const fc = fmt(q.fecha_entrega_centro)
    const fd = fmt(q.fecha_entrega_desde)
    const fh = fmt(q.fecha_entrega_hasta)
    if (fc && fd && fh && fd !== fh) {
        return `Entrega estimada alrededor del ${fc}. Por logística del transportista puede llegar entre el ${fd} y el ${fh}.`
    }
    if (fc) {
        return `Entrega estimada alrededor del ${fc}. La fecha puede variar unos días según la paquetería.`
    }
    return ''
}

function maskNumber(num) {
    if (!num || typeof num !== 'string') return '••••'
    const digits = num.replace(/\D/g, '')
    if (digits.length < 4) return '••••'
    return `•••• •••• •••• ${digits.slice(-4)}`
}

/** Texto a mostrar para número de tarjeta: desde API solo tenemos last4. */
function cardDisplayNumber(c) {
    if (c.numero) return maskNumber(c.numero)
    return `•••• •••• •••• ${c.last4 || '••••'}`
}

export default function CheckoutModal({
    open,
    onClose,
    darkMode = true,
    onConfirm,
    loading = false,
    error: externalError = null,
}) {
    const [step, setStep] = useState('contacto') // contacto | facturacion | tarjetas
    const [direcciones, setDirecciones] = useState([])
    const [datosFacturacion, setDatosFacturacion] = useState([])
    const [loadingDir, setLoadingDir] = useState(false)
    const [loadingFac, setLoadingFac] = useState(false)
    const [showAddDireccion, setShowAddDireccion] = useState(false)
    const [showAddFacturacion, setShowAddFacturacion] = useState(false)
    const [savingDireccion, setSavingDireccion] = useState(false)
    const [savingFacturacion, setSavingFacturacion] = useState(false)
    const [direccionErrors, setDireccionErrors] = useState({})
    const [facturacionErrors, setFacturacionErrors] = useState({})

    const [selectedDireccionId, setSelectedDireccionId] = useState(null)
    const [selectedFacturacionId, setSelectedFacturacionId] = useState(null)
    const [usarFacturacion, setUsarFacturacion] = useState(true)
    const [metodoPago, setMetodoPago] = useState(null) // 'paypal' | 'mercadopago' | 'tarjeta'
    const [selectedTarjetaId, setSelectedTarjetaId] = useState(null)

    const [cards, setCards] = useState([])
    const [loadingCards, setLoadingCards] = useState(false)
    const [showAddCard, setShowAddCard] = useState(false)
    const [editingCardId, setEditingCardId] = useState(null)
    const [cardForm, setCardForm] = useState({ nombreTitular: '', numero: '', fechaCaducidad: '', cvv: '' })
    const [cardFormErrors, setCardFormErrors] = useState({})
    const [savingCard, setSavingCard] = useState(false)
    const [cvvPago, setCvvPago] = useState('') // CVV al pagar con tarjeta guardada (no se guarda)
    const [paymentFlags, setPaymentFlags] = useState(DEFAULT_PAYMENT_FLAGS)
    const [loadingPaymentFlags, setLoadingPaymentFlags] = useState(false)
    const [envioCotizacion, setEnvioCotizacion] = useState(null)
    const [loadingEnvio, setLoadingEnvio] = useState(false)
    const [errorEnvio, setErrorEnvio] = useState(null)
    const [direccionForm, setDireccionForm] = useState({
        nombre: '',
        telefono: '',
        calle: '',
        numero_exterior: '',
        numero_interior: '',
        colonia: '',
        ciudad: '',
        estado: '',
        codigo_postal: '',
        referencias: '',
        es_principal: false,
    })
    const [facturacionForm, setFacturacionForm] = useState({
        razon_social: '',
        rfc: '',
        calle: '',
        numero_exterior: '',
        numero_interior: '',
        colonia: '',
        ciudad: '',
        estado: '',
        codigo_postal: '',
        email_facturacion: '',
        telefono: '',
        es_principal: false,
    })

    const fetchCards = useCallback(async () => {
        setLoadingCards(true)
        try {
            const { data } = await axios.get('/tarjetas-guardadas')
            const list = data?.success && data?.data ? data.data : []
            setCards(list)
            const fav = list.find((c) => c.esFavorita)
            setSelectedTarjetaId(fav?.id ?? list[0]?.id ?? null)
        } catch {
            setCards([])
            setSelectedTarjetaId(null)
        } finally {
            setLoadingCards(false)
        }
    }, [])

    const fetchDirecciones = useCallback(async () => {
        setLoadingDir(true)
        try {
            const { data } = await axios.get('/direcciones-envio')
            const list = data?.success && data?.data ? data.data : []
            setDirecciones(list)
            const principal = list.find((d) => d.es_principal)
            setSelectedDireccionId(principal?.id ?? list[0]?.id ?? null)
        } catch {
            setDirecciones([])
            setSelectedDireccionId(null)
        } finally {
            setLoadingDir(false)
        }
    }, [])

    const fetchDatosFacturacion = useCallback(async () => {
        setLoadingFac(true)
        try {
            const { data } = await axios.get('/datos-facturacion')
            const list = data?.success && data?.data ? data.data : []
            setDatosFacturacion(list)
            const principal = list.find((d) => d.es_principal)
            setSelectedFacturacionId(principal?.id ?? list[0]?.id ?? null)
        } catch {
            setDatosFacturacion([])
            setSelectedFacturacionId(null)
        } finally {
            setLoadingFac(false)
        }
    }, [])

    const fetchPaymentFlags = useCallback(async () => {
        setLoadingPaymentFlags(true)
        try {
            const { data } = await axios.get('/metodos-pago')
            const flags = data?.success ? data?.data?.flags : null
            setPaymentFlags({
                paypal: flags?.paypal !== false,
                mercadopago: flags?.mercadopago !== false,
                tarjeta: flags?.tarjeta !== false,
            })
        } catch {
            setPaymentFlags(DEFAULT_PAYMENT_FLAGS)
        } finally {
            setLoadingPaymentFlags(false)
        }
    }, [])

    useEffect(() => {
        if (open) {
            setStep('contacto')
            setEnvioCotizacion(null)
            setErrorEnvio(null)
            setLoadingEnvio(false)
            fetchDirecciones()
            fetchDatosFacturacion()
            fetchCards()
            fetchPaymentFlags()
            setUsarFacturacion(true)
            setCvvPago('')
            setShowAddDireccion(false)
            setShowAddFacturacion(false)
            setDireccionErrors({})
            setFacturacionErrors({})
        }
    }, [open, fetchDirecciones, fetchDatosFacturacion, fetchCards, fetchPaymentFlags])

    useEffect(() => {
        if (!open || step !== 'tarjetas') return
        if (selectedDireccionId == null) return
        let cancelled = false
        setLoadingEnvio(true)
        setErrorEnvio(null)
        setEnvioCotizacion(null)
        cotizarEnvio({ direccion_envio_id: selectedDireccionId })
            .then((data) => {
                if (!cancelled) {
                    setEnvioCotizacion(data)
                    setLoadingEnvio(false)
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setEnvioCotizacion(null)
                    setErrorEnvio(err?.message || 'No se pudo cotizar el envío')
                    setLoadingEnvio(false)
                }
            })
        return () => {
            cancelled = true
        }
    }, [open, step, selectedDireccionId])

    useEffect(() => {
        if (!usarFacturacion) return
        if (selectedFacturacionId != null) return
        const principal = datosFacturacion.find((d) => d.es_principal)
        setSelectedFacturacionId(principal?.id ?? datosFacturacion[0]?.id ?? null)
    }, [usarFacturacion, selectedFacturacionId, datosFacturacion])

    useEffect(() => {
        setCvvPago('')
    }, [selectedTarjetaId])

    const direccionPrincipal = direcciones.find((d) => d.es_principal) ?? direcciones[0]
    const facturacionPrincipal = datosFacturacion.find((d) => d.es_principal) ?? datosFacturacion[0]

    const validateCardForm = () => {
        const err = {}
        if (!String(cardForm.nombreTitular ?? '').trim()) err.nombreTitular = 'Requerido'
        const num = String(cardForm.numero ?? '').replace(/\s/g, '')
        if (num.length < 13 || num.length > 19) err.numero = 'Número inválido'
        const fecha = String(cardForm.fechaCaducidad ?? '').trim()
        if (!/^\d{2}\s*\/\s*\d{2}$/.test(fecha)) err.fechaCaducidad = 'Formato MM/AA'
        const cvv = String(cardForm.cvv ?? '').trim()
        if (cvv.length < 3 || cvv.length > 4) err.cvv = 'CVV 3 o 4 dígitos'
        setCardFormErrors(err)
        return Object.keys(err).length === 0
    }

    const handleSaveCard = async () => {
        const isEdit = !!editingCardId
        if (isEdit) {
            if (!String(cardForm.nombreTitular ?? '').trim()) {
                setCardFormErrors({ nombreTitular: 'Requerido' })
                return
            }
            setCardFormErrors({})
        } else {
            if (!validateCardForm()) return
        }

        setSavingCard(true)
        setCardFormErrors({})
        try {
            if (isEdit) {
                const current = cards.find((c) => c.id === editingCardId)
                await axios.put(`/tarjetas-guardadas/${editingCardId}`, {
                    nombre_titular: cardForm.nombreTitular.trim(),
                    es_favorita: current?.esFavorita ?? false,
                })
            } else {
                const num = String(cardForm.numero).replace(/\D/g, '')
                const fecha = String(cardForm.fechaCaducidad).replace(/\s/g, '')
                const { data } = await axios.post('/tarjetas-guardadas', {
                    nombre_titular: cardForm.nombreTitular.trim(),
                    numero: num,
                    fecha_caducidad: fecha,
                    es_favorita: cards.length === 0,
                })
                if (data?.success && data?.data) {
                    setSelectedTarjetaId(data.data.id)
                }
            }
            setCardForm({ nombreTitular: '', numero: '', fechaCaducidad: '', cvv: '' })
            setCardFormErrors({})
            setShowAddCard(false)
            setEditingCardId(null)
            await fetchCards()
        } catch (err) {
            const msg = err?.response?.data?.message || (err?.response?.data?.errors ? JSON.stringify(err.response.data.errors) : err?.message || 'Error al guardar')
            setCardFormErrors({ general: msg })
        } finally {
            setSavingCard(false)
        }
    }

    const setCardFavorite = async (id, fav) => {
        try {
            await axios.put(`/tarjetas-guardadas/${id}`, { es_favorita: fav })
            const next = cards.map((c) => ({ ...c, esFavorita: c.id === id ? fav : (fav ? false : c.esFavorita) }))
            setCards(next)
            if (fav) setSelectedTarjetaId(id)
        } catch {}
    }

    const handleDeleteCard = async (id) => {
        try {
            await axios.delete(`/tarjetas-guardadas/${id}`)
            const next = cards.filter((c) => c.id !== id)
            setCards(next)
            if (selectedTarjetaId === id) setSelectedTarjetaId(next[0]?.id ?? null)
        } catch {}
    }

    const openEditCard = (card) => {
        setEditingCardId(card.id)
        setCardForm({
            nombreTitular: card.nombreTitular || '',
            numero: card.numero || '',
            fechaCaducidad: card.fechaCaducidad || '',
            cvv: '',
        })
        setCardFormErrors({})
        setShowAddCard(true)
    }

    const resetDireccionForm = () => {
        setDireccionForm({
            nombre: '',
            telefono: '',
            calle: '',
            numero_exterior: '',
            numero_interior: '',
            colonia: '',
            ciudad: '',
            estado: '',
            codigo_postal: '',
            referencias: '',
            es_principal: direcciones.length === 0,
        })
        setDireccionErrors({})
    }

    const resetFacturacionForm = () => {
        setFacturacionForm({
            razon_social: '',
            rfc: '',
            calle: '',
            numero_exterior: '',
            numero_interior: '',
            colonia: '',
            ciudad: '',
            estado: '',
            codigo_postal: '',
            email_facturacion: '',
            telefono: '',
            es_principal: datosFacturacion.length === 0,
        })
        setFacturacionErrors({})
    }

    const openAddDireccionModal = () => {
        resetDireccionForm()
        setShowAddDireccion(true)
    }

    const openAddFacturacionModal = () => {
        resetFacturacionForm()
        setShowAddFacturacion(true)
    }

    const handleCreateDireccion = async (e) => {
        e.preventDefault()
        setSavingDireccion(true)
        setDireccionErrors({})
        try {
            const payload = {
                ...direccionForm,
                codigo_postal: String(direccionForm.codigo_postal || '').slice(0, 5),
                es_principal: !!direccionForm.es_principal,
            }
            const { data } = await axios.post('/direcciones-envio', payload)
            const createdId = data?.data?.id ?? null
            await fetchDirecciones()
            if (createdId != null) setSelectedDireccionId(createdId)
            setShowAddDireccion(false)
        } catch (err) {
            const errors = err?.response?.data?.errors || {}
            const message = err?.response?.data?.message || err?.message || 'No se pudo guardar la dirección.'
            setDireccionErrors({ ...errors, general: errors?.general || [message] })
        } finally {
            setSavingDireccion(false)
        }
    }

    const handleCreateFacturacion = async (e) => {
        e.preventDefault()
        setSavingFacturacion(true)
        setFacturacionErrors({})
        try {
            const payload = {
                ...facturacionForm,
                rfc: String(facturacionForm.rfc || '').toUpperCase().replace(/\s/g, ''),
                codigo_postal: String(facturacionForm.codigo_postal || '').slice(0, 5),
                es_principal: !!facturacionForm.es_principal,
            }
            const { data } = await axios.post('/datos-facturacion', payload)
            const createdId = data?.data?.id ?? null
            await fetchDatosFacturacion()
            if (createdId != null) setSelectedFacturacionId(createdId)
            setUsarFacturacion(true)
            setShowAddFacturacion(false)
        } catch (err) {
            const errors = err?.response?.data?.errors || {}
            const message = err?.response?.data?.message || err?.message || 'No se pudieron guardar los datos de facturación.'
            setFacturacionErrors({ ...errors, general: errors?.general || [message] })
        } finally {
            setSavingFacturacion(false)
        }
    }

    const handleConfirm = () => {
        onConfirm({
            direccionId: selectedDireccionId,
            facturacionId: usarFacturacion ? selectedFacturacionId : null,
            usarFacturacion,
            metodoPago,
            tarjetaId: metodoPago === 'tarjeta' ? selectedTarjetaId : null,
            cvvPago: metodoPago === 'tarjeta' ? cvvPago.trim() : null,
        })
    }

    const selectedCard = cards.find((c) => c.id === selectedTarjetaId)
    const paypalEnabled = paymentFlags.paypal !== false
    const mercadoPagoEnabled = paymentFlags.mercadopago !== false
    const tarjetaEnabled = paymentFlags.tarjeta !== false
    const availableMethods = [
        paypalEnabled ? 'paypal' : null,
        mercadoPagoEnabled ? 'mercadopago' : null,
        tarjetaEnabled ? 'tarjeta' : null,
    ].filter(Boolean)
    const anyMethodEnabled = availableMethods.length > 0

    useEffect(() => {
        if (!open) return
        if (!metodoPago || !availableMethods.includes(metodoPago)) {
            setMetodoPago(availableMethods[0] ?? null)
        }
    }, [open, metodoPago, availableMethods])

    const cvvPagoValido = /^\d{3,4}$/.test(cvvPago.trim())
    const tieneTarjetaValida = tarjetaEnabled && metodoPago === 'tarjeta' && selectedTarjetaId != null && cvvPagoValido
    const metodoPagoValido =
        (paypalEnabled && metodoPago === 'paypal') ||
        (mercadoPagoEnabled && metodoPago === 'mercadopago') ||
        tieneTarjetaValida
    const canConfirm =
        step === 'tarjetas' &&
        selectedDireccionId != null &&
        (!usarFacturacion || selectedFacturacionId != null) &&
        metodoPagoValido &&
        anyMethodEnabled &&
        !loadingPaymentFlags &&
        !loadingEnvio &&
        envioCotizacion != null &&
        !errorEnvio

    if (!open) return null

    const steps = [
        { id: 'contacto', label: 'Contacto / Envío' },
        { id: 'facturacion', label: 'Facturación' },
        { id: 'tarjetas', label: 'Método de pago' },
    ]
    const inputClass = `w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-[#FF8000] focus:border-[#FF8000] outline-none transition-colors ${
        darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
    }`
    const labelClass = `block text-sm font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => !loading && onClose()} aria-hidden />
            <div
                className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl border-2 shadow-2xl z-50 flex flex-col ${
                    darkMode ? 'bg-tienda-elevated border-gray-600' : 'bg-white border-gray-200'
                }`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="checkout-modal-title"
            >
                {/* Barra naranja y título */}
                <div className="bg-gradient-to-r from-[#FF8000] to-[#FF9500] px-6 py-3 flex items-center justify-between shrink-0">
                    <h2 id="checkout-modal-title" className="text-lg font-bold text-white">
                        Finalizar compra
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors disabled:opacity-50"
                        aria-label="Cerrar"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className={`flex border-b shrink-0 ${darkMode ? 'border-gray-600 bg-tienda-elevated/80' : 'border-gray-200 bg-gray-50'}`}>
                    {steps.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => setStep(s.id)}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                                step === s.id
                                    ? 'text-[#FF8000] border-b-2 border-[#FF8000]'
                                    : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Contacto / Envío */}
                    {step === 'contacto' && (
                        <div className="space-y-3">
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={openAddDireccionModal}
                                    className="shrink-0 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold bg-[#FF8000] hover:bg-[#e67300] text-white transition-colors"
                                >
                                    <span className="text-sm leading-none">+</span>
                                    Ingresar nuevos datos
                                </button>
                            </div>
                            {loadingDir ? (
                                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Cargando direcciones…</p>
                            ) : direcciones.length === 0 ? (
                                <p className={darkMode ? 'text-amber-400' : 'text-amber-700'}>
                                    No tienes direcciones todavía. Registra una aquí mismo para continuar.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {direcciones
                                        .sort((a, b) => (b.es_principal ? 1 : 0) - (a.es_principal ? 1 : 0))
                                        .map((d) => (
                                            <label
                                                key={d.id}
                                                className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                                    selectedDireccionId === d.id
                                                        ? darkMode ? 'border-[#FF8000] bg-[#FF8000]/10' : 'border-[#FF8000] bg-[#FF8000]/5'
                                                        : darkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="direccion"
                                                    checked={selectedDireccionId === d.id}
                                                    onChange={() => setSelectedDireccionId(d.id)}
                                                    className="mt-1 text-[#FF8000] focus:ring-[#FF8000]"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{d.nombre}</span>
                                                    {d.es_principal && (
                                                        <span className="ml-2 text-xs font-bold text-[#FF8000]">Principal</span>
                                                    )}
                                                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {d.calle}{d.numero_exterior ? ` ${d.numero_exterior}` : ''}, {d.colonia}, {d.ciudad_nombre || d.ciudad}, {d.estado}. CP {d.codigo_postal}
                                                    </p>
                                                </div>
                                            </label>
                                        ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Facturación */}
                    {step === 'facturacion' && (
                        <div className="space-y-3">
                            <div
                                className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${
                                    darkMode ? 'bg-gray-700/40 border-gray-600' : 'bg-gray-50 border-gray-200'
                                }`}
                            >
                                <div>
                                    <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                        ¿Deseas factura para este pedido?
                                    </p>
                                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Si la desactivas, el pedido se crea sin datos de facturación.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setUsarFacturacion((v) => !v)}
                                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                                        usarFacturacion ? 'bg-[#FF8000]' : 'bg-gray-400'
                                    }`}
                                    aria-label="Activar o desactivar facturación"
                                >
                                    <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                            usarFacturacion ? 'translate-x-8' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={openAddFacturacionModal}
                                    className="shrink-0 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold bg-[#FF8000] hover:bg-[#e67300] text-white transition-colors"
                                >
                                    <span className="text-sm leading-none">+</span>
                                    Ingresar nuevos datos
                                </button>
                            </div>
                            {!usarFacturacion ? (
                                <div
                                    className={`rounded-xl p-3 text-sm border ${
                                        darkMode ? 'bg-[#FF8000]/15 border-[#FF8000]/50 text-orange-200' : 'bg-orange-50 border-orange-200 text-orange-700'
                                    }`}
                                >
                                    Este pedido no incluirá datos de facturación.
                                </div>
                            ) : loadingFac ? (
                                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Cargando datos…</p>
                            ) : datosFacturacion.length === 0 ? (
                                <p className={darkMode ? 'text-amber-400' : 'text-amber-700'}>
                                    No tienes datos de facturación todavía. Regístralos aquí mismo.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {datosFacturacion
                                        .sort((a, b) => (b.es_principal ? 1 : 0) - (a.es_principal ? 1 : 0))
                                        .map((d) => (
                                            <label
                                                key={d.id}
                                                className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                                    selectedFacturacionId === d.id
                                                        ? darkMode ? 'border-[#FF8000] bg-[#FF8000]/10' : 'border-[#FF8000] bg-[#FF8000]/5'
                                                        : darkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="facturacion"
                                                    checked={selectedFacturacionId === d.id}
                                                    onChange={() => setSelectedFacturacionId(d.id)}
                                                    className="mt-1 text-[#FF8000] focus:ring-[#FF8000]"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{d.razon_social}</span>
                                                    {d.es_principal && (
                                                        <span className="ml-2 text-xs font-bold text-[#FF8000]">Principal</span>
                                                    )}
                                                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        RFC {d.rfc} · {d.email_facturacion || d.telefono || ''}
                                                    </p>
                                                </div>
                                            </label>
                                        ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Método de pago: PayPal, Mercado Pago o Tarjeta */}
                    {step === 'tarjetas' && (
                        <div className="space-y-4">
                            <div
                                className={`rounded-xl border p-3 text-sm space-y-2 ${
                                    darkMode ? 'bg-gray-700/40 border-gray-600' : 'bg-gray-50 border-gray-200'
                                }`}
                            >
                                <p className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Total a cobrar (productos + envío)</p>
                                {loadingEnvio && (
                                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Cotizando envío según tu carrito y dirección…</p>
                                )}
                                {errorEnvio && <p className="text-red-500 text-sm">{errorEnvio}</p>}
                                {envioCotizacion && !loadingEnvio && !errorEnvio && (
                                    <>
                                        <div className={`flex justify-between gap-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                            <span>Subtotal productos</span>
                                            <span className="font-medium tabular-nums">
                                                {formatPrecio(Number(envioCotizacion.subtotal_productos) || 0, envioCotizacion.moneda || 'MXN')}
                                            </span>
                                        </div>
                                        <div className={`flex justify-between gap-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                            <span>Envío estimado</span>
                                            <span className="font-medium tabular-nums">
                                                {formatPrecio(Number(envioCotizacion.costo_envio) || 0, envioCotizacion.moneda || 'MXN')}
                                            </span>
                                        </div>
                                        <div
                                            className={`flex justify-between gap-2 pt-2 border-t font-semibold ${
                                                darkMode ? 'text-[#FF8000] border-gray-600' : 'text-[#FF8000] border-gray-200'
                                            }`}
                                        >
                                            <span>Total</span>
                                            <span className="tabular-nums">
                                                {formatPrecio(Number(envioCotizacion.total) || 0, envioCotizacion.moneda || 'MXN')}
                                            </span>
                                        </div>
                                        {textoEntregaEstimada(envioCotizacion) ? (
                                            <p className={`text-xs leading-relaxed pt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {textoEntregaEstimada(envioCotizacion)}
                                            </p>
                                        ) : null}
                                        {envioCotizacion.aviso_envio ? (
                                            <p
                                                className={`text-xs leading-relaxed mt-2 rounded-lg border px-2.5 py-2 ${
                                                    darkMode
                                                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                                                        : 'border-amber-300 bg-amber-50 text-amber-900'
                                                }`}
                                            >
                                                {envioCotizacion.aviso_envio}
                                            </p>
                                        ) : null}
                                    </>
                                )}
                            </div>
                            {(() => {
                                const dSel = direcciones.find((d) => d.id === selectedDireccionId)
                                const fSel = usarFacturacion
                                    ? datosFacturacion.find((f) => f.id === selectedFacturacionId)
                                    : null
                                if (!dSel) return null
                                if (usarFacturacion && !fSel) return null
                                return (
                                    <div
                                        className={`rounded-xl p-3 text-xs border space-y-2 ${
                                            darkMode
                                                ? 'bg-gray-700/40 border-gray-600 text-gray-200'
                                                : 'bg-gray-50 border-gray-200 text-gray-800'
                                        }`}
                                    >
                                        <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                            Se usarán para tu pedido
                                        </p>
                                        <p>
                                            <span className="font-semibold text-[#FF8000]">Envío:</span>{' '}
                                            {dSel.nombre} — {dSel.calle}
                                            {dSel.numero_exterior ? ` ${dSel.numero_exterior}` : ''}, {dSel.colonia},{' '}
                                            {dSel.ciudad_nombre || dSel.ciudad}, CP {dSel.codigo_postal}
                                        </p>
                                        {usarFacturacion ? (
                                            <p>
                                                <span className="font-semibold text-[#FF8000]">Facturación:</span>{' '}
                                                {fSel.razon_social} — RFC {fSel.rfc}
                                            </p>
                                        ) : (
                                            <p>
                                                <span className="font-semibold text-[#FF8000]">Facturación:</span> No solicitada
                                            </p>
                                        )}
                                    </div>
                                )
                            })()}

                            {/* Opciones: PayPal, Mercado Pago, Tarjeta */}
                            <div className="grid grid-cols-1 gap-3">
                                {paypalEnabled && (
                                    <label
                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                            metodoPago === 'paypal'
                                                ? darkMode ? 'border-[#FF8000] bg-[#FF8000]/10' : 'border-[#FF8000] bg-[#FF8000]/5'
                                                : darkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="metodoPago"
                                            checked={metodoPago === 'paypal'}
                                            onChange={() => setMetodoPago('paypal')}
                                            className="text-[#FF8000] focus:ring-[#FF8000]"
                                        />
                                        <Image src="/Imagenes/PayPal.png" alt="PayPal" width={88} height={35} className="object-contain max-w-[88px] max-h-[35px]" />
                                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>PayPal</span>
                                    </label>
                                )}
                                {mercadoPagoEnabled && (
                                    <label
                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                            metodoPago === 'mercadopago'
                                                ? darkMode ? 'border-[#FF8000] bg-[#FF8000]/10' : 'border-[#FF8000] bg-[#FF8000]/5'
                                                : darkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="metodoPago"
                                            checked={metodoPago === 'mercadopago'}
                                            onChange={() => setMetodoPago('mercadopago')}
                                            className="text-[#FF8000] focus:ring-[#FF8000]"
                                        />
                                        <Image src="/Imagenes/mercado%20pago.png" alt="Mercado Pago" width={80} height={32} className="object-contain" />
                                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Mercado Pago</span>
                                    </label>
                                )}
                                {tarjetaEnabled && (
                                    <label
                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                            metodoPago === 'tarjeta'
                                                ? darkMode ? 'border-[#FF8000] bg-[#FF8000]/10' : 'border-[#FF8000] bg-[#FF8000]/5'
                                                : darkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="metodoPago"
                                            checked={metodoPago === 'tarjeta'}
                                            onChange={() => setMetodoPago('tarjeta')}
                                            className="text-[#FF8000] focus:ring-[#FF8000]"
                                        />
                                        <svg className="w-10 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Tarjeta de crédito o débito</span>
                                    </label>
                                )}
                            </div>
                            {!loadingPaymentFlags && !anyMethodEnabled && (
                                <div
                                    className={`rounded-xl p-3 text-xs border ${
                                        darkMode
                                            ? 'bg-red-950/40 border-red-700 text-red-200'
                                            : 'bg-red-50 border-red-200 text-red-700'
                                    }`}
                                >
                                    No hay métodos de pago disponibles en este momento. Contacta a administración.
                                </div>
                            )}

                            {/* Solo si eligió tarjeta: formulario y lista de tarjetas */}
                            {tarjetaEnabled && metodoPago === 'tarjeta' && (
                                <>
                            <p className={`text-sm pt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Añade una tarjeta y verifícala. Se guarda en tu cuenta y solo tú puedes verla.
                            </p>

                            {/* Ayuda visual: dónde encontrar número y CVV */}
                            <div className={`rounded-xl p-4 border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                <p className={`text-xs font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    ¿Dónde encuentro los datos?
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2">
                                        <Image
                                            src="/Imagenes/icon_tarjeta_frente.png"
                                            alt="Frente de tarjeta"
                                            width={32}
                                            height={32}
                                            className="object-contain"
                                        />
                                        <div>
                                            <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Frente:</span>
                                            <span className={`text-xs ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Número y nombre</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Image
                                            src="/Imagenes/icon_tarjeta_atras.png"
                                            alt="Reverso de tarjeta"
                                            width={32}
                                            height={32}
                                            className="object-contain"
                                        />
                                        <div>
                                            <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Reverso:</span>
                                            <span className={`text-xs ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>CVV (3-4 dígitos)</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 flex gap-4">
                                    <Image src="/Imagenes/Tarjeta_frente.png" alt="Ejemplo frente" width={120} height={76} className="rounded object-cover border border-gray-500" />
                                    <Image src="/Imagenes/Tarjeta_atras.png" alt="Ejemplo reverso" width={120} height={76} className="rounded object-cover border border-gray-500 ml-14" />
                                </div>
                            </div>

                            {/* Lista de tarjetas */}
                            <div className="space-y-2">
                                {cards.map((c) => (
                                    <div
                                        key={c.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 ${
                                            selectedTarjetaId === c.id
                                                ? darkMode ? 'border-[#FF8000] bg-[#FF8000]/10' : 'border-[#FF8000] bg-[#FF8000]/5'
                                                : darkMode ? 'border-gray-600' : 'border-gray-200'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="tarjeta"
                                            checked={selectedTarjetaId === c.id}
                                            onChange={() => setSelectedTarjetaId(c.id)}
                                            className="text-[#FF8000] focus:ring-[#FF8000]"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{c.nombreTitular}</p>
                                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{cardDisplayNumber(c)} · {c.fechaCaducidad}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setCardFavorite(c.id, !c.esFavorita)}
                                            className={`p-1.5 rounded-lg transition-colors ${c.esFavorita ? 'text-[#FF8000]' : darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                                            title={c.esFavorita ? 'Quitar favorita' : 'Marcar favorita'}
                                            aria-label={c.esFavorita ? 'Quitar favorita' : 'Marcar favorita'}
                                        >
                                            <svg className="w-5 h-5" fill={c.esFavorita ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openEditCard(c)}
                                            className={`p-1.5 rounded-lg ${darkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-200'}`}
                                            title="Editar"
                                            aria-label="Editar tarjeta"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteCard(c.id)}
                                            className={`p-1.5 rounded-lg ${darkMode ? 'text-red-400 hover:bg-red-500/20' : 'text-red-600 hover:bg-red-50'}`}
                                            title="Eliminar"
                                            aria-label="Eliminar tarjeta"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {!showAddCard ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingCardId(null)
                                        setCardForm({ nombreTitular: '', numero: '', fechaCaducidad: '', cvv: '' })
                                        setCardFormErrors({})
                                        setShowAddCard(true)
                                    }}
                                    className={`w-full py-2.5 rounded-xl border-2 border-dashed font-medium text-sm transition-colors ${
                                        darkMode ? 'border-gray-500 text-gray-300 hover:border-[#FF8000] hover:text-[#FF8000]' : 'border-gray-300 text-gray-600 hover:border-[#FF8000] hover:text-[#FF8000]'
                                    }`}
                                >
                                    + Añadir tarjeta
                                </button>
                            ) : (
                                <div className={`rounded-xl border-2 p-4 space-y-3 ${darkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-200 bg-gray-50'}`}>
                                    <h4 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {editingCardId ? 'Editar tarjeta' : 'Nueva tarjeta'}
                                    </h4>
                                    <div>
                                        <label className={labelClass}>Nombre en la tarjeta</label>
                                        <input
                                            type="text"
                                            value={cardForm.nombreTitular}
                                            onChange={(e) => setCardForm((f) => ({ ...f, nombreTitular: e.target.value }))}
                                            className={inputClass}
                                            placeholder="Como aparece en la tarjeta"
                                        />
                                        {cardFormErrors.nombreTitular && (
                                            <p className="mt-1 text-xs text-red-500">{cardFormErrors.nombreTitular}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={labelClass}>Número de tarjeta</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={19}
                                            value={cardForm.numero}
                                            onChange={(e) => {
                                                const v = e.target.value.replace(/\D/g, '').slice(0, 19)
                                                setCardForm((f) => ({ ...f, numero: v }))
                                            }}
                                            className={inputClass}
                                            placeholder="16 dígitos"
                                            disabled={!!editingCardId}
                                            readOnly={!!editingCardId}
                                        />
                                        {cardFormErrors.numero && (
                                            <p className="mt-1 text-xs text-red-500">{cardFormErrors.numero}</p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass}>Vencimiento (MM/AA)</label>
                                            <input
                                                type="text"
                                                value={cardForm.fechaCaducidad}
                                                onChange={(e) => {
                                                    let v = e.target.value.replace(/\D/g, '').slice(0, 4)
                                                    if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2)
                                                    setCardForm((f) => ({ ...f, fechaCaducidad: v }))
                                                }}
                                                className={inputClass}
                                                placeholder="MM/AA"
                                            />
                                            {cardFormErrors.fechaCaducidad && (
                                                <p className="mt-1 text-xs text-red-500">{cardFormErrors.fechaCaducidad}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className={labelClass}>CVV</label>
                                            <input
                                                type="password"
                                                inputMode="numeric"
                                                maxLength={4}
                                                value={cardForm.cvv}
                                                onChange={(e) => setCardForm((f) => ({ ...f, cvv: e.target.value.replace(/\D/g, '') }))}
                                                className={inputClass}
                                                placeholder="3 o 4 dígitos"
                                                disabled={!!editingCardId}
                                                readOnly={!!editingCardId}
                                            />
                                            {cardFormErrors.cvv && (
                                                <p className="mt-1 text-xs text-red-500">{cardFormErrors.cvv}</p>
                                            )}
                                        </div>
                                    </div>
                                    {cardFormErrors.general && (
                                        <p className="text-sm text-red-500">{cardFormErrors.general}</p>
                                    )}
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddCard(false)
                                                setEditingCardId(null)
                                                setCardForm({ nombreTitular: '', numero: '', fechaCaducidad: '', cvv: '' })
                                                setCardFormErrors({})
                                            }}
                                            disabled={savingCard}
                                            className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveCard}
                                            disabled={savingCard}
                                            className="flex-1 py-2 rounded-lg text-sm font-semibold bg-[#FF8000] hover:bg-[#e67300] text-white disabled:opacity-50"
                                        >
                                            {savingCard ? 'Guardando…' : (editingCardId ? 'Guardar cambios' : 'Guardar tarjeta')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {selectedCard && (
                                <div className={`rounded-xl p-4 border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                    <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        CVV de la tarjeta •••• {selectedCard.last4}
                                    </label>
                                    <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Por seguridad, ingresa el CVV (3 o 4 dígitos del reverso). No se guarda.
                                    </p>
                                    <input
                                        type="password"
                                        inputMode="numeric"
                                        maxLength={4}
                                        value={cvvPago}
                                        onChange={(e) => setCvvPago(e.target.value.replace(/\D/g, ''))}
                                        className={inputClass}
                                        placeholder="CVV"
                                        aria-label="CVV de la tarjeta"
                                    />
                                </div>
                            )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {externalError && (
                    <p className="px-6 pb-2 text-sm text-red-500">{externalError}</p>
                )}
                {open && step !== 'tarjetas' && (
                    <p className={`px-6 pb-1 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        Para ver el total con envío y poder pagar, abre la pestaña «Método de pago».
                    </p>
                )}

                {/* Footer: Cancelar (cierra ventana) y Pagar (cuando ya eligió tarjeta/datos) */}
                <div className={`flex gap-3 justify-end p-6 border-t shrink-0 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 bg-red-600 hover:bg-red-700 text-white"
                        aria-label="Cancelar y cerrar"
                    >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={loading || !canConfirm}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold bg-[#FF8000] hover:bg-[#e67300] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Pagar"
                    >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        {loading ? 'Procesando…' : 'Pagar'}
                    </button>
                </div>
            </div>

            {showAddDireccion && (
                <>
                    <div className="fixed inset-0 bg-black/70 z-[60]" onClick={() => !savingDireccion && setShowAddDireccion(false)} aria-hidden />
                    <div
                        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[94%] max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border-2 shadow-2xl z-[70] flex flex-col ${
                            darkMode ? 'bg-tienda-elevated border-gray-600' : 'bg-white border-gray-200'
                        }`}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="checkout-add-direccion-title"
                    >
                        <div className="bg-gradient-to-r from-[#FF8000] to-[#FF9500] px-6 py-3 flex items-center justify-between">
                            <h3 id="checkout-add-direccion-title" className="text-base font-bold text-white">
                                Nueva dirección de envío
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowAddDireccion(false)}
                                disabled={savingDireccion}
                                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors disabled:opacity-50"
                                aria-label="Cerrar modal de dirección"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateDireccion} className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Nombre *</label>
                                    <input
                                        type="text"
                                        value={direccionForm.nombre}
                                        onChange={(e) => setDireccionForm((f) => ({ ...f, nombre: e.target.value }))}
                                        className={inputClass}
                                    />
                                    {direccionErrors.nombre?.[0] && <p className="mt-1 text-xs text-red-500">{direccionErrors.nombre[0]}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Teléfono *</label>
                                    <input
                                        type="text"
                                        value={direccionForm.telefono}
                                        onChange={(e) => setDireccionForm((f) => ({ ...f, telefono: e.target.value }))}
                                        className={inputClass}
                                    />
                                    {direccionErrors.telefono?.[0] && <p className="mt-1 text-xs text-red-500">{direccionErrors.telefono[0]}</p>}
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Calle *</label>
                                <input
                                    type="text"
                                    value={direccionForm.calle}
                                    onChange={(e) => setDireccionForm((f) => ({ ...f, calle: e.target.value }))}
                                    className={inputClass}
                                />
                                {direccionErrors.calle?.[0] && <p className="mt-1 text-xs text-red-500">{direccionErrors.calle[0]}</p>}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Núm. exterior</label>
                                    <input
                                        type="text"
                                        value={direccionForm.numero_exterior}
                                        onChange={(e) => setDireccionForm((f) => ({ ...f, numero_exterior: e.target.value }))}
                                        className={inputClass}
                                    />
                                    {direccionErrors.numero_exterior?.[0] && <p className="mt-1 text-xs text-red-500">{direccionErrors.numero_exterior[0]}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Núm. interior (opcional)</label>
                                    <input
                                        type="text"
                                        value={direccionForm.numero_interior}
                                        onChange={(e) => setDireccionForm((f) => ({ ...f, numero_interior: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Colonia *</label>
                                <input
                                    type="text"
                                    value={direccionForm.colonia}
                                    onChange={(e) => setDireccionForm((f) => ({ ...f, colonia: e.target.value }))}
                                    className={inputClass}
                                />
                                {direccionErrors.colonia?.[0] && <p className="mt-1 text-xs text-red-500">{direccionErrors.colonia[0]}</p>}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Ciudad *</label>
                                    <input
                                        type="text"
                                        value={direccionForm.ciudad}
                                        onChange={(e) => setDireccionForm((f) => ({ ...f, ciudad: e.target.value }))}
                                        className={inputClass}
                                    />
                                    {direccionErrors.ciudad?.[0] && <p className="mt-1 text-xs text-red-500">{direccionErrors.ciudad[0]}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Estado *</label>
                                    <input
                                        type="text"
                                        value={direccionForm.estado}
                                        onChange={(e) => setDireccionForm((f) => ({ ...f, estado: e.target.value }))}
                                        className={inputClass}
                                    />
                                    {direccionErrors.estado?.[0] && <p className="mt-1 text-xs text-red-500">{direccionErrors.estado[0]}</p>}
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Código postal * (5 dígitos)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={5}
                                    value={direccionForm.codigo_postal}
                                    onChange={(e) => setDireccionForm((f) => ({ ...f, codigo_postal: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                                    className={inputClass}
                                />
                                {direccionErrors.codigo_postal?.[0] && <p className="mt-1 text-xs text-red-500">{direccionErrors.codigo_postal[0]}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Referencias (opcional)</label>
                                <input
                                    type="text"
                                    value={direccionForm.referencias}
                                    onChange={(e) => setDireccionForm((f) => ({ ...f, referencias: e.target.value }))}
                                    className={inputClass}
                                />
                                {direccionErrors.referencias?.[0] && <p className="mt-1 text-xs text-red-500">{direccionErrors.referencias[0]}</p>}
                            </div>
                            <label className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <input
                                    type="checkbox"
                                    checked={direccionForm.es_principal}
                                    onChange={(e) => setDireccionForm((f) => ({ ...f, es_principal: e.target.checked }))}
                                    className="rounded border-gray-300 text-[#FF8000] focus:ring-[#FF8000]"
                                />
                                Guardar como dirección principal
                            </label>
                            {direccionErrors.general?.[0] && <p className="text-sm text-red-500">{direccionErrors.general[0]}</p>}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddDireccion(false)}
                                    disabled={savingDireccion}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                                >
                                    <span className="relative block w-4 h-4 shrink-0">
                                        <Image src="/Imagenes/icon_cerrar_sesion.webp" alt="" fill className="object-contain brightness-0 invert" />
                                    </span>
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingDireccion}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#FF8000] hover:bg-[#e67300] text-white disabled:opacity-50"
                                >
                                    <span className="relative block w-4 h-4 shrink-0">
                                        <Image src="/Imagenes/icon_guardar.png" alt="" fill className="object-contain brightness-0 invert" />
                                    </span>
                                    {savingDireccion ? 'Guardando…' : 'Guardar dirección'}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}

            {showAddFacturacion && (
                <>
                    <div className="fixed inset-0 bg-black/70 z-[60]" onClick={() => !savingFacturacion && setShowAddFacturacion(false)} aria-hidden />
                    <div
                        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[94%] max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border-2 shadow-2xl z-[70] flex flex-col ${
                            darkMode ? 'bg-tienda-elevated border-gray-600' : 'bg-white border-gray-200'
                        }`}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="checkout-add-facturacion-title"
                    >
                        <div className="bg-gradient-to-r from-[#FF8000] to-[#FF9500] px-6 py-3 flex items-center justify-between">
                            <h3 id="checkout-add-facturacion-title" className="text-base font-bold text-white">
                                Nuevos datos de facturación
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowAddFacturacion(false)}
                                disabled={savingFacturacion}
                                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors disabled:opacity-50"
                                aria-label="Cerrar modal de facturación"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateFacturacion} className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div>
                                <label className={labelClass}>Razón social *</label>
                                <input
                                    type="text"
                                    value={facturacionForm.razon_social}
                                    onChange={(e) => setFacturacionForm((f) => ({ ...f, razon_social: e.target.value }))}
                                    className={inputClass}
                                />
                                {facturacionErrors.razon_social?.[0] && <p className="mt-1 text-xs text-red-500">{facturacionErrors.razon_social[0]}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>RFC * (12-13 caracteres)</label>
                                <input
                                    type="text"
                                    maxLength={14}
                                    value={facturacionForm.rfc}
                                    onChange={(e) => setFacturacionForm((f) => ({ ...f, rfc: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                                    className={inputClass}
                                />
                                {facturacionErrors.rfc?.[0] && <p className="mt-1 text-xs text-red-500">{facturacionErrors.rfc[0]}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Calle *</label>
                                <input
                                    type="text"
                                    value={facturacionForm.calle}
                                    onChange={(e) => setFacturacionForm((f) => ({ ...f, calle: e.target.value }))}
                                    className={inputClass}
                                />
                                {facturacionErrors.calle?.[0] && <p className="mt-1 text-xs text-red-500">{facturacionErrors.calle[0]}</p>}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Núm. exterior</label>
                                    <input
                                        type="text"
                                        value={facturacionForm.numero_exterior}
                                        onChange={(e) => setFacturacionForm((f) => ({ ...f, numero_exterior: e.target.value }))}
                                        className={inputClass}
                                    />
                                    {facturacionErrors.numero_exterior?.[0] && <p className="mt-1 text-xs text-red-500">{facturacionErrors.numero_exterior[0]}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Núm. interior (opcional)</label>
                                    <input
                                        type="text"
                                        value={facturacionForm.numero_interior}
                                        onChange={(e) => setFacturacionForm((f) => ({ ...f, numero_interior: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Colonia *</label>
                                <input
                                    type="text"
                                    value={facturacionForm.colonia}
                                    onChange={(e) => setFacturacionForm((f) => ({ ...f, colonia: e.target.value }))}
                                    className={inputClass}
                                />
                                {facturacionErrors.colonia?.[0] && <p className="mt-1 text-xs text-red-500">{facturacionErrors.colonia[0]}</p>}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Ciudad *</label>
                                    <input
                                        type="text"
                                        value={facturacionForm.ciudad}
                                        onChange={(e) => setFacturacionForm((f) => ({ ...f, ciudad: e.target.value }))}
                                        className={inputClass}
                                    />
                                    {facturacionErrors.ciudad?.[0] && <p className="mt-1 text-xs text-red-500">{facturacionErrors.ciudad[0]}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Estado *</label>
                                    <input
                                        type="text"
                                        value={facturacionForm.estado}
                                        onChange={(e) => setFacturacionForm((f) => ({ ...f, estado: e.target.value }))}
                                        className={inputClass}
                                    />
                                    {facturacionErrors.estado?.[0] && <p className="mt-1 text-xs text-red-500">{facturacionErrors.estado[0]}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Código postal * (5 dígitos)</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={5}
                                        value={facturacionForm.codigo_postal}
                                        onChange={(e) => setFacturacionForm((f) => ({ ...f, codigo_postal: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                                        className={inputClass}
                                    />
                                    {facturacionErrors.codigo_postal?.[0] && <p className="mt-1 text-xs text-red-500">{facturacionErrors.codigo_postal[0]}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Email facturación (opcional)</label>
                                    <input
                                        type="email"
                                        value={facturacionForm.email_facturacion}
                                        onChange={(e) => setFacturacionForm((f) => ({ ...f, email_facturacion: e.target.value }))}
                                        className={inputClass}
                                    />
                                    {facturacionErrors.email_facturacion?.[0] && <p className="mt-1 text-xs text-red-500">{facturacionErrors.email_facturacion[0]}</p>}
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Teléfono (opcional)</label>
                                <input
                                    type="text"
                                    value={facturacionForm.telefono}
                                    onChange={(e) => setFacturacionForm((f) => ({ ...f, telefono: e.target.value }))}
                                    className={inputClass}
                                />
                                {facturacionErrors.telefono?.[0] && <p className="mt-1 text-xs text-red-500">{facturacionErrors.telefono[0]}</p>}
                            </div>
                            <label className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <input
                                    type="checkbox"
                                    checked={facturacionForm.es_principal}
                                    onChange={(e) => setFacturacionForm((f) => ({ ...f, es_principal: e.target.checked }))}
                                    className="rounded border-gray-300 text-[#FF8000] focus:ring-[#FF8000]"
                                />
                                Guardar como datos principales
                            </label>
                            {facturacionErrors.general?.[0] && <p className="text-sm text-red-500">{facturacionErrors.general[0]}</p>}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddFacturacion(false)}
                                    disabled={savingFacturacion}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                                >
                                    <span className="relative block w-4 h-4 shrink-0">
                                        <Image src="/Imagenes/icon_cerrar_sesion.webp" alt="" fill className="object-contain brightness-0 invert" />
                                    </span>
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingFacturacion}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#FF8000] hover:bg-[#e67300] text-white disabled:opacity-50"
                                >
                                    <span className="relative block w-4 h-4 shrink-0">
                                        <Image src="/Imagenes/icon_guardar.png" alt="" fill className="object-contain brightness-0 invert" />
                                    </span>
                                    {savingFacturacion ? 'Guardando…' : 'Guardar datos'}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </>
    )
}
