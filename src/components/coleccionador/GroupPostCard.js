'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import axios from '@/lib/axios'
import { storageUrl } from '@/lib/storageUrl'
import { profileHref } from '@/lib/profileUrl'
import { buildGroupPostShareUrl, shareNativeOrClipboard } from '@/lib/sharePost'
import { scrollAncestorsToBottom } from '@/lib/scrollAncestorsToBottom'
import { emitVikuChanSignal } from '@/lib/vikuChanSignals'
import ReactionLikeIcon from '@/components/coleccionador/ReactionLikeIcon'
import ShareLinkIcon from '@/components/coleccionador/ShareLinkIcon'
import AmbientPostImage from '@/components/coleccionador/AmbientPostImage'
import PostMediaLightbox from '@/components/coleccionador/PostMediaLightbox'

const GROUP_MODAL_BACKDROP =
    'fixed inset-0 z-[200] flex items-end justify-center bg-transparent p-0 md:items-center md:justify-center md:pl-72 md:pr-6 md:py-6'

const GROUP_THREAD_MODAL_BACKDROP =
    'fixed inset-0 z-[270] flex items-end justify-center bg-transparent p-0 md:items-center md:justify-center md:pl-72 md:pr-6 md:py-6'

function formatFeedDate(iso) {
    if (!iso) return ''
    try {
        return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
    } catch {
        return ''
    }
}

