import axios from '@/lib/axios'
import { CHAT_CHANNEL_VENTAS } from '@/lib/chatChannels'

const CHANNEL = CHAT_CHANNEL_VENTAS

function withChannel(msg) {
    return msg && typeof msg === 'object' ? { ...msg, channel: CHANNEL } : msg
}

function withChannelList(list) {
    return (Array.isArray(list) ? list : []).map(withChannel)
}

export async function getMensajesChatClienteVentas(afterId = 0) {
    const params = {}
    if (afterId > 0) params.after_id = afterId
    const { data } = await axios.get('/chat-vendedor-mensajes', { params })
    return withChannelList(data?.success && data?.data ? data.data : [])
}

export async function enviarMensajeChatClienteVentas(body) {
    const { data } = await axios.post('/chat-vendedor-mensajes', { body })
    if (!data?.success) return null
    const msg = data.data ?? data
    if (!msg || typeof msg !== 'object' || !('id' in msg)) return null
    return withChannel(msg)
}

export async function actualizarMensajeChatClienteVentas(id, body) {
    const { data } = await axios.put(`/chat-vendedor-mensajes/${id}`, { body })
    return data?.success ? withChannel(data.data) : null
}

export async function eliminarMensajeChatClienteVentas(id) {
    const { data } = await axios.delete(`/chat-vendedor-mensajes/${id}`)
    return data?.success
}
