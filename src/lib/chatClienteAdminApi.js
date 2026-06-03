import axios from '@/lib/axios'
import {
    CHAT_CHANNEL_ADMIN,
    filterMessagesByChannel,
    normalizeChatChannel,
} from '@/lib/chatChannels'

const CHANNEL = CHAT_CHANNEL_ADMIN

export async function getMensajesChatClienteAdmin(afterId = 0) {
    const params = { channel: CHANNEL }
    if (afterId > 0) params.after_id = afterId
    const { data } = await axios.get('/chat-mensajes', { params })
    const list = data?.success && data?.data ? data.data : []
    return filterMessagesByChannel(list, CHANNEL)
}

export async function enviarMensajeChatClienteAdmin(body) {
    const { data } = await axios.post('/chat-mensajes', { body, channel: CHANNEL })
    if (!data?.success) return null
    const msg = data.data ?? data
    if (!msg || typeof msg !== 'object' || !('id' in msg)) return null
    if (msg.channel && normalizeChatChannel(msg.channel) !== CHANNEL) return null
    return { ...msg, channel: CHANNEL }
}

export async function actualizarMensajeChatClienteAdmin(id, body) {
    const { data } = await axios.put(`/chat-mensajes/${id}`, { body })
    if (!data?.success) return null
    const msg = data.data
    return msg && filterMessagesByChannel([msg], CHANNEL).length > 0 ? msg : null
}

export async function eliminarMensajeChatClienteAdmin(id) {
    const { data } = await axios.delete(`/chat-mensajes/${id}`)
    return data?.success
}
