'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from '@/lib/axios'
import { useAuth } from '@/hooks/auth'
import AppHero from '@/components/coleccionador/AppHero'
import PageFade from '@/components/coleccionador/PageFade'
import { storageUrl } from '@/lib/storageUrl'
import { listingAllImages } from '@/lib/tiendaListingUtils'
import { profileHref } from '@/lib/profileUrl'
import { emitVikuChanSignal } from '@/lib/vikuChanSignals'

function peerFromChat(chat, myId) {
    const parts = chat?.participants || []
    const users = parts.map((p) => p.user).filter(Boolean)
    return users.find((u) => u.id !== myId) || users[0] || null
}

function IconChevronRight({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function IconChevronLeft({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function IconClip({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path
                d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 018.28 1.14 4 4 0 01-1.14 8.28L8.52 18.78a2 2 0 01-2.83-2.83l8.49-8.48"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

const MOBILE_DRAWER_TOGGLE_GAP = 10
const MOBILE_DRAWER_TOGGLE_BTN = 56
const MOBILE_DRAWER_TOGGLE_MARGIN = 16

/** Flotante, siempre fuera del DOM del panel; `left` animado con la misma curva que el drawer para ir “con” la barra. */
function MobileChatDrawerToggle({ sidebarOpen, onToggle, className = '', style }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            style={style}
            className={`pointer-events-auto grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-slate-200/90 bg-white text-slate-800 shadow-[0_10px_40px_rgba(15,23,42,0.18)] ring-2 ring-[var(--app-accent)]/25 transition-[left] duration-200 ease-out active:scale-[0.97] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] dark:ring-[var(--app-accent)]/30 ${className}`}
            title={sidebarOpen ? 'Ocultar conversaciones' : 'Mostrar conversaciones'}
            aria-expanded={sidebarOpen}
            aria-controls="mensajes-lista-interna-movil"
        >
            {sidebarOpen ? <IconChevronLeft className="h-7 w-7" /> : <IconChevronRight className="h-7 w-7" />}
        </button>
    )
}

export default function MensajesInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user } = useAuth({})
    const myId = user?.id

    const initialChat = searchParams?.get?.('chat')
    const [q, setQ] = useState('')
    const [users, setUsers] = useState([])
    const [chats, setChats] = useState([])
    const [chatsReady, setChatsReady] = useState(false)
    const [activeChat, setActiveChat] = useState(initialChat ? Number(initialChat) : null)
    const [messages, setMessages] = useState([])
    const [body, setBody] = useState('')
    const [attachmentPreviews, setAttachmentPreviews] = useState([])
    const [editingMessageId, setEditingMessageId] = useState(null)
    const [editingBody, setEditingBody] = useState('')
    const [deletingMessageId, setDeletingMessageId] = useState(null)
    const [chatError, setChatError] = useState('')
    const [confirmDeleteChatId, setConfirmDeleteChatId] = useState(null)
    const [deletingChatId, setDeletingChatId] = useState(null)
    const messagesScrollRef = useRef(null)
    const messageRowRefs = useRef({})
    const messagesBottomRef = useRef(null)
    const mobileDrawerAsideRef = useRef(null)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [mobileToggleLeftPx, setMobileToggleLeftPx] = useState(16)
    const swipeRef = useRef({ x: 0, y: 0, t: 0 })

    const loadChats = useCallback(async () => {
        try {
            const { data } = await axios.get('/chats')
            setChats(Array.isArray(data) ? data : [])
        } catch {
            setChats([])
        } finally {
            setChatsReady(true)
        }
    }, [])

    useEffect(() => {
        loadChats()
    }, [loadChats])

    useEffect(() => {
        const c = searchParams?.get?.('chat')
        if (c) setActiveChat(Number(c))
    }, [searchParams])

    useEffect(() => {
        setEditingMessageId(null)
        setEditingBody('')
        setDeletingMessageId(null)
        setConfirmDeleteChatId(null)
    }, [activeChat])

    // Botón aparte del aside: misma duración/easing que `transition-transform` del panel. `offsetWidth` no depende del translate.
    useLayoutEffect(() => {
        function updateToggleLeft() {
            const el = mobileDrawerAsideRef.current
            const vw = typeof window !== 'undefined' ? window.innerWidth : 400
            const drawerW = el?.offsetWidth ?? Math.min(300, Math.max(0, vw - 32))
            if (!sidebarOpen) {
                setMobileToggleLeftPx(MOBILE_DRAWER_TOGGLE_MARGIN)
                return
            }
            const desired = drawerW + MOBILE_DRAWER_TOGGLE_GAP
            const maxLeft = vw - MOBILE_DRAWER_TOGGLE_BTN - MOBILE_DRAWER_TOGGLE_MARGIN
            setMobileToggleLeftPx(Math.max(MOBILE_DRAWER_TOGGLE_MARGIN, Math.min(desired, maxLeft)))
        }

        updateToggleLeft()
        window.addEventListener('resize', updateToggleLeft)
        const el = mobileDrawerAsideRef.current
        const ro = el ? new ResizeObserver(updateToggleLeft) : null
        if (el && ro) ro.observe(el)
        return () => {
            window.removeEventListener('resize', updateToggleLeft)
            ro?.disconnect()
        }
    }, [sidebarOpen])

    useEffect(() => {
        if (!activeChat) return
        let cancelled = false
        ;(async () => {
            try {
                const { data } = await axios.get(`/chats/${activeChat}/messages`)
                if (!cancelled) setMessages(Array.isArray(data) ? data : [])
            } catch {
                if (!cancelled) setMessages([])
            }
        })()
        return () => {
            cancelled = true
        }
    }, [activeChat])

    const searchUsers = async () => {
        const { data } = await axios.get('/users/search', { params: { q } })
        setUsers(Array.isArray(data) ? data : [])
    }

    const openChatWithUser = async (userId) => {
        try {
            const { data } = await axios.post('/chats/direct', { user_id: userId })
            await loadChats()
            const id = data?.id
            if (id) {
                setActiveChat(id)
                router.replace(`/mensajes?chat=${id}`, { scroll: false })
                if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
                    setSidebarOpen(false)
                }
            }
        } catch {
            alert('No se pudo abrir el chat.')
        }
    }

    const saleChatCoverImage = (chat) => {
        const imgs = listingAllImages(chat?.listing || {})
        const first = Array.isArray(imgs) && imgs.length ? imgs[0] : null
        return first ? storageUrl(first) : '/Imagenes/caja.png'
    }

    const deleteChat = useCallback(
        async (chatId) => {
            if (!chatId) return
            try {
                setChatError('')
                setDeletingChatId(chatId)
                await axios.delete(`/chats/${chatId}`)
                setConfirmDeleteChatId(null)
                await loadChats()
                if (activeChat === chatId) {
                    setActiveChat(null)
                    setMessages([])
                    router.replace('/mensajes', { scroll: false })
                }
            } catch {
                setChatError('No se pudo eliminar el chat.')
            } finally {
                setDeletingChatId(null)
            }
        },
        [activeChat, loadChats, router]
    )

    const send = async () => {
        if (!activeChat || (!body.trim() && attachmentPreviews.length === 0)) return
        try {
            setChatError('')
            let attachments = null
            if (attachmentPreviews.length > 0) {
                const uploaded = []
                for (const item of attachmentPreviews) {
                    if (!item?.file) continue
                    const fd = new FormData()
                    fd.append('file', item.file)
                    const up = await axios.post('/uploads', fd)
                    if (up.data?.path) uploaded.push(up.data.path)
                }
                attachments = uploaded.length ? uploaded : null
            }
            await axios.post(`/chats/${activeChat}/messages`, { body: body.trim() || null, attachments })
            emitVikuChanSignal('compose')
            setBody('')
            setAttachmentPreviews((prev) => {
                prev.forEach((p) => p.url && URL.revokeObjectURL(p.url))
                return []
            })
            await refreshMessages()
        } catch {
            setChatError('No se pudo enviar el mensaje. Intenta de nuevo.')
        }
    }

    const refreshMessages = useCallback(async () => {
        if (!activeChat) return
        const { data } = await axios.get(`/chats/${activeChat}/messages`)
        setMessages(Array.isArray(data) ? data : [])
    }, [activeChat])

    const scrollToLatest = useCallback(() => {
        const el = messagesScrollRef.current
        if (!el) return
        // Forzar scroll al final tras render y después de cargas tardías (imágenes).
        const apply = () => {
            if (messagesBottomRef.current) {
                messagesBottomRef.current.scrollIntoView({ block: 'end' })
            } else {
                el.scrollTop = el.scrollHeight
            }
        }
        apply()
        requestAnimationFrame(apply)
        window.setTimeout(apply, 0)
        window.setTimeout(apply, 120)
        window.setTimeout(apply, 350)
    }, [])

    const scrollMessageIntoView = useCallback((messageId) => {
        if (!messageId) return
        const row = messageRowRefs.current[String(messageId)]
        if (!row) return
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, [])

    const startEditMessage = (messageId, currentBody) => {
        setDeletingMessageId(null)
        setEditingMessageId(messageId)
        setEditingBody(currentBody || '')
        window.setTimeout(() => scrollMessageIntoView(messageId), 0)
    }

    const cancelEditMessage = () => {
        setEditingMessageId(null)
        setEditingBody('')
    }

    const saveEditMessage = async (messageId) => {
        try {
            setChatError('')
            await axios.patch(`/chats/${activeChat}/messages/${messageId}`, { body: editingBody })
            cancelEditMessage()
            await refreshMessages()
        } catch (e) {
            if (e?.response?.status === 404) {
                setChatError('Ese mensaje ya no existe o cambió de chat. Se recargó la conversación.')
                cancelEditMessage()
                await refreshMessages()
                return
            }
            setChatError('No se pudo guardar la edición.')
        }
    }

    const startDeleteConfirm = (messageId) => {
        setEditingMessageId(null)
        setEditingBody('')
        setDeletingMessageId(messageId)
        window.setTimeout(() => scrollMessageIntoView(messageId), 0)
    }

    const cancelDeleteConfirm = () => {
        setDeletingMessageId(null)
    }

    const confirmDeleteMessage = async (messageId) => {
        try {
            setChatError('')
            await axios.delete(`/chats/${activeChat}/messages/${messageId}`)
            cancelDeleteConfirm()
            await refreshMessages()
        } catch (e) {
            if (e?.response?.status === 404) {
                setChatError('Ese mensaje ya no existe. Se actualizó la conversación.')
                cancelDeleteConfirm()
                await refreshMessages()
                return
            }
            setChatError('No se pudo eliminar el mensaje.')
        }
    }

    const appendAttachments = (fileList) => {
        const files = Array.from(fileList || []).filter((f) => f && f.size > 0)
        if (!files.length) return
        setAttachmentPreviews((prev) => {
            const next = [...prev]
            for (const file of files) {
                next.push({
                    id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    file,
                    url: URL.createObjectURL(file),
                })
            }
            return next
        })
    }

    const removeAttachment = (id) => {
        setAttachmentPreviews((prev) => {
            const picked = prev.find((x) => x.id === id)
            if (picked?.url) URL.revokeObjectURL(picked.url)
            return prev.filter((x) => x.id !== id)
        })
    }

    const activeMeta = useMemo(() => chats.find((c) => c.id === activeChat), [chats, activeChat])

    useEffect(() => {
        scrollToLatest()
    }, [messages, scrollToLatest])

    useEffect(() => {
        return () => {
            attachmentPreviews.forEach((p) => p.url && URL.revokeObjectURL(p.url))
        }
    }, [attachmentPreviews])

    const headerTitle = useMemo(() => {
        if (!activeMeta || !myId) return 'Chat'
        if (activeMeta.type === 'sale') {
            const t = activeMeta.listing?.item?.title || 'Producto en venta'
            return `Venta · ${t}`
        }
        const peer = peerFromChat(activeMeta, myId)
        return peer?.name || 'Chat directo'
    }, [activeMeta, myId])

    const headerPeer = useMemo(() => (activeMeta && myId ? peerFromChat(activeMeta, myId) : null), [activeMeta, myId])

    const headerPeerProfileHref = useMemo(() => {
        if (!headerPeer?.id) return null
        return profileHref({ id: headerPeer.id, name: headerPeer.name, currentUserId: myId })
    }, [headerPeer, myId])

    const saleHeaderImage = useMemo(() => (activeMeta?.type === 'sale' ? saleChatCoverImage(activeMeta) : null), [activeMeta])

    const hasChats = chats.length > 0

    const pickChat = useCallback(
        (chatId) => {
            setActiveChat(chatId)
            router.replace(`/mensajes?chat=${chatId}`, { scroll: false })
            if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
                setSidebarOpen(false)
            }
        },
        [router]
    )

    const onMainTouchStart = useCallback((e) => {
        const t = e.touches?.[0]
        if (!t) return
        swipeRef.current = { x: t.clientX, y: t.clientY, edge: t.clientX < 40 }
    }, [])

    const onMainTouchEnd = useCallback(
        (e) => {
            if (!hasChats) return
            const t = e.changedTouches?.[0]
            if (!t) return
            const { x, y, edge } = swipeRef.current
            const dx = t.clientX - x
            const dy = t.clientY - y
            if (Math.abs(dx) < 56) return
            if (Math.abs(dy) > Math.abs(dx) * 1.15) return
            const vw = typeof window !== 'undefined' ? window.innerWidth : 400
            if (!sidebarOpen && dx > 0 && (edge || x < vw * 0.34)) {
                setSidebarOpen(true)
            } else if (sidebarOpen && dx < 0) {
                setSidebarOpen(false)
            }
        },
        [hasChats, sidebarOpen]
    )

    const onDrawerTouchStart = useCallback((e) => {
        const t = e.touches?.[0]
        if (!t) return
        swipeRef.current = { x: t.clientX, y: t.clientY, edge: false }
    }, [])

    const onDrawerTouchEnd = useCallback(
        (e) => {
            const t = e.changedTouches?.[0]
            if (!t || !sidebarOpen) return
            const { x, y } = swipeRef.current
            const dx = t.clientX - x
            const dy = t.clientY - y
            if (Math.abs(dx) < 48) return
            if (Math.abs(dy) > Math.abs(dx) * 1.15) return
            if (dx < 0) setSidebarOpen(false)
        },
        [sidebarOpen]
    )

    const sidebarInner = (
        <div className="flex h-full min-h-0 flex-col p-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Buscar usuarios</p>
            <div className="mt-2 flex gap-2">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                    placeholder="Nombre o correo"
                />
                <button type="button" onClick={searchUsers} className="rounded-2xl bg-[var(--app-accent)] px-3 py-2 text-sm font-extrabold text-white">
                    Buscar
                </button>
            </div>
            <div className="mt-3 space-y-2">
                {users.map((u) => (
                    <button
                        key={u.id}
                        type="button"
                        onClick={() => openChatWithUser(u.id)}
                        className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 p-2 text-left text-sm transition hover:border-[var(--app-accent)]/50 dark:border-slate-700"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={storageUrl(u.avatar_path)} alt="" className="h-9 w-9 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-bold">{u.name}</p>
                            <p className="truncate text-xs text-slate-500">{u.email}</p>
                        </div>
                        <span className="text-xs font-bold text-[var(--app-accent)]">Chat</span>
                    </button>
                ))}
            </div>

            <p className="mt-4 shrink-0 text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Chats</p>
            <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
                {chats.map((c) => {
                    const peer = myId ? peerFromChat(c, myId) : null
                    const isSale = c.type === 'sale'
                    const label = isSale ? c.listing?.item?.title || 'Venta' : peer?.name || 'Chat'
                    const img = isSale ? saleChatCoverImage(c) : storageUrl(peer?.avatar_path)

                    return (
                        <div
                            key={c.id}
                            onClick={() => pickChat(c.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    pickChat(c.id)
                                }
                            }}
                            className={`flex w-full items-center gap-2 rounded-2xl border px-2 py-2 text-left text-sm transition ${
                                activeChat === c.id
                                    ? 'border-[var(--app-accent)] bg-indigo-50 dark:bg-indigo-950/30'
                                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                            }`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt="" className="h-9 w-9 rounded-xl object-cover" />
                            <span className="min-w-0 flex-1 truncate font-bold">{label}</span>
                            {isSale ? (
                                <span className="shrink-0 rounded-lg bg-amber-100 px-1.5 py-0.5 text-[0.65rem] font-black text-amber-900">$</span>
                            ) : null}
                            <div className="ml-1 shrink-0">
                                {confirmDeleteChatId === c.id ? (
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setConfirmDeleteChatId(null)
                                            }}
                                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900/30 dark:text-slate-200"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            disabled={deletingChatId === c.id}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                deleteChat(c.id)
                                            }}
                                            className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                                        >
                                            {deletingChatId === c.id ? 'Eliminando…' : 'Eliminar'}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setConfirmDeleteChatId(c.id)
                                        }}
                                        className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                                    >
                                        Eliminar
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )

    return (
        <PageFade>
            {!chatsReady ? (
                <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 px-4">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--app-accent)] border-t-transparent" aria-hidden />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Cargando conversaciones…</p>
                </div>
            ) : !hasChats ? (
                <AppHero eyebrow="Conversaciones" title="Mensajes" subtitle="Chats de venta y mensajes directos entre coleccionistas." />
            ) : null}

            {!chatsReady || !hasChats ? null : (
                <div className="relative z-[1] -mx-4 flex max-md:h-[calc(100dvh-4.75rem)] max-md:min-h-0 max-md:flex-col md:mx-0 md:h-[calc(100dvh-4.5rem)] md:min-h-0 md:flex-1 md:flex-row md:items-stretch md:pb-0">
                    {sidebarOpen ? (
                        <button
                            type="button"
                            className="fixed inset-0 bottom-[4.5rem] z-[60] bg-black/45 backdrop-blur-[1px] md:hidden"
                            aria-label="Cerrar lista de chats"
                            onClick={() => setSidebarOpen(false)}
                        />
                    ) : null}

                    {/* Escritorio: lista empuja el chat (debajo del header de la app, alineado al main) */}
                    <div
                        className={`relative z-[1] hidden h-full min-h-0 shrink-0 md:flex md:self-stretch ${sidebarOpen ? 'w-[348px]' : 'w-12'}`}
                    >
                        {/* Lista a la izquierda, flecha pegada al borde derecho de la barra (misma pieza) */}
                        <div className="flex h-full min-h-0 w-full flex-1 flex-row overflow-hidden rounded-l-2xl rounded-r-2xl border border-slate-200 bg-white shadow-[4px_0_24px_rgba(15,23,42,0.08)] dark:border-slate-600 dark:bg-slate-900 dark:shadow-[4px_0_28px_rgba(0,0,0,0.35)]">
                            <aside
                                id="mensajes-lista-interna"
                                data-chat-drawer
                                onTouchStart={onDrawerTouchStart}
                                onTouchEnd={onDrawerTouchEnd}
                                className={`min-h-0 overflow-hidden border-r border-slate-200/90 transition-[width,opacity] duration-200 ease-out dark:border-slate-600/90 ${
                                    sidebarOpen ? 'w-[300px] opacity-100' : 'pointer-events-none w-0 border-0 opacity-0'
                                }`}
                                aria-hidden={!sidebarOpen}
                            >
                                <div className="flex h-full min-h-0 w-[300px] flex-col">{sidebarInner}</div>
                            </aside>
                            <button
                                type="button"
                                onClick={() => setSidebarOpen((v) => !v)}
                                className="flex w-12 shrink-0 flex-col items-center justify-center self-stretch bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:bg-slate-800/95 dark:text-slate-100 dark:hover:bg-slate-800"
                                title={sidebarOpen ? 'Ocultar conversaciones' : 'Mostrar conversaciones'}
                                aria-expanded={sidebarOpen}
                                aria-controls="mensajes-lista-interna"
                            >
                                {sidebarOpen ? <IconChevronLeft className="h-6 w-6" /> : <IconChevronRight className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>

                    {/* Móvil: panel y botón son nodos hermanos; el botón anima `left` en sync con el translate del panel */}
                    <aside
                        ref={mobileDrawerAsideRef}
                        id="mensajes-lista-interna-movil"
                        data-chat-drawer
                        onTouchStart={onDrawerTouchStart}
                        onTouchEnd={onDrawerTouchEnd}
                        className={`fixed bottom-[4.5rem] left-0 top-0 z-[62] flex min-h-0 w-[min(300px,calc(100vw-2rem))] flex-col overflow-hidden rounded-r-2xl border border-slate-200 bg-white shadow-[8px_0_32px_rgba(15,23,42,0.14)] transition-transform duration-200 ease-out dark:border-slate-600 dark:bg-slate-900 dark:shadow-[8px_0_36px_rgba(0,0,0,0.45)] md:hidden ${
                            sidebarOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
                        }`}
                        aria-hidden={!sidebarOpen}
                    >
                        <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto overflow-x-hidden">{sidebarInner}</div>
                    </aside>
                    <MobileChatDrawerToggle
                        sidebarOpen={sidebarOpen}
                        onToggle={() => setSidebarOpen((v) => !v)}
                        className="fixed z-[70] md:hidden"
                        style={{
                            top: 'calc(env(safe-area-inset-top) + 6.75rem)',
                            left: mobileToggleLeftPx,
                        }}
                    />

                    <div
                        className="relative flex min-h-0 flex-1 flex-col px-3 max-md:min-h-0 md:h-full md:min-h-0 md:min-w-0 md:flex-1 md:px-4"
                        onTouchStart={onMainTouchStart}
                        onTouchEnd={onMainTouchEnd}
                    >
                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 md:h-full md:min-h-0">
                            {!activeChat ? (
                                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                                    <div className="relative shrink-0 overflow-hidden rounded-t-3xl border-b border-white/15 bg-gradient-to-br from-[var(--app-accent)] via-indigo-600 to-slate-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] dark:border-white/10">
                                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.16)_0%,transparent_38%,rgba(0,0,0,0.12)_100%)]" />
                                        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                                        <div className="relative flex items-center gap-3 px-4 py-3.5">
                                            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-2xl ring-2 ring-white/35 shadow-inner">💬</div>
                                            <div className="min-w-0">
                                                <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-white/75">Tus mensajes</p>
                                                <p className="truncate text-base font-extrabold tracking-tight drop-shadow-sm">Elige una conversación</p>
                                                <p className="mt-0.5 text-xs font-medium text-white/80">Chats de venta y mensajes directos.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50/90 to-slate-100/80 px-6 py-8 dark:from-slate-950/40 dark:to-slate-900/60">
                                        <div className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12] [background-image:radial-gradient(circle_at_1px_1px,rgb(15_23_42)_1px,transparent_0)] [background-size:20px_20px]" />
                                        <div className="relative flex max-w-sm flex-col items-center text-center">
                                            <div className="mb-5 flex gap-2 opacity-40" aria-hidden>
                                                <span className="h-10 w-16 rounded-2xl rounded-br-md bg-slate-300/90 dark:bg-slate-600/80" />
                                                <span className="h-10 w-20 rounded-2xl rounded-bl-md bg-[var(--app-accent)]/35 dark:bg-[var(--app-accent)]/25" />
                                            </div>
                                            <p className="text-base font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Aquí verás la conversación</p>
                                            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                                                Selecciona un chat en la lista para empezar a leer y enviar mensajes.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="relative shrink-0 overflow-hidden rounded-t-3xl border-b border-white/15 bg-gradient-to-br from-[var(--app-accent)] via-indigo-600 to-slate-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] dark:border-white/10">
                                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.16)_0%,transparent_38%,rgba(0,0,0,0.12)_100%)]" />
                                        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                                        <div className="relative px-4 py-3.5">
                                            {activeMeta?.type === 'sale' && activeMeta?.listing_id ? (
                                                <Link
                                                    href={`/tienda/${activeMeta.listing_id}`}
                                                    className="flex min-w-0 items-center gap-3 rounded-2xl outline-none ring-white/0 transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50"
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={saleHeaderImage || '/Imagenes/caja.png'}
                                                        alt=""
                                                        className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-2 ring-white/45 shadow-lg"
                                                    />
                                                    <div className="min-w-0 flex-1 text-left">
                                                        <p className="truncate text-base font-extrabold tracking-tight drop-shadow-sm">{headerTitle}</p>
                                                        <p className="mt-0.5 text-xs font-medium text-white/85">Conversación ligada a una publicación de la tienda.</p>
                                                        <span className="mt-1 inline-block text-[0.7rem] font-bold uppercase tracking-wide text-white/90 underline decoration-white/50 underline-offset-2">
                                                            Ver publicación
                                                        </span>
                                                    </div>
                                                </Link>
                                            ) : headerPeerProfileHref ? (
                                                <Link
                                                    href={headerPeerProfileHref}
                                                    className="flex min-w-0 items-center gap-3 rounded-2xl outline-none ring-white/0 transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50"
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={storageUrl(headerPeer?.avatar_path)}
                                                        alt=""
                                                        className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-2 ring-white/45 shadow-lg"
                                                    />
                                                    <div className="min-w-0 flex-1 text-left">
                                                        <p className="truncate text-base font-extrabold tracking-tight drop-shadow-sm">{headerTitle}</p>
                                                        <p className="mt-0.5 text-xs font-medium text-white/85">Mensaje directo entre coleccionistas.</p>
                                                        <span className="mt-1 inline-block text-[0.7rem] font-bold uppercase tracking-wide text-white/90 underline decoration-white/50 underline-offset-2">
                                                            Ver perfil
                                                        </span>
                                                    </div>
                                                </Link>
                                            ) : (
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-2xl ring-2 ring-white/35">💬</div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-base font-extrabold drop-shadow-sm">{headerTitle}</p>
                                                        <p className="mt-0.5 text-xs font-medium text-white/85">Mensaje directo entre coleccionistas.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex min-h-0 flex-1 flex-col gap-0 px-4 pb-4 pt-3">
                                        <div
                                            ref={messagesScrollRef}
                                            className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200/80 bg-slate-100/70 p-3 pr-2 dark:border-slate-700/70 dark:bg-slate-950/35"
                                        >
                                {messages.map((m) => {
                                    const mine = Number(m.user_id) === Number(myId)
                                    return (
                                        <div
                                            key={m.id}
                                            ref={(el) => {
                                                if (el) messageRowRefs.current[String(m.id)] = el
                                                else delete messageRowRefs.current[String(m.id)]
                                            }}
                                            className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}
                                        >
                                            {!mine ? (
                                                m.user?.avatar_path ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={storageUrl(m.user.avatar_path)}
                                                        alt=""
                                                        className="h-7 w-7 shrink-0 self-end rounded-full border border-slate-200 object-cover dark:border-slate-700"
                                                    />
                                                ) : (
                                                    <div className="grid h-7 w-7 shrink-0 place-items-center self-end rounded-full border border-slate-200 bg-white text-[10px] dark:border-slate-700 dark:bg-slate-900">
                                                        👤
                                                    </div>
                                                )
                                            ) : null}
                                            <div
                                                className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                                                    mine
                                                        ? 'rounded-br-md bg-[var(--app-accent)] text-white'
                                                        : 'rounded-bl-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50'
                                                }`}
                                            >
                                                {!mine ? <p className="text-[0.68rem] font-bold text-slate-500 dark:text-slate-400">{m.user?.name}</p> : null}
                                                {m.body ? <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p> : null}
                                                {(m.attachments || []).map((att) => (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        key={att}
                                                        src={storageUrl(att)}
                                                        alt=""
                                                        onLoad={scrollToLatest}
                                                        className="mt-2 max-h-56 rounded-xl object-cover"
                                                    />
                                                ))}
                                                <div className={`mt-1 flex items-center gap-2 text-[0.65rem] ${mine ? 'text-white/80' : 'text-slate-400'}`}>
                                                    <p>{new Date(m.created_at).toLocaleString()}</p>
                                                    {mine ? (
                                                        <>
                                                            {editingMessageId === m.id ? null : deletingMessageId === m.id ? null : (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => startEditMessage(m.id, m.body)}
                                                                        className="font-bold underline underline-offset-2"
                                                                    >
                                                                        editar
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => startDeleteConfirm(m.id)}
                                                                        className="font-bold text-rose-200 underline underline-offset-2"
                                                                    >
                                                                        borrar
                                                                    </button>
                                                                </>
                                                            )}
                                                        </>
                                                    ) : null}
                                                </div>
                                                {mine && editingMessageId === m.id ? (
                                                    <div className="mt-2 space-y-2 rounded-xl bg-black/15 p-2">
                                                        <textarea
                                                            value={editingBody}
                                                            onChange={(e) => setEditingBody(e.target.value)}
                                                            rows={2}
                                                            className="w-full rounded-lg border border-white/35 bg-white/20 px-2 py-1.5 text-xs text-white placeholder:text-white/70"
                                                            placeholder="Editar mensaje"
                                                        />
                                                        <div className="flex justify-end gap-2 text-[0.68rem] font-bold">
                                                            <button
                                                                type="button"
                                                                onClick={cancelEditMessage}
                                                                className="rounded-md border border-white/50 px-2 py-1 text-white/90"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => saveEditMessage(m.id)}
                                                                className="rounded-md bg-white px-2 py-1 text-[var(--app-accent)]"
                                                            >
                                                                Guardar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : null}
                                                {mine && deletingMessageId === m.id ? (
                                                    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-rose-500/20 px-2 py-1.5 text-[0.68rem]">
                                                        <span>¿Eliminar este mensaje?</span>
                                                        <div className="flex gap-1.5 font-bold">
                                                            <button
                                                                type="button"
                                                                onClick={cancelDeleteConfirm}
                                                                className="rounded-md border border-white/45 px-2 py-1 text-white/90"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => confirmDeleteMessage(m.id)}
                                                                className="rounded-md bg-rose-100 px-2 py-1 text-rose-700"
                                                            >
                                                                Confirmar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    )
                                })}
                                            <div ref={messagesBottomRef} />
                                        </div>
                                        {chatError ? (
                                            <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                                                {chatError}
                                            </p>
                                        ) : null}
                                        {attachmentPreviews.length > 0 ? (
                                            <div className="mt-2 flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2 dark:border-slate-700/60 dark:bg-slate-900/40">
                                                {attachmentPreviews.map((item) => (
                                                    <div key={item.id} className="group relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={item.url} alt="" className="h-full w-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeAttachment(item.id)}
                                                            className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/65 text-[10px] font-black text-white opacity-95 transition hover:bg-black/80"
                                                            title="Quitar imagen"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                        <div className="mt-3 flex items-center gap-2">
                                            <input
                                                value={body}
                                                onChange={(e) => setBody(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                                                className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                                                placeholder="Escribe un mensaje"
                                            />
                                            <label
                                                className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[var(--app-accent)]/40 hover:bg-slate-50 hover:text-[var(--app-accent)] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                                                title={attachmentPreviews.length > 0 ? `${attachmentPreviews.length} imagen(es)` : 'Adjuntar imágenes'}
                                            >
                                                <IconClip className="h-5 w-5" />
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="sr-only"
                                                    onChange={(e) => {
                                                        appendAttachments(e.target.files)
                                                        e.target.value = ''
                                                    }}
                                                />
                                            </label>
                                            <button type="button" onClick={send} className="shrink-0 rounded-full bg-[var(--app-accent)] px-5 py-2.5 text-sm font-extrabold text-white">
                                                Enviar
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </PageFade>
    )
}
