'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import {
    getChatClientesAdmin,
    getChatMensajesAdmin,
    enviarMensajeAdmin,
    actualizarMensajeAdmin,
    eliminarMensajeAdmin,
} from '@/lib/chatStaffAdminApi'
import { CHAT_CHANNEL_ADMIN } from '@/lib/chatChannels'
import {
    maxChatMessageId,
    setChatMessagesFromServer,
    appendChatMessagesFromServer,
} from '@/lib/chatMerge'
import AdminChatView from '@/components/AdminChatView'

const POLL_MS = 8000

export default function AdminMensajesPage() {
    const [darkMode, setDarkMode] = useState(true)
    const [filtro, setFiltro] = useState('')
    const [clientes, setClientes] = useState([])
    const [loadingClientes, setLoadingClientes] = useState(true)
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
    const [mensajes, setMensajes] = useState([])
    const [loadingMensajes, setLoadingMensajes] = useState(false)
    const [nuevoTexto, setNuevoTexto] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [editandoId, setEditandoId] = useState(null)
    const [editandoTexto, setEditandoTexto] = useState('')
    const [guardandoId, setGuardandoId] = useState(null)
    const [eliminandoId, setEliminandoId] = useState(null)
    const [scrollBump, setScrollBump] = useState(0)
    const mensajesRef = useRef([])
    const pollingRef = useRef(false)

    mensajesRef.current = mensajes

    const panel = darkMode
        ? 'rounded-2xl border border-gray-700 bg-tienda-elevated/80 flex flex-col overflow-hidden min-h-0 h-full'
        : 'rounded-2xl border border-gray-200 bg-white flex flex-col overflow-hidden min-h-0 h-full'

    useEffect(() => {
        setDarkMode(JSON.parse(localStorage.getItem('darkMode') ?? 'true'))
    }, [])
    useEffect(() => {
        const onDarkModeChange = (e) => setDarkMode(!!e.detail)
        window.addEventListener('darkModeChange', onDarkModeChange)
        return () => window.removeEventListener('darkModeChange', onDarkModeChange)
    }, [])

    const cargarClientes = useCallback(async (silent = false) => {
        if (!silent) setLoadingClientes(true)
        try {
            const lista = await getChatClientesAdmin()
            setClientes(Array.isArray(lista) ? lista : [])
        } catch {
            if (!silent) setClientes([])
        } finally {
            if (!silent) setLoadingClientes(false)
        }
    }, [])

    useEffect(() => {
        cargarClientes()
    }, [cargarClientes])

    const cargarMensajes = useCallback(async (userId, silent = false) => {
        if (!userId) {
            setMensajes([])
            return
        }
        if (pollingRef.current && silent) return
        if (silent) pollingRef.current = true
        if (!silent) setLoadingMensajes(true)
        try {
            const afterId = silent ? maxChatMessageId(mensajesRef.current) : 0
            const { mensajes: list } = await getChatMensajesAdmin(userId, afterId)
            const arr = Array.isArray(list) ? list : []
            setMensajes((prev) => {
                if (!silent || afterId === 0) return setChatMessagesFromServer(prev, arr, CHAT_CHANNEL_ADMIN)
                return appendChatMessagesFromServer(prev, arr, CHAT_CHANNEL_ADMIN)
            })
        } catch {
            if (!silent) setMensajes([])
        } finally {
            if (!silent) setLoadingMensajes(false)
            if (silent) pollingRef.current = false
        }
    }, [])

    useEffect(() => {
        if (clienteSeleccionado?.id) {
            cargarMensajes(clienteSeleccionado.id)
        } else {
            setMensajes([])
        }
    }, [clienteSeleccionado?.id, cargarMensajes])

    useEffect(() => {
        if (!clienteSeleccionado?.id) return
        const interval = setInterval(() => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible' && editandoId == null) {
                cargarMensajes(clienteSeleccionado.id, true)
                cargarClientes(true)
            }
        }, POLL_MS)
        return () => clearInterval(interval)
    }, [clienteSeleccionado?.id, cargarMensajes, cargarClientes, editandoId])

    const handleEnviar = async () => {
        const userId = clienteSeleccionado?.id
        const texto = (nuevoTexto || '').trim()
        if (!userId || !texto || enviando) return
        const tempId = 'temp-' + Date.now()
        const tempMsg = {
            id: tempId,
            channel: CHAT_CHANNEL_ADMIN,
            user_id: userId,
            sender_type: 'admin',
            body: texto,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            admin_name: null,
            admin_email: null,
            pending: true,
        }
        setMensajes((prev) => [...prev, tempMsg])
        setNuevoTexto('')
        setScrollBump((b) => b + 1)
        setEnviando(true)
        try {
            const m = await enviarMensajeAdmin(userId, texto)
            if (m) {
                setMensajes((prev) => prev.map((x) => (x.id === tempId ? { ...m, pending: false } : x)))
                cargarClientes()
            } else {
                setMensajes((prev) => prev.filter((x) => x.id !== tempId))
            }
        } catch {
            setMensajes((prev) => prev.filter((x) => x.id !== tempId))
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
            const actualizado = await actualizarMensajeAdmin(editandoId, texto)
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
            const ok = await eliminarMensajeAdmin(id)
            if (ok) {
                setMensajes((prev) => prev.filter((x) => x.id !== id))
            }
        } catch {
            //
        } finally {
            setEliminandoId(null)
        }
    }

    const q = filtro.trim().toLowerCase()
    const clientesFiltrados = q
        ? clientes.filter(
              (c) =>
                  (c.name || '').toLowerCase().includes(q) ||
                  (c.email || '').toLowerCase().includes(q)
          )
        : clientes

    const seleccionarCliente = (c) => {
        setClienteSeleccionado({ id: c.id, name: c.name, email: c.email })
    }

    const volverALista = () => {
        setClienteSeleccionado(null)
    }

    const enConversacionMobile = Boolean(clienteSeleccionado)

    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="shrink-0 flex flex-wrap items-center gap-3 mb-3 md:mb-4">
                <span
                    className={`flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl ${
                        darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                    }`}
                >
                    <Image src="/Imagenes/icon_mensaje.png" alt="" width={24} height={24} className="object-contain md:w-7 md:h-7" />
                </span>
                <div>
                    <h1 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                        Mensajería con clientes
                    </h1>
                    <p className={`text-xs md:text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Clientes que han iniciado chat. Selecciona uno para ver y responder.
                    </p>
                </div>
            </div>

            <div className="flex flex-1 min-h-0 gap-0 md:gap-4 md:grid md:grid-cols-12 md:grid-rows-1 overflow-hidden min-h-[calc(100dvh-11rem)] md:min-h-0 max-md:relative">
                <div
                    className={`${panel} md:col-span-4 max-md:absolute max-md:inset-0 max-md:z-10 ${
                        enConversacionMobile ? 'max-md:hidden' : 'max-md:flex'
                    }`}
                >
                    <div
                        className={`shrink-0 border-b px-3 py-2 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                    >
                        <input
                            type="search"
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                            placeholder="Filtrar clientes…"
                            className={`w-full rounded-lg border px-3 py-2 text-sm ${
                                darkMode
                                    ? 'border-gray-600 bg-[#202020] text-gray-100 placeholder-gray-500'
                                    : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'
                            }`}
                        />
                    </div>
                    <ul className="overflow-y-auto flex-1 min-h-0 p-2">
                        {loadingClientes ? (
                            <li className={`px-3 py-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Cargando…
                            </li>
                        ) : clientesFiltrados.length === 0 ? (
                            <li className={`px-3 py-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {clientes.length === 0
                                    ? 'Ningún cliente ha iniciado un chat aún.'
                                    : 'Sin coincidencias.'}
                            </li>
                        ) : (
                            clientesFiltrados.map((c) => {
                                const initial = (c.name || c.email || '?').charAt(0).toUpperCase()
                                const active = clienteSeleccionado?.id === c.id
                                return (
                                    <li key={c.id}>
                                        <button
                                            type="button"
                                            onClick={() => seleccionarCliente(c)}
                                            className={`w-full text-left rounded-xl p-3 mb-2 transition-all flex items-center gap-3 ${
                                                active
                                                    ? 'bg-emerald-600 text-white shadow-md'
                                                    : darkMode
                                                      ? 'hover:bg-gray-700/80 text-gray-200'
                                                      : 'hover:bg-gray-100 text-gray-800'
                                            }`}
                                        >
                                            <span
                                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                                                    active
                                                        ? 'bg-white/20 text-white'
                                                        : darkMode
                                                          ? 'bg-gray-600 text-gray-200'
                                                          : 'bg-gray-200 text-gray-600'
                                                }`}
                                            >
                                                {initial}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium text-sm truncate">
                                                    {c.name || 'Sin nombre'}
                                                </div>
                                                <div
                                                    className={`text-xs truncate ${
                                                        active
                                                            ? 'text-emerald-100'
                                                            : darkMode
                                                              ? 'text-gray-400'
                                                              : 'text-gray-500'
                                                    }`}
                                                >
                                                    {c.email}
                                                </div>
                                                {c.unanswered_count > 0 && (
                                                    <span className="mt-1 inline-flex rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                                                        {c.unanswered_count} sin leer
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    </li>
                                )
                            })
                        )}
                    </ul>
                </div>

                <div
                    className={`${panel} md:col-span-8 max-md:absolute max-md:inset-0 max-md:z-20 flex ${
                        !enConversacionMobile ? 'max-md:hidden' : ''
                    }`}
                >
                    <div
                        className={`shrink-0 border-b px-3 py-2.5 md:px-4 md:py-3 flex items-center gap-2 ${
                            darkMode ? 'border-gray-700' : 'border-gray-200'
                        }`}
                    >
                        {enConversacionMobile && (
                            <button
                                type="button"
                                onClick={volverALista}
                                className={`md:hidden shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium ${
                                    darkMode
                                        ? 'text-emerald-200 hover:bg-gray-700'
                                        : 'text-emerald-800 hover:bg-emerald-50'
                                }`}
                                aria-label="Volver a la lista de clientes"
                            >
                                <span aria-hidden>←</span>
                                <span>Clientes</span>
                            </button>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className={`text-[10px] md:text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                Conversación con
                            </p>
                            <p
                                className={`font-semibold text-sm md:text-base truncate ${
                                    darkMode ? 'text-white' : 'text-gray-900'
                                }`}
                            >
                                {clienteSeleccionado?.name || 'Selecciona un cliente'}
                            </p>
                            {clienteSeleccionado?.email && (
                                <p
                                    className={`text-[10px] md:text-xs truncate ${
                                        darkMode ? 'text-gray-400' : 'text-gray-500'
                                    }`}
                                >
                                    {clienteSeleccionado.email}
                                </p>
                            )}
                        </div>
                        {clienteSeleccionado && (
                            <span className="hidden sm:inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                                Abierta
                            </span>
                        )}
                    </div>
                    <div className="flex flex-1 flex-col min-h-0 overflow-hidden p-2 md:p-3">
                        <AdminChatView
                            threadId="staff-chat-admin"
                            chatChannel={CHAT_CHANNEL_ADMIN}
                            darkMode={darkMode}
                            cliente={clienteSeleccionado}
                            mensajes={mensajes}
                            loading={loadingMensajes}
                            nuevoTexto={nuevoTexto}
                            setNuevoTexto={setNuevoTexto}
                            enviando={enviando}
                            onEnviar={handleEnviar}
                            editandoId={editandoId}
                            editandoTexto={editandoTexto}
                            setEditandoTexto={setEditandoTexto}
                            onIniciarEdicion={iniciarEdicion}
                            onCancelarEdicion={cancelarEdicion}
                            onGuardarEdicion={guardarEdicion}
                            guardandoId={guardandoId}
                            onEliminar={handleEliminar}
                            eliminandoId={eliminandoId}
                            scrollForceKey={`${clienteSeleccionado?.id ?? 0}-${scrollBump}`}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
