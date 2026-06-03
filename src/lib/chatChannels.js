/** Canal: chat cliente ↔ administración */
export const CHAT_CHANNEL_ADMIN = 'admin'

/** Canal: chat cliente ↔ ventas / vendedor */
export const CHAT_CHANNEL_VENTAS = 'ventas'

const VALID = new Set([CHAT_CHANNEL_ADMIN, CHAT_CHANNEL_VENTAS])

export function normalizeChatChannel(channel) {
    const value = String(channel || CHAT_CHANNEL_ADMIN).trim().toLowerCase()
    return VALID.has(value) ? value : CHAT_CHANNEL_ADMIN
}

/**
 * Mensajes legacy sin `channel` se consideran solo del canal admin.
 * Nunca deben aparecer en el chat de ventas.
 */
export function messageBelongsToChannel(message, channel) {
    if (!message || typeof message !== 'object') return false
    const normalized = normalizeChatChannel(channel)
    const raw = message.channel
    if (raw == null || String(raw).trim() === '') {
        return normalized === CHAT_CHANNEL_ADMIN
    }
    return normalizeChatChannel(raw) === normalized
}

export function filterMessagesByChannel(messages, channel) {
    const list = Array.isArray(messages) ? messages : []
    return list.filter((m) => messageBelongsToChannel(m, channel))
}

/** Clave estable para listas React (evita colisiones entre canales). */
export function chatMessageReactKey(message, channel) {
    const ch = normalizeChatChannel(channel || message?.channel)
    const id = message?.id ?? 'unknown'
    return `${ch}:${id}`
}
