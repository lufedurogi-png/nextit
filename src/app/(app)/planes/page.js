'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppHero from '@/components/coleccionador/AppHero'
import PageFade from '@/components/coleccionador/PageFade'
import {
    fetchPlanCatalog,
    fetchPaymentMethodFlags,
    fetchPlanSubscription,
    createPlanMercadoPagoPreference,
    confirmPlanMercadoPagoPayment,
    createPlanPayPalOrder,
    capturePlanPayPalOrder,
    checkoutPlanTarjeta,
    checkoutPlanPromocional,
    submitPromotionalPlanFeedback,
    cancelPlanSubscription,
    resumePlanSubscription,
} from '@/lib/planCheckout'

const METHOD_ICON = {
    paypal: '/Imagenes/PayPal.png',
    mercadopago: '/Imagenes/mercado%20pago.png',
    tarjeta: '/Imagenes/icons_metodosdepago.png',
    promocional: '/Imagenes/icon_modo.webp',
}

const FAQ = [
    {
        q: '¿Esto ya cobra de verdad?',
        a: 'No, hasta que pagues el plan Pro Coleccionista.',
    },
    {
        q: '¿Qué pasa con mis colecciones y progreso si cambio de teléfono?',
        a: 'Tu progreso se conserva desde que inicias sesión.',
    },
    {
        q: '¿Incluye cartas físicas?',
        a: 'El producto digital es independiente del álbum físico; aquí ordenas tu colección y tus intercambios.',
    },
]

function formatMoney(amount, currency) {
    try {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN' }).format(Number(amount) || 0)
    } catch {
        return `${currency || ''} ${amount}`
    }
}

