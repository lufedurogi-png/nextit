import axios from '@/lib/axios'

export async function getMensajesChatClienteAdmin(afterId = 0) {
    const params = {}
    if (afterId > 0) params.after_id = afterId
    const { data } = await axios.get('/chat-mensajes', { params })
    return data?.success && data?.data ? data.data : []
}

export async function enviarMensajeChatClienteAdmin(body) {
    const { data } = await axios.post('/chat-mensajes', { body })
    if (!data?.success) return null
    const msg = data.data ?? data
    if (!msg || typeof msg !== 'object' || !('id' in msg)) return null
    return msg
}

export async function actualizarMensajeChatClienteAdmin(id, body) {
    const { data } = await axios.put(`/chat-mensajes/${id}`, { body })
    return data?.success ? data.data : null
}

export async function eliminarMensajeChatClienteAdmin(id) {
    const { data } = await axios.delete(`/chat-mensajes/${id}`)
    return data?.success
}
