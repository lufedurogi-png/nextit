'use client'

import { useRef } from 'react'
import { CHAT_CHANNEL_VENTAS } from '@/lib/chatChannels'
import {
    getMensajesChatClienteVentas,
    enviarMensajeChatClienteVentas,
    actualizarMensajeChatClienteVentas,
    eliminarMensajeChatClienteVentas,
} from '@/lib/chatClienteVentasApi'
import useChatClienteCanal from '@/hooks/useChatClienteCanal'
import { useChatAutoScroll } from '@/hooks/useChatAutoScroll'
import ChatClienteThreadView from '@/components/chat/ChatClienteThreadView'

const THREAD_ID = 'chat-cliente-vendedor'
const STAFF_COLOR = '#FF8000'

const ventasApi = {
    getMensajes: getMensajesChatClienteVentas,
    enviarMensaje: enviarMensajeChatClienteVentas,
    actualizarMensaje: actualizarMensajeChatClienteVentas,
    eliminarMensaje: eliminarMensajeChatClienteVentas,
}

/** Chat del cliente con ventas / vendedor — canal fijo `ventas`, sin mezclar con admin. */
export default function ChatClienteVentasPanel({ darkMode }) {
    const scrollRef = useRef(null)
    const chat = useChatClienteCanal({
        channel: CHAT_CHANNEL_VENTAS,
        threadId: THREAD_ID,
        api: ventasApi,
        staffLabel: (m) => m.seller_name || 'Vendedor',
        emptyHint: 'Aún no hay mensajes. Escribe algo y un vendedor te responderá.',
    })

    useChatAutoScroll(scrollRef, chat.mensajes, { forceKey: THREAD_ID })

    return (
        <ChatClienteThreadView
            threadId={THREAD_ID}
            channel={CHAT_CHANNEL_VENTAS}
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
