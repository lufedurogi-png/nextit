'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { formatMessageTime } from '@/lib/chatApi'
import { useChatAutoScroll } from '@/hooks/useChatAutoScroll'
import ChatMessageComposer from '@/components/ChatMessageComposer'

const COLOR_CLIENTE = '#FF8000'
const COLOR_ADMIN = '#059669'

export default function AdminChatView({
    darkMode,
    cliente,
    mensajes,
    loading,
    nuevoTexto,
    setNuevoTexto,
    enviando,
    onEnviar,
    editandoId,
    editandoTexto,
    setEditandoTexto,
    onIniciarEdicion,
    onCancelarEdicion,
    onGuardarEdicion,
    guardandoId,
    onEliminar,
    eliminandoId,
    staffColor = COLOR_ADMIN,
    staffTypes = ['admin', 'seller'],
    staffName = (m) => m.admin_name || m.seller_name,
    staffEmail = (m) => m.admin_email || m.seller_email,
    composerAccent = 'emerald',
    scrollForceKey = 0,
}) {
    const scrollRef = useRef(null)
    useChatAutoScroll(scrollRef, mensajes, { forceKey: scrollForceKey })

    const isCliente = (m) => m.sender_type === 'customer'
    const isStaff = (m) => staffTypes.includes(m.sender_type)

    if (!cliente) {
        return (
            <div
                className={`flex-1 flex items-center justify-center rounded-xl border-2 ${
                    darkMode ? 'border-gray-700 bg-tienda-elevated/30' : 'border-gray-200 bg-gray-50'
                }`}
            >
                <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Selecciona un cliente para ver el chat.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div
                ref={scrollRef}
                className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain rounded-xl border-2 p-4 space-y-4 mb-3 scroll-smooth ${
                    darkMode ? 'border-gray-600 bg-tienda-elevated/40' : 'border-gray-200 bg-gray-50'
                }`}
            >
                {loading ? (
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Cargando mensajes…</p>
                ) : !mensajes?.length ? (
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Aún no hay mensajes con este cliente.</p>
                ) : (
                    mensajes.map((m) => (
                        <div
                            key={m.id}
                            className={`flex flex-col ${isCliente(m) ? 'items-start' : 'items-end'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-lg ${
                                    isCliente(m) ? 'rounded-bl-sm' : 'rounded-br-sm'
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
                                {isCliente(m) && (m.user_name || m.user_email) && (
                                    <div className="text-xs opacity-90 mb-1">
                                        {m.user_name}
                                        {m.user_email ? ` (${m.user_email})` : ''}
                                    </div>
                                )}
                                {isStaff(m) && (staffName(m) || staffEmail(m)) && (
                                    <div className="text-xs opacity-90 mb-1">
                                        {staffName(m)}
                                        {staffEmail(m) ? ` (${staffEmail(m)})` : ''}
                                    </div>
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
                                                onClick={onGuardarEdicion}
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
                                                onClick={onCancelarEdicion}
                                                className="p-1.5 rounded bg-white/20 hover:bg-white/30 text-white text-xs"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-2 group">
                                        <span className="text-sm whitespace-pre-wrap break-words">{m.body}</span>
                                        {isStaff(m) && (
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => onIniciarEdicion(m)}
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
                                                    onClick={() => onEliminar(m.id)}
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
                                <div className="mt-1.5 text-[10px] opacity-80">
                                    {formatMessageTime(m.created_at)}
                                    {m.pending && <span className="italic ml-1">(enviando…)</span>}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="shrink-0">
                <ChatMessageComposer
                value={nuevoTexto}
                onChange={setNuevoTexto}
                onSubmit={onEnviar}
                placeholder="Escribe tu respuesta…"
                disabled={loading}
                sending={enviando}
                darkMode={darkMode}
                accent={composerAccent}
            />
            </div>
        </div>
    )
}
