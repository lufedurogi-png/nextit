'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import {
    getChatClientesVentas,
    getChatMensajesVentas,
    enviarMensajeVentas,
    actualizarMensajeVentas,
    eliminarMensajeVentas,
} from '@/lib/chatApi'
import {
    maxChatMessageId,
    setChatMessagesFromServer,
    appendChatMessagesFromServer,
} from '@/lib/chatMerge'
import AdminChatView from '@/components/AdminChatView'
import VentasFichaRapida from '@/components/ventas/VentasFichaRapida'
import { fetchVentasFichaCliente } from '@/lib/ventasChatFichaApi'
import { useAdminTheme } from '@/contexts/AdminThemeContext'

const panel =
    'rounded-2xl border border-orange-100 bg-white dark:border-orange-900/40 dark:bg-[#262626]/80 flex flex-col overflow-hidden min-h-0 h-full'
const STAFF_COLOR = '#FF8000'
const POLL_MS = 8000

export default function VentasInboxClient() {
    const searchParams = useSearchParams()
    const { darkMode } = useAdminTheme()
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

    const cargarClientes = useCallback(async (silent = false) => {
        if (!silent) setLoadingClientes(true)
        try {
            const lista = await getChatClientesVentas()
            const arr = Array.isArray(lista) ? lista : []
            setClientes((prev) => {
                if (silent && prev.length === arr.length) {
                    const same = prev.every((c, i) => {
                        const n = arr[i]
                        return n && c.id === n.id && c.unanswered_count === n.unanswered_count
                    })
                    if (same) return prev
                }
                return arr
            })
        } catch {
            if (!silent) setClientes([])
        } finally {
            if (!silent) setLoadingClientes(false)
        }
    }, [])

    useEffect(() => {
        cargarClientes()
    }, [cargarClientes])

    useEffect(() => {
        const raw = searchParams.get('cliente')
        if (!raw) return
        const id = Number(raw)
        if (!Number.isFinite(id) || id <= 0) return
        if (clienteSeleccionado?.id === id) return

        const found = clientes.find((c) => c.id === id)
        if (found) {
            setClienteSeleccionado({ id: found.id, name: found.name, email: found.email })
            return
        }

        let cancelled = false
        fetchVentasFichaCliente(id)
            .then((data) => {
                if (cancelled) return
                setClienteSeleccionado({
                    id,
                    name: data?.name || 'Cliente',
                    email: data?.email || '',
                })
            })
            .catch(() => {
                if (!cancelled) setClienteSeleccionado({ id, name: 'Cliente', email: '' })
            })
        return () => {
            cancelled = true
        }
    }, [searchParams, clientes, clienteSeleccionado?.id])

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
            const { mensajes: list } = await getChatMensajesVentas(userId, afterId)
            const arr = Array.isArray(list) ? list : []
            setMensajes((prev) => {
                if (!silent || afterId === 0) return setChatMessagesFromServer(prev, arr)
                return appendChatMessagesFromServer(prev, arr)
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
            user_id: userId,
            sender_type: 'seller',
            body: texto,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            pending: true,
        }
        setMensajes((prev) => [...prev, tempMsg])
        setNuevoTexto('')
        setScrollBump((b) => b + 1)
        setEnviando(true)
        try {
            const m = await enviarMensajeVentas(userId, texto)
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
            const actualizado = await actualizarMensajeVentas(editandoId, texto)
            if (actualizado) {
                setMensajes((prev) => prev.map((x) => (x.id === editandoId ? { ...x, ...actualizado } : x)))
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
            const ok = await eliminarMensajeVentas(id)
            if (ok) setMensajes((prev) => prev.filter((x) => x.id !== id))
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

    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-orange-950 dark:text-white">Chats</h1>
                    <p className="text-sm text-orange-800/70 dark:text-orange-200/60 mt-1">
                        Mensajes y seguimiento con clientes.
                    </p>
                </div>
            </div>

            <div className="grid flex-1 min-h-0 gap-4 md:grid-cols-12 md:grid-rows-1 overflow-hidden">
                <div className={`${panel} md:col-span-3`}>
                    <div className="shrink-0 border-b border-orange-100 px-3 py-2 dark:border-orange-900/40">
                        <input
                            type="search"
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                            placeholder="Filtrar clientes…"
                            className="w-full rounded-lg border border-orange-100 bg-orange-50/50 px-3 py-2 text-sm dark:border-orange-800 dark:bg-[#202020] dark:text-orange-100"
                        />
                    </div>
                    <ul className="overflow-y-auto flex-1 min-h-0">
                        {loadingClientes ? (
                            <li className="px-3 py-4 text-sm text-orange-600 dark:text-orange-300/70">Cargando…</li>
                        ) : clientesFiltrados.length === 0 ? (
                            <li className="px-3 py-4 text-sm text-orange-600 dark:text-orange-300/70">
                                {clientes.length === 0
                                    ? 'Ningún cliente ha iniciado chat con ventas aún.'
                                    : 'Sin coincidencias.'}
                            </li>
                        ) : (
                            clientesFiltrados.map((c) => {
                                const active = clienteSeleccionado?.id === c.id
                                return (
                                    <li key={c.id}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setClienteSeleccionado({ id: c.id, name: c.name, email: c.email })
                                            }
                                            className={`w-full border-b border-orange-50 px-3 py-3 text-left transition dark:border-orange-900/30 ${
                                                active
                                                    ? 'bg-orange-50/80 dark:bg-orange-600/15'
                                                    : 'hover:bg-orange-50/40 dark:hover:bg-white/[0.03]'
                                            }`}
                                        >
                                            <p className="font-medium text-sm text-gray-900 dark:text-white">
                                                {c.name || 'Sin nombre'}
                                            </p>
                                            <p className="text-xs text-orange-700/70 dark:text-orange-300/60 truncate">
                                                {c.email}
                                            </p>
                                            {c.unanswered_count > 0 && (
                                                <span className="mt-1 inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
                                                    {c.unanswered_count} sin leer
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                )
                            })
                        )}
                    </ul>
                </div>

                <div className={`${panel} md:col-span-6`}>
                    <div className="shrink-0 border-b border-orange-100 px-4 py-3 flex items-center justify-between dark:border-orange-900/40">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-orange-300/50">Conversación con</p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                                {clienteSeleccionado?.name || 'Selecciona un cliente'}
                            </p>
                            {clienteSeleccionado?.email && (
                                <p className="text-xs text-orange-700/70 dark:text-orange-300/60">
                                    {clienteSeleccionado.email}
                                </p>
                            )}
                        </div>
                        {clienteSeleccionado && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                                Abierta
                            </span>
                        )}
                    </div>
                    <div className="flex flex-1 flex-col min-h-0 overflow-hidden p-3">
                        <AdminChatView
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
                            staffColor={STAFF_COLOR}
                            staffTypes={['seller']}
                            staffName={(m) => m.seller_name}
                            staffEmail={(m) => m.seller_email}
                            composerAccent="orange"
                            scrollForceKey={`${clienteSeleccionado?.id ?? 0}-${scrollBump}`}
                        />
                    </div>
                </div>

                <div className={`${panel} md:col-span-3`}>
                    <div className="shrink-0 border-b border-orange-100 px-4 py-3 dark:border-orange-900/40">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Ficha rápida</h3>
                    </div>
                    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
                        <VentasFichaRapida
                            clienteId={clienteSeleccionado?.id}
                            clienteFallback={clienteSeleccionado}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
