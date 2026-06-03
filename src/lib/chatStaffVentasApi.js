import axios from '@/lib/axios'
import { CHAT_CHANNEL_VENTAS } from '@/lib/chatChannels'

const CHANNEL = CHAT_CHANNEL_VENTAS

function withChannel(msg) {
    return msg && typeof msg === 'object' ? { ...msg, channel: CHANNEL } : msg
}

function withChannelList(list) {
    return (Array.isArray(list) ? list : []).map(withChannel)
}

export async function getChatClientesVentas() {
    const { data } = await axios.get('/ventas/chat/clientes')
    return data?.success && data?.data ? data.data : []
}

export async function getChatMensajesVentas(userId, afterId = 0) {
    const params = {}
    if (afterId > 0) params.after_id = afterId
    const { data } = await axios.get(`/ventas/chat/clientes/${userId}`, { params })
    if (!data?.success) return { cliente: null, mensajes: [] }
    return {
        cliente: data.data?.cliente ?? null,
        mensajes: withChannelList(data.data?.mensajes ?? []),
    }
}

export async function enviarMensajeVentas(userId, body) {
    const { data } = await axios.post(`/ventas/chat/clientes/${userId}/mensajes`, { body })
    return data?.success ? withChannel(data.data) : null
}

export async function actualizarMensajeVentas(id, body) {
    const { data } = await axios.put(`/ventas/chat/mensajes/${id}`, { body })
    return data?.success ? withChannel(data.data) : null
}

export async function eliminarMensajeVentas(id) {
    const { data } = await axios.delete(`/ventas/chat/mensajes/${id}`)
    return data?.success
}
