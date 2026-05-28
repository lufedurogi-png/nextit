import axios from '@/lib/axios'

export async function fetchVentasCorreoDestinatarios() {
    const { data } = await axios.get('/ventas/correos/destinatarios')
    if (!data?.success || !Array.isArray(data.data)) {
        throw new Error(data?.message || 'No se pudieron cargar los destinatarios.')
    }
    return data.data
}

export async function createVentasCorreoDestinatario(payload) {
    const { data } = await axios.post('/ventas/correos/destinatarios', payload)
    if (!data?.success || !data.data) {
        throw new Error(data?.message || 'No se pudo registrar el correo.')
    }
    return { row: data.data, message: data.message }
}

export async function deleteVentasCorreoDestinatario(id) {
    const { data } = await axios.delete(`/ventas/correos/destinatarios/${id}`)
    if (!data?.success) {
        throw new Error(data?.message || 'No se pudo eliminar el destinatario.')
    }
}

export async function fetchVentasCorreoHistorial(page = 1, perPage = 10) {
    const { data } = await axios.get('/ventas/correos/historial', { params: { page, per_page: perPage } })
    if (!data?.success || !data.data?.envios) {
        throw new Error(data?.message || 'No se pudo cargar el historial.')
    }
    return data.data
}

export async function fetchVentasCorreoHistorialDetalle(id) {
    const { data } = await axios.get(`/ventas/correos/historial/${id}`)
    if (!data?.success || !data.data) {
        throw new Error(data?.message || 'No se encontró el envío.')
    }
    return data.data
}

export async function sendVentasCorreos({ asunto, cuerpo, destinatario_ids, adjuntos = [], imagenes_inline = [] }) {
    const formData = new FormData()
    formData.append('asunto', asunto)
    formData.append('cuerpo', cuerpo)
    destinatario_ids.forEach((id) => formData.append('destinatario_ids[]', String(id)))
    adjuntos.forEach((file) => formData.append('adjuntos[]', file))
    imagenes_inline.forEach((file) => formData.append('imagenes_inline[]', file))

    const { data } = await axios.post('/ventas/correos/enviar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (!data?.success) {
        throw new Error(data?.message || 'No se pudieron enviar los correos.')
    }
    return data
}
