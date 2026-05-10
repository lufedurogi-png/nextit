'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import axios from '@/lib/axios'
import { storageUrl } from '@/lib/storageUrl'
import { profileHref } from '@/lib/profileUrl'
import { buildFeedPostShareUrl, shareNativeOrClipboard } from '@/lib/sharePost'
import { emitVikuChanSignal } from '@/lib/vikuChanSignals'
import ReactionLikeIcon from '@/components/coleccionador/ReactionLikeIcon'
import ShareLinkIcon from '@/components/coleccionador/ShareLinkIcon'

function formatFeedDate(iso) {
    if (!iso) return ''
    try {
        return new Date(iso).toLocaleString('es-MX', {
            dateStyle: 'short',
            timeStyle: 'short',
        })
    } catch {
        return ''
    }
}

function displayBody(body) {
    return (body || '').trim()
}

function cloneCommentTree(comments) {
    if (!Array.isArray(comments)) return []
    return comments.map((c) => ({
        ...c,
        replies: cloneCommentTree(c.replies || []),
    }))
}

/** Combina la publicación local con la respuesta JSON del PATCH /feed/:id (sin perder comentarios si el API no los devuelve). */
function mergeFeedPostFromApi(prev, apiNext) {
    if (!apiNext || typeof apiNext !== 'object') return prev
    return {
        ...prev,
        ...apiNext,
        user: apiNext.user ?? prev.user,
        parent: apiNext.parent ?? prev.parent,
        comments: apiNext.comments != null ? apiNext.comments : prev.comments,
        images: apiNext.images != null ? apiNext.images : prev.images,
        body: apiNext.body != null ? apiNext.body : prev.body,
        edited_at: apiNext.edited_at ?? prev.edited_at,
        likes_count: apiNext.likes_count ?? prev.likes_count,
        dislikes_count: apiNext.dislikes_count ?? prev.dislikes_count,
    }
}

function countCommentsInTree(nodes) {
    if (!Array.isArray(nodes)) return 0
    return nodes.reduce((acc, n) => acc + 1 + countCommentsInTree(n.replies || []), 0)
}

/** Solo respuestas bajo un comentario (sin contar el propio nodo). */
function countRepliesInSubtree(nodes) {
    if (!Array.isArray(nodes)) return 0
    return nodes.reduce((acc, n) => acc + 1 + countRepliesInSubtree(n.replies || []), 0)
}

function addCommentToLocalTree(tree, parentId, newComment) {
    const node = { ...newComment, replies: Array.isArray(newComment.replies) ? newComment.replies : [] }
    if (parentId == null) return [...tree, node]
    return tree.map((n) => {
        if (Number(n.id) === Number(parentId)) {
            return { ...n, replies: [...(n.replies || []), node] }
        }
        if (n.replies?.length) {
            return { ...n, replies: addCommentToLocalTree(n.replies, parentId, newComment) }
        }
        return n
    })
}

function updateCommentInTree(tree, updated) {
    return tree.map((n) => {
        if (Number(n.id) === Number(updated.id)) {
            return { ...n, ...updated, replies: n.replies || [] }
        }
        if (n.replies?.length) {
            return { ...n, replies: updateCommentInTree(n.replies, updated) }
        }
        return n
    })
}

function removeCommentFromTree(tree, targetId) {
    return tree
        .filter((n) => Number(n.id) !== Number(targetId))
        .map((n) => ({
            ...n,
            replies: removeCommentFromTree(n.replies || [], targetId),
        }))
}

const FEED_MODAL_BACKDROP =
    'fixed inset-0 z-[200] flex items-end justify-center bg-transparent p-0 md:items-center md:justify-center md:pl-72 md:pr-6 md:py-6'

const THREAD_MODAL_BACKDROP =
    'fixed inset-0 z-[210] flex items-end justify-center bg-transparent p-0 md:items-center md:justify-center md:pl-72 md:pr-6 md:py-6'

function findCommentByIdInForest(tree, id) {
    if (!Array.isArray(tree) || id == null) return null
    for (const n of tree) {
        if (Number(n.id) === Number(id)) return n
        const inner = findCommentByIdInForest(n.replies || [], id)
        if (inner) return inner
    }
    return null
}

/** Respuestas en orden cronológico, sin anidar visualmente (etiqueta "En respuesta a…"). */
function flattenDescendantsSorted(replies, threadRootAuthorName) {
    const rows = []
    const walk = (nodes, inReplyTo) => {
        if (!Array.isArray(nodes)) return
        for (const n of nodes) {
            rows.push({ c: n, inReplyTo })
            walk(n.replies || [], n.user?.name || 'Usuario')
        }
    }
    walk(replies || [], threadRootAuthorName ?? null)
    rows.sort((a, b) => new Date(a.c.created_at) - new Date(b.c.created_at))
    return rows
}

function IconDotsVertical({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 8a2 2 0 100-4 2 2 0 000 4zm0 2a2 2 0 110 4 2 2 0 010-4zm0 6a2 2 0 110 4 2 2 0 010-4z" />
        </svg>
    )
}