function formatCountdown(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds || 0))
    const d = Math.floor(s / 86400)
    const h = Math.floor((s % 86400) / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${d}d ${h}h ${m}m ${sec}s`
}

function cadenceLabel(days) {
    const n = Number(days) || 30
    if (n === 7) return '/ semana'
    if (n === 30) return '/ mes'
    if (n === 365) return '/ año'
    return `/ ${n} días`
}

export default function PlanesPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [openFaq, setOpenFaq] = useState(0)
    const [mounted, setMounted] = useState(false)
    const [hasToken, setHasToken] = useState(false)
    const [catalog, setCatalog] = useState({ amount: 99, currency: 'MXN', period_days: 30, features: [] })
    const [subscription, setSubscription] = useState(null)
    const [payOpen, setPayOpen] = useState(false)
    const [flags, setFlags] = useState({ paypal: true, mercadopago: true, tarjeta: true, promocional: false })
    const [checkoutLoading, setCheckoutLoading] = useState(false)
    const [checkoutError, setCheckoutError] = useState('')
    const [failModal, setFailModal] = useState('')
    const [successModal, setSuccessModal] = useState(false)
    const [cancelOpen, setCancelOpen] = useState(false)
    const [cancelBusy, setCancelBusy] = useState(false)
    const [promoFeedback, setPromoFeedback] = useState('')
    const [promoFeedbackBusy, setPromoFeedbackBusy] = useState(false)
    const [promoFeedbackOk, setPromoFeedbackOk] = useState('')
    const [promoFeedbackErr, setPromoFeedbackErr] = useState('')

    useEffect(() => {
        setMounted(true)
        setHasToken(typeof window !== 'undefined' && !!localStorage.getItem('auth_token'))
    }, [])

    const loadCatalog = useCallback(async () => {
        try {
            const c = await fetchPlanCatalog()
            setCatalog(c)
        } catch {
            /* defaults */
        }
    }, [])

    const loadSubscription = useCallback(async () => {
        if (typeof window === 'undefined' || !localStorage.getItem('auth_token')) {
            setSubscription(null)
            return
        }
        try {
            const s = await fetchPlanSubscription()
            setSubscription(s)
        } catch {
            setSubscription(null)
        }
    }, [])

    useEffect(() => {
        loadCatalog()
    }, [loadCatalog])

    useEffect(() => {
        if (!mounted) return
        loadSubscription()
    }, [mounted, loadSubscription])

    const [clock, setClock] = useState(0)
    useEffect(() => {
        if (!subscription?.pro_active) return
        if (subscription?.pro_indefinite || subscription?.seconds_remaining == null) return
        const id = setInterval(() => setClock((c) => c + 1), 1000)
        return () => clearInterval(id)
    }, [subscription?.pro_active, subscription?.pro_indefinite, subscription?.seconds_remaining])

    const secondsLeft = useMemo(() => {
        if (!subscription?.pro_active || !subscription?.pro_ends_at) return 0
        const end = new Date(subscription.pro_ends_at).getTime()
        return Math.max(0, Math.floor((end - Date.now()) / 1000))
    }, [subscription, clock])

    const openPayModal = async () => {
        if (!hasToken) {
            router.push('/login')
            return
        }
        setCheckoutError('')
        try {
            const f = await fetchPaymentMethodFlags()
            setFlags(f)
        } catch {
            setFlags({ paypal: true, mercadopago: true, tarjeta: true, promocional: false })
        }
        setPayOpen(true)
    }

    const plansBase = useMemo(() => {
        const proPrice = formatMoney(catalog.amount, catalog.currency)
        const proFeatures = Array.isArray(catalog.features) ? catalog.features.filter((t) => String(t).trim()) : []
        return [
            {
                id: 'starter',
                name: 'Inicial',
                price: '$0',
                cadence: 'para siempre',
                blurb: 'Perfecto para empezar y sentir la experiencia.',
                highlight: false,
                features: ['Registros con cámara', 'Personalización de temas', 'Grupos', 'Mensajería', 'Tienda', 'Búsquedas'],
                cta: 'Ya lo tienes',
                tone: 'border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-900/70',
            },
            {
                id: 'pro',
                name: 'Pro Coleccionista',
                price: proPrice,
                cadence: cadenceLabel(catalog.period_days),
                blurb: 'Para quien quiere llevar el hobby en serio.',
                highlight: true,
                badge: 'Más popular',
                features: proFeatures,
                cta: 'Comprar',
                tone: 'border-[#c9a227]/70 bg-[linear-gradient(180deg,rgba(201,162,39,0.18),rgba(255,255,255,0.92))] shadow-[0_26px_80px_rgba(201,162,39,0.22)] dark:bg-[linear-gradient(180deg,rgba(201,162,39,0.22),rgba(15,23,42,0.92))]',
            },
        ]
    }, [catalog])

    const proActive = !!subscription?.pro_active
    const proCancelled = !!subscription?.pro_cancelled
    const visiblePlans = proActive ? plansBase.filter((p) => p.id === 'pro') : plansBase

    const handleCheckout = async (metodoPago) => {
        setCheckoutError('')
        setCheckoutLoading(true)
        try {
            const base = typeof window !== 'undefined' ? `${window.location.origin}/planes` : '/planes'

            if (metodoPago === 'mercadopago') {
                const { init_point: mpUrl } = await createPlanMercadoPagoPreference({
                    success: `${base}?mp_ok=1`,
                    failure: `${base}?mp_cancel=1`,
                    pending: `${base}?mp_pending=1`,
                })
                if (typeof window !== 'undefined' && mpUrl) window.location.assign(mpUrl)
                return
            }

            if (metodoPago === 'paypal') {
                const { approve_url: approveUrl } = await createPlanPayPalOrder(`${base}?paypal_ok=1`, `${base}?paypal_cancel=1`)
                if (typeof window !== 'undefined' && approveUrl) window.location.assign(approveUrl)
                return
            }

            if (metodoPago === 'tarjeta') {
                await checkoutPlanTarjeta()
                setPayOpen(false)
                await loadSubscription()
                setSuccessModal(true)
                return
            }

            if (metodoPago === 'promocional') {
                await checkoutPlanPromocional()
                setPayOpen(false)
                await loadSubscription()
                setSuccessModal(true)
                return
            }

            setCheckoutError('Método de pago no soportado.')
        } catch (err) {
            setCheckoutError(err?.message || err?.response?.data?.message || 'Error al procesar el pago')
        } finally {
            setCheckoutLoading(false)
        }
    }

    useEffect(() => {
        if (!mounted || !hasToken) return
        if (searchParams.get('paypal_cancel') === '1') {
            setFailModal('El pago no se completó en PayPal o fue cancelado.')
            router.replace('/planes', { scroll: false })
            return
        }
        if (searchParams.get('mp_cancel') === '1') {
            setFailModal('El pago no se completó en Mercado Pago o fue cancelado.')
            router.replace('/planes', { scroll: false })
            return
        }
        if (searchParams.get('mp_pending') === '1') {
            setFailModal('Tu pago está pendiente de confirmación. Cuando se apruebe, verás el plan activo al volver a esta página.')
            router.replace('/planes', { scroll: false })
            return
        }
        if (searchParams.get('paypal_ok') !== '1') return
        const orderId = searchParams.get('token')
        if (!orderId) {
            setFailModal('No se recibió la orden de PayPal.')
            router.replace('/planes', { scroll: false })
            return
        }
        const doneKey = `plan_paypal_done_${orderId}`
        if (sessionStorage.getItem(doneKey)) {
            router.replace('/planes', { scroll: false })
            return
        }
        const lockKey = `plan_paypal_lock_${orderId}`
        if (sessionStorage.getItem(lockKey)) return
        sessionStorage.setItem(lockKey, '1')
        ;(async () => {
            setCheckoutLoading(true)
            try {
                await capturePlanPayPalOrder(orderId)
                sessionStorage.setItem(doneKey, '1')
                sessionStorage.removeItem(lockKey)
                router.replace('/planes', { scroll: false })
                await loadSubscription()
                setSuccessModal(true)
            } catch (e) {
                sessionStorage.removeItem(lockKey)
                setFailModal(e?.message || e?.response?.data?.message || 'No se pudo confirmar PayPal.')
            } finally {
                setCheckoutLoading(false)
            }
        })()
    }, [mounted, hasToken, router, searchParams, loadSubscription])

    useEffect(() => {
        if (!mounted || !hasToken) return
        if (searchParams.get('mp_ok') !== '1') return
        const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id')
        const preferenceId = searchParams.get('preference_id')
        if (!paymentId) {
            setFailModal('No se recibió el identificador de pago de Mercado Pago.')
            router.replace('/planes', { scroll: false })
            return
        }
        const doneKey = `plan_mp_done_${paymentId}`
        if (sessionStorage.getItem(doneKey)) {
            router.replace('/planes', { scroll: false })
            return
        }
        const lockKey = `plan_mp_lock_${paymentId}`
        if (sessionStorage.getItem(lockKey)) return
        sessionStorage.setItem(lockKey, '1')
        ;(async () => {
            setCheckoutLoading(true)
            try {
                await confirmPlanMercadoPagoPayment({
                    payment_id: paymentId,
                    preference_id: preferenceId || undefined,
                })
                sessionStorage.setItem(doneKey, '1')
                sessionStorage.removeItem(lockKey)
                router.replace('/planes', { scroll: false })
                await loadSubscription()
                setSuccessModal(true)
            } catch (e) {
                sessionStorage.removeItem(lockKey)
                setFailModal(e?.message || e?.response?.data?.message || 'No se pudo confirmar Mercado Pago.')
            } finally {
                setCheckoutLoading(false)
            }
        })()
    }, [mounted, hasToken, router, searchParams, loadSubscription])

    const startedLabel = subscription?.pro_started_at
        ? new Date(subscription.pro_started_at).toLocaleString('es-MX', {
              dateStyle: 'medium',
              timeStyle: 'short',
          })
        : null

    return (
        <PageFade>
            <AppHero eyebrow="Membresías" title="Planes">
                <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90">
                        Pro · periodo {catalog.period_days || 30} días · pasarelas reales
                    </span>
                    <Link
                        href="/inicio"
                        className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </AppHero>

            <div className="relative z-[1] mx-auto max-w-5xl px-4 pb-14 -mt-4">
                {checkoutLoading ? (
                    <div className="mb-4 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                        Confirmando pago…
                    </div>
                ) : null}

                <div className={`mx-auto grid max-w-3xl gap-4 ${visiblePlans.length > 1 ? 'lg:grid-cols-2' : 'lg:max-w-lg'}`}>
                    {visiblePlans.map((plan, idx) => (
                        <motion.article
                            key={plan.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * idx, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                            className={`relative overflow-hidden rounded-[1.6rem] border p-5 ${plan.tone}`}
                        >
                            {plan.highlight ? (
                                <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#c9a227]/25 blur-3xl" />
                            ) : null}
                            {plan.badge ? (
                                <div className="mb-3 inline-flex items-center rounded-full bg-[#0b1b3c] px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.22em] text-white">
                                    {plan.badge}
                                </div>
                            ) : null}
                            <h2 className="font-playfair text-2xl font-extrabold text-slate-900 dark:text-slate-50">{plan.name}</h2>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{plan.blurb}</p>
                            <div className="mt-5 flex items-end gap-2">
                                <p className="font-playfair text-4xl font-extrabold text-slate-900 dark:text-slate-50">{plan.price}</p>
                                <p className="pb-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{plan.cadence}</p>
                            </div>

                            {plan.id === 'pro' && proActive ? (
                                <div className="mt-4 space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
                                    <p className="font-extrabold">Plan activo</p>
                                    {startedLabel ? (
                                        <p>
                                            <span className="font-semibold text-emerald-800 dark:text-emerald-200">Inicio del periodo: </span>
                                            {startedLabel}
                                        </p>
                                    ) : null}
                                    <p>
                                        <span className="font-semibold text-emerald-800 dark:text-emerald-200">Tiempo restante: </span>
                                        {secondsLeft === null ? 'Ilimitado' : formatCountdown(secondsLeft)}
                                    </p>
                                    {proCancelled ? (
                                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                                            Marcaste cancelación; puedes reanudar mientras siga vigente el periodo pagado.
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}

                            {plan.id === 'pro' && plan.features.length === 0 ? (
                                <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
                                    Los beneficios del plan Pro se configuran desde el panel de administración.
                                </p>
                            ) : (
                                <ul className="mt-5 space-y-2">
                                    {plan.features.map((f, fi) => (
                                        <li key={`${plan.id}-${fi}-${f.slice(0, 24)}`} className="flex gap-2 text-sm text-slate-700 dark:text-slate-200">
                                            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                                ✓
                                            </span>
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <div className="mt-6 space-y-2">
                                {plan.id === 'starter' ? (
                                    <button
                                        type="button"
                                        disabled
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-extrabold text-slate-900 opacity-80 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-50"
                                    >
                                        {plan.cta}
                                    </button>
                                ) : null}

                                {plan.id === 'pro' && !proActive ? (
                                    <button
                                        type="button"
                                        onClick={openPayModal}
                                        className="w-full rounded-2xl bg-[#0b1b3c] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:brightness-110 active:scale-[0.99]"
                                    >
                                        {plan.cta}
                                    </button>
                                ) : null}

                                {plan.id === 'pro' && proActive && !proCancelled ? (
                                    <button
                                        type="button"
                                        onClick={() => setCancelOpen(true)}
                                        className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-extrabold text-red-700 transition hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/30"
                                    >
                                        Cancelar plan
                                    </button>
                                ) : null}

                                {plan.id === 'pro' && proActive && proCancelled && !subscription?.pro_indefinite ? (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setCheckoutError('')
                                            try {
                                                await resumePlanSubscription()
                                                await loadSubscription()
                                            } catch (e) {
                                                setCheckoutError(e?.message || 'No se pudo reanudar')
                                            }
                                        }}
                                        className="w-full rounded-2xl bg-[#0b1b3c] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:brightness-110"
                                    >
                                        Reanudar plan
                                    </button>
                                ) : null}

                                {plan.id !== 'pro' ? (
                                    <p className="text-center text-[0.7rem] font-semibold text-slate-500 dark:text-slate-400">
                                        Plan base sin cargo.
                                    </p>
                                ) : null}
                                {checkoutError ? <p className="text-center text-xs font-bold text-red-600">{checkoutError}</p> : null}
                            </div>
                        </motion.article>
                    ))}
                </div>

                {subscription?.show_promotional_feedback && hasToken ? (
                    <motion.section
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="mt-8 rounded-[1.6rem] border border-[#c9a227]/35 bg-[linear-gradient(180deg,rgba(201,162,39,0.12),rgba(255,255,255,0.92))] p-5 dark:border-[#c9a227]/30 dark:bg-[linear-gradient(180deg,rgba(201,162,39,0.15),rgba(15,23,42,0.92))]"
                    >
                        <h3 className="font-playfair text-2xl font-extrabold text-slate-900 dark:text-slate-50">Comentarios y sugerencias</h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            Activaste Pro con la promoción: cuéntanos qué te gustaría mejorar en la experiencia Coleccionador.
                        </p>
                        {promoFeedbackOk ? (
                            <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{promoFeedbackOk}</p>
                        ) : null}
                        {promoFeedbackErr ? (
                            <p className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400">{promoFeedbackErr}</p>
                        ) : null}
                        <textarea
                            value={promoFeedback}
                            onChange={(e) => setPromoFeedback(e.target.value)}
                            placeholder="Escribe aquí tus comentarios o sugerencias…"
                            rows={5}
                            className="mt-4 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                        />
                        <div className="mt-4 flex flex-wrap gap-3">
                            <button
                                type="button"
                                disabled={promoFeedbackBusy || !promoFeedback.trim()}
                                onClick={async () => {
                                    setPromoFeedbackOk('')
                                    setPromoFeedbackErr('')
                                    setPromoFeedbackBusy(true)
                                    try {
                                        await submitPromotionalPlanFeedback(promoFeedback.trim())
                                        setPromoFeedback('')
                                        setPromoFeedbackOk('¡Gracias! Tu mensaje fue enviado.')
                                    } catch (e) {
                                        setPromoFeedbackErr(e?.message || 'No se pudo enviar.')
                                    } finally {
                                        setPromoFeedbackBusy(false)
                                    }
                                }}
                                className="rounded-2xl bg-[#0b1b3c] px-5 py-2.5 text-sm font-extrabold text-white transition hover:brightness-110 disabled:opacity-50"
                            >
                                {promoFeedbackBusy ? 'Enviando…' : 'Enviar'}
                            </button>
                        </div>
                    </motion.section>
                ) : null}

                <motion.section
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-8 rounded-[1.6rem] border border-slate-200 bg-white/90 p-5 dark:border-slate-700 dark:bg-slate-900/70"
                >
                    <h3 className="font-playfair text-2xl font-extrabold text-slate-900 dark:text-slate-50">Preguntas frecuentes</h3>
                    <div className="mt-4 space-y-2">
                        {FAQ.map((item, idx) => {
                            const open = openFaq === idx
                            return (
                                <button
                                    key={item.q}
                                    type="button"
                                    onClick={() => setOpenFaq(open ? -1 : idx)}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-[#c9a227]/60 dark:border-slate-800 dark:bg-slate-950/35"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{item.q}</p>
                                        <span className="text-slate-400">{open ? '−' : '+'}</span>
                                    </div>
                                    {open ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.a}</p> : null}
                                </button>
                            )
                        })}
                    </div>
                </motion.section>
            </div>

            {payOpen ? (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
                    <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#c9a227]">Checkout</p>
                                <h3 className="mt-1 font-playfair text-xl font-extrabold text-slate-900 dark:text-slate-50">Métodos de pago</h3>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                    Importe: <span className="font-bold">{formatMoney(catalog.amount, catalog.currency)}</span> · periodo{' '}
                                    {catalog.period_days || 30} días
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setPayOpen(false)
                                    setCheckoutError('')
                                }}
                                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                Cerrar
                            </button>
                        </div>

                        {checkoutError ? <p className="mt-3 text-sm font-bold text-red-600">{checkoutError}</p> : null}

                        <div className="mt-5 space-y-3">
                            {flags.mercadopago ? (
                                <button
                                    type="button"
                                    disabled={checkoutLoading}
                                    onClick={() => handleCheckout('mercadopago')}
                                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[#c9a227] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
                                >
                                    <Image src={METHOD_ICON.mercadopago} alt="" width={40} height={28} className="object-contain" />
                                    <div>
                                        <p className="font-extrabold text-slate-900 dark:text-slate-50">Mercado Pago</p>
                                    </div>
                                </button>
                            ) : null}
                            {flags.paypal ? (
                                <button
                                    type="button"
                                    disabled={checkoutLoading}
                                    onClick={() => handleCheckout('paypal')}
                                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[#c9a227] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
                                >
                                    <Image src={METHOD_ICON.paypal} alt="" width={40} height={28} className="object-contain" />
                                    <div>
                                        <p className="font-extrabold text-slate-900 dark:text-slate-50">PayPal</p>
                                    </div>
                                </button>
                            ) : null}
                            {flags.tarjeta ? (
                                <button
                                    type="button"
                                    disabled={checkoutLoading}
                                    onClick={() => handleCheckout('tarjeta')}
                                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[#c9a227] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
                                >
                                    <Image src={METHOD_ICON.tarjeta} alt="" width={40} height={28} className="object-contain" />
                                    <div>
                                        <p className="font-extrabold text-slate-900 dark:text-slate-50">Tarjeta bancaria</p>
                                    </div>
                                </button>
                            ) : null}
                            {flags.promocional ? (
                                <button
                                    type="button"
                                    disabled={checkoutLoading}
                                    onClick={() => handleCheckout('promocional')}
                                    className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-[#c9a227]/70 bg-[#c9a227]/10 p-4 text-left transition hover:border-[#c9a227] disabled:opacity-60 dark:bg-[#c9a227]/15"
                                >
                                    <Image src={METHOD_ICON.promocional} alt="" width={40} height={28} className="object-contain" />
                                    <div>
                                        <p className="font-extrabold text-slate-900 dark:text-slate-50">Promocional por tiempo limitado</p>
                                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                            Activa Pro gratis durante la promo
                                        </p>
                                    </div>
                                </button>
                            ) : null}
                            {!flags.mercadopago && !flags.paypal && !flags.tarjeta && !flags.promocional ? (
                                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                                    No hay métodos de pago habilitados. Un administrador puede activarlos en el panel.
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}

            {failModal ? (
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-md rounded-[1.5rem] border border-red-200 bg-white p-6 text-center shadow-2xl dark:border-red-900/50 dark:bg-slate-900">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl dark:bg-red-950/60">
                            !
                        </div>
                        <h3 className="font-playfair text-xl font-extrabold text-slate-900 dark:text-slate-50">No se completó el pago</h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{failModal}</p>
                        <button
                            type="button"
                            onClick={() => setFailModal('')}
                            className="mt-5 w-full rounded-2xl bg-[#0b1b3c] px-4 py-3 text-sm font-extrabold text-white"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            ) : null}

            {successModal ? (
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-md rounded-[1.5rem] border border-emerald-200 bg-white p-6 text-center shadow-2xl dark:border-emerald-900/40 dark:bg-slate-900">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            ✓
                        </div>
                        <h3 className="font-playfair text-xl font-extrabold text-slate-900 dark:text-slate-50">¡Pago exitoso!</h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Tu plan Pro Coleccionista ya está activo en esta cuenta.</p>
                        <button
                            type="button"
                            onClick={() => setSuccessModal(false)}
                            className="mt-5 w-full rounded-2xl bg-[#0b1b3c] px-4 py-3 text-sm font-extrabold text-white"
                        >
                            Continuar
                        </button>
                    </div>
                </div>
            ) : null}

            {cancelOpen ? (
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                        <h3 className="font-playfair text-xl font-extrabold text-slate-900 dark:text-slate-50">Cancelar plan Pro</h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            Marcaremos el plan como cancelado. Mientras siga vigente el tiempo que ya pagaste, podrás reanudarlo y seguirás teniendo acceso a las
                            funciones del periodo (por ejemplo el botón Escanear).
                        </p>
                        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                            <button
                                type="button"
                                disabled={cancelBusy}
                                onClick={() => setCancelOpen(false)}
                                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-slate-800 dark:border-slate-600 dark:text-slate-100"
                            >
                                Volver
                            </button>
                            <button
                                type="button"
                                disabled={cancelBusy}
                                onClick={async () => {
                                    setCancelBusy(true)
                                    try {
                                        await cancelPlanSubscription()
                                        setCancelOpen(false)
                                        await loadSubscription()
                                    } catch (e) {
                                        setCheckoutError(e?.message || 'No se pudo cancelar')
                                    } finally {
                                        setCancelBusy(false)
                                    }
                                }}
                                className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-60"
                            >
                                {cancelBusy ? 'Procesando…' : 'Sí, cancelar'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </PageFade>
    )
}
