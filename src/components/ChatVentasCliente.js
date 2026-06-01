'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import {
    formatMessageTime,
    getChatMensajesCliente,
    enviarMensajeCliente,
    actualizarMensajeCliente,
    eliminarMensajeCliente,
} from '@/lib/chatApi'
import {
    maxChatMessageId,
    setChatMessagesFromServer,
    appendChatMessagesFromServer,
} from '@/lib/chatMerge'
import { useChatAutoScroll } from '@/hooks/useChatAutoScroll'
import ChatMessageComposer from '@/components/ChatMessageComposer'

const COLOR_CLIENTE = '#FF8000'
const COLOR_ADMIN = '#059669'
const COLOR_VENDEDOR = '#7c3aed'
const POLL_MS = 8000

export default function ChatVentasCliente({ darkMode, channel = 'admin' }) {
    const [mensajes, setMensajes] = useState([])
    const [loading, setLoading] = useState(true)
    const [nuevoTexto, setNuevoTexto] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [editandoId, setEditandoId] = useState(null)
    const [editandoTexto, setEditandoTexto] = useState('')
    const [guardandoId, setGuardandoId] = useState(null)
    const [eliminandoId, setEliminandoId] = useState(null)
    const [errorEnvio, setErrorEnvio] = useState(null)
    const scrollRef = useRef(null)
    const mensajesRef = useRef([])
    const pollingRef = useRef(false)

    mensajesRef.current = mensajes

    const { scrollToBottom } = useChatAutoScroll(scrollRef, mensajes, { forceKey: channel })

    const cargarMensajes = useCallback(
        async (silent = false) => {
            if (pollingRef.current && silent) return
            if (silent) pollingRef.current = true

            if (!silent) {
                setLoading(true)
                setErrorEnvio(null)
            }

            try {
                const afterId = silent ? maxChatMessageId(mensajesRef.current) : 0
                const lista = await getChatMensajesCliente(channel, afterId)
                const list = Array.isArray(lista) ? lista : []

                setMensajes((prev) => {
                    if (!silent || afterId === 0) {
                        return setChatMessagesFromServer(prev, list)
                    }
                    return appendChatMessagesFromServer(prev, list)
                })
            } catch {
                if (!silent) setMensajes([])
            } finally {
                if (!silent) setLoading(false)
                if (silent) pollingRef.current = false
            }
        },
        [channel]
    )

    useEffect(() => {
        setMensajes([])
        cargarMensajes(false)
    }, [channel, cargarMensajes])

    useEffect(() => {
        const interval = setInterval(() => {
            if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
            if (editandoId != null) return
            cargarMensajes(true)
        }, POLL_MS)
        return () => clearInterval(interval)
    }, [channel, cargarMensajes, editandoId])

    const handleEnviar = async () => {
        const texto = (nuevoTexto || '').trim()
        if (!texto || enviando) return
        setErrorEnvio(null)
        const tempId = 'temp-' + Date.now()
        const tempMsg = {
            id: tempId,
            sender_type: 'customer',
            body: texto,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            pending: true,
        }
        setMensajes((prev) => [...prev, tempMsg])
        setNuevoTexto('')
        scrollToBottom('smooth')
        setEnviando(true)
        try {
            const m = await enviarMensajeCliente(texto, channel)
            if (m) {
                setMensajes((prev) => prev.map((x) => (x.id === tempId ? { ...m, pending: false } : x)))
            } else {
                setMensajes((prev) => prev.filter((x) => x.id !== tempId))
                setErrorEnvio('No se pudo enviar el mensaje. Revisa tu conexión o intenta de nuevo.')
            }
        } catch (err) {
            setMensajes((prev) => prev.filter((x) => x.id !== tempId))
            const msg = err.response?.data?.message || err.response?.data?.errors?.body?.[0] || err.message
            setErrorEnvio(msg || 'Error al enviar. Intenta de nuevo.')
        } finally {
            setEnviando(false)
        }
    }

    const iniciarEdicion = (m) => {
        setEditandoId(m.id)
        setEditandoTexto(m.body)
    }

    const cancelarEdicion = () => {
        setEditandoId(null)
        setEditandoTexto('')
    }

    const guardarEdicion = async () => {
        if (editandoId == null) return
        const texto = (editandoTexto || '').trim()
        if (!texto) return
        setGuardandoId(editandoId)
        try {
            const actualizado = await actualizarMensajeCliente(editandoId, texto)
            if (actualizado) {
                setMensajes((prev) =>
                    prev.map((x) => (x.id === editandoId ? { ...x, ...actualizado } : x))
                )
            }
            cancelarEdicion()
        } catch {
            //
        } finally {
            setGuardandoId(null)
        }
    }

    const handleEliminar = async (id) => {
        if (eliminandoId) return
        setEliminandoId(id)
        try {
            const ok = await eliminarMensajeCliente(id)
            if (ok) setMensajes((prev) => prev.filter((x) => x.id !== id))
        } catch {
            //
        } finally {
            setEliminandoId(null)
        }
    }

    const isCliente = (m) => m.sender_type === 'customer'
    const isStaff = (m) => m.sender_type === 'admin' || m.sender_type === 'seller'
    const staffColor = channel === 'ventas' ? COLOR_VENDEDOR : COLOR_ADMIN
    const staffLabel = (m) => {
        if (channel === 'ventas') return m.seller_name || 'Vendedor'
        return m.admin_name || m.seller_name || 'Administración'
    }

    const emptyHint =
        channel === 'ventas'
            ? 'Aún no hay mensajes. Escribe algo y un vendedor te responderá.'
            : 'Aún no hay mensajes. Escribe algo y un administrador te responderá.'

    return (
        <div className="flex flex-col min-h-[420px]" style={{ height: 'min(520px, 55vh)' }}>
            <div
                ref={scrollRef}
                className={`flex-1 overflow-y-auto rounded-2xl border-2 p-4 space-y-4 mb-4 scroll-smooth ${
                    darkMode ? 'border-gray-600 bg-tienda-elevated/40' : 'border-gray-200 bg-gray-50'
                }`}
            >
                {loading ? (
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Cargando…</p>
                ) : mensajes.length === 0 ? (
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>{emptyHint}</p>
                ) : (
                    mensajes.map((m) => (
                        <div
                            key={m.id}
                            className={`flex flex-col ${isCliente(m) ? 'items-end' : 'items-start'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-lg ${
                                    isCliente(m) ? 'rounded-br-sm' : 'rounded-bl-sm'
                                } ${m.pending ? 'opacity-90' : ''}`}
                                style={{
                                    backgroundColor: isCliente(m)
                                        ? COLOR_CLIENTE
                                        : darkMode
                                          ? `${staffColor}99`
                                          : staffColor,
                                    color: '#fff',
                                }}
                            >
                                {isStaff(m) && (
                                    <div className="text-xs opacity-90 mb-1">{staffLabel(m)}</div>
                                )}
                                {editandoId === m.id ? (
                                    <div className="flex flex-col gap-2">
                                        <textarea
                                            value={editandoTexto}
                                            onChange={(e) => setEditandoTexto(e.target.value)}
                                            rows={2}
                                            className="w-full rounded px-2 py-1 text-gray-900 text-sm"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={guardarEdicion}
                                                disabled={guardandoId === m.id}
                                                className="p-1.5 rounded bg-white/20 hover:bg-white/30"
                                                title="Guardar"
                                            >
                                                <Image
                                                    src="/Imagenes/icon_guardar.png"
                                                    alt="Guardar"
                                                    width={18}
                                                    height={18}
                                                    className="object-contain invert"
                                                />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={cancelarEdicion}
                                                className="p-1.5 rounded bg-white/20 hover:bg-white/30 text-white text-xs"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-2 group">
                                        <span className="text-sm whitespace-pre-wrap break-words">{m.body}</span>
                                        {isCliente(m) && (
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => iniciarEdicion(m)}
                                                    className="p-1 rounded hover:bg-white/20"
                                                    title="Editar"
                                                >
                                                    <Image
                                                        src="/Imagenes/icon_editar.webp"
                                                        alt="Editar"
                                                        width={16}
                                                        height={16}
                                                        className="object-contain invert"
                                                    />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleEliminar(m.id)}
                                                    disabled={eliminandoId === m.id}
                                                    className="p-1 rounded hover:bg-white/20"
                                                    title="Eliminar"
                                                >
                                                    <Image
                                                        src="/Imagenes/icon_basura.png"
                                                        alt="Eliminar"
                                                        width={16}
                                                        height={16}
                                                        className="object-contain invert"
                                                    />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="mt-1.5 text-[10px] opacity-80 flex items-center gap-1">
                                    {formatMessageTime(m.created_at)}
                                    {m.pending && <span className="italic">(enviando…)</span>}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {errorEnvio && (
                <p className="mb-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-3 py-2 rounded-lg">
                    {errorEnvio}
                </p>
            )}
            <ChatMessageComposer
                value={nuevoTexto}
                onChange={setNuevoTexto}
                onSubmit={handleEnviar}
                placeholder="Escribe tu mensaje…"
                disabled={loading}
                sending={enviando}
                darkMode={darkMode}
                accent={channel === 'ventas' ? 'violet' : 'orange'}
            />
        </div>
    )
}
