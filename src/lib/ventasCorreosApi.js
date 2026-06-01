import axios from '@/lib/axios'

export async function fetchVentasCorreoGrupos() {
    const { data } = await axios.get('/ventas/correos/grupos')
    if (!data?.success || !Array.isArray(data.data)) {
        throw new Error(data?.message || 'No se pudieron cargar los grupos.')
    }
    return data.data
}

export async function createVentasCorreoGrupo(nombre) {
    const { data } = await axios.post('/ventas/correos/grupos', { nombre })
    if (!data?.success || !data.data) {
        throw new Error(data?.message || 'No se pudo crear el grupo.')
    }
    return data.data
}

export async function updateVentasCorreoGrupo(id, nombre) {
    const { data } = await axios.put(`/ventas/correos/grupos/${id}`, { nombre })
    if (!data?.success || !data.data) {
        throw new Error(data?.message || 'No se pudo actualizar el grupo.')
    }
    return data.data
}

export async function deleteVentasCorreoGrupo(id) {
    const { data } = await axios.delete(`/ventas/correos/grupos/${id}`)
    if (!data?.success) {
        throw new Error(data?.message || 'No se pudo eliminar el grupo.')
    }
    return data
}

export async function fetchVentasCorreoDestinatarios() {
    const { data } = await axios.get('/ventas/correos/destinatarios')
    if (!data?.success || !Array.isArray(data.data)) {
        throw new Error(data?.message || 'No se pudieron cargar los destinatarios.')
    }
    return data.data
}

export async function createVentasCorreoDestinatario({ email, nombre, grupo_id }) {
    const { data } = await axios.post('/ventas/correos/destinatarios', {
        email,
        nombre,
        grupo_id,
    })
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

export async function fetchVentasCorreoHistorial({
    page = 1,
    perPage = 6,
    q = '',
    anio = '',
    mes = '',
    dia = '',
} = {}) {
    const params = { page, per_page: perPage }
    const busqueda = (q || '').trim()
    if (busqueda) params.q = busqueda
    if (anio) params.anio = anio
    if (mes) params.mes = mes
    if (dia) params.dia = dia

    const { data } = await axios.get('/ventas/correos/historial', { params })
    if (!data?.success || !data.data?.envios) {
        throw new Error(data?.message || 'No se pudo cargar el historial.')
    }
    return data.data
}

export async function deleteVentasCorreoHistorial(id) {
    const { data } = await axios.delete(`/ventas/correos/historial/${id}`)
    if (!data?.success) {
        throw new Error(data?.message || 'No se pudo eliminar el envío.')
    }
    return data
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
