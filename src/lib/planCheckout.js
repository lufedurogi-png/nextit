import axios from '@/lib/axios'

function publicApiBase() {
    const raw = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
    return raw.endsWith('/api') ? raw : `${raw}/api`
}

/** Sin Bearer: evita 401 por token caducado al leer precio en página pública. */
export async function fetchPlanCatalog() {
    const res = await fetch(`${publicApiBase()}/plan/catalog`, {
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    })
    const data = await res.json().catch(() => ({}))
    if (data?.success && data?.data?.pro) {
        const pro = data.data.pro
        return {
            amount: pro.amount,
            currency: pro.currency,
            period_days: pro.period_days ?? 30,
            features: Array.isArray(pro.features) ? pro.features : [],
        }
    }
    return { amount: 99, currency: 'MXN', period_days: 30, features: [] }
}

export async function fetchPaymentMethodFlags() {
    const { data } = await axios.get('/metodos-pago')
    if (data?.success && data?.data?.flags) return data.data.flags
    return { paypal: true, mercadopago: true, tarjeta: true }
}

export async function fetchPlanSubscription() {
    const { data } = await axios.get('/plan/subscription')
    if (data?.success && data?.data) return data.data
    return null
}

export async function createPlanMercadoPagoPreference(backUrls) {
    const { data } = await axios.post('/plan/mercadopago/preferences', { back_urls: backUrls })
    if (data?.success && data?.data?.init_point) return data.data
    throw new Error(data?.message || 'No se pudo iniciar Mercado Pago')
}

export async function confirmPlanMercadoPagoPayment(body) {
    const { data } = await axios.post('/plan/mercadopago/payments/confirm', body)
    if (data?.success) return data
    throw new Error(data?.message || 'No se pudo confirmar el pago')
}

export async function createPlanPayPalOrder(returnUrl, cancelUrl) {
    const { data } = await axios.post('/plan/paypal/orders', {
        return_url: returnUrl,
        cancel_url: cancelUrl,
    })
    if (data?.success && data?.data?.approve_url) return data.data
    throw new Error(data?.message || 'No se pudo iniciar PayPal')
}

export async function capturePlanPayPalOrder(orderId) {
    const { data } = await axios.post('/plan/paypal/orders/capture', { order_id: orderId })
    if (data?.success) return data
    throw new Error(data?.message || 'No se pudo confirmar PayPal')
}

export async function checkoutPlanTarjeta() {
    const { data } = await axios.post('/plan/tarjeta/checkout')
    if (data?.success) return data
    throw new Error(data?.message || 'No se pudo completar el pago simulado')
}

export async function cancelPlanSubscription() {
    const { data } = await axios.post('/plan/subscription/cancel')
    if (data?.success) return data
    throw new Error(data?.message || 'No se pudo cancelar')
}

export async function resumePlanSubscription() {
    const { data } = await axios.post('/plan/subscription/resume')
    if (data?.success) return data
    throw new Error(data?.message || 'No se pudo reanudar')
}
