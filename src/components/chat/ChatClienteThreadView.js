'use client'

import Image from 'next/image'
import { formatMessageTime, chatMessageReactKey } from '@/lib/chatApi'
import ChatMessageComposer from '@/components/ChatMessageComposer'

const COLOR_CLIENTE = '#FF8000'

export default function ChatClienteThreadView({
    threadId,
    channel,
    darkMode,
    mensajes,
    loading,
    emptyHint,
    staffColor,
    staffLabel,
    nuevoTexto,
    setNuevoTexto,
    enviando,
    onEnviar,
    editandoId,
    editandoTexto,
    setEditandoTexto,
    onGuardarEdicion,
    onCancelarEdicion,
    onIniciarEdicion,
    onEliminar,
    guardandoId,
    eliminandoId,
    errorEnvio,
    scrollRef,
}) {
    const isCliente = (m) => m.sender_type === 'customer'
    const isStaff = (m) => m.sender_type === 'admin' || m.sender_type === 'seller'

    return (
        <div
            id={threadId}
            data-chat-thread={threadId}
            data-chat-channel={channel}
            className="flex flex-col flex-1 min-h-[min(520px,58dvh)] md:min-h-[420px] w-full"
        >
            <div
                ref={scrollRef}
                className={`flex-1 min-h-0 overflow-y-auto rounded-2xl border-2 p-3 md:p-4 space-y-3 md:space-y-4 mb-3 md:mb-4 scroll-smooth ${
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
                            key={chatMessageReactKey(m, channel)}
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
                                        {isCliente(m) && (
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
                onSubmit={onEnviar}
                placeholder="Escribe tu mensaje…"
                disabled={loading}
                sending={enviando}
                darkMode={darkMode}
                accent="orange"
            />
        </div>
    )
}
