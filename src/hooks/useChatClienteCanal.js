'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
    maxChatMessageId,
    setChatMessagesFromServer,
    appendChatMessagesFromServer,
} from '@/lib/chatMerge'

const POLL_MS = 8000

/**
 * Hook de chat cliente atado a UN canal fijo (admin o ventas).
 * Cada panel debe pasar su propio `config` y `threadId` — no reutilizar entre canales.
 */
export default function useChatClienteCanal({ channel, threadId, api, staffLabel, emptyHint }) {
    const [mensajes, setMensajes] = useState([])
    const [loading, setLoading] = useState(true)
    const [nuevoTexto, setNuevoTexto] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [editandoId, setEditandoId] = useState(null)
    const [editandoTexto, setEditandoTexto] = useState('')
    const [guardandoId, setGuardandoId] = useState(null)
    const [eliminandoId, setEliminandoId] = useState(null)
    const [errorEnvio, setErrorEnvio] = useState(null)
    const mensajesRef = useRef([])
    const pollingRef = useRef(false)

    mensajesRef.current = mensajes

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
                const list = await api.getMensajes(afterId)
                const arr = Array.isArray(list) ? list : []
                setMensajes((prev) => {
                    if (!silent || afterId === 0) {
                        return setChatMessagesFromServer(prev, arr, channel)
                    }
                    return appendChatMessagesFromServer(prev, arr, channel)
                })
            } catch {
                if (!silent) setMensajes([])
            } finally {
                if (!silent) setLoading(false)
                if (silent) pollingRef.current = false
            }
        },
        [api, channel]
    )

    useEffect(() => {
        setMensajes([])
        cargarMensajes(false)
    }, [threadId, cargarMensajes])

    useEffect(() => {
        const interval = setInterval(() => {
            if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
            if (editandoId != null) return
            cargarMensajes(true)
        }, POLL_MS)
        return () => clearInterval(interval)
    }, [threadId, cargarMensajes, editandoId])

    const handleEnviar = async () => {
        const texto = (nuevoTexto || '').trim()
        if (!texto || enviando) return
        setErrorEnvio(null)
        const tempId = `temp-${threadId}-${Date.now()}`
        const tempMsg = {
            id: tempId,
            channel,
            sender_type: 'customer',
            body: texto,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            pending: true,
        }
        setMensajes((prev) => [...prev, tempMsg])
        setNuevoTexto('')
        setEnviando(true)
        try {
            const m = await api.enviarMensaje(texto)
            if (m) {
                setMensajes((prev) => prev.map((x) => (x.id === tempId ? { ...m, pending: false } : x)))
            } else {
                setMensajes((prev) => prev.filter((x) => x.id !== tempId))
                setErrorEnvio('No se pudo enviar el mensaje. Intenta de nuevo.')
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
            const actualizado = await api.actualizarMensaje(editandoId, texto)
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
            const ok = await api.eliminarMensaje(id)
            if (ok) setMensajes((prev) => prev.filter((x) => x.id !== id))
        } catch {
            //
        } finally {
            setEliminandoId(null)
        }
    }

    return {
        channel,
        threadId,
        mensajes,
        loading,
        nuevoTexto,
        setNuevoTexto,
        enviando,
        editandoId,
        editandoTexto,
        setEditandoTexto,
        guardandoId,
        eliminandoId,
        errorEnvio,
        emptyHint,
        staffLabel,
        handleEnviar,
        iniciarEdicion,
        cancelarEdicion,
        guardarEdicion,
        handleEliminar,
    }
}
