/**
 * Utilidades compartidas de chat y re-exportes de compatibilidad.
 * Para código nuevo, importa desde chatClienteAdminApi, chatClienteVentasApi,
 * chatStaffAdminApi o chatStaffVentasApi según el canal.
 */

import { CHAT_CHANNEL_VENTAS, normalizeChatChannel } from '@/lib/chatChannels'
import {
    getMensajesChatClienteAdmin,
    enviarMensajeChatClienteAdmin,
    actualizarMensajeChatClienteAdmin,
    eliminarMensajeChatClienteAdmin,
} from '@/lib/chatClienteAdminApi'
import {
    getMensajesChatClienteVentas,
    enviarMensajeChatClienteVentas,
    actualizarMensajeChatClienteVentas,
    eliminarMensajeChatClienteVentas,
} from '@/lib/chatClienteVentasApi'

export {
    CHAT_CHANNEL_ADMIN,
    CHAT_CHANNEL_VENTAS,
    normalizeChatChannel,
    messageBelongsToChannel,
    filterMessagesByChannel,
    chatMessageReactKey,
} from '@/lib/chatChannels'

export {
    getMensajesChatClienteAdmin as getChatMensajesClienteAdmin,
    enviarMensajeChatClienteAdmin,
    actualizarMensajeChatClienteAdmin,
    eliminarMensajeChatClienteAdmin,
} from '@/lib/chatClienteAdminApi'

export {
    getMensajesChatClienteVentas as getChatMensajesClienteVentas,
    enviarMensajeChatClienteVentas,
    actualizarMensajeChatClienteVentas,
    eliminarMensajeChatClienteVentas,
} from '@/lib/chatClienteVentasApi'

export {
    getChatClientesAdmin,
    getChatMensajesAdmin,
    enviarMensajeAdmin,
    actualizarMensajeAdmin,
    eliminarMensajeAdmin,
} from '@/lib/chatStaffAdminApi'

export {
    getChatClientesVentas,
    getChatMensajesVentas,
    enviarMensajeVentas,
    actualizarMensajeVentas,
    eliminarMensajeVentas,
} from '@/lib/chatStaffVentasApi'

/** @deprecated Usa getChatMensajesClienteAdmin o getChatMensajesClienteVentas */
export async function getChatMensajesCliente(channel = 'admin', afterId = 0) {
    if (normalizeChatChannel(channel) === CHAT_CHANNEL_VENTAS) {
        return getMensajesChatClienteVentas(afterId)
    }
    return getMensajesChatClienteAdmin(afterId)
}

/** @deprecated Usa enviarMensajeChatClienteAdmin o enviarMensajeChatClienteVentas */
export async function enviarMensajeCliente(body, channel = 'admin') {
    if (normalizeChatChannel(channel) === CHAT_CHANNEL_VENTAS) {
        return enviarMensajeChatClienteVentas(body)
    }
    return enviarMensajeChatClienteAdmin(body)
}

/** @deprecated Usa actualizarMensajeChatClienteAdmin o actualizarMensajeChatClienteVentas */
export async function actualizarMensajeCliente(id, body, channel = 'admin') {
    if (normalizeChatChannel(channel) === CHAT_CHANNEL_VENTAS) {
        return actualizarMensajeChatClienteVentas(id, body)
    }
    return actualizarMensajeChatClienteAdmin(id, body)
}

/** @deprecated Usa eliminarMensajeChatClienteAdmin o eliminarMensajeChatClienteVentas */
export async function eliminarMensajeCliente(id, channel = 'admin') {
    if (normalizeChatChannel(channel) === CHAT_CHANNEL_VENTAS) {
        return eliminarMensajeChatClienteVentas(id)
    }
    return eliminarMensajeChatClienteAdmin(id)
}

/** Formato 12 horas: "Hoy 6:30 PM", "Ayer 6:30 PM", "5 Mar 2025 6:30 PM" */
export function formatMessageTime(isoString) {
    if (!isoString) return ''
    const d = new Date(isoString)
    if (Number.isNaN(d.getTime())) return ''
    const now = new Date()
    const sameDay = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()
    const time = d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true })
    if (sameDay) return `Hoy ${time}`
    if (isYesterday) return `Ayer ${time}`
    const date = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
    return `${date} ${time}`.trim()
}

export function formatHistorialFecha(isoString) {
    if (!isoString) return '—'
    const d = new Date(isoString)
    if (Number.isNaN(d.getTime())) return '—'
    const now = new Date()
    const sameDay = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    if (sameDay) return 'Hoy'
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()
    if (isYesterday) return 'Ayer'
    return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}
