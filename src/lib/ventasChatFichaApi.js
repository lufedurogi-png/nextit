import axios from '@/lib/axios'
import { downloadCotizacionPdf } from '@/lib/cotizacionPdf'

export async function fetchVentasFichaCliente(userId) {
    const { data } = await axios.get(`/ventas/chat/clientes/${userId}/ficha`)
    if (!data?.success) throw new Error(data?.message || 'No se pudo cargar el cliente.')
    return data.data
}

export async function fetchVentasFichaComentarios(userId, { page = 1, q = '' } = {}) {
    const { data } = await axios.get(`/ventas/chat/clientes/${userId}/comentarios`, {
        params: { page, q: q || undefined },
    })
    if (!data?.success) throw new Error(data?.message || 'No se pudieron cargar los comentarios.')
    return { rows: data.data ?? [], meta: data.meta ?? {} }
}

export async function crearVentasFichaComentario(userId, body) {
    const { data } = await axios.post(`/ventas/chat/clientes/${userId}/comentarios`, { body })
    if (!data?.success) throw new Error(data?.message || 'No se pudo guardar el comentario.')
    return data.data
}

export async function fetchVentasFichaPedidos(userId, { page = 1, folio = '', estatus = 'todos', fecha_desde = '', fecha_hasta = '' } = {}) {
    const { data } = await axios.get(`/ventas/chat/clientes/${userId}/pedidos`, {
        params: {
            page,
            folio: folio || undefined,
            estatus: estatus !== 'todos' ? estatus : undefined,
            fecha_desde: fecha_desde || undefined,
            fecha_hasta: fecha_hasta || undefined,
        },
    })
    if (!data?.success) throw new Error(data?.message || 'No se pudieron cargar los pedidos.')
    return { rows: data.data ?? [], meta: data.meta ?? {} }
}

export async function fetchVentasFichaPedidoDetalle(userId, pedidoId) {
    const { data } = await axios.get(`/ventas/chat/clientes/${userId}/pedidos/${pedidoId}`)
    if (!data?.success) throw new Error(data?.message || 'No se pudo cargar el pedido.')
    return data.data
}

export async function fetchVentasFichaCotizaciones(userId, { page = 1, q = '', tipo = 'todos' } = {}) {
    const { data } = await axios.get(`/ventas/chat/clientes/${userId}/cotizaciones`, {
        params: { page, q: q || undefined, tipo: tipo !== 'todos' ? tipo : undefined },
    })
    if (!data?.success) throw new Error(data?.message || 'No se pudieron cargar las cotizaciones.')
    return { rows: data.data ?? [], meta: data.meta ?? {} }
}

export async function fetchVentasFichaCotizacionDetalle(userId, tipo, id) {
    const { data } = await axios.get(`/ventas/chat/clientes/${userId}/cotizaciones/${tipo}/${id}`)
    if (!data?.success) throw new Error(data?.message || 'No se pudo cargar la cotización.')
    return data.data
}

export async function downloadVentasFichaPedidoPdf(userId, pedidoId, folio) {
    const { data } = await axios.get(`/ventas/chat/clientes/${userId}/pedidos/${pedidoId}/pdf`, {
        responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `pedido-${folio || pedidoId}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
}

export async function downloadVentasFichaCotizacionPdf(userId, detalle) {
    if (detalle.tipo === 'tienda') {
        const { data } = await axios.get(`/ventas/chat/clientes/${userId}/cotizaciones/tienda/${detalle.id}/pdf`, {
            responseType: 'blob',
        })
        const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
        const a = document.createElement('a')
        a.href = url
        a.download = `cotizacion-${detalle.folio || detalle.id}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
        return
    }
    await downloadCotizacionPdf(
        detalle.items ?? [],
        detalle.total,
        `Cotizacion_${detalle.folio || detalle.id}.pdf`,
        detalle.folio || detalle.id
    )
}
