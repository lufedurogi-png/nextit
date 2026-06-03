'use client'

import { useRef } from 'react'
import { CHAT_CHANNEL_ADMIN } from '@/lib/chatChannels'
import {
    getMensajesChatClienteAdmin,
    enviarMensajeChatClienteAdmin,
    actualizarMensajeChatClienteAdmin,
    eliminarMensajeChatClienteAdmin,
} from '@/lib/chatClienteAdminApi'
import useChatClienteCanal from '@/hooks/useChatClienteCanal'
import { useChatAutoScroll } from '@/hooks/useChatAutoScroll'
import ChatClienteThreadView from '@/components/chat/ChatClienteThreadView'

const THREAD_ID = 'chat-cliente-administracion'
const STAFF_COLOR = '#059669'

const adminApi = {
    getMensajes: getMensajesChatClienteAdmin,
    enviarMensaje: enviarMensajeChatClienteAdmin,
    actualizarMensaje: actualizarMensajeChatClienteAdmin,
    eliminarMensaje: eliminarMensajeChatClienteAdmin,
}

/** Chat del cliente con administración — canal fijo `admin`, sin mezclar con ventas. */
export default function ChatClienteAdminPanel({ darkMode }) {
    const scrollRef = useRef(null)
    const chat = useChatClienteCanal({
        channel: CHAT_CHANNEL_ADMIN,
        threadId: THREAD_ID,
        api: adminApi,
        staffLabel: (m) => m.admin_name || m.seller_name || 'Administración',
        emptyHint: 'Aún no hay mensajes. Escribe algo y un administrador te responderá.',
    })

    useChatAutoScroll(scrollRef, chat.mensajes, { forceKey: THREAD_ID })

    return (
        <ChatClienteThreadView
            threadId={THREAD_ID}
            channel={CHAT_CHANNEL_ADMIN}
            darkMode={darkMode}
            scrollRef={scrollRef}
            staffColor={STAFF_COLOR}
            mensajes={chat.mensajes}
            loading={chat.loading}
            emptyHint={chat.emptyHint}
            staffLabel={chat.staffLabel}
            nuevoTexto={chat.nuevoTexto}
            setNuevoTexto={chat.setNuevoTexto}
            enviando={chat.enviando}
            editandoId={chat.editandoId}
            editandoTexto={chat.editandoTexto}
            setEditandoTexto={chat.setEditandoTexto}
            guardandoId={chat.guardandoId}
            eliminandoId={chat.eliminandoId}
            errorEnvio={chat.errorEnvio}
            onEnviar={chat.handleEnviar}
            onIniciarEdicion={chat.iniciarEdicion}
            onCancelarEdicion={chat.cancelarEdicion}
            onGuardarEdicion={chat.guardarEdicion}
            onEliminar={chat.handleEliminar}
        />
    )
}
