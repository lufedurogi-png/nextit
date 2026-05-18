'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from '@/lib/axios'
import AmbientPostImage from '@/components/coleccionador/AmbientPostImage'
import PageFade from '@/components/coleccionador/PageFade'
import { storageUrl } from '@/lib/storageUrl'
import { useAuth } from '@/hooks/auth'
import { profileHref } from '@/lib/profileUrl'

const AUTO_MS = 5000
const SWIPE_MIN = 48
const parseOverlayToList = (raw) => {
    if (!raw) return []
    if (Array.isArray(raw)) {
        return raw
            .map((entry) => {
                if (entry && typeof entry === 'object') {
                    return {
                        text: String(entry.text ?? '').trim(),
                        x: Number.isFinite(Number(entry.x)) ? Number(entry.x) : 50,
                        y: Number.isFinite(Number(entry.y)) ? Number(entry.y) : 50,
                    }
                }
                return {
                    text: String(entry ?? '').trim(),
                    x: 50,
                    y: 50,
                }
            })
            .filter((item) => item.text)
    }
    const text = String(raw)
    try {
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) return parseOverlayToList(parsed)
    } catch {
        // Formato legado.
    }
    return text
        .split('\n')
        .map((t) => ({ text: t.trim(), x: 50, y: 50 }))
        .filter((item) => item.text)
}

