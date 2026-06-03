import axios from '@/lib/axios'

export async function getChatClientesAdmin() {
    const { data } = await axios.get('/admin/chat/clientes')
    return data?.success && data?.data ? data.data : []
}

export async function getChatMensajesAdmin(userId, afterId = 0) {
    const params = {}
    if (afterId > 0) params.after_id = afterId
    const { data } = await axios.get(`/admin/chat/clientes/${userId}`, { params })
    if (!data?.success) return { cliente: null, mensajes: [] }
    return {
        cliente: data.data?.cliente ?? null,
        mensajes: data.data?.mensajes ?? [],
    }
}

export async function enviarMensajeAdmin(userId, body) {
    const { data } = await axios.post(`/admin/chat/clientes/${userId}/mensajes`, { body })
    return data?.success ? data.data : null
}

export async function actualizarMensajeAdmin(id, body) {
    const { data } = await axios.put(`/admin/chat/mensajes/${id}`, { body })
    return data?.success ? data.data : null
}

export async function eliminarMensajeAdmin(id) {
    const { data } = await axios.delete(`/admin/chat/mensajes/${id}`)
    return data?.success
}
