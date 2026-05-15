import axios from '@/lib/axios'

export async function fetchVentasCotizacionReglasPrecio() {
    const { data } = await axios.get('/ventas/cotizaciones/reglas-precio')
    const pct = Number(data?.data?.max_descuento_pct)
    return Number.isFinite(pct) && pct > 0 ? pct : 10
}

export async function searchVentasClientes(q) {
    const { data } = await axios.get('/ventas/cotizaciones/clientes', { params: { q } })
    if (!data?.success || !Array.isArray(data.data)) return []
    return data.data
}

export async function fetchVentasCotizaciones(page = 1, perPage = 10) {
    const { data } = await axios.get('/ventas/cotizaciones', { params: { page, per_page: perPage } })
    if (!data?.success || !Array.isArray(data.data)) {
        throw new Error(data?.message || 'No se pudieron cargar las cotizaciones.')
    }
    return {
        rows: data.data,
        meta: data.meta || { current_page: 1, last_page: 1, per_page: perPage, total: 0 },
    }
}

export async function createVentasCotizacion(payload) {
    const { data } = await axios.post('/ventas/cotizaciones', payload)
    if (!data?.success || !data.data) {
        throw new Error(data?.message || 'No se pudo guardar la cotización.')
    }
    return data.data
}

export async function updateVentasCotizacion(id, payload) {
    const { data } = await axios.put(`/ventas/cotizaciones/${id}`, payload)
    if (!data?.success || !data.data) {
        throw new Error(data?.message || 'No se pudo actualizar la cotización.')
    }
    return data.data
}

export async function deleteVentasCotizacion(id) {
    const { data } = await axios.delete(`/ventas/cotizaciones/${id}`)
    if (!data?.success) {
        throw new Error(data?.message || 'No se pudo eliminar.')
    }
}
