'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import axios from '@/lib/axios'
import ChatMessageComposer from '@/components/ChatMessageComposer'
import { resolveStorageUrl } from '@/lib/productos'
import { useDocumentDarkMode } from '@/hooks/useTiendaDarkMode'

const SESSION_KEY = 'tienda_chatbot_session_id'
const HISTORY_KEY = 'tienda_chatbot_history_v1'

function getOrCreateSessionId() {
    try {
        let id = localStorage.getItem(SESSION_KEY)
        if (!id) {
            id = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
            localStorage.setItem(SESSION_KEY, id)
        }
        return id
    } catch {
        return `guest_${Date.now()}`
    }
}

function formatPrecio(precio) {
    const n = Number(precio)
    if (!Number.isFinite(n)) return null
    return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

const WELCOME = {
    id: 'welcome',
    role: 'assistant',
    reply: '¡Hola! Soy el asistente de la tienda. Puedo recomendarte productos o llevarte a carrito, favoritos, cotizaciones y más. ¿Qué necesitas?',
    links: [
        { label: 'Inicio', href: '/' },
        { label: 'Búsqueda', href: '/tienda/busqueda' },
        { label: 'Carrito', href: '/tienda/carrito' },
    ],
    products: [],
}

export default function TiendaChatbotFloating() {
    // Sigue html.dark (misma fuente visual que body dark:), no el estado React local de la página
    const darkMode = useDocumentDarkMode()
    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState('')
    const [sending, setSending] = useState(false)
    const [messages, setMessages] = useState([WELCOME])
    const listRef = useRef(null)
    const sessionId = useMemo(() => (typeof window !== 'undefined' ? getOrCreateSessionId() : ''), [])

    useEffect(() => {
        try {
            const raw = localStorage.getItem(HISTORY_KEY)
            if (!raw) return
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed) && parsed.length) {
                setMessages(parsed.slice(-40))
            }
        } catch {
            // ignore
        }
    }, [])

    useEffect(() => {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-40)))
        } catch {
            // ignore
        }
    }, [messages])

    useEffect(() => {
        if (!open || !listRef.current) return
        listRef.current.scrollTop = listRef.current.scrollHeight
    }, [open, messages, sending])

    const conversationContext = useMemo(() => {
        const lines = []
        for (const m of messages.slice(-8)) {
            if (!m?.reply || typeof m.reply !== 'string') continue
            const role = m.role === 'user' ? 'user' : 'assistant'
            const text = m.reply.replace(/\s+/g, ' ').trim().slice(0, 280)
            if (text) lines.push(`${role}: ${text}`)
        }
        return lines.join('\n').slice(0, 3500)
    }, [messages])

    const send = useCallback(async () => {
        const text = draft.trim()
        if (!text || sending) return

        const userMsg = {
            id: `u_${Date.now()}`,
            role: 'user',
            reply: text,
            links: [],
            products: [],
        }
        setMessages((prev) => [...prev, userMsg])
        setDraft('')
        setSending(true)

        try {
            const ctx = [conversationContext, `user: ${text}`].filter(Boolean).join('\n').slice(0, 3500)
            const { data } = await axios.post('/tienda/chatbot', {
                message: text,
                session_id: sessionId,
                context: ctx || undefined,
            })
            const payload = data?.data || {}
            setMessages((prev) => [
                ...prev,
                {
                    id: `a_${Date.now()}`,
                    role: 'assistant',
                    reply: payload.reply || data?.message || 'Listo.',
                    links: Array.isArray(payload.links) ? payload.links : [],
                    products: Array.isArray(payload.products) ? payload.products : [],
                },
            ])
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                'No pude responder ahora. Revisa tu conexión e inténtalo de nuevo.'
            setMessages((prev) => [
                ...prev,
                {
                    id: `e_${Date.now()}`,
                    role: 'assistant',
                    reply: msg,
                    links: [{ label: 'Ir al inicio', href: '/' }],
                    products: [],
                },
            ])
        } finally {
            setSending(false)
        }
    }, [draft, sending, sessionId, conversationContext])

    // Paleta alineada con TiendaNavHeader / canvas de tienda
    const panel = darkMode
        ? 'border-gray-700 bg-tienda-elevated text-gray-100 shadow-black/40'
        : 'border-gray-200 bg-white text-gray-900 shadow-gray-900/10'
    const header = darkMode
        ? 'border-gray-700 bg-tienda-canvas/90'
        : 'border-gray-200 bg-gray-50'
    const title = darkMode ? 'text-gray-100' : 'text-gray-900'
    const subtitle = darkMode ? 'text-gray-400' : 'text-gray-600'
    const bubbleUser = 'bg-brand text-white'
    const bubbleBot = darkMode
        ? 'bg-tienda-canvas border border-gray-700 text-gray-100'
        : 'bg-gray-100 border border-gray-200 text-gray-900'
    const chip = darkMode
        ? 'bg-tienda-elevated text-gray-200 ring-1 ring-white/[0.06] hover:bg-gray-700'
        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    const productCard = darkMode
        ? 'bg-tienda-canvas/80 hover:bg-tienda-canvas border border-gray-700'
        : 'bg-white hover:bg-gray-50 border border-gray-200'
    const fab = open
        ? darkMode
            ? 'bg-tienda-elevated text-gray-100 ring-1 ring-white/10'
            : 'bg-gray-800 text-white'
        : 'bg-brand text-white hover:brightness-110'

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`fixed z-[70] right-4 bottom-4 md:right-6 md:bottom-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${fab}`}
                aria-label={open ? 'Cerrar asistente' : 'Abrir asistente de la tienda'}
                aria-expanded={open}
            >
                {open ? (
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />
                    </svg>
                )}
            </button>

            {open ? (
                <div
                    className={`fixed z-[70] right-4 bottom-20 md:right-6 md:bottom-24 flex w-[min(100vw-1.5rem,24rem)] max-h-[min(78vh,36rem)] flex-col overflow-hidden rounded-2xl border shadow-2xl ${panel}`}
                    role="dialog"
                    aria-label="Asistente de la tienda"
                >
                    <div className={`flex items-center justify-between gap-2 px-4 py-3 border-b ${header}`}>
                        <div className="min-w-0">
                            <p className={`text-sm font-bold truncate ${title}`}>Asistente de tienda</p>
                            <p className={`text-[11px] truncate ${subtitle}`}>Productos, enlaces y ayuda rápida</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setMessages([WELCOME])
                                try {
                                    localStorage.removeItem(HISTORY_KEY)
                                } catch {
                                    // ignore
                                }
                            }}
                            className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                                darkMode ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            Limpiar
                        </button>
                    </div>

                    <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                        {messages.map((m) => {
                            const isUser = m.role === 'user'
                            return (
                                <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                                            isUser ? bubbleUser : bubbleBot
                                        }`}
                                    >
                                        <p className="whitespace-pre-wrap">{m.reply}</p>

                                        {!isUser && Array.isArray(m.links) && m.links.length > 0 ? (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {m.links.map((l) => (
                                                    <Link
                                                        key={`${m.id}-${l.href}-${l.label}`}
                                                        href={l.href}
                                                        onClick={() => setOpen(false)}
                                                        className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${chip}`}
                                                    >
                                                        {l.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        ) : null}

                                        {!isUser && Array.isArray(m.products) && m.products.length > 0 ? (
                                            <div className="mt-2 space-y-2">
                                                {m.products.map((p) => {
                                                    const img = resolveStorageUrl(p.imagen)
                                                    const precio = formatPrecio(p.precio)
                                                    return (
                                                        <Link
                                                            key={`${m.id}-${p.clave}`}
                                                            href={p.href || `/tienda/producto/${encodeURIComponent(p.clave)}`}
                                                            onClick={() => setOpen(false)}
                                                            className={`flex gap-2 rounded-xl p-2 transition ${productCard}`}
                                                        >
                                                            <div
                                                                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg ${
                                                                    darkMode ? 'bg-gray-800' : 'bg-gray-100'
                                                                }`}
                                                            >
                                                                {img ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img
                                                                        src={img}
                                                                        alt=""
                                                                        className="h-full w-full object-cover"
                                                                        loading="lazy"
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        className={`flex h-full items-center justify-center text-[10px] ${
                                                                            darkMode ? 'text-gray-500' : 'text-gray-400'
                                                                        }`}
                                                                    >
                                                                        Sin img
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs font-semibold line-clamp-2">
                                                                    {p.descripcion || p.clave}
                                                                </p>
                                                                <p className={`text-[10px] mt-0.5 ${subtitle}`}>
                                                                    {p.clave}
                                                                    {p.marca ? ` · ${p.marca}` : ''}
                                                                </p>
                                                                {precio ? (
                                                                    <p className="text-xs font-bold mt-0.5 text-brand">
                                                                        {precio}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        </Link>
                                                    )
                                                })}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            )
                        })}
                        {sending ? (
                            <p className={`text-xs px-1 ${subtitle}`}>Un momento…</p>
                        ) : null}
                    </div>

                    <div className={`border-t p-2 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <ChatMessageComposer
                            value={draft}
                            onChange={setDraft}
                            onSubmit={send}
                            sending={sending}
                            darkMode={darkMode}
                            accent="orange"
                            placeholder="Ej. busco monitor gaming o ir al carrito…"
                            maxLength={2000}
                        />
                    </div>
                </div>
            ) : null}
        </>
    )
}