export default function StoryViewPage() {
    const params = useParams()
    const router = useRouter()
    const { user } = useAuth({})
    const storyId = Number(params?.id || 0)
    const [story, setStory] = useState(null)
    const [siblings, setSiblings] = useState([])
    const [isOwner, setIsOwner] = useState(false)
    const [flatIds, setFlatIds] = useState([])
    const [replyText, setReplyText] = useState('')
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState('')
    const touchStartX = useRef(null)

    const loadPlaylist = useCallback(async () => {
        try {
            const { data } = await axios.get('/stories')
            const groups = Array.isArray(data) ? data : []
            const ids = []
            for (const g of groups) {
                for (const s of g.stories || []) {
                    if (s?.id) ids.push(Number(s.id))
                }
            }
            setFlatIds(ids)
        } catch {
            setFlatIds([])
        }
    }, [])

    const load = useCallback(async () => {
        if (!storyId) return
        try {
            const { data } = await axios.get(`/stories/${storyId}`)
            setStory(data?.story || null)
            setSiblings(Array.isArray(data?.siblings) ? data.siblings : [])
            setIsOwner(Boolean(data?.is_owner))
            setError('')
        } catch {
            setStory(null)
            setSiblings([])
            setError('La historia no existe o ya expiró.')
        }
    }, [storyId])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        loadPlaylist()
    }, [loadPlaylist])

    const currentIndex = useMemo(() => siblings.findIndex((s) => Number(s.id) === Number(story?.id)), [siblings, story?.id])
    const prevSiblingId = currentIndex > 0 ? siblings[currentIndex - 1]?.id : null
    const nextSiblingId = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1]?.id : null

    const { prevId, nextId } = useMemo(() => {
        const cur = Number(story?.id)
        if (!cur) return { prevId: null, nextId: null }
        if (flatIds.length) {
            const i = flatIds.indexOf(cur)
            if (i >= 0) {
                return {
                    prevId: i > 0 ? flatIds[i - 1] : null,
                    nextId: i < flatIds.length - 1 ? flatIds[i + 1] : null,
                }
            }
        }
        return { prevId: prevSiblingId || null, nextId: nextSiblingId || null }
    }, [story?.id, flatIds, prevSiblingId, nextSiblingId])
    const overlayTexts = useMemo(() => parseOverlayToList(story?.text_overlay), [story?.text_overlay])

    const goTo = useCallback(async (id) => {
        if (!id) return
        try {
            const { data } = await axios.get(`/stories/${id}`)
            setStory(data?.story || null)
            setSiblings(Array.isArray(data?.siblings) ? data.siblings : [])
            setIsOwner(Boolean(data?.is_owner))
            setConfirmDelete(false)
            router.replace(`/historias/${id}`)
        } catch {
            // ignorar
        }
    }, [router])

    useEffect(() => {
        if (!story?.id || !nextId) return undefined
        const t = window.setInterval(() => {
            goTo(nextId)
        }, AUTO_MS)
        return () => window.clearInterval(t)
    }, [story?.id, nextId, goTo])

    const sendReply = async () => {
        const text = replyText.trim()
        if (!text || !story?.user?.id || Number(story.user.id) === Number(user?.id)) return
        try {
            const { data } = await axios.post('/chats/direct', { user_id: story.user.id })
            const chatId = data?.id
            if (!chatId) return
            await axios.post(`/chats/${chatId}/messages`, { body: `Respuesta a tu historia: ${text}` })
            setReplyText('')
        } catch {
            // ignorar
        }
    }

    const deleteStory = async () => {
        if (!story?.id) return
        setDeleting(true)
        try {
            await axios.delete(`/stories/${story.id}`)
            const remaining = siblings.filter((s) => Number(s.id) !== Number(story.id))
            if (remaining.length === 0) {
                window.location.href = '/inicio'
                return
            }
            await goTo(remaining[0].id)
            await loadPlaylist()
        } catch {
            // ignorar
        } finally {
            setDeleting(false)
        }
    }

    const onTouchStart = (e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null
    }

    const onTouchEnd = (e) => {
        const start = touchStartX.current
        touchStartX.current = null
        if (start == null) return
        const end = e.changedTouches[0]?.clientX
        if (end == null) return
        const dx = end - start
        if (dx > SWIPE_MIN && prevId) goTo(prevId)
        else if (dx < -SWIPE_MIN && nextId) goTo(nextId)
    }

    if (!story) {
        return (
            <PageFade>
                <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-slate-500">{error || 'Cargando historia…'}</div>
            </PageFade>
        )
    }

    return (
        <PageFade>
            <div className="relative mx-auto w-full max-w-6xl px-4 pb-14 pt-4">
                <div
                    className="relative touch-pan-y overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                >
                    <AmbientPostImage
                        src={storageUrl(story.image_path)}
                        containerClassName="h-[82vh]"
                        innerClassName="h-full min-h-[82vh] w-full"
                        foregroundClassName="max-h-[82vh] w-full object-contain"
                    />
                    <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/75 via-transparent to-black/40" />

                    <button
                        type="button"
                        aria-label="Historia anterior"
                        onClick={() => goTo(prevId)}
                        disabled={!prevId}
                        className="absolute left-1 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/55 disabled:opacity-25 sm:left-2 sm:h-16 sm:w-16 md:h-[4.5rem] md:w-[4.5rem]"
                    >
                        <span className="text-2xl font-black leading-none sm:text-3xl" aria-hidden>
                            ‹
                        </span>
                    </button>
                    <button
                        type="button"
                        aria-label="Historia siguiente"
                        onClick={() => goTo(nextId)}
                        disabled={!nextId}
                        className="absolute right-1 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/55 disabled:opacity-25 sm:right-2 sm:h-16 sm:w-16 md:h-[4.5rem] md:w-[4.5rem]"
                    >
                        <span className="text-2xl font-black leading-none sm:text-3xl" aria-hidden>
                            ›
                        </span>
                    </button>

                    <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
                        <Link href={profileHref({ id: story.user?.id, name: story.user?.name, currentUserId: user?.id })} className="flex items-center gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={storageUrl(story.user?.avatar_path)} alt="" className="h-9 w-9 rounded-full border border-white/80 object-cover" />
                            <div className="text-left">
                                <p className="text-sm font-bold text-white">{story.user?.name}</p>
                                <p className="text-[11px] text-white/80">{new Date(story.created_at).toLocaleString()}</p>
                            </div>
                        </Link>
                        <div className="flex items-center gap-2">
                            {isOwner ? (
                                <>
                                    <Link
                                        href={`/historias/nueva?edit=${story.id}`}
                                        className="rounded-full bg-black/35 px-3 py-1.5 text-xs font-bold text-white"
                                    >
                                        Editar
                                    </Link>
                                    {confirmDelete ? (
                                        <>
                                            <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-full bg-black/35 px-2 py-1 text-xs font-bold text-white">
                                                Cancelar
                                            </button>
                                            <button type="button" onClick={deleteStory} disabled={deleting} className="rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white disabled:opacity-60">
                                                {deleting ? 'Eliminando…' : 'Confirmar'}
                                            </button>
                                        </>
                                    ) : (
                                        <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-full bg-red-600/90 px-2 py-1 text-xs font-bold text-white">
                                            Eliminar
                                        </button>
                                    )}
                                </>
                            ) : null}
                            <Link href="/inicio" className="rounded-full bg-black/35 px-2 py-1 text-xs font-bold text-white">
                                Cerrar
                            </Link>
                        </div>
                    </div>

                    {overlayTexts.length ? (
                        <div className="pointer-events-none absolute inset-0 px-4">
                            {overlayTexts.map((item, idx) => (
                                <p
                                    key={idx}
                                    style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%, -50%)' }}
                                    className="absolute max-w-[75%] rounded-lg bg-black/35 px-3 py-2 text-center text-sm font-semibold text-white"
                                >
                                    {item.text}
                                </p>
                            ))}
                        </div>
                    ) : null}

                    <div className="absolute bottom-3 left-3 right-3 space-y-2 pr-2 pl-2 sm:pr-4 sm:pl-4">
                        {!isOwner ? (
                            <div className="flex gap-2">
                                <input
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') sendReply()
                                    }}
                                    placeholder="Responder historia..."
                                    className="flex-1 rounded-full border border-white/35 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/75"
                                />
                                <button type="button" onClick={sendReply} className="rounded-full bg-[var(--app-accent)] px-4 py-2 text-xs font-extrabold text-white">
                                    Enviar
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </PageFade>
    )
}