function IconPencil({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function IconTrash({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function IconClose({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
    )
}

function IconChat({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M21 15a4 4 0 01-4 4H8l-5 4V7a4 4 0 014-4h10a4 4 0 014 4v8z" strokeLinejoin="round" />
        </svg>
    )
}

function IconArrowLeft({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function ProfileFeedComment({
    c,
    currentUserId,
    editingCommentId,
    editingCommentBody,
    setEditingCommentBody,
    editingKeptPaths,
    setEditingKeptPaths,
    editingNewEntries,
    onAppendEditingNewFiles,
    onRemoveEditingNewEntry,
    commentFileRef,
    reactionOverrides,
    variant,
    replyCount = 0,
    inReplyToLabel,
    onOpenThread,
    onThreadReply,
    onReact,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onDelete,
}) {
    const mine = Number(c.user_id) === Number(currentUserId)
    const isEditing = editingCommentId === c.id
    const ov = reactionOverrides?.[c.id]
    const likeN = ov?.likes ?? c.likes_count ?? 0
    const dislikeN = ov?.dislikes ?? c.dislikes_count ?? 0
    const isMain = variant === 'main'

    return (
        <div>
            <div
                className={`rounded-2xl border px-3 py-2.5 ${
                    isMain
                        ? 'border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900/70'
                        : 'border-slate-100 bg-slate-50/90 dark:border-slate-700/80 dark:bg-slate-900/50'
                }`}
            >
                {inReplyToLabel ? (
                    <p className="mb-1.5 text-[0.65rem] font-semibold text-indigo-600 dark:text-indigo-400">
                        En respuesta a <span className="font-bold">{inReplyToLabel}</span>
                    </p>
                ) : null}
                <div className="flex gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={storageUrl(c.user?.avatar_path)}
                        alt=""
                        className="mt-0.5 h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-600"
                    />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-50">{c.user?.name || 'Usuario'}</span>
                            <span className="text-[0.7rem] text-slate-500 dark:text-slate-400">
                                {formatFeedDate(c.created_at)}
                                {c.edited_at ? ' · editado' : ''}
                            </span>
                        </div>
                        {isEditing ? (
                            <div className="mt-2 space-y-2">
                                <textarea
                                    value={editingCommentBody}
                                    onChange={(e) => setEditingCommentBody(e.target.value)}
                                    rows={3}
                                    maxLength={3000}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-50"
                                />
                                {editingKeptPaths.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {editingKeptPaths.map((path, i) => (
                                            <div key={path + i} className="group relative">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={storageUrl(path)} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-600" />
                                                <button
                                                    type="button"
                                                    title="Quitar imagen"
                                                    onClick={() => setEditingKeptPaths((prev) => prev.filter((p) => p !== path))}
                                                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                                <div className="flex flex-wrap items-center gap-2">
                                    <input
                                        ref={commentFileRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="max-w-full text-[0.7rem] file:mr-2 file:rounded-lg file:border-0 file:bg-slate-200 file:px-2 file:py-1 file:text-[0.65rem] file:font-bold dark:file:bg-slate-700"
                                        onChange={(e) => {
                                            onAppendEditingNewFiles(e.target.files)
                                            const input = e.target
                                            window.queueMicrotask(() => {
                                                input.value = ''
                                            })
                                        }}
                                    />
                                    {editingNewEntries.length > 0 ? (
                                        <span className="text-[0.65rem] text-slate-500">+{editingNewEntries.length} nueva(s)</span>
                                    ) : null}
                                </div>
                                {editingNewEntries.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {editingNewEntries.map((e) => (
                                            <div key={e.id} className="relative">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={e.previewUrl}
                                                    alt=""
                                                    className="h-16 w-16 rounded-lg border border-slate-200 bg-white object-contain dark:border-slate-600 dark:bg-slate-950"
                                                />
                                                <button
                                                    type="button"
                                                    title="Quitar imagen nueva"
                                                    onClick={() => onRemoveEditingNewEntry(e.id)}
                                                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] font-bold text-white shadow"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={onSaveEdit}
                                        className="rounded-lg bg-[var(--app-accent)] px-3 py-1.5 text-xs font-bold text-white"
                                    >
                                        Guardar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onCancelEdit}
                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-600"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {displayBody(c.body) ? (
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">{displayBody(c.body)}</p>
                                ) : null}
                                {Array.isArray(c.images) && c.images.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {c.images.map((path, i) => (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                key={i}
                                                src={storageUrl(path)}
                                                alt=""
                                                className="h-24 max-w-[140px] rounded-lg border border-slate-200 bg-white object-contain dark:border-slate-700 dark:bg-slate-950"
                                            />
                                        ))}
                                    </div>
                                ) : null}
                            </>
                        )}
                        {!isEditing ? (
                            <div className="mt-2 flex min-h-[36px] flex-wrap items-stretch divide-x divide-slate-200 rounded-lg border border-slate-100 bg-slate-50/80 dark:divide-slate-600 dark:border-slate-700/80 dark:bg-slate-900/40">
                                <button
                                    type="button"
                                    onClick={() => onReact(c.id, 'like')}
                                    className="inline-flex flex-1 items-center justify-center gap-1 px-2 py-1.5 text-[0.7rem] font-bold text-emerald-700 transition hover:bg-white/80 dark:text-emerald-400 dark:hover:bg-slate-800/80"
                                >
                                    <ReactionLikeIcon className="h-3.5 w-3.5" />
                                    <span className="tabular-nums">{likeN}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onReact(c.id, 'dislike')}
                                    className="inline-flex flex-1 items-center justify-center gap-1 px-2 py-1.5 text-[0.7rem] font-bold text-slate-600 transition hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-800/80"
                                >
                                    <ReactionLikeIcon flipped className="h-3.5 w-3.5" />
                                    <span className="tabular-nums">{dislikeN}</span>
                                </button>
                                {isMain && replyCount > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => onOpenThread?.(c)}
                                        className="inline-flex flex-1 items-center justify-center px-2 py-1.5 text-[0.7rem] font-bold text-slate-700 transition hover:bg-white/80 dark:text-slate-200 dark:hover:bg-slate-800/80"
                                    >
                                        Respuestas ({replyCount})
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={() =>
                                        isMain ? onOpenThread?.(c) : onThreadReply?.(c.id, c.user?.name || 'Usuario')
                                    }
                                    className="inline-flex flex-1 items-center justify-center px-2 py-1.5 text-[0.7rem] font-bold text-[var(--app-accent)] transition hover:bg-white/80 dark:hover:bg-slate-800/80"
                                >
                                    Responder
                                </button>
                                {mine ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => onStartEdit(c)}
                                            className="inline-flex flex-1 items-center justify-center gap-0.5 px-2 py-1.5 text-[0.7rem] font-bold text-slate-600 transition hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-800/80"
                                        >
                                            <IconPencil className="h-3.5 w-3.5" />
                                            Editar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onDelete(c.id)}
                                            className="inline-flex flex-1 items-center justify-center gap-0.5 px-2 py-1.5 text-[0.7rem] font-bold text-red-600 transition hover:bg-red-50/80 dark:text-red-400 dark:hover:bg-red-950/20"
                                        >
                                            <IconTrash className="h-3.5 w-3.5" />
                                            Eliminar
                                        </button>
                                    </>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function ProfileFeedPost({ post, currentUserId, onRefresh, onSharePost }) {
    const [localPost, setLocalPost] = useState(() => ({ ...post }))
    const [activePostImageIndex, setActivePostImageIndex] = useState(0)
    const [postMenuOpen, setPostMenuOpen] = useState(false)
    const [postDeleteConfirmOpen, setPostDeleteConfirmOpen] = useState(false)
    const [editPostModalOpen, setEditPostModalOpen] = useState(false)
    const [editPostBody, setEditPostBody] = useState('')
    const [editPostKeptImages, setEditPostKeptImages] = useState([])
    /** Archivos nuevos con URL de vista previa estable (no revocar en cada render). */
    const [editPostNewEntries, setEditPostNewEntries] = useState([])
    const [commentsModalOpen, setCommentsModalOpen] = useState(false)
    const [commentText, setCommentText] = useState('')
    const [commentFileEntries, setCommentFileEntries] = useState([])
    const [threadModalOpen, setThreadModalOpen] = useState(false)
    const [threadRootId, setThreadRootId] = useState(null)
    const [threadReplyParentId, setThreadReplyParentId] = useState(null)
    const [threadReplyToName, setThreadReplyToName] = useState(null)
    const [threadText, setThreadText] = useState('')
    const [threadFileEntries, setThreadFileEntries] = useState([])
    const [editingCommentId, setEditingCommentId] = useState(null)
    const [editingCommentBody, setEditingCommentBody] = useState('')
    const [editingKeptPaths, setEditingKeptPaths] = useState([])
    const [editingNewEntries, setEditingNewEntries] = useState([])
    const [likesCount, setLikesCount] = useState(post.likes_count ?? 0)
    const [dislikesCount, setDislikesCount] = useState(post.dislikes_count ?? 0)
    const [commentReactionOverrides, setCommentReactionOverrides] = useState({})
    const [localComments, setLocalComments] = useState(() => cloneCommentTree(post.comments))

    const commentFileRef = useRef(null)
    const editPostNewInputRef = useRef(null)
    const modalCommentFileRef = useRef(null)
    const threadModalFileRef = useRef(null)
    const commentsListRef = useRef(null)
    const threadListRef = useRef(null)
    const postMenuRef = useRef(null)

    const threadRootComment = useMemo(
        () => (threadRootId != null ? findCommentByIdInForest(localComments, threadRootId) : null),
        [localComments, threadRootId]
    )

    const threadFlatRows = useMemo(() => {
        if (!threadRootComment) return []
        const name = threadRootComment.user?.name || 'Usuario'
        return flattenDescendantsSorted(threadRootComment.replies, name)
    }, [threadRootComment])

    useEffect(() => {
        if (!threadModalOpen) return
        const t = window.setTimeout(() => {
            threadListRef.current?.scrollTo({ top: threadListRef.current.scrollHeight, behavior: 'smooth' })
        }, 80)
        return () => window.clearTimeout(t)
    }, [threadModalOpen, localComments, threadFlatRows.length])

    const isPostAuthor = Number(post.user_id) === Number(currentUserId)

    useEffect(() => {
        setLocalPost({ ...post })
        // Solo al cambiar de publicación en la lista; si dependemos de `post` entero, el padre puede pasar otra referencia con datos viejos y borraría un guardado local reciente.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [post.id])

    useEffect(() => {
        setEditPostBody(displayBody(localPost.body))
    }, [localPost.id, localPost.body])

    useEffect(() => {
        setLikesCount(localPost.likes_count ?? 0)
        setDislikesCount(localPost.dislikes_count ?? 0)
    }, [localPost.id, localPost.likes_count, localPost.dislikes_count])

    useEffect(() => {
        setCommentReactionOverrides({})
    }, [post.id])

    useEffect(() => {
        setLocalComments(cloneCommentTree(post.comments))
    }, [post.id, post.comments])

    useEffect(() => {
        const totalImages = Array.isArray(localPost.images) ? localPost.images.length : 0
        if (totalImages === 0) {
            setActivePostImageIndex(0)
            return
        }
        setActivePostImageIndex((prev) => Math.min(prev, totalImages - 1))
    }, [localPost.images])

    useEffect(() => {
        const closeIfOutside = (e) => {
            if (!postMenuRef.current?.contains(e.target)) {
                setPostMenuOpen(false)
                setPostDeleteConfirmOpen(false)
            }
        }
        if (postMenuOpen) {
            document.addEventListener('mousedown', closeIfOutside)
            document.addEventListener('touchstart', closeIfOutside, { passive: true })
        }
        return () => {
            document.removeEventListener('mousedown', closeIfOutside)
            document.removeEventListener('touchstart', closeIfOutside)
        }
    }, [postMenuOpen])

    useEffect(() => {
        if (!commentsModalOpen && !editPostModalOpen && !threadModalOpen) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [commentsModalOpen, editPostModalOpen, threadModalOpen])

    useEffect(() => {
        if (!commentsModalOpen) return
        const t = window.setTimeout(() => {
            commentsListRef.current?.scrollTo({ top: commentsListRef.current.scrollHeight, behavior: 'smooth' })
        }, 80)
        return () => window.clearTimeout(t)
    }, [commentsModalOpen, localComments])

    useEffect(() => {
        if (!threadModalOpen || !threadRootId) return
        if (threadRootComment) return
        setThreadModalOpen(false)
        setThreadRootId(null)
        setThreadReplyParentId(null)
        setThreadReplyToName(null)
        setThreadText('')
        setThreadFileEntries((prev) => {
            prev.forEach((e) => URL.revokeObjectURL(e.previewUrl))
            return []
        })
    }, [threadModalOpen, threadRootId, threadRootComment])

    const clearThreadReply = useCallback(() => {
        setThreadReplyParentId(null)
        setThreadReplyToName(null)
    }, [])

    const toFileEntries = useCallback((fileList) => {
        const list = Array.from(fileList || []).filter((f) => f instanceof File && f.size > 0)
        if (list.length === 0) return []
        return list.map((file) => ({
            id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            file,
            previewUrl: URL.createObjectURL(file),
        }))
    }, [])

    const clearCommentFileEntries = useCallback(() => {
        setCommentFileEntries((prev) => {
            prev.forEach((e) => URL.revokeObjectURL(e.previewUrl))
            return []
        })
    }, [])

    const appendCommentFiles = useCallback(
        (fileList) => {
            const entries = toFileEntries(fileList)
            if (entries.length === 0) return
            setCommentFileEntries((prev) => [...prev, ...entries])
        },
        [toFileEntries]
    )

    const removeCommentFileEntry = useCallback((id) => {
        setCommentFileEntries((prev) => {
            const found = prev.find((x) => x.id === id)
            if (found) URL.revokeObjectURL(found.previewUrl)
            return prev.filter((x) => x.id !== id)
        })
    }, [])

    const clearThreadFileEntries = useCallback(() => {
        setThreadFileEntries((prev) => {
            prev.forEach((e) => URL.revokeObjectURL(e.previewUrl))
            return []
        })
    }, [])

    const appendThreadFiles = useCallback(
        (fileList) => {
            const entries = toFileEntries(fileList)
            if (entries.length === 0) return
            setThreadFileEntries((prev) => [...prev, ...entries])
        },
        [toFileEntries]
    )

    const removeThreadFileEntry = useCallback((id) => {
        setThreadFileEntries((prev) => {
            const found = prev.find((x) => x.id === id)
            if (found) URL.revokeObjectURL(found.previewUrl)
            return prev.filter((x) => x.id !== id)
        })
    }, [])

    const clearEditingNewEntries = useCallback(() => {
        setEditingNewEntries((prev) => {
            prev.forEach((e) => URL.revokeObjectURL(e.previewUrl))
            return []
        })
    }, [])

    const appendEditingNewFiles = useCallback(
        (fileList) => {
            const entries = toFileEntries(fileList)
            if (entries.length === 0) return
            setEditingNewEntries((prev) => [...prev, ...entries])
        },
        [toFileEntries]
    )

    const removeEditingNewEntry = useCallback((id) => {
        setEditingNewEntries((prev) => {
            const found = prev.find((x) => x.id === id)
            if (found) URL.revokeObjectURL(found.previewUrl)
            return prev.filter((x) => x.id !== id)
        })
    }, [])

    const closeThreadModal = useCallback(() => {
        setThreadModalOpen(false)
        setThreadRootId(null)
        setThreadReplyParentId(null)
        setThreadReplyToName(null)
        setThreadText('')
        clearThreadFileEntries()
        if (threadModalFileRef.current) threadModalFileRef.current.value = ''
    }, [clearThreadFileEntries])

    const openThreadModal = useCallback((c) => {
        if (!c?.id) return
        setThreadRootId(c.id)
        setThreadReplyParentId(null)
        setThreadReplyToName(null)
        setThreadText('')
        clearThreadFileEntries()
        if (threadModalFileRef.current) threadModalFileRef.current.value = ''
        setThreadModalOpen(true)
    }, [clearThreadFileEntries])

    const closeCommentsModal = useCallback(() => {
        setCommentsModalOpen(false)
        clearCommentFileEntries()
        if (modalCommentFileRef.current) modalCommentFileRef.current.value = ''
        closeThreadModal()
    }, [clearCommentFileEntries, closeThreadModal])

    const clearEditNewEntries = useCallback(() => {
        setEditPostNewEntries((prev) => {
            prev.forEach((e) => URL.revokeObjectURL(e.previewUrl))
            return []
        })
    }, [])

    const removeEditNewEntry = useCallback((id) => {
        setEditPostNewEntries((prev) => {
            const found = prev.find((x) => x.id === id)
            if (found) URL.revokeObjectURL(found.previewUrl)
            return prev.filter((x) => x.id !== id)
        })
    }, [])

    const appendEditNewFiles = useCallback((fileList) => {
        const list = Array.from(fileList || []).filter((f) => f instanceof File && f.size > 0)
        if (list.length === 0) return
        setEditPostNewEntries((prev) => [
            ...prev,
            ...list.map((file) => ({
                id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                file,
                previewUrl: URL.createObjectURL(file),
            })),
        ])
    }, [])

    useEffect(
        () => () => {
            clearCommentFileEntries()
            clearThreadFileEntries()
            clearEditingNewEntries()
            clearEditNewEntries()
        },
        [clearCommentFileEntries, clearThreadFileEntries, clearEditingNewEntries, clearEditNewEntries]
    )

    useEffect(() => {
        if (!commentsModalOpen && !editPostModalOpen && !threadModalOpen) return
        const onKey = (e) => {
            if (e.key !== 'Escape') return
            if (threadModalOpen) {
                closeThreadModal()
                return
            }
            clearEditNewEntries()
            setEditPostModalOpen(false)
            closeCommentsModal()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [commentsModalOpen, editPostModalOpen, threadModalOpen, closeCommentsModal, closeThreadModal, clearEditNewEntries])

    const openEditPostModal = () => {
        clearEditNewEntries()
        setEditPostBody(displayBody(localPost.body))
        setEditPostKeptImages([...(localPost.images || [])])
        if (editPostNewInputRef.current) editPostNewInputRef.current.value = ''
        setEditPostModalOpen(true)
        setPostMenuOpen(false)
        setPostDeleteConfirmOpen(false)
    }

    const savePostEdit = async () => {
        const b = editPostBody.trim()
        if (!b && editPostKeptImages.length === 0 && editPostNewEntries.length === 0) return
        try {
            const { data: d1 } = await axios.patch(`/feed/${post.id}`, {
                body: b || ' ',
                images: editPostKeptImages,
            })
            let merged = mergeFeedPostFromApi(localPost, d1)
            if (editPostNewEntries.length > 0) {
                const fd = new FormData()
                fd.append('_method', 'PATCH')
                if (b) fd.append('body', b)
                editPostNewEntries.forEach((e) => fd.append('images[]', e.file))
                const { data: d2 } = await axios.post(`/feed/${post.id}`, fd)
                merged = mergeFeedPostFromApi(merged, d2)
            }
            setLocalPost(merged)
            clearEditNewEntries()
            setEditPostModalOpen(false)
            setEditPostKeptImages(Array.isArray(merged.images) ? [...merged.images] : [])
            if (editPostNewInputRef.current) editPostNewInputRef.current.value = ''
        } catch {
            // ignorar
        }
    }

    const deletePost = async () => {
        setPostDeleteConfirmOpen(false)
        setPostMenuOpen(false)
        try {
            await axios.delete(`/feed/${post.id}`)
            await onRefresh()
        } catch {
            // ignorar
        }
    }

    const reactPost = async (reaction) => {
        try {
            const { data } = await axios.post(`/feed/${post.id}/react`, { reaction })
            if (typeof data?.likes_count === 'number') setLikesCount(data.likes_count)
            if (typeof data?.dislikes_count === 'number') setDislikesCount(data.dislikes_count)
            if (reaction === 'like') emitVikuChanSignal('like')
        } catch {
            // ignorar
        }
    }

    const handleSharePost = useCallback(() => {
        if (typeof onSharePost === 'function') {
            onSharePost()
            emitVikuChanSignal('share')
            return
        }
        void shareNativeOrClipboard(buildFeedPostShareUrl(localPost.id))
        emitVikuChanSignal('share')
    }, [onSharePost, localPost.id])

    const reactComment = async (commentId, reaction) => {
        try {
            const { data } = await axios.post(`/feed/comments/${commentId}/react`, { reaction })
            if (typeof data?.likes_count === 'number' && typeof data?.dislikes_count === 'number') {
                setCommentReactionOverrides((prev) => ({
                    ...prev,
                    [commentId]: { likes: data.likes_count, dislikes: data.dislikes_count },
                }))
            }
            if (reaction === 'like') emitVikuChanSignal('like')
        } catch {
            // ignorar
        }
    }

    const submitComment = async () => {
        const t = commentText.trim()
        if (!t && commentFileEntries.length === 0) return
        const fd = new FormData()
        if (t) fd.append('body', t)
        commentFileEntries.forEach((e) => fd.append('images[]', e.file))
        try {
            const { data } = await axios.post(`/feed/${post.id}/comments`, fd)
            if (data?.id) {
                setLocalComments((prev) => addCommentToLocalTree(prev, null, data))
                emitVikuChanSignal('compose')
            }
            setCommentText('')
            clearCommentFileEntries()
            if (modalCommentFileRef.current) modalCommentFileRef.current.value = ''
            window.setTimeout(() => {
                commentsListRef.current?.scrollTo({ top: commentsListRef.current.scrollHeight, behavior: 'smooth' })
            }, 50)
        } catch {
            // ignorar
        }
    }

    const submitThreadComment = async () => {
        if (threadRootId == null) return
        const t = threadText.trim()
        if (!t && threadFileEntries.length === 0) return
        const parentId = threadReplyParentId ?? threadRootId
        const fd = new FormData()
        if (t) fd.append('body', t)
        threadFileEntries.forEach((e) => fd.append('images[]', e.file))
        fd.append('parent_comment_id', String(parentId))
        try {
            const { data } = await axios.post(`/feed/${post.id}/comments`, fd)
            if (data?.id) {
                setLocalComments((prev) => addCommentToLocalTree(prev, parentId, data))
                emitVikuChanSignal('compose')
            }
            setThreadText('')
            clearThreadFileEntries()
            clearThreadReply()
            if (threadModalFileRef.current) threadModalFileRef.current.value = ''
            window.setTimeout(() => {
                threadListRef.current?.scrollTo({ top: threadListRef.current.scrollHeight, behavior: 'smooth' })
            }, 50)
        } catch {
            // ignorar
        }
    }

    const startEditComment = (c) => {
        setEditingCommentId(c.id)
        setEditingCommentBody(displayBody(c.body))
        setEditingKeptPaths([...(c.images || [])])
        clearEditingNewEntries()
    }

    const cancelCommentEdit = () => {
        setEditingCommentId(null)
        setEditingCommentBody('')
        setEditingKeptPaths([])
        clearEditingNewEntries()
        if (commentFileRef.current) commentFileRef.current.value = ''
    }

    const saveCommentEdit = async () => {
        if (!editingCommentId) return
        const b = editingCommentBody.trim()
        if (!b && editingKeptPaths.length === 0 && editingNewEntries.length === 0) return
        try {
            const { data: d1 } = await axios.patch(`/feed/comments/${editingCommentId}`, {
                body: b || ' ',
                images: editingKeptPaths,
            })
            let updated = d1
            if (editingNewEntries.length > 0) {
                const fd = new FormData()
                fd.append('_method', 'PATCH')
                if (b) fd.append('body', b)
                editingNewEntries.forEach((e) => fd.append('images[]', e.file))
                const { data: d2 } = await axios.post(`/feed/comments/${editingCommentId}`, fd)
                updated = d2
            }
            if (updated?.id) {
                setLocalComments((prev) => updateCommentInTree(prev, updated))
            }
            cancelCommentEdit()
        } catch {
            // ignorar
        }
    }

    const deleteComment = async (commentId) => {
        if (!window.confirm('¿Eliminar este comentario y sus respuestas?')) return
        try {
            await axios.delete(`/feed/comments/${commentId}`)
            if (editingCommentId === commentId) cancelCommentEdit()
            setLocalComments((prev) => removeCommentFromTree(prev, commentId))
            setCommentReactionOverrides((prev) => {
                const next = { ...prev }
                delete next[commentId]
                return next
            })
        } catch {
            // ignorar
        }
    }

    const textContent = displayBody(localPost.body)
    const commentCount = countCommentsInTree(localComments)
    const postImages = Array.isArray(localPost.images) ? localPost.images : []
    const activePostImagePath = postImages[Math.min(activePostImageIndex, Math.max(postImages.length - 1, 0))]
    const authorHref = profileHref({ id: localPost.user_id, name: localPost.user?.name, currentUserId })

    const actionCell =
        'flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-1 px-1 py-2.5 text-slate-700 transition-colors duration-150 hover:bg-slate-100/90 active:bg-slate-200/60 sm:flex-row sm:gap-1.5 sm:px-2 dark:text-slate-200 dark:hover:bg-white/[0.06] dark:active:bg-white/[0.1]'

    return (
        <article className="relative z-[1] isolate overflow-hidden rounded-3xl border border-slate-200/70 bg-white text-[15px] shadow-md shadow-slate-200/50 ring-1 ring-slate-900/[0.03] transition-shadow duration-200 hover:shadow-lg hover:shadow-slate-200/60 pointer-events-auto dark:border-slate-700/50 dark:bg-slate-900/95 dark:shadow-none dark:ring-white/[0.06] dark:hover:shadow-md dark:hover:shadow-black/20">
            <div className="px-4 pt-4 pb-2">
                <div className="flex gap-3.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <Link href={authorHref} className="shrink-0 rounded-full ring-2 ring-slate-200/80 ring-offset-2 ring-offset-white transition hover:ring-[var(--app-accent)]/35 dark:ring-slate-600 dark:ring-offset-slate-900 dark:hover:ring-[var(--app-accent)]/40">
                        <img
                            src={storageUrl(localPost.user?.avatar_path)}
                            alt=""
                            className="h-11 w-11 rounded-full border border-slate-200/80 object-cover dark:border-slate-600/80"
                        />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <Link href={authorHref} className="text-[15px] font-extrabold leading-tight tracking-tight text-slate-900 transition hover:text-[var(--app-accent)] dark:text-slate-50 dark:hover:text-[var(--app-accent)]">
                                    {localPost.user?.name || 'Usuario'}
                                </Link>
                                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">
                                    {formatFeedDate(localPost.created_at)}
                                    {localPost.edited_at ? ' · editado' : ''}
                                </p>
                            </div>
                            {isPostAuthor ? (
                                <div className="relative z-[2] shrink-0" ref={postMenuRef}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPostMenuOpen((v) => {
                                                const next = !v
                                                if (!next) setPostDeleteConfirmOpen(false)
                                                return next
                                            })
                                        }
                                        className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 active:bg-slate-200 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:active:bg-slate-700"
                                        aria-expanded={postMenuOpen}
                                        aria-haspopup="true"
                                        aria-label="Opciones de la publicación"
                                    >
                                        <IconDotsVertical className="h-5 w-5" />
                                    </button>
                                    {postMenuOpen ? (
                                        <div className="absolute right-0 z-[80] mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-600 dark:bg-slate-900">
                                            {!postDeleteConfirmOpen ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={openEditPostModal}
                                                        className="flex w-full items-center gap-2 px-3 py-2 text-left font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                                                    >
                                                        <IconPencil className="h-4 w-4 shrink-0" />
                                                        Editar publicación
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPostDeleteConfirmOpen(true)}
                                                        className="flex w-full items-center gap-2 px-3 py-2 text-left font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                                    >
                                                        <IconTrash className="h-4 w-4 shrink-0" />
                                                        Eliminar
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="px-3 py-2">
                                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">¿Eliminar esta publicación?</p>
                                                    <div className="mt-2 flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={deletePost}
                                                            className="flex-1 rounded-lg bg-red-600 px-2 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                                                        >
                                                            Sí, eliminar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPostDeleteConfirmOpen(false)}
                                                            className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            {textContent ? (
                <div className="px-4 pb-3 pt-0.5">
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-100">{textContent}</p>
                </div>
            ) : null}

            {postImages.length > 0 ? (
                <div className="px-4 pb-4">
                    {postImages.length === 1 ? (
                        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-inner shadow-slate-900/5 ring-1 ring-slate-900/[0.04] dark:border-slate-700/60 dark:bg-slate-950/60 dark:ring-white/[0.05]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={storageUrl(postImages[0])} alt="" className="max-h-[min(70vh,520px)] w-full object-contain" />
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-2 shadow-inner shadow-slate-900/[0.03] dark:border-slate-700/60 dark:bg-slate-950/40">
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <div className="order-2 sm:order-1 sm:w-20">
                                    <div className="flex gap-2 overflow-x-auto pb-1 sm:max-h-[420px] sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden sm:pb-0">
                                        {postImages.map((path, i) => {
                                            const selected = i === activePostImageIndex
                                            return (
                                                <button
                                                    key={`${path}-${i}`}
                                                    type="button"
                                                    onClick={() => setActivePostImageIndex(i)}
                                                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border transition ${
                                                        selected
                                                            ? 'border-[var(--app-accent)] ring-2 ring-[var(--app-accent)]/35'
                                                            : 'border-slate-200 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500'
                                                    }`}
                                                    aria-label={`Ver imagen ${i + 1}`}
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={storageUrl(path)} alt="" className="h-full w-full object-contain bg-white dark:bg-slate-950" />
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="order-1 flex min-h-[220px] flex-1 items-center justify-center overflow-hidden rounded-lg bg-white p-2 dark:bg-slate-950">
                                    {activePostImagePath ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={storageUrl(activePostImagePath)} alt="" className="max-h-[min(62vh,460px)] w-full object-contain" />
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {localPost.parent ? (
                <div className="mx-4 mb-3 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-slate-100/80 p-3 text-sm shadow-sm dark:border-slate-700/60 dark:from-slate-900/80 dark:to-slate-950/60">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Compartido de {localPost.parent.user?.name}</p>
                    <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-slate-600 dark:text-slate-400">
                        {displayBody(localPost.parent.body) || '(sin texto)'}
                    </p>
                </div>
            ) : null}

            <div className="border-t border-slate-200/70 bg-gradient-to-b from-slate-50/95 to-slate-100/70 px-2 pb-2 pt-2 dark:border-slate-700/50 dark:from-slate-950/90 dark:to-slate-900/80">
                <div className="grid grid-cols-4 gap-1 overflow-hidden rounded-2xl bg-slate-200/50 p-1 dark:bg-slate-800/50">
                    <button type="button" onClick={() => reactPost('like')} className={`${actionCell} rounded-xl bg-white/95 dark:bg-slate-900/90`}>
                        <ReactionLikeIcon className="h-4 w-4 shrink-0 sm:h-[1.125rem] sm:w-[1.125rem]" />
                        <span className="text-[11px] font-bold tabular-nums text-slate-600 sm:text-xs dark:text-slate-400">{likesCount}</span>
                    </button>
                    <button type="button" onClick={() => reactPost('dislike')} className={`${actionCell} rounded-xl bg-white/95 dark:bg-slate-900/90`}>
                        <ReactionLikeIcon flipped className="h-4 w-4 shrink-0 sm:h-[1.125rem] sm:w-[1.125rem]" />
                        <span className="text-[11px] font-bold tabular-nums text-slate-600 sm:text-xs dark:text-slate-400">{dislikesCount}</span>
                    </button>
                    <button type="button" onClick={handleSharePost} className={`${actionCell} rounded-xl bg-white/95 text-slate-600 dark:bg-slate-900/90 dark:text-slate-300`}>
                        <ShareLinkIcon className="h-4 w-4 shrink-0" />
                        <span className="max-w-full truncate text-[10px] font-bold sm:text-[11px]">Compartir</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setCommentsModalOpen(true)}
                        className={`${actionCell} rounded-xl bg-white/95 text-[var(--app-accent)] dark:bg-slate-900/90`}
                    >
                        <IconChat className="h-4 w-4 shrink-0 sm:h-[1.125rem] sm:w-[1.125rem]" />
                        <span className="max-w-full truncate text-center text-[10px] font-bold sm:text-[11px]">
                            Comentar
                            {commentCount > 0 ? <span className="tabular-nums text-slate-500 dark:text-slate-400"> ({commentCount})</span> : null}
                        </span>
                    </button>
                </div>
            </div>
            {Number(localPost.user_id) === Number(currentUserId) ? (
                <p className="border-t border-slate-200/50 px-4 py-2 text-right text-[0.65rem] font-bold uppercase tracking-wider text-[var(--app-accent)] dark:border-slate-700/40">Tuya</p>
            ) : null}

            {/* Modal editar publicación (portal: encima del nav lateral y sin recargar el feed) */}
            {editPostModalOpen && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          className={FEED_MODAL_BACKDROP}
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby={`edit-post-${post.id}`}
                          onClick={(e) => {
                              if (e.target === e.currentTarget) {
                                  clearEditNewEntries()
                                  setEditPostModalOpen(false)
                              }
                          }}
                      >
                          <div className="pointer-events-auto flex max-h-[min(92vh,640px)] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-900 md:rounded-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                            <h2 id={`edit-post-${post.id}`} className="text-base font-bold text-slate-900 dark:text-slate-50">
                                Editar publicación
                            </h2>
                            <button
                                type="button"
                                onClick={() => {
                                    clearEditNewEntries()
                                    setEditPostModalOpen(false)
                                }}
                                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                aria-label="Cerrar"
                            >
                                <IconClose className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                            <textarea
                                value={editPostBody}
                                onChange={(e) => setEditPostBody(e.target.value)}
                                rows={4}
                                maxLength={5000}
                                placeholder="¿Qué quieres decir?"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-50"
                            />
                            <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Imágenes actuales</p>
                            {editPostKeptImages.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {editPostKeptImages.map((path) => (
                                        <div key={path} className="relative">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={storageUrl(path)} alt="" className="h-24 w-24 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-600" />
                                            <button
                                                type="button"
                                                onClick={() => setEditPostKeptImages((prev) => prev.filter((p) => p !== path))}
                                                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow"
                                                title="Quitar"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-1 text-xs text-slate-400">Ninguna (puedes añadir nuevas abajo)</p>
                            )}
                            <input
                                ref={editPostNewInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="sr-only"
                                onChange={(e) => {
                                    appendEditNewFiles(e.target.files)
                                    const input = e.target
                                    window.queueMicrotask(() => {
                                        input.value = ''
                                    })
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => editPostNewInputRef.current?.click()}
                                className="mt-3 w-full rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-sm font-bold text-[var(--app-accent)] dark:border-slate-600"
                            >
                                Añadir imágenes
                            </button>
                            {editPostNewEntries.length > 0 ? (
                                <div className="mt-3">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        Nuevas ({editPostNewEntries.length})
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {editPostNewEntries.map((e) => (
                                            <div key={e.id} className="relative h-24 w-24 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={e.previewUrl} alt="" className="h-full w-full object-cover" />
                                                <button
                                                    type="button"
                                                    title="Quitar"
                                                    onClick={() => removeEditNewEntry(e.id)}
                                                    className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-[11px] font-bold text-white"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        <div className="flex gap-2 border-t border-slate-100 p-4 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => {
                                    clearEditNewEntries()
                                    setEditPostModalOpen(false)
                                }}
                                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold dark:border-slate-600"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={savePostEdit}
                                className="flex-1 rounded-xl bg-[var(--app-accent)] py-2.5 text-sm font-bold text-white"
                            >
                                Guardar cambios
                            </button>
                        </div>
                    </div>
                </div>,
                      document.body
                  )
                : null}

            {/* Modal comentarios */}
            {commentsModalOpen && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          className={FEED_MODAL_BACKDROP}
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby={`comments-${post.id}`}
                          onClick={(e) => {
                              if (e.target === e.currentTarget) closeCommentsModal()
                          }}
                      >
                          <div className="pointer-events-auto flex max-h-[min(88vh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-[#0b1220] md:max-h-[min(85vh,680px)] md:rounded-2xl">
                        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                            <h2 id={`comments-${post.id}`} className="text-base font-bold text-slate-900 dark:text-slate-50">
                                Comentarios
                                {commentCount > 0 ? <span className="ml-1 font-semibold text-slate-500">({commentCount})</span> : null}
                            </h2>
                            <button
                                type="button"
                                onClick={closeCommentsModal}
                                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                aria-label="Cerrar"
                            >
                                <IconClose className="h-5 w-5" />
                            </button>
                        </div>

                        <div ref={commentsListRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
                            {localComments.length === 0 ? (
                                <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Sé el primero en comentar.</p>
                            ) : (
                                <div className="space-y-3">
                                    {localComments.map((c) => (
                                        <ProfileFeedComment
                                            key={c.id}
                                            c={c}
                                            variant="main"
                                            replyCount={countRepliesInSubtree(c.replies || [])}
                                            currentUserId={currentUserId}
                                            editingCommentId={editingCommentId}
                                            editingCommentBody={editingCommentBody}
                                            setEditingCommentBody={setEditingCommentBody}
                                            editingKeptPaths={editingKeptPaths}
                                            setEditingKeptPaths={setEditingKeptPaths}
                                            editingNewEntries={editingNewEntries}
                                            onAppendEditingNewFiles={appendEditingNewFiles}
                                            onRemoveEditingNewEntry={removeEditingNewEntry}
                                            commentFileRef={commentFileRef}
                                            reactionOverrides={commentReactionOverrides}
                                            onOpenThread={openThreadModal}
                                            onReact={reactComment}
                                            onStartEdit={startEditComment}
                                            onSaveEdit={saveCommentEdit}
                                            onCancelEdit={cancelCommentEdit}
                                            onDelete={deleteComment}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="shrink-0 border-t border-slate-100 bg-slate-50/95 p-3 dark:border-slate-700 dark:bg-slate-900/95 sm:rounded-b-2xl">
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                rows={2}
                                maxLength={3000}
                                placeholder="Escribe un comentario…"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-50"
                            />
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <input
                                    ref={modalCommentFileRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="max-w-full text-[0.7rem] file:mr-2 file:rounded-lg file:border-0 file:bg-slate-200 file:px-2 file:py-1 file:text-[0.65rem] file:font-bold dark:file:bg-slate-700"
                                    onChange={(e) => {
                                        appendCommentFiles(e.target.files)
                                        const input = e.target
                                        window.queueMicrotask(() => {
                                            input.value = ''
                                        })
                                    }}
                                />
                                {commentFileEntries.length > 0 ? (
                                    <span className="text-[0.7rem] text-slate-500">{commentFileEntries.length} imagen(es)</span>
                                ) : null}
                            </div>
                            {commentFileEntries.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {commentFileEntries.map((e) => (
                                        <div key={e.id} className="relative">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={e.previewUrl}
                                                alt=""
                                                className="h-16 w-16 rounded-lg border border-slate-200 bg-white object-contain dark:border-slate-600 dark:bg-slate-950"
                                            />
                                            <button
                                                type="button"
                                                title="Quitar imagen"
                                                onClick={() => removeCommentFileEntry(e.id)}
                                                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] font-bold text-white shadow"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                            <button
                                type="button"
                                onClick={submitComment}
                                className="mt-2 w-full rounded-xl bg-[var(--app-primary)] py-2.5 text-sm font-bold text-white shadow-sm"
                            >
                                Publicar comentario
                            </button>
                        </div>
                    </div>
                </div>,
                      document.body
                  )
                : null}

            {threadModalOpen && threadRootComment && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          className={THREAD_MODAL_BACKDROP}
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby={`thread-${post.id}-${threadRootComment.id}`}
                          onClick={(e) => {
                              if (e.target === e.currentTarget) closeThreadModal()
                          }}
                      >
                          <div className="pointer-events-auto flex max-h-[min(88vh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-[#0b1220] md:max-h-[min(85vh,680px)] md:rounded-2xl">
                              <div className="flex shrink-0 items-center border-b border-slate-100 px-2 py-2 dark:border-slate-700 sm:px-3">
                                  <div className="flex min-w-0 flex-1 justify-start">
                                      <button
                                          type="button"
                                          onClick={closeThreadModal}
                                          className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                          aria-label="Regresar a la lista de comentarios"
                                      >
                                          <IconArrowLeft className="h-5 w-5 shrink-0" />
                                          <span className="whitespace-nowrap text-xs font-bold sm:text-sm">Regresar</span>
                                      </button>
                                  </div>
                                  <h2
                                      id={`thread-${post.id}-${threadRootComment.id}`}
                                      className="shrink-0 truncate px-1 text-center text-base font-bold text-slate-900 dark:text-slate-50"
                                  >
                                      Respuestas
                                      {threadFlatRows.length > 0 ? (
                                          <span className="font-semibold text-slate-500"> ({threadFlatRows.length})</span>
                                      ) : null}
                                  </h2>
                                  <div className="flex flex-1 justify-end">
                                      <button
                                          type="button"
                                          onClick={closeThreadModal}
                                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                          aria-label="Cerrar hilo"
                                      >
                                          <IconClose className="h-5 w-5" />
                                      </button>
                                  </div>
                              </div>

                              <div ref={threadListRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:px-4">
                                  <ProfileFeedComment
                                      c={threadRootComment}
                                      variant="thread"
                                      replyCount={0}
                                      currentUserId={currentUserId}
                                      editingCommentId={editingCommentId}
                                      editingCommentBody={editingCommentBody}
                                      setEditingCommentBody={setEditingCommentBody}
                                      editingKeptPaths={editingKeptPaths}
                                      setEditingKeptPaths={setEditingKeptPaths}
                                      editingNewEntries={editingNewEntries}
                                      onAppendEditingNewFiles={appendEditingNewFiles}
                                      onRemoveEditingNewEntry={removeEditingNewEntry}
                                      commentFileRef={commentFileRef}
                                      reactionOverrides={commentReactionOverrides}
                                      onThreadReply={(id, name) => {
                                          setThreadReplyParentId(id)
                                          setThreadReplyToName(name)
                                      }}
                                      onReact={reactComment}
                                      onStartEdit={startEditComment}
                                      onSaveEdit={saveCommentEdit}
                                      onCancelEdit={cancelCommentEdit}
                                      onDelete={deleteComment}
                                  />
                                  {threadFlatRows.length > 0 ? (
                                      <>
                                          <p className="pt-1 text-[0.65rem] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                              Más en este hilo
                                          </p>
                                          <div className="space-y-2">
                                              {threadFlatRows.map(({ c: rowC, inReplyTo }) => (
                                                  <ProfileFeedComment
                                                      key={rowC.id}
                                                      c={rowC}
                                                      variant="thread"
                                                      replyCount={0}
                                                      inReplyToLabel={inReplyTo || undefined}
                                                      currentUserId={currentUserId}
                                                      editingCommentId={editingCommentId}
                                                      editingCommentBody={editingCommentBody}
                                                      setEditingCommentBody={setEditingCommentBody}
                                                      editingKeptPaths={editingKeptPaths}
                                                      setEditingKeptPaths={setEditingKeptPaths}
                                                      editingNewEntries={editingNewEntries}
                                                      onAppendEditingNewFiles={appendEditingNewFiles}
                                                      onRemoveEditingNewEntry={removeEditingNewEntry}
                                                      commentFileRef={commentFileRef}
                                                      reactionOverrides={commentReactionOverrides}
                                                      onThreadReply={(id, name) => {
                                                          setThreadReplyParentId(id)
                                                          setThreadReplyToName(name)
                                                      }}
                                                      onReact={reactComment}
                                                      onStartEdit={startEditComment}
                                                      onSaveEdit={saveCommentEdit}
                                                      onCancelEdit={cancelCommentEdit}
                                                      onDelete={deleteComment}
                                                  />
                                              ))}
                                          </div>
                                      </>
                                  ) : (
                                      <p className="text-center text-sm text-slate-500 dark:text-slate-400">Aún no hay respuestas en este hilo.</p>
                                  )}
                              </div>

                              <div className="shrink-0 border-t border-slate-100 bg-slate-50/95 p-3 dark:border-slate-700 dark:bg-slate-900/95 sm:rounded-b-2xl">
                                  {threadReplyParentId != null ? (
                                      <p className="mb-2 text-xs text-indigo-600 dark:text-indigo-400">
                                          Respondiendo a <strong>{threadReplyToName}</strong>{' '}
                                          <button type="button" onClick={clearThreadReply} className="font-bold underline">
                                              Cancelar
                                          </button>
                                      </p>
                                  ) : null}
                                  <textarea
                                      value={threadText}
                                      onChange={(e) => setThreadText(e.target.value)}
                                      rows={2}
                                      maxLength={3000}
                                      placeholder="Escribe una respuesta…"
                                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-50"
                                  />
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <input
                                          ref={threadModalFileRef}
                                          type="file"
                                          accept="image/*"
                                          multiple
                                          className="max-w-full text-[0.7rem] file:mr-2 file:rounded-lg file:border-0 file:bg-slate-200 file:px-2 file:py-1 file:text-[0.65rem] file:font-bold dark:file:bg-slate-700"
                                          onChange={(e) => {
                                              appendThreadFiles(e.target.files)
                                              const input = e.target
                                              window.queueMicrotask(() => {
                                                  input.value = ''
                                              })
                                          }}
                                      />
                                      {threadFileEntries.length > 0 ? (
                                          <span className="text-[0.7rem] text-slate-500">{threadFileEntries.length} imagen(es)</span>
                                      ) : null}
                                  </div>
                                  {threadFileEntries.length > 0 ? (
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                          {threadFileEntries.map((e) => (
                                              <div key={e.id} className="relative">
                                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                                  <img
                                                      src={e.previewUrl}
                                                      alt=""
                                                      className="h-16 w-16 rounded-lg border border-slate-200 bg-white object-contain dark:border-slate-600 dark:bg-slate-950"
                                                  />
                                                  <button
                                                      type="button"
                                                      title="Quitar imagen"
                                                      onClick={() => removeThreadFileEntry(e.id)}
                                                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] font-bold text-white shadow"
                                                  >
                                                      ×
                                                  </button>
                                              </div>
                                          ))}
                                      </div>
                                  ) : null}
                                  <button
                                      type="button"
                                      onClick={submitThreadComment}
                                      className="mt-2 w-full rounded-xl bg-[var(--app-primary)] py-2.5 text-sm font-bold text-white shadow-sm"
                                  >
                                      Publicar respuesta
                                  </button>
                              </div>
                          </div>
                      </div>,
                      document.body
                  )
                : null}
        </article>
    )
}
