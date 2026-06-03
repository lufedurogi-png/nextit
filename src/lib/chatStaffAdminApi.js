import axios from '@/lib/axios'
import { CHAT_CHANNEL_ADMIN, filterMessagesByChannel } from '@/lib/chatChannels'

const CHANNEL = CHAT_CHANNEL_ADMIN

export async function getChatClientesAdmin() {
    const { data } = await axios.get('/admin/chat/clientes', { params: { channel: CHANNEL } })
    return data?.success && data?.data ? data.data : []
}

export async function getChatMensajesAdmin(userId, afterId = 0) {
    const params = { channel: CHANNEL }
    if (afterId > 0) params.after_id = afterId
    const { data } = await axios.get(`/admin/chat/clientes/${userId}`, { params })
    if (!data?.success) return { cliente: null, mensajes: [] }
    const mensajes = filterMessagesByChannel(data.data?.mensajes ?? [], CHANNEL)
    return {
        cliente: data.data?.cliente ?? null,
        mensajes,
    }
}

export async function enviarMensajeAdmin(userId, body) {
    const { data } = await axios.post(`/admin/chat/clientes/${userId}/mensajes`, {
        body,
        channel: CHANNEL,
    })
    if (!data?.success) return null
    const msg = data.data
    return msg && filterMessagesByChannel([msg], CHANNEL).length > 0
        ? { ...msg, channel: CHANNEL }
        : null
}

export async function actualizarMensajeAdmin(id, body) {
    const { data } = await axios.put(`/admin/chat/mensajes/${id}`, { body })
    return data?.success ? data.data : null
}

export async function eliminarMensajeAdmin(id) {
    const { data } = await axios.delete(`/admin/chat/mensajes/${id}`)
    return data?.success
}
