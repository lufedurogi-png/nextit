import axios from '@/lib/axios'
import {
    fetchVentasFichaCotizacionDetalle,
    fetchVentasFichaCotizaciones,
    downloadVentasFichaCotizacionPdf,
} from '@/lib/ventasChatFichaApi'

export async function fetchVentasClientesCrm({ page = 1, q = '' } = {}) {
    const { data } = await axios.get('/ventas/clientes/crm', {
        params: { page, q: q || undefined },
    })
    if (!data?.success) throw new Error(data?.message || 'No se pudieron cargar los clientes.')
    return { rows: data.data ?? [], meta: data.meta ?? {} }
}

export async function fetchVentasClientesTienda({ page = 1, q = '' } = {}) {
    const { data } = await axios.get('/ventas/clientes/tienda', {
        params: { page, q: q || undefined },
    })
    if (!data?.success) throw new Error(data?.message || 'No se pudieron cargar los clientes.')
    return { rows: data.data ?? [], meta: data.meta ?? {} }
}

export async function fetchVentasClientesCrmCotizaciones(cliente, { page = 1 } = {}) {
    const params = { page }
    if (cliente?.cliente_user_id) {
        params.cliente_user_id = cliente.cliente_user_id
    } else if (cliente?.invitado_email) {
        params.invitado_email = cliente.invitado_email
    } else {
        throw new Error('Cliente sin identificador.')
    }
    const { data } = await axios.get('/ventas/clientes/crm/cotizaciones', { params })
    if (!data?.success) throw new Error(data?.message || 'No se pudieron cargar las cotizaciones.')
    return { rows: data.data ?? [], meta: data.meta ?? {} }
}

export async function fetchVentasClientesCrmCotizacionDetalle(id) {
    const { data } = await axios.get(`/ventas/clientes/crm/cotizaciones/${id}`)
    if (!data?.success) throw new Error(data?.message || 'No se pudo cargar la cotización.')
    return data.data
}

export async function fetchVentasClientesTiendaCotizaciones(userId, { page = 1, q = '' } = {}) {
    return fetchVentasFichaCotizaciones(userId, { page, q, tipo: 'tienda' })
}

export async function fetchVentasClientesTiendaCotizacionDetalle(userId, id) {
    return fetchVentasFichaCotizacionDetalle(userId, 'tienda', id)
}

export async function downloadVentasClientesCotizacionPdf(userId, detalle) {
    return downloadVentasFichaCotizacionPdf(userId, detalle)
}