function IconDotsVertical({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 8a2 2 0 100-4 2 2 0 000 4zm0 2a2 2 0 110 4 2 2 0 010-4zm0 6a2 2 0 110 4 2 2 0 010-4z" />
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
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

async function uploadPublicFile(file) {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await axios.post('/uploads', fd)
    return data?.path || null
}

function countRepliesInSubtree(nodes) {
    if (!Array.isArray(nodes) || nodes.length === 0) return 0
    return nodes.reduce((acc, n) => acc + 1 + countRepliesInSubtree(n.replies || []), 0)
}

function addCommentToLocalTree(tree, parentId, newComment) {
    const list = Array.isArray(tree) ? tree : []
    if (!parentId) return [...list, { ...newComment, replies: newComment.replies || [] }]
    return list.map((n) => {
        if (n.id === parentId) {
            const prevReplies = Array.isArray(n.replies) ? n.replies : []
            return { ...n, replies: [...prevReplies, { ...newComment, replies: newComment.replies || [] }] }
        }
        return { ...n, replies: addCommentToLocalTree(n.replies || [], parentId, newComment) }
    })
}

function updateCommentInTree(tree, commentId, updater) {
    const list = Array.isArray(tree) ? tree : []
    return list.map((n) => {
        if (n.id === commentId) return updater(n)
        return { ...n, replies: updateCommentInTree(n.replies || [], commentId, updater) }
    })
}

function removeCommentFromTree(tree, commentId) {
    const list = Array.isArray(tree) ? tree : []
    return list
        .filter((n) => n.id !== commentId)
        .map((n) => ({ ...n, replies: removeCommentFromTree(n.replies || [], commentId) }))
}

function findCommentInTree(tree, targetId) {
    const list = Array.isArray(tree) ? tree : []
    for (const node of list) {
        if (node.id === targetId) return node
        const nested = findCommentInTree(node.replies || [], targetId)
        if (nested) return nested
    }
    return null
}

function flattenThreadReplies(nodes, parentName = null) {
    const list = Array.isArray(nodes) ? nodes : []
    const out = []
    for (const node of list) {
        out.push({ c: node, inReplyTo: parentName })
        out.push(...flattenThreadReplies(node.replies || [], node.user?.name || parentName))
    }
    return out
}

export default function GroupPostCard({
    post,
    groupId,
    currentUserId,
    canModerate,
    canComment = true,
    canInteract = true,
    onRefresh,
    groupMeta = null,
    onSharePost,
}) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [commentsOpen, setCommentsOpen] = useState(false)
    const [mediaLightboxOpen, setMediaLightboxOpen] = useState(false)
    const [mediaLightboxStart, setMediaLightboxStart] = useState(0)
    const [commentImageViewerOpen, setCommentImageViewerOpen] = useState(false)
    const [commentImageViewerUrls, setCommentImageViewerUrls] = useState([])
    const [commentImageViewerStart, setCommentImageViewerStart] = useState(0)
    const [editOpen, setEditOpen] = useState(false)
    const [editBody, setEditBody] = useState(post.body || '')
    const [editPaths, setEditPaths] = useState([...(post.images || [])])
    const [editNewFiles, setEditNewFiles] = useState([])
    const editFileRef = useRef(null)
    const menuRef = useRef(null)
    const [commentText, setCommentText] = useState('')
    const [commentFileEntries, setCommentFileEntries] = useState([])
    const [commentError, setCommentError] = useState('')
    const [submittingComment, setSubmittingComment] = useState(false)
    const [replyParentId, setReplyParentId] = useState(null)
    const [replyToName, setReplyToName] = useState(null)
    const [threadModalOpen, setThreadModalOpen] = useState(false)
    const [threadRootId, setThreadRootId] = useState(null)
    const [threadText, setThreadText] = useState('')
    const [threadFileEntries, setThreadFileEntries] = useState([])
    const [threadReplyParentId, setThreadReplyParentId] = useState(null)
    const [threadReplyToName, setThreadReplyToName] = useState(null)
    const [threadCommentError, setThreadCommentError] = useState('')
    const [submittingThreadComment, setSubmittingThreadComment] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [editingCommentId, setEditingCommentId] = useState(null)
    const [editingCommentText, setEditingCommentText] = useState('')
    const [editingCommentPaths, setEditingCommentPaths] = useState([])
    const [editingCommentNewEntries, setEditingCommentNewEntries] = useState([])
    const [commentEditError, setCommentEditError] = useState('')
    const [likesCount, setLikesCount] = useState(post.likes_count ?? 0)
    const [dislikesCount, setDislikesCount] = useState(post.dislikes_count ?? 0)
    const [commentReactionOverrides, setCommentReactionOverrides] = useState({})
    const commentFileRef = useRef(null)
    const groupLightboxCommentsListRef = useRef(null)
    const groupLightboxCommentFileRef = useRef(null)
    const editCommentFileRef = useRef(null)
    const threadModalFileRef = useRef(null)

    const normalizedCurrentUserId = Number(currentUserId)
    const canEditPost = Number(post.user_id) === normalizedCurrentUserId || canModerate
    const [localComments, setLocalComments] = useState(Array.isArray(post.comments) ? post.comments : [])
    const comments = localComments
    const totalComments = comments.reduce((acc, c) => acc + 1 + countRepliesInSubtree(c.replies || []), 0)
    const targetGroupId = groupId ?? post.group_id
    const threadRootComment = threadRootId != null ? findCommentInTree(comments, threadRootId) : null
    const threadFlatRows = threadRootComment ? flattenThreadReplies(threadRootComment.replies || [], threadRootComment.user?.name || null) : []
    const authorHref = profileHref({ id: post.user_id, name: post.user?.name, currentUserId })

    useEffect(() => {
        setLikesCount(post.likes_count ?? 0)
        setDislikesCount(post.dislikes_count ?? 0)
        setCommentReactionOverrides({})
    }, [post.id, post.likes_count, post.dislikes_count])

    useEffect(() => {
        setLocalComments(Array.isArray(post.comments) ? post.comments : [])
    }, [post.id, post.comments])

    useEffect(() => {
        const closeIfOutside = (e) => {
            if (!menuRef.current?.contains(e.target)) setMenuOpen(false)
        }
        if (menuOpen) {
            document.addEventListener('mousedown', closeIfOutside)
            document.addEventListener('touchstart', closeIfOutside, { passive: true })
        }
        return () => {
            document.removeEventListener('mousedown', closeIfOutside)
            document.removeEventListener('touchstart', closeIfOutside)
        }
    }, [menuOpen])

    useEffect(() => {
        if (!commentsOpen && !editOpen) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [commentsOpen, editOpen])

    useEffect(() => {
        setEditBody(post.body || '')
        setEditPaths([...(post.images || [])])
        setEditNewFiles([])
    }, [post.id, post.body, post.images])

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

    const appendCommentFiles = useCallback((fileList) => {
        const entries = toFileEntries(fileList)
        if (entries.length === 0) return
        setCommentFileEntries((prev) => [...prev, ...entries])
    }, [toFileEntries])

    const removeCommentFileEntry = useCallback((id) => {
        setCommentFileEntries((prev) => {
            const found = prev.find((x) => x.id === id)
            if (found) URL.revokeObjectURL(found.previewUrl)
            return prev.filter((x) => x.id !== id)
        })
    }, [])

    useEffect(() => () => clearCommentFileEntries(), [clearCommentFileEntries])

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

    useEffect(() => () => clearThreadFileEntries(), [clearThreadFileEntries])

    const clearEditingCommentNewEntries = useCallback(() => {
        setEditingCommentNewEntries((prev) => {
            prev.forEach((e) => URL.revokeObjectURL(e.previewUrl))
            return []
        })
    }, [])

    const appendEditingCommentFiles = useCallback((fileList) => {
        const entries = toFileEntries(fileList)
        if (entries.length === 0) return
        setEditingCommentNewEntries((prev) => [...prev, ...entries])
    }, [toFileEntries])

    const removeEditingCommentNewEntry = useCallback((id) => {
        setEditingCommentNewEntries((prev) => {
            const found = prev.find((x) => x.id === id)
            if (found) URL.revokeObjectURL(found.previewUrl)
            return prev.filter((x) => x.id !== id)
        })
    }, [])

    useEffect(() => () => clearEditingCommentNewEntries(), [clearEditingCommentNewEntries])

    const closeCommentsModal = () => {
        setCommentsOpen(false)
        setThreadModalOpen(false)
        setThreadRootId(null)
        setThreadText('')
        clearThreadFileEntries()
        setThreadReplyParentId(null)
        setThreadReplyToName(null)
        setThreadCommentError('')
        if (threadModalFileRef.current) threadModalFileRef.current.value = ''
        clearCommentFileEntries()
        setCommentError('')
        setReplyParentId(null)
        setReplyToName(null)
        setEditingCommentId(null)
        setEditingCommentPaths([])
        clearEditingCommentNewEntries()
        setCommentEditError('')
        if (commentFileRef.current) commentFileRef.current.value = ''
        if (groupLightboxCommentFileRef.current) groupLightboxCommentFileRef.current.value = ''
        if (editCommentFileRef.current) editCommentFileRef.current.value = ''
    }

    useEffect(() => {
        if (!commentsOpen && !editOpen && !mediaLightboxOpen && !commentImageViewerOpen && !threadModalOpen) return
        const onKey = (e) => {
            if (e.key !== 'Escape') return
            if (commentImageViewerOpen) {
                setCommentImageViewerOpen(false)
                setCommentImageViewerUrls([])
                e.stopImmediatePropagation()
                return
            }
            if (threadModalOpen) {
                setThreadModalOpen(false)
                setThreadRootId(null)
                setThreadText('')
                clearThreadFileEntries()
                setThreadReplyParentId(null)
                setThreadReplyToName(null)
                setThreadCommentError('')
                if (threadModalFileRef.current) threadModalFileRef.current.value = ''
                e.stopImmediatePropagation()
                return
            }
            if (mediaLightboxOpen) {
                setMediaLightboxOpen(false)
                e.stopImmediatePropagation()
                return
            }
            setThreadModalOpen(false)
            setThreadRootId(null)
            setThreadText('')
            clearThreadFileEntries()
            setThreadReplyParentId(null)
            setThreadReplyToName(null)
            setThreadCommentError('')
            if (threadModalFileRef.current) threadModalFileRef.current.value = ''
            setCommentsOpen(false)
            clearCommentFileEntries()
            if (commentFileRef.current) commentFileRef.current.value = ''
            if (groupLightboxCommentFileRef.current) groupLightboxCommentFileRef.current.value = ''
            setReplyParentId(null)
            setReplyToName(null)
            setEditOpen(false)
            setEditingCommentId(null)
            setCommentEditError('')
            setEditingCommentPaths([])
            clearEditingCommentNewEntries()
        }
        window.addEventListener('keydown', onKey, true)
        return () => window.removeEventListener('keydown', onKey, true)
    }, [
        commentsOpen,
        editOpen,
        mediaLightboxOpen,
        commentImageViewerOpen,
        threadModalOpen,
        clearCommentFileEntries,
        clearEditingCommentNewEntries,
        clearThreadFileEntries,
    ])

    const deletePost = async () => {
        setMenuOpen(false)
        await axios.delete(`/groups/${targetGroupId}/posts/${post.id}`)
        await onRefresh()
    }

    const savePostEdit = async () => {
        const b = editBody.trim()
        const paths = [...editPaths]
        for (const f of editNewFiles) {
            const p = await uploadPublicFile(f)
            if (p) paths.push(p)
        }
        await axios.patch(`/groups/${targetGroupId}/posts/${post.id}`, {
            body: b || ' ',
            images: paths.length ? paths : null,
        })
        setEditOpen(false)
        setEditNewFiles([])
        if (editFileRef.current) editFileRef.current.value = ''
        await onRefresh()
    }

    const submitComment = async () => {
        const t = commentText.trim()
        if ((!t && commentFileEntries.length === 0) || submittingComment) return
        if (!targetGroupId) {
            setCommentError('No se encontró el grupo de la publicación.')
            return
        }
        setCommentError('')
        setSubmittingComment(true)
        try {
            const uploadedPaths = []
            for (const entry of commentFileEntries) {
                const path = await uploadPublicFile(entry.file)
                if (path) uploadedPaths.push(path)
            }
            const { data } = await axios.post(`/groups/${targetGroupId}/posts/${post.id}/comments`, {
                body: t || ' ',
                images: uploadedPaths.length > 0 ? uploadedPaths : null,
                parent_comment_id: replyParentId,
            })
            if (data?.id) {
                setLocalComments((prev) => addCommentToLocalTree(prev, replyParentId, data))
                emitVikuChanSignal('compose')
            }
            setCommentText('')
            clearCommentFileEntries()
            setReplyParentId(null)
            setReplyToName(null)
            if (commentFileRef.current) commentFileRef.current.value = ''
            if (groupLightboxCommentFileRef.current) groupLightboxCommentFileRef.current.value = ''
            try {
                await onRefresh()
            } catch {
                // Si refrescar falla, el comentario ya quedó en local.
            }
            window.setTimeout(() => {
                scrollAncestorsToBottom(groupLightboxCommentsListRef.current, { behavior: 'smooth' })
            }, 80)
        } catch (error) {
            const status = error?.response?.status
            const apiMsg = error?.response?.data?.message
            const apiErrors = error?.response?.data?.errors
            const firstFieldError = apiErrors && typeof apiErrors === 'object'
                ? Object.values(apiErrors)?.[0]?.[0]
                : null
            const fallback = error?.message || 'No se pudo publicar el comentario.'
            const detail = apiMsg || firstFieldError || fallback
            setCommentError(status ? `Error ${status}: ${detail}` : detail)
        } finally {
            setSubmittingComment(false)
        }
    }

    const submitThreadComment = async () => {
        const t = threadText.trim()
        if ((!t && threadFileEntries.length === 0) || submittingThreadComment) return
        if (!targetGroupId) {
            setThreadCommentError('No se encontró el grupo de la publicación.')
            return
        }
        if (threadRootId == null) return
        const parentId = threadReplyParentId ?? threadRootId
        setThreadCommentError('')
        setSubmittingThreadComment(true)
        try {
            const uploadedPaths = []
            for (const entry of threadFileEntries) {
                const path = await uploadPublicFile(entry.file)
                if (path) uploadedPaths.push(path)
            }
            const { data } = await axios.post(`/groups/${targetGroupId}/posts/${post.id}/comments`, {
                body: t || ' ',
                images: uploadedPaths.length > 0 ? uploadedPaths : null,
                parent_comment_id: parentId,
            })
            if (data?.id) {
                setLocalComments((prev) => addCommentToLocalTree(prev, parentId, data))
                emitVikuChanSignal('compose')
            }
            setThreadText('')
            clearThreadFileEntries()
            setThreadReplyParentId(null)
            setThreadReplyToName(null)
            if (threadModalFileRef.current) threadModalFileRef.current.value = ''
            try {
                await onRefresh()
            } catch {
                // ok
            }
        } catch (error) {
            const status = error?.response?.status
            const apiMsg = error?.response?.data?.message
            const apiErrors = error?.response?.data?.errors
            const firstFieldError = apiErrors && typeof apiErrors === 'object'
                ? Object.values(apiErrors)?.[0]?.[0]
                : null
            const fallback = error?.message || 'No se pudo publicar la respuesta.'
            const detail = apiMsg || firstFieldError || fallback
            setThreadCommentError(status ? `Error ${status}: ${detail}` : detail)
        } finally {
            setSubmittingThreadComment(false)
        }
    }

    const reactPost = async (reaction) => {
        if (!canInteract) return
        try {
            const { data } = await axios.post(`/groups/${targetGroupId}/posts/${post.id}/react`, { reaction })
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
        void shareNativeOrClipboard(buildGroupPostShareUrl(post.id))
        emitVikuChanSignal('share')
    }, [onSharePost, post.id])

    const openMediaLightbox = useCallback(
        (i) => {
            const imgs = Array.isArray(post.images) ? post.images : []
            if (imgs.length === 0) return
            const safe = Math.min(Math.max(0, i), imgs.length - 1)
            setMediaLightboxStart(safe)
            setMediaLightboxOpen(true)
        },
        [post.images]
    )

    const reactComment = async (commentId, reaction) => {
        if (!canInteract) return
        try {
            const { data } = await axios.post(`/groups/${targetGroupId}/posts/${post.id}/comments/${commentId}/react`, { reaction })
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

    const saveComment = async (commentId) => {
        const t = editingCommentText.trim()
        if (!t && editingCommentPaths.length === 0 && editingCommentNewEntries.length === 0) return
        setCommentEditError('')
        try {
            const uploadedPaths = []
            for (const entry of editingCommentNewEntries) {
                const path = await uploadPublicFile(entry.file)
                if (path) uploadedPaths.push(path)
            }
            const mergedPaths = [...editingCommentPaths, ...uploadedPaths]
            const { data } = await axios.patch(`/groups/${targetGroupId}/posts/${post.id}/comments/${commentId}`, {
                body: t || ' ',
                images: mergedPaths.length > 0 ? mergedPaths : [],
            })
            if (data?.id) {
                setLocalComments((prev) => updateCommentInTree(prev, commentId, (node) => ({ ...node, ...data })))
            }
            setEditingCommentId(null)
            setEditingCommentPaths([])
            clearEditingCommentNewEntries()
            if (editCommentFileRef.current) editCommentFileRef.current.value = ''
            try {
                await onRefresh()
            } catch {
                // fallback local
            }
        } catch (error) {
            const status = error?.response?.status
            const apiMsg = error?.response?.data?.message
            const apiErrors = error?.response?.data?.errors
            const firstFieldError = apiErrors && typeof apiErrors === 'object'
                ? Object.values(apiErrors)?.[0]?.[0]
                : null
            const fallback = error?.message || 'No se pudo guardar la edición.'
            const detail = apiMsg || firstFieldError || fallback
            setCommentEditError(status ? `Error ${status}: ${detail}` : detail)
        }
    }

    const deleteComment = async (commentId) => {
        await axios.delete(`/groups/${targetGroupId}/posts/${post.id}/comments/${commentId}`)
        setLocalComments((prev) => removeCommentFromTree(prev, commentId))
        setEditingCommentId(null)
        if (replyParentId === commentId) {
            setReplyParentId(null)
            setReplyToName(null)
        }
        if (threadReplyParentId === commentId) {
            setThreadReplyParentId(null)
            setThreadReplyToName(null)
        }
        try {
            await onRefresh()
        } catch {
            // fallback local
        }
    }

    const requestDeletePost = () => {
        setConfirmDelete({
            title: 'Eliminar publicación',
            message: '¿Seguro que quieres eliminar esta publicación?',
            actionLabel: 'Eliminar',
            onConfirm: deletePost,
        })
    }

    const requestDeleteComment = (commentId) => {
        setConfirmDelete({
            title: 'Eliminar comentario',
            message: '¿Seguro que quieres eliminar este comentario?',
            actionLabel: 'Eliminar',
            onConfirm: () => deleteComment(commentId),
        })
    }

    const runConfirmDelete = async () => {
        if (!confirmDelete?.onConfirm) return
        try {
            await confirmDelete.onConfirm()
        } finally {
            setConfirmDelete(null)
        }
    }

    const openThreadModal = (commentId) => {
        setThreadRootId(commentId)
        setThreadModalOpen(true)
        setThreadText('')
        clearThreadFileEntries()
        setThreadReplyParentId(null)
        setThreadReplyToName(null)
        setThreadCommentError('')
        if (threadModalFileRef.current) threadModalFileRef.current.value = ''
    }

    const closeThreadModal = () => {
        setThreadModalOpen(false)
        setThreadRootId(null)
        setThreadText('')
        clearThreadFileEntries()
        setThreadReplyParentId(null)
        setThreadReplyToName(null)
        setThreadCommentError('')
        if (threadModalFileRef.current) threadModalFileRef.current.value = ''
    }

    const textBody = (post.body || '').trim()

    const openCommentImageViewer = useCallback((paths, startIdx = 0) => {
        if (!Array.isArray(paths) || paths.length === 0) return
        const safe = Math.min(Math.max(0, startIdx), paths.length - 1)
        setCommentImageViewerUrls(paths.map((p) => storageUrl(p)))
        setCommentImageViewerStart(safe)
        setCommentImageViewerOpen(true)
    }, [])

    const closeCommentImageViewer = useCallback(() => {
        setCommentImageViewerOpen(false)
        setCommentImageViewerUrls([])
    }, [])

    const renderCommentNode = (cm, level = 0, inThread = false, inReplyToLabel = null) => {
        const canEdit = Number(cm.user_id) === normalizedCurrentUserId || canModerate
        const override = commentReactionOverrides[cm.id]
        const likeN = override?.likes ?? cm.likes_count ?? 0
        const dislikeN = override?.dislikes ?? cm.dislikes_count ?? 0
        const replies = Array.isArray(cm.replies) ? cm.replies : []
        const replyCount = countRepliesInSubtree(replies)
        const canReplyThisLevel = level < 2
        const showThreadLine = level > 0 || Boolean(inReplyToLabel)
        const cardClass =
            'overflow-hidden rounded-[18px] shadow-sm ring-1 ring-[var(--app-accent)]/30 ' +
            (level === 0
                ? 'bg-[color-mix(in_srgb,var(--app-card)_94%,var(--app-accent)_6%)]'
                : 'bg-[color-mix(in_srgb,var(--app-card)_90%,var(--app-accent)_10%)]') +
            ' text-[var(--app-text)]'
        const actionsRowClass =
            'mt-1.5 flex min-h-[2.25rem] w-full min-w-0 flex-wrap items-center gap-x-0 divide-x divide-[var(--app-subtle)]/40 overflow-x-auto rounded-lg'
        const commentProfileHref =
            cm.user_id != null && String(cm.user_id).trim() !== ''
                ? profileHref({ id: cm.user_id, name: cm.user?.name, currentUserId: normalizedCurrentUserId })
                : null
        const commentAuthorNameClass =
            'text-sm font-bold text-[var(--app-text)] hover:text-[var(--app-accent)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-card)] rounded-sm'

        return (
            <div key={cm.id} className={`space-y-2 ${level > 0 ? 'ml-1 sm:ml-3' : ''}`}>
                <div className="flex min-w-0 items-stretch gap-1.5 sm:gap-2">
                    <div className="relative flex w-9 shrink-0 flex-col items-center self-stretch sm:w-10">
                        {commentProfileHref ? (
                            <Link
                                href={commentProfileHref}
                                className="relative z-[1] mt-0.5 shrink-0 rounded-full ring-1 ring-[var(--app-accent)]/25 ring-offset-2 ring-offset-[var(--app-bg)] transition hover:ring-[var(--app-accent)]/45"
                                title={`Perfil de ${cm.user?.name || 'usuario'}`}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={storageUrl(cm.user?.avatar_path)}
                                    alt=""
                                    className="h-8 w-8 rounded-full border-2 border-[var(--app-card)] object-cover shadow-sm sm:h-9 sm:w-9"
                                />
                            </Link>
                        ) : (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={storageUrl(cm.user?.avatar_path)}
                                alt=""
                                className="relative z-[1] mt-0.5 h-8 w-8 shrink-0 rounded-full border-2 border-[var(--app-card)] object-cover shadow-sm ring-1 ring-[var(--app-accent)]/25 sm:h-9 sm:w-9"
                            />
                        )}
                        {showThreadLine ? (
                            <div
                                className="pointer-events-none absolute bottom-0 left-1/2 top-[2.125rem] w-px -translate-x-1/2 bg-[var(--app-accent)]/40 sm:top-[2.375rem]"
                                aria-hidden
                            />
                        ) : null}
                    </div>
                    <div className="min-w-0 flex-1 pb-0.5">
                        {editingCommentId === cm.id ? (
                            <div className={cardClass}>
                                <div className="px-3 pt-2.5 pb-2">
                                    {inReplyToLabel ? (
                                        <p className="mb-1.5 text-[0.65rem] font-semibold text-[var(--app-accent)]">
                                            En respuesta a <span className="font-bold">{inReplyToLabel}</span>
                                        </p>
                                    ) : null}
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                                        {commentProfileHref ? (
                                            <Link href={commentProfileHref} className={commentAuthorNameClass}>
                                                {cm.user?.name || 'Usuario'}
                                            </Link>
                                        ) : (
                                            <span className="text-sm font-bold text-[var(--app-text)]">{cm.user?.name || 'Usuario'}</span>
                                        )}
                                        <span className="text-[0.72rem] text-[var(--app-subtle)]">{formatFeedDate(cm.created_at)}</span>
                                    </div>
                                    <div className="mt-2 space-y-2">
                                        <textarea
                                            value={editingCommentText}
                                            onChange={(e) => setEditingCommentText(e.target.value)}
                                            rows={2}
                                            className="w-full rounded-xl border border-[var(--app-subtle)]/45 bg-[var(--app-card)] px-2 py-1.5 text-sm text-[var(--app-text)] placeholder:text-[var(--app-subtle)]"
                                        />
                                        {editingCommentPaths.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {editingCommentPaths.map((path) => (
                                                    <div key={`keep-${cm.id}-${path}`} className="relative">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={storageUrl(path)}
                                                            alt=""
                                                            className="h-16 w-16 rounded-lg border border-[var(--app-subtle)]/35 bg-[var(--app-card)] object-contain"
                                                        />
                                                        <button
                                                            type="button"
                                                            title="Quitar imagen"
                                                            onClick={() => setEditingCommentPaths((prev) => prev.filter((x) => x !== path))}
                                                            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] font-bold text-white shadow"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                        <div className="flex flex-wrap items-center gap-2">
                                            <input
                                                ref={editCommentFileRef}
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="max-w-full text-[0.7rem] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--app-primary)]/15 file:px-2 file:py-1 file:text-[0.65rem] file:font-bold file:text-[var(--app-text)]"
                                                onChange={(e) => {
                                                    appendEditingCommentFiles(e.target.files)
                                                    const input = e.target
                                                    window.queueMicrotask(() => {
                                                        input.value = ''
                                                    })
                                                }}
                                            />
                                            {(editingCommentPaths.length + editingCommentNewEntries.length) > 0 ? (
                                                <span className="text-[0.7rem] text-[var(--app-subtle)]">
                                                    {editingCommentPaths.length + editingCommentNewEntries.length} imagen(es)
                                                </span>
                                            ) : null}
                                        </div>
                                        {editingCommentNewEntries.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {editingCommentNewEntries.map((entry) => (
                                                    <div key={entry.id} className="relative">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={entry.previewUrl}
                                                            alt=""
                                                            className="h-16 w-16 rounded-lg border border-[var(--app-subtle)]/35 bg-[var(--app-card)] object-contain"
                                                        />
                                                        <button
                                                            type="button"
                                                            title="Quitar imagen"
                                                            onClick={() => removeEditingCommentNewEntry(entry.id)}
                                                            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] font-bold text-white shadow"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                        {commentEditError ? (
                                            <p className="text-xs font-semibold text-red-600 dark:text-red-400">{commentEditError}</p>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 border-t border-[var(--app-subtle)]/30 px-3 py-2.5">
                                    <button
                                        type="button"
                                        onClick={() => saveComment(cm.id)}
                                        className="rounded-lg bg-[var(--app-accent)] px-2 py-1 text-xs font-bold text-white"
                                    >
                                        Guardar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingCommentId(null)
                                            setCommentEditError('')
                                            setEditingCommentPaths([])
                                            clearEditingCommentNewEntries()
                                            if (editCommentFileRef.current) editCommentFileRef.current.value = ''
                                        }}
                                        className="rounded-lg border border-[var(--app-subtle)]/50 px-2 py-1 text-xs font-bold text-[var(--app-text)]"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className={cardClass}>
                                    <div className="px-3 pt-2.5 pb-2">
                                        {inReplyToLabel ? (
                                            <p className="mb-1.5 text-[0.65rem] font-semibold text-[var(--app-accent)]">
                                                En respuesta a <span className="font-bold">{inReplyToLabel}</span>
                                            </p>
                                        ) : null}
                                        {commentProfileHref ? (
                                            <Link href={commentProfileHref} className={`inline-block ${commentAuthorNameClass}`}>
                                                {cm.user?.name || 'Usuario'}
                                            </Link>
                                        ) : (
                                            <div className="text-sm font-bold text-[var(--app-text)]">{cm.user?.name || 'Usuario'}</div>
                                        )}
                                        {cm.body ? (
                                            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-snug text-[var(--app-text)]">{cm.body}</p>
                                        ) : null}
                                    </div>
                                    {Array.isArray(cm.images) && cm.images.length > 0 ? (
                                        <div className="px-3 pb-2.5">
                                            <div
                                                className={
                                                    cm.images.length === 1
                                                        ? 'overflow-hidden rounded-xl ring-1 ring-[var(--app-accent)]/30'
                                                        : 'grid grid-cols-2 gap-1.5'
                                                }
                                            >
                                                {cm.images.map((path, idx) => (
                                                    <div
                                                        key={`${cm.id}-${path}-${idx}`}
                                                        className={
                                                            cm.images.length === 1
                                                                ? ''
                                                                : 'overflow-hidden rounded-xl ring-1 ring-[var(--app-accent)]/25'
                                                        }
                                                    >
                                                        <AmbientPostImage
                                                            src={storageUrl(path)}
                                                            alt={`Adjunto ${idx + 1}`}
                                                            containerClassName="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-card)]"
                                                            innerClassName="min-h-[120px] w-full bg-[var(--app-bg)]/20 sm:min-h-[140px]"
                                                            foregroundClassName={
                                                                cm.images.length === 1
                                                                    ? 'max-h-72 w-full object-contain'
                                                                    : 'max-h-52 w-full object-contain sm:max-h-56'
                                                            }
                                                            onOpen={() => openCommentImageViewer(cm.images, idx)}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                                <div className={actionsRowClass}>
                                    <span className="inline-flex shrink-0 items-center px-2 py-1.5 text-[0.7rem] font-semibold text-[var(--app-subtle)]">
                                        {formatFeedDate(cm.created_at)}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={!canInteract}
                                        onClick={() => reactComment(cm.id, 'like')}
                                        className="inline-flex min-w-[3rem] flex-1 items-center justify-center gap-1 px-2 py-1.5 text-[0.68rem] font-bold text-emerald-600 transition hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
                                    >
                                        <ReactionLikeIcon className="h-3.5 w-3.5 shrink-0" />
                                        <span className="tabular-nums">{likeN}</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canInteract}
                                        onClick={() => reactComment(cm.id, 'dislike')}
                                        className="inline-flex min-w-[3rem] flex-1 items-center justify-center gap-1 px-2 py-1.5 text-[0.68rem] font-bold text-[var(--app-subtle)] transition hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
                                    >
                                        <ReactionLikeIcon flipped className="h-3.5 w-3.5 shrink-0" />
                                        <span className="tabular-nums">{dislikeN}</span>
                                    </button>
                                    {inThread ? (
                                        <span className="inline-flex min-w-[4.5rem] flex-1 items-center justify-center px-2 py-1.5 text-[0.68rem] font-bold text-[var(--app-text)]">
                                            Respuestas {replyCount > 0 ? `(${replyCount})` : ''}
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => openThreadModal(cm.id)}
                                            className="inline-flex min-w-[4.5rem] flex-1 items-center justify-center px-2 py-1.5 text-[0.68rem] font-bold text-[var(--app-text)] transition hover:underline"
                                        >
                                            Respuestas {replyCount > 0 ? `(${replyCount})` : ''}
                                        </button>
                                    )}
                                    {canReplyThisLevel ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (inThread) {
                                                    setThreadReplyParentId(cm.id)
                                                    setThreadReplyToName(cm.user?.name || 'usuario')
                                                } else {
                                                    setReplyParentId(cm.id)
                                                    setReplyToName(cm.user?.name || 'usuario')
                                                }
                                            }}
                                            className="inline-flex min-w-[3.5rem] flex-1 items-center justify-center px-2 py-1.5 text-[0.68rem] font-bold text-[var(--app-accent)] transition hover:underline"
                                        >
                                            Responder
                                        </button>
                                    ) : null}
                                    {canEdit ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingCommentId(cm.id)
                                                    setEditingCommentText(cm.body || '')
                                                    setEditingCommentPaths(Array.isArray(cm.images) ? [...cm.images] : [])
                                                    setCommentEditError('')
                                                    clearEditingCommentNewEntries()
                                                    if (editCommentFileRef.current) editCommentFileRef.current.value = ''
                                                }}
                                                className="inline-flex min-w-[4rem] flex-1 items-center justify-center gap-0.5 px-2 py-1.5 text-[0.68rem] font-bold text-[var(--app-subtle)] transition hover:underline"
                                            >
                                                <IconPencil className="h-3.5 w-3.5 shrink-0" />
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => requestDeleteComment(cm.id)}
                                                className="inline-flex min-w-[4rem] flex-1 items-center justify-center gap-0.5 px-2 py-1.5 text-[0.68rem] font-bold text-red-500 transition hover:underline"
                                            >
                                                <IconTrash className="h-3.5 w-3.5 shrink-0" />
                                                Eliminar
                                            </button>
                                        </>
                                    ) : null}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    const actionCell =
        'flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-1 px-1 py-2.5 text-[var(--app-subtle)] transition-colors duration-150 hover:bg-[var(--app-accent)]/12 active:bg-[var(--app-accent)]/18 sm:flex-row sm:gap-1.5 sm:px-2'

    return (
        <article className="relative z-[1] isolate overflow-hidden rounded-3xl border border-[var(--app-subtle)]/20 bg-[var(--app-card)] text-[15px] text-[var(--app-text)] shadow-sm pointer-events-auto">
            <div className="flex gap-3.5 px-4 pt-4 pb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <Link href={authorHref} className="shrink-0 rounded-full ring-2 ring-[var(--app-subtle)]/45 ring-offset-2 ring-offset-[var(--app-card)] transition hover:ring-[var(--app-accent)]/45">
                    <img
                        src={storageUrl(post.user?.avatar_path)}
                        alt=""
                        className="h-11 w-11 rounded-full border border-[var(--app-subtle)]/35 object-cover"
                    />
                </Link>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <Link href={authorHref} className="text-[15px] font-extrabold leading-tight tracking-tight text-[var(--app-text)] transition hover:text-[var(--app-accent)]">
                                {post.user?.name || 'Usuario'}
                            </Link>
                            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--app-subtle)]">{formatFeedDate(post.created_at)}</p>
                            {groupMeta?.id ? (
                                <Link
                                    href={`/comunidad/${groupMeta.id}`}
                                    className="group mt-2 inline-flex max-w-full items-center gap-2 rounded-xl border border-[var(--app-subtle)]/35 bg-[color-mix(in_srgb,var(--app-card)_96%,var(--app-bg)_4%)] px-2.5 py-1.5 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
                                >
                                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-[var(--app-subtle)]/25">
                                        {groupMeta.cover_path ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={storageUrl(groupMeta.cover_path)} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <span
                                                className="h-full w-full"
                                                style={{ backgroundColor: groupMeta.accent_color || '#8b5cf6' }}
                                                aria-hidden
                                            />
                                        )}
                                    </span>
                                    <span className="min-w-0 leading-tight">
                                        <span className="block text-[0.58rem] font-black uppercase tracking-[0.2em] text-[var(--app-subtle)]">Publicado en</span>
                                        <span className="flex min-w-0 items-center gap-1.5">
                                            <span
                                                className="h-2 w-2 shrink-0 rounded-full"
                                                style={{ backgroundColor: groupMeta.accent_color || '#8b5cf6' }}
                                                aria-hidden
                                            />
                                            <span className="truncate text-[0.72rem] font-extrabold text-[var(--app-text)] group-hover:text-[var(--app-accent)]">
                                                {groupMeta.name || 'Grupo'}
                                            </span>
                                        </span>
                                    </span>
                                </Link>
                            ) : null}
                        </div>
                        {canEditPost ? (
                            <div className="relative z-[2] shrink-0" ref={menuRef}>
                                <button
                                    type="button"
                                    onClick={() => setMenuOpen((v) => !v)}
                                    className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-transparent text-[var(--app-subtle)] transition hover:border-[var(--app-subtle)]/40 hover:bg-[var(--app-accent)]/10 active:bg-[var(--app-accent)]/16"
                                    aria-label="Opciones"
                                >
                                    <IconDotsVertical className="h-5 w-5" />
                                </button>
                                {menuOpen ? (
                                    <div className="absolute right-0 z-[80] mt-1 min-w-[10rem] overflow-hidden rounded-xl border border-[var(--app-subtle)]/40 bg-[var(--app-card)] py-1 text-sm text-[var(--app-text)] shadow-lg">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditBody(post.body || '')
                                                setEditPaths([...(post.images || [])])
                                                setEditNewFiles([])
                                                setEditOpen(true)
                                                setMenuOpen(false)
                                            }}
                                            className="block w-full px-3 py-2 text-left font-semibold text-[var(--app-text)] hover:bg-[var(--app-accent)]/12"
                                        >
                                            Editar publicación
                                        </button>
                                        <button
                                            type="button"
                                            onClick={requestDeletePost}
                                            className="block w-full px-3 py-2 text-left font-semibold text-red-600 hover:bg-red-500/10"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {textBody ? (
                <div className="px-4 pb-3 pt-0.5">
                    <p className="whitespace-pre-wrap leading-relaxed text-[var(--app-text)]">{textBody}</p>
                </div>
            ) : null}

            {(post.images || []).length > 0 ? (
                <div className={`px-4 pb-4 ${(post.images || []).length === 1 ? '' : 'grid grid-cols-2 gap-1'}`}>
                    {(post.images || []).length === 1 ? (
                        <div className="overflow-hidden rounded-2xl border border-[var(--app-subtle)]/20 bg-[var(--app-card)]">
                            <AmbientPostImage
                                src={storageUrl((post.images || [])[0])}
                                foregroundClassName="max-h-[min(70vh,520px)] w-full object-contain"
                                onOpen={() => openMediaLightbox(0)}
                            />
                        </div>
                    ) : (
                        (post.images || []).map((img, idx) => (
                            <button
                                key={img}
                                type="button"
                                onClick={() => openMediaLightbox(idx)}
                                className="relative block w-full cursor-zoom-in overflow-hidden rounded-xl text-left ring-1 ring-[var(--app-subtle)]/20 transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={storageUrl(img)}
                                    alt=""
                                    className="aspect-[4/3] w-full object-cover sm:aspect-video"
                                />
                            </button>
                        ))
                    )}
                </div>
            ) : null}

            <div className="border-t border-[var(--app-subtle)]/15 bg-[color-mix(in_srgb,var(--app-card)_88%,var(--app-accent)_12%)] px-2 pb-2 pt-2">
                <div className="grid grid-cols-4 gap-1 overflow-hidden rounded-2xl p-1">
                    <button
                        type="button"
                        onClick={() => reactPost('like')}
                        disabled={!canInteract}
                        className={`${actionCell} rounded-xl bg-[color-mix(in_srgb,var(--app-card)_94%,var(--app-bg)_6%)] disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                        <ReactionLikeIcon className="h-4 w-4 shrink-0 sm:h-[1.125rem] sm:w-[1.125rem]" />
                        <span className="text-[11px] font-bold tabular-nums text-[var(--app-subtle)] sm:text-xs">{likesCount}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => reactPost('dislike')}
                        disabled={!canInteract}
                        className={`${actionCell} rounded-xl bg-[color-mix(in_srgb,var(--app-card)_94%,var(--app-bg)_6%)] disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                        <ReactionLikeIcon flipped className="h-4 w-4 shrink-0 sm:h-[1.125rem] sm:w-[1.125rem]" />
                        <span className="text-[11px] font-bold tabular-nums text-[var(--app-subtle)] sm:text-xs">{dislikesCount}</span>
                    </button>
                    <button type="button" onClick={handleSharePost} className={`${actionCell} rounded-xl bg-[color-mix(in_srgb,var(--app-card)_94%,var(--app-bg)_6%)] text-[var(--app-subtle)]`}>
                        <ShareLinkIcon className="h-4 w-4 shrink-0" />
                        <span className="max-w-full truncate text-[10px] font-bold sm:text-[11px]">Compartir</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setCommentsOpen(true)}
                        className={`${actionCell} rounded-xl bg-[color-mix(in_srgb,var(--app-card)_94%,var(--app-bg)_6%)] text-[var(--app-accent)]`}
                    >
                        <IconChat className="h-4 w-4 shrink-0 sm:h-[1.125rem] sm:w-[1.125rem]" />
                        <span className="max-w-full truncate text-center text-[10px] font-bold sm:text-[11px]">
                            Comentar
                            {totalComments > 0 ? <span className="tabular-nums text-[var(--app-subtle)]"> ({totalComments})</span> : null}
                        </span>
                    </button>
                </div>
            </div>

            {editOpen && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          className={GROUP_MODAL_BACKDROP}
                          role="dialog"
                          aria-modal="true"
                          onMouseDown={(e) => e.target === e.currentTarget && setEditOpen(false)}
                      >
                          <div className="pointer-events-auto flex max-h-[min(90vh,560px)] w-full max-w-lg flex-col rounded-t-2xl border border-[var(--app-subtle)]/35 bg-[var(--app-card)] text-[var(--app-text)] shadow-2xl md:rounded-2xl">
                        <div className="flex items-center justify-between border-b border-[var(--app-subtle)]/20 px-4 py-3">
                            <h2 className="text-base font-bold text-[var(--app-text)]">Editar publicación</h2>
                            <button type="button" onClick={() => setEditOpen(false)} className="rounded-full p-2 text-[var(--app-subtle)] hover:bg-[var(--app-accent)]/12" aria-label="Cerrar">
                                <IconClose className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                            <textarea
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                rows={4}
                                className="w-full rounded-xl border border-[var(--app-subtle)]/30 bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] placeholder:text-[var(--app-subtle)]/60"
                            />
                            <p className="mt-2 text-xs font-semibold text-[var(--app-subtle)]">Imágenes</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {editPaths.map((path) => (
                                    <div key={path} className="relative">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={storageUrl(path)} alt="" className="h-20 w-20 rounded-lg object-cover ring-1 ring-[var(--app-subtle)]/35" />
                                        <button
                                            type="button"
                                            onClick={() => setEditPaths((p) => p.filter((x) => x !== path))}
                                            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <input ref={editFileRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => setEditNewFiles((p) => [...p, ...Array.from(e.target.files || [])])} />
                            <button
                                type="button"
                                onClick={() => editFileRef.current?.click()}
                                className="mt-3 w-full rounded-xl border-2 border-dashed border-[var(--app-subtle)]/35 py-2 text-sm font-bold text-[var(--app-accent)]"
                            >
                                Añadir imágenes
                            </button>
                            {editNewFiles.length > 0 ? <p className="mt-1 text-xs text-[var(--app-subtle)]">{editNewFiles.length} nueva(s) — se subirán al guardar</p> : null}
                        </div>
                        <div className="flex gap-2 border-t border-[var(--app-subtle)]/20 p-4">
                            <button type="button" onClick={() => setEditOpen(false)} className="flex-1 rounded-xl border border-[var(--app-subtle)]/35 py-2.5 text-sm font-bold text-[var(--app-text)]">
                                Cancelar
                            </button>
                            <button type="button" onClick={savePostEdit} className="flex-1 rounded-xl bg-[var(--app-accent)] py-2.5 text-sm font-bold text-white">
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>,
                      document.body
                  )
                : null}

            {mediaLightboxOpen && (post.images || []).length > 0 && typeof document !== 'undefined' ? (
                <PostMediaLightbox
                    open={mediaLightboxOpen}
                    onClose={() => setMediaLightboxOpen(false)}
                    imageUrls={(post.images || []).map((p) => storageUrl(p))}
                    startIndex={mediaLightboxStart}
                    sidebarHeader={
                        <div className="border-b border-[var(--app-subtle)]/35 px-3 py-3">
                            <div className="flex gap-2.5">
                                <Link href={authorHref} className="shrink-0">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={storageUrl(post.user?.avatar_path)}
                                        alt=""
                                        className="h-10 w-10 rounded-full border border-[var(--app-subtle)]/40 object-cover"
                                    />
                                </Link>
                                <div className="min-w-0 flex-1">
                                    <Link href={authorHref} className="text-sm font-bold text-[var(--app-text)] hover:underline">
                                        {post.user?.name || 'Usuario'}
                                    </Link>
                                    <p className="text-[11px] text-[var(--app-subtle)]">{formatFeedDate(post.created_at)}</p>
                                </div>
                            </div>
                            {textBody ? (
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-snug text-[var(--app-text)] md:max-h-32 md:overflow-y-auto">{textBody}</p>
                            ) : null}
                            <div className="mt-3 flex items-center justify-between gap-2 md:flex-wrap md:justify-start">
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={!canInteract}
                                        onClick={() => reactPost('like')}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--app-accent)]/14 px-2.5 py-1.5 text-xs font-bold text-emerald-600 transition hover:bg-[var(--app-accent)]/22 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ReactionLikeIcon className="h-4 w-4 shrink-0" />
                                        <span className="tabular-nums">{likesCount}</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canInteract}
                                        onClick={() => reactPost('dislike')}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--app-subtle)]/12 px-2.5 py-1.5 text-xs font-bold text-[var(--app-text)] transition hover:bg-[var(--app-subtle)]/20 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ReactionLikeIcon flipped className="h-4 w-4 shrink-0" />
                                        <span className="tabular-nums">{dislikesCount}</span>
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSharePost}
                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--app-subtle)]/12 px-2.5 py-1.5 text-xs font-bold text-[var(--app-text)] transition hover:bg-[var(--app-subtle)]/20"
                                >
                                    <ShareLinkIcon className="h-4 w-4 shrink-0" />
                                    <span>Compartir</span>
                                </button>
                            </div>
                        </div>
                    }
                    sidebarBody={
                        <div ref={groupLightboxCommentsListRef} className="bg-[var(--app-bg)] px-2 py-2 sm:px-3">
                            {comments.length === 0 ? (
                                <p className="py-6 text-center text-sm text-[var(--app-subtle)]">Sin comentarios aún.</p>
                            ) : (
                                <div className="space-y-2">{comments.map((cm) => renderCommentNode(cm, 0, false))}</div>
                            )}
                        </div>
                    }
                    sidebarFooter={
                        <div className="border-t border-[var(--app-subtle)]/35 bg-[color-mix(in_srgb,var(--app-card)_97%,var(--app-bg)_3%)] p-3">
                            {canComment ? (
                                <>
                                    {replyParentId ? (
                                        <p className="mb-2 text-xs font-semibold text-[var(--app-accent)]">
                                            Respondiendo a <strong>{replyToName || 'usuario'}</strong>{' '}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReplyParentId(null)
                                                    setReplyToName(null)
                                                }}
                                                className="font-bold underline"
                                            >
                                                Cancelar
                                            </button>
                                        </p>
                                    ) : null}
                                    <textarea
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        rows={2}
                                        placeholder="Escribe un comentario…"
                                        className="w-full rounded-xl border border-[var(--app-subtle)]/45 bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] placeholder:text-[var(--app-subtle)]"
                                    />
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <input
                                            ref={groupLightboxCommentFileRef}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="max-w-full text-[0.7rem] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--app-primary)]/15 file:px-2 file:py-1 file:text-[0.65rem] file:font-bold file:text-[var(--app-text)]"
                                            onChange={(e) => {
                                                appendCommentFiles(e.target.files)
                                                const input = e.target
                                                window.queueMicrotask(() => {
                                                    input.value = ''
                                                })
                                            }}
                                        />
                                        {commentFileEntries.length > 0 ? (
                                            <span className="text-[0.7rem] text-[var(--app-subtle)]">{commentFileEntries.length} imagen(es)</span>
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
                                                        className="h-14 w-14 rounded-lg border border-[var(--app-subtle)]/40 object-contain"
                                                    />
                                                    <button
                                                        type="button"
                                                        title="Quitar imagen"
                                                        onClick={() => removeCommentFileEntry(e.id)}
                                                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--app-text)]/85 text-[10px] font-bold text-[var(--app-card)] shadow"
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
                                        disabled={submittingComment}
                                        className="mt-2 w-full rounded-xl bg-[var(--app-primary)] py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {submittingComment ? 'Publicando…' : 'Publicar comentario'}
                                    </button>
                                    {commentError ? <p className="mt-2 text-xs font-semibold text-red-400">{commentError}</p> : null}
                                </>
                            ) : (
                                <p className="text-center text-xs font-semibold text-[var(--app-subtle)]">
                                    Los administradores desactivaron nuevos comentarios para tu cuenta en este grupo.
                                </p>
                            )}
                        </div>
                    }
                />
            ) : null}

            {commentImageViewerOpen && commentImageViewerUrls.length > 0 && typeof document !== 'undefined' ? (
                <PostMediaLightbox
                    open={commentImageViewerOpen}
                    onClose={closeCommentImageViewer}
                    imageUrls={commentImageViewerUrls}
                    startIndex={commentImageViewerStart}
                    shellClassName="!z-[280]"
                />
            ) : null}

            {commentsOpen && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          className={GROUP_MODAL_BACKDROP}
                          role="dialog"
                          aria-modal="true"
                          onMouseDown={(e) => e.target === e.currentTarget && closeCommentsModal()}
                      >
                          <div className="pointer-events-auto flex max-h-[min(88vh,640px)] w-full max-w-lg flex-col rounded-t-2xl border border-[var(--app-subtle)]/40 bg-[var(--app-card)] text-[var(--app-text)] shadow-2xl md:rounded-2xl">
                        <div className="flex shrink-0 items-center justify-between border-b border-[var(--app-subtle)]/30 px-4 py-3">
                            <h2 className="text-base font-bold text-[var(--app-text)]">
                                Comentarios {totalComments > 0 ? <span className="text-[var(--app-subtle)]">({totalComments})</span> : null}
                            </h2>
                            <button
                                type="button"
                                onClick={closeCommentsModal}
                                className="rounded-full p-2 text-[var(--app-subtle)] transition hover:bg-[var(--app-accent)]/12 hover:text-[var(--app-text)]"
                                aria-label="Cerrar"
                            >
                                <IconClose className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[var(--app-bg)] px-4 py-3">
                            {comments.length === 0 ? (
                                <p className="py-6 text-center text-sm text-[var(--app-subtle)]">Sin comentarios aún.</p>
                            ) : (
                                comments.map((cm) => renderCommentNode(cm, 0, false))
                            )}
                        </div>
                        <div className="shrink-0 border-t border-[var(--app-subtle)]/30 bg-[color-mix(in_srgb,var(--app-card)_97%,var(--app-bg)_3%)] p-3">
                            {canComment ? (
                                <>
                                    {replyParentId ? (
                                        <p className="mb-2 text-xs font-semibold text-[var(--app-accent)]">
                                            Respondiendo a <strong>{replyToName || 'usuario'}</strong>{' '}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReplyParentId(null)
                                                    setReplyToName(null)
                                                }}
                                                className="font-bold underline"
                                            >
                                                Cancelar
                                            </button>
                                        </p>
                                    ) : null}
                                    <textarea
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        rows={2}
                                        placeholder="Escribe un comentario…"
                                        className="w-full rounded-xl border border-[var(--app-subtle)]/45 bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] placeholder:text-[var(--app-subtle)]"
                                    />
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <input
                                            ref={commentFileRef}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="max-w-full text-[0.7rem] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--app-primary)]/15 file:px-2 file:py-1 file:text-[0.65rem] file:font-bold file:text-[var(--app-text)]"
                                            onChange={(e) => {
                                                appendCommentFiles(e.target.files)
                                                const input = e.target
                                                window.queueMicrotask(() => {
                                                    input.value = ''
                                                })
                                            }}
                                        />
                                        {commentFileEntries.length > 0 ? (
                                            <span className="text-[0.7rem] text-[var(--app-subtle)]">{commentFileEntries.length} imagen(es)</span>
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
                                                        className="h-16 w-16 rounded-lg border border-[var(--app-subtle)]/40 bg-[var(--app-card)] object-contain"
                                                    />
                                                    <button
                                                        type="button"
                                                        title="Quitar imagen"
                                                        onClick={() => removeCommentFileEntry(e.id)}
                                                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--app-text)]/85 text-[10px] font-bold text-[var(--app-card)] shadow"
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
                                        disabled={submittingComment}
                                        className="mt-2 w-full rounded-xl bg-[var(--app-primary)] py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {submittingComment ? 'Publicando…' : 'Publicar comentario'}
                                    </button>
                                    {commentError ? <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">{commentError}</p> : null}
                                </>
                            ) : (
                                <p className="text-center text-xs font-semibold text-[var(--app-subtle)]">
                                    Los administradores desactivaron nuevos comentarios para tu cuenta en este grupo.
                                </p>
                            )}
                        </div>
                    </div>
                </div>,
                      document.body
                  )
                : null}

            {threadModalOpen && threadRootComment && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          className={GROUP_THREAD_MODAL_BACKDROP}
                          role="dialog"
                          aria-modal="true"
                          onMouseDown={(e) => e.target === e.currentTarget && closeThreadModal()}
                      >
                          <div className="pointer-events-auto flex max-h-[min(88vh,640px)] w-full max-w-lg flex-col rounded-t-2xl border border-[var(--app-subtle)]/40 bg-[var(--app-card)] text-[var(--app-text)] shadow-2xl md:rounded-2xl">
                              <div className="flex shrink-0 items-center border-b border-[var(--app-subtle)]/30 px-2 py-2 sm:px-3">
                                  <div className="flex min-w-0 flex-1 justify-start">
                                      <button
                                          type="button"
                                          onClick={closeThreadModal}
                                          className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-bold text-[var(--app-text)] transition hover:bg-[var(--app-accent)]/12"
                                      >
                                          <IconArrowLeft className="h-5 w-5 shrink-0" />
                                          <span className="whitespace-nowrap text-xs font-bold sm:text-sm">Regresar</span>
                                      </button>
                                  </div>
                                  <h3 className="shrink-0 truncate px-1 text-center text-base font-bold text-[var(--app-text)]">
                                      Respuestas
                                      {threadFlatRows.length > 0 ? (
                                          <span className="font-semibold text-[var(--app-subtle)]"> ({threadFlatRows.length})</span>
                                      ) : null}
                                  </h3>
                                  <div className="flex flex-1 justify-end">
                                      <button
                                          type="button"
                                          onClick={closeThreadModal}
                                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-[var(--app-subtle)] transition hover:bg-[var(--app-accent)]/12 hover:text-[var(--app-text)]"
                                          aria-label="Cerrar respuestas"
                                      >
                                          <IconClose className="h-5 w-5" />
                                      </button>
                                  </div>
                              </div>
                              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[var(--app-bg)] px-4 py-3">
                                  {renderCommentNode(threadRootComment, 0, true)}
                                  {threadFlatRows.length > 0 ? (
                                      <div className="space-y-2">
                                          {threadFlatRows.map(({ c: rowC, inReplyTo }) => (
                                              <div key={`thread-${rowC.id}`} className="pl-2">
                                                  {renderCommentNode(rowC, 0, true, inReplyTo || null)}
                                              </div>
                                          ))}
                                      </div>
                                  ) : (
                                      <p className="text-center text-sm text-[var(--app-subtle)]">Aún no hay respuestas en este hilo.</p>
                                  )}
                              </div>
                              <div className="shrink-0 border-t border-[var(--app-subtle)]/30 bg-[color-mix(in_srgb,var(--app-card)_97%,var(--app-bg)_3%)] p-3">
                                  {canComment ? (
                                      <>
                                          {threadReplyParentId != null ? (
                                              <p className="mb-2 text-xs font-semibold text-[var(--app-accent)]">
                                                  Respondiendo a <strong>{threadReplyToName || 'usuario'}</strong>{' '}
                                                  <button
                                                      type="button"
                                                      onClick={() => {
                                                          setThreadReplyParentId(null)
                                                          setThreadReplyToName(null)
                                                      }}
                                                      className="font-bold underline"
                                                  >
                                                      Cancelar
                                                  </button>
                                              </p>
                                          ) : null}
                                          <textarea
                                              value={threadText}
                                              onChange={(e) => setThreadText(e.target.value)}
                                              rows={2}
                                              placeholder="Escribe una respuesta…"
                                              className="w-full rounded-xl border border-[var(--app-subtle)]/45 bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] placeholder:text-[var(--app-subtle)]"
                                          />
                                          <div className="mt-2 flex flex-wrap items-center gap-2">
                                              <input
                                                  ref={threadModalFileRef}
                                                  type="file"
                                                  accept="image/*"
                                                  multiple
                                                  className="max-w-full text-[0.7rem] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--app-primary)]/15 file:px-2 file:py-1 file:text-[0.65rem] file:font-bold file:text-[var(--app-text)]"
                                                  onChange={(e) => {
                                                      appendThreadFiles(e.target.files)
                                                      const input = e.target
                                                      window.queueMicrotask(() => {
                                                          input.value = ''
                                                      })
                                                  }}
                                              />
                                              {threadFileEntries.length > 0 ? (
                                                  <span className="text-[0.7rem] text-[var(--app-subtle)]">{threadFileEntries.length} imagen(es)</span>
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
                                                              className="h-16 w-16 rounded-lg border border-[var(--app-subtle)]/40 bg-[var(--app-card)] object-contain"
                                                          />
                                                          <button
                                                              type="button"
                                                              title="Quitar imagen"
                                                              onClick={() => removeThreadFileEntry(e.id)}
                                                              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--app-text)]/85 text-[10px] font-bold text-[var(--app-card)] shadow"
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
                                              disabled={submittingThreadComment}
                                              className="mt-2 w-full rounded-xl bg-[var(--app-primary)] py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                                          >
                                              {submittingThreadComment ? 'Publicando…' : 'Publicar respuesta'}
                                          </button>
                                          {threadCommentError ? (
                                              <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">{threadCommentError}</p>
                                          ) : null}
                                      </>
                                  ) : (
                                      <p className="text-center text-xs font-semibold text-[var(--app-subtle)]">
                                          Los administradores desactivaron nuevos comentarios para tu cuenta en este grupo.
                                      </p>
                                  )}
                              </div>
                          </div>
                      </div>,
                      document.body
                  )
                : null}

            {confirmDelete && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          className={GROUP_MODAL_BACKDROP}
                          role="dialog"
                          aria-modal="true"
                          onMouseDown={(e) => e.target === e.currentTarget && setConfirmDelete(null)}
                      >
                          <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-[var(--app-subtle)]/35 bg-[var(--app-card)] p-4 text-[var(--app-text)] shadow-2xl">
                              <h3 className="text-base font-bold text-[var(--app-text)]">{confirmDelete.title}</h3>
                              <p className="mt-2 text-sm text-[var(--app-subtle)]">{confirmDelete.message}</p>
                              <div className="mt-4 flex gap-2">
                                  <button
                                      type="button"
                                      onClick={() => setConfirmDelete(null)}
                                      className="flex-1 rounded-xl border border-[var(--app-subtle)]/35 py-2 text-sm font-bold text-[var(--app-text)]"
                                  >
                                      Cancelar
                                  </button>
                                  <button
                                      type="button"
                                      onClick={runConfirmDelete}
                                      className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-bold text-white hover:bg-red-700"
                                  >
                                      {confirmDelete.actionLabel}
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
