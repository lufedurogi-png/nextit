'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'next/navigation'
import axios from '@/lib/axios'
import { compressImageForUpload, createImageEntriesFromFileList } from '@/lib/compressImageForUpload'
import PageFade from '@/components/coleccionador/PageFade'
import { storageUrl } from '@/lib/storageUrl'
import { useAuth } from '@/hooks/auth'
import GroupPostCard from '@/components/coleccionador/GroupPostCard'

function parseRulesText(rules) {
    if (!rules) return []
    return String(rules)
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean)
}

export default function GrupoDetallePage() {
    const params = useParams()
    const { user } = useAuth({})
    const id = params?.id
    const [group, setGroup] = useState(null)
    const [postBody, setPostBody] = useState('')
    const [postEntries, setPostEntries] = useState([])
    const postFilesRef = useRef(null)
    const [publishing, setPublishing] = useState(false)
    const [compressingPostImages, setCompressingPostImages] = useState(false)
    const [postMessage, setPostMessage] = useState('')

    const [rulesOpen, setRulesOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [editGroupName, setEditGroupName] = useState('')
    const [editGroupDesc, setEditGroupDesc] = useState('')
    const [editIncludeRules, setEditIncludeRules] = useState(false)
    const [editRuleList, setEditRuleList] = useState([''])
    const [editGroupColor, setEditGroupColor] = useState('#8b5cf6')
    const [editCoverEntry, setEditCoverEntry] = useState(null)
    const editCoverInputRef = useRef(null)
    const [savingGroup, setSavingGroup] = useState(false)
    const [deletingGroup, setDeletingGroup] = useState(false)

    const load = useCallback(async () => {
        if (!id) return
        try {
            const { data } = await axios.get(`/groups/${id}`)
            setGroup(data)
        } catch {
            setGroup(null)
        }
    }, [id])

    useEffect(() => {
        load()
    }, [load])

    const myMember = useMemo(() => (group?.members || []).find((m) => Number(m.user_id) === Number(user?.id)), [group, user?.id])
    const canModerate = ['owner', 'admin'].includes(myMember?.role)
    const isOwner = myMember?.role === 'owner' || Number(group?.owner_id) === Number(user?.id)
    const groupRulesList = useMemo(() => parseRulesText(group?.rules), [group?.rules])

    const canPost = !myMember ? false : isOwner || myMember?.can_post !== false
    const canComment = !myMember ? false : isOwner || myMember?.can_comment !== false

    const clearPostEntries = useCallback(() => {
        setPostEntries((prev) => {
            prev.forEach((e) => URL.revokeObjectURL(e.previewUrl))
            return []
        })
    }, [])

    useEffect(
        () => () => {
            clearPostEntries()
        },
        [clearPostEntries]
    )

    const clearEditCover = useCallback(() => {
        setEditCoverEntry((prev) => {
            if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl)
            return null
        })
    }, [])

    useEffect(
        () => () => {
            clearEditCover()
        },
        [clearEditCover]
    )

    const openEditModal = () => {
        if (!group) return
        setEditGroupName(group.name || '')
        setEditGroupDesc(group.description || '')
        const lines = parseRulesText(group.rules)
        if (lines.length) {
            setEditIncludeRules(true)
            setEditRuleList(lines)
        } else {
            setEditIncludeRules(false)
            setEditRuleList([''])
        }
        setEditGroupColor(group.accent_color || '#8b5cf6')
        clearEditCover()
        if (editCoverInputRef.current) editCoverInputRef.current.value = ''
        setEditOpen(true)
    }

    const join = async () => {
        await axios.post(`/groups/${id}/join`)
        await load()
    }

    const leave = async () => {
        await axios.delete(`/groups/${id}/leave`)
        await load()
    }

    const appendPostFiles = async (fileList) => {
        const files = Array.from(fileList || []).filter((f) => f instanceof File && f.size > 0)
        if (!files.length) return
        setCompressingPostImages(true)
        try {
            const entries = await createImageEntriesFromFileList(files)
            if (!entries.length) return
            setPostEntries((prev) => [...prev, ...entries])
        } finally {
            setCompressingPostImages(false)
        }
    }

    const removePostEntry = (entryId) => {
        setPostEntries((prev) => {
            const found = prev.find((x) => x.id === entryId)
            if (found) URL.revokeObjectURL(found.previewUrl)
            return prev.filter((x) => x.id !== entryId)
        })
    }

    const createPost = async () => {
        const text = postBody.trim()
        if (!text && postEntries.length === 0) return
        if (!canPost) return
        setPublishing(true)
        setPostMessage('')
        try {
            const images = []
            for (const e of postEntries) {
                const fd = new FormData()
                fd.append('file', e.file)
                const up = await axios.post('/uploads', fd)
                if (up.data?.path) images.push(up.data.path)
            }
            const payload = {
                images: images.length ? images : null,
            }
            if (text) payload.body = text
            await axios.post(`/groups/${id}/posts`, payload)
            setPostBody('')
            clearPostEntries()
            if (postFilesRef.current) postFilesRef.current.value = ''
            await load()
        } catch (err) {
            const data = err?.response?.data
            const fieldMsg = data?.errors?.body?.[0]
            const msg = fieldMsg || data?.message || 'No se pudo publicar.'
            setPostMessage(typeof msg === 'string' ? msg : 'No se pudo publicar.')
        } finally {
            setPublishing(false)
        }
    }

    const saveGroupSettings = async () => {
        if (!id || savingGroup) return
        setSavingGroup(true)
        try {
            let coverPath
            if (editCoverEntry?.file) {
                const fd = new FormData()
                fd.append('file', editCoverEntry.file)
                const up = await axios.post('/uploads', fd)
                coverPath = up.data?.path || null
            }
            const parsedRules = editIncludeRules ? editRuleList.map((r) => r.trim()).filter(Boolean) : []
            await axios.patch(`/groups/${id}`, {
                name: editGroupName.trim(),
                description: editGroupDesc.trim() || null,
                rules: parsedRules.length ? parsedRules.join('\n') : null,
                accent_color: editGroupColor,
                ...(coverPath ? { cover_path: coverPath } : {}),
            })
            clearEditCover()
            if (editCoverInputRef.current) editCoverInputRef.current.value = ''
            setEditOpen(false)
            await load()
        } catch {
            // ignorar
        } finally {
            setSavingGroup(false)
        }
    }

    const confirmDeleteGroup = async () => {
        if (!id || deletingGroup) return
        setDeletingGroup(true)
        try {
            await axios.delete(`/groups/${id}`)
            window.location.href = '/comunidad'
        } catch {
            setDeletingGroup(false)
        }
    }

    const patchMemberFlags = async (memberId, payload) => {
        await axios.patch(`/groups/${id}/members/${memberId}`, payload)
        await load()
    }

    const removeMember = async (memberId, ban) => {
        await axios.delete(`/groups/${id}/members/${memberId}`, { data: ban ? { ban: true } : {} })
        await load()
    }

    const toggleMemberAdmin = async (m) => {
        if (m.role === 'owner') return
        await axios.patch(`/groups/${id}/members/${m.id}`, { role: m.role === 'admin' ? 'member' : 'admin' })
        await load()
    }

    const coverSrc = group?.cover_path ? storageUrl(group.cover_path) : '/Imagenes/caja.png'

    return (
        <PageFade>
            <div className="relative z-[1] mx-auto max-w-6xl px-4 pb-14">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/80"
                >
                    <div className="relative min-h-[220px] md:min-h-[280px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
                        <div className="pointer-events-none absolute left-4 top-4">
                            <Link
                                href="/comunidad"
                                className="pointer-events-auto inline-flex rounded-full border border-white/40 bg-black/30 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur hover:bg-black/45"
                            >
                                ← Comunidad
                            </Link>
                        </div>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 md:p-6">
                            <div className="pointer-events-auto flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                                <div className="min-w-0 text-white">
                                    <p className="text-[0.65rem] font-black uppercase tracking-[0.28em] text-white/80">Grupo</p>
                                    <h1 className="mt-1 truncate text-2xl font-black tracking-tight md:text-3xl">{group?.name || 'Cargando…'}</h1>
                                    <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-white/90">{group?.description || ' '}</p>
                                    <p className="mt-2 text-xs font-bold text-white/75">{(group?.members || []).length} miembros</p>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRulesOpen(true)}
                                        className="rounded-2xl border border-white/50 bg-black/30 px-4 py-2 text-xs font-bold text-white backdrop-blur hover:bg-black/45"
                                    >
                                        Reglas
                                    </button>
                                    {canModerate ? (
                                        <button
                                            type="button"
                                            onClick={openEditModal}
                                            className="rounded-2xl border border-white/50 bg-black/30 px-4 py-2 text-xs font-bold text-white backdrop-blur hover:bg-black/45"
                                        >
                                            Editar
                                        </button>
                                    ) : null}
                                    {isOwner ? (
                                        <button
                                            type="button"
                                            onClick={() => setDeleteOpen(true)}
                                            className="rounded-2xl border border-red-300/80 bg-red-600/85 px-4 py-2 text-xs font-extrabold text-white hover:bg-red-600"
                                        >
                                            Eliminar
                                        </button>
                                    ) : null}
                                    {!myMember ? (
                                        <button
                                            type="button"
                                            onClick={join}
                                            className="rounded-2xl bg-[var(--app-accent)] px-4 py-2 text-xs font-extrabold text-white shadow-lg"
                                        >
                                            Unirme
                                        </button>
                                    ) : myMember.role !== 'owner' ? (
                                        <button
                                            type="button"
                                            onClick={leave}
                                            className="rounded-2xl border border-white/60 bg-white/15 px-4 py-2 text-xs font-bold text-white hover:bg-white/25"
                                        >
                                            Salir
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 p-4 md:p-6">
                        {myMember ? (
                            <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                                <p className="text-sm font-bold text-slate-900 dark:text-slate-50">Nueva publicación</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Misma idea que en tu perfil: texto opcional y varias imágenes.</p>
                                <textarea
                                    value={postBody}
                                    onChange={(e) => setPostBody(e.target.value)}
                                    rows={3}
                                    maxLength={5000}
                                    disabled={!canPost}
                                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
                                    placeholder="¿Qué quieres compartir con el grupo?"
                                />
                                <div className="mt-2">
                                    <input
                                        ref={postFilesRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        disabled={!canPost}
                                        className="w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-200 file:px-2 file:py-1.5 file:text-xs file:font-bold disabled:opacity-50 dark:text-slate-300 dark:file:bg-slate-700"
                                        onChange={(e) => {
                                            void appendPostFiles(e.target.files)
                                            const input = e.target
                                            window.queueMicrotask(() => {
                                                input.value = ''
                                            })
                                        }}
                                    />
                                    {compressingPostImages ? (
                                        <p className="mt-1 text-xs font-semibold text-slate-500">Optimizando imágenes…</p>
                                    ) : null}
                                    {postEntries.length > 0 ? (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {postEntries.map((entry) => (
                                                <div key={entry.id} className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={entry.previewUrl} alt="" className="h-full w-full object-cover" />
                                                    <button
                                                        type="button"
                                                        title="Quitar"
                                                        onClick={() => removePostEntry(entry.id)}
                                                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] font-bold text-white"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                                {!canPost ? (
                                    <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">Un administrador desactivó nuevas publicaciones para tu cuenta en este grupo.</p>
                                ) : null}
                                {postMessage ? <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">{postMessage}</p> : null}
                                <button
                                    type="button"
                                    onClick={createPost}
                                    disabled={publishing || compressingPostImages || !canPost || (!postBody.trim() && postEntries.length === 0)}
                                    className="mt-3 w-full rounded-2xl bg-[var(--app-primary)] py-2.5 text-sm font-extrabold text-white shadow-md transition hover:opacity-95 disabled:opacity-45"
                                >
                                    {publishing ? 'Publicando…' : 'Publicar'}
                                </button>
                            </section>
                        ) : (
                            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-600">
                                Únete al grupo para ver y crear publicaciones.
                            </p>
                        )}

                        <div className="space-y-3">
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Publicaciones del grupo</p>
                            {(group?.posts || []).length === 0 ? (
                                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-600">Aún no hay publicaciones.</p>
                            ) : (
                                (group?.posts || []).map((post) => (
                                    <GroupPostCard
                                        key={post.id}
                                        post={post}
                                        groupId={id}
                                        currentUserId={user?.id}
                                        canModerate={canModerate}
                                        canComment={canComment}
                                        canInteract={Boolean(myMember)}
                                        onRefresh={load}
                                        onPostDeleted={(postId) =>
                                            setGroup((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          posts: (prev.posts || []).filter((x) => x.id !== postId),
                                                      }
                                                    : prev
                                            )
                                        }
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {rulesOpen && typeof document !== 'undefined'
                ? createPortal(
                <div className="fixed inset-0 z-[400] flex max-md:items-start max-md:justify-center max-md:overflow-y-auto max-md:p-3 max-md:pt-[max(0.5rem,env(safe-area-inset-top))] max-md:pb-[max(0.5rem,env(safe-area-inset-bottom))] md:items-center md:justify-center md:overflow-hidden md:p-2 md:pl-72 md:pr-6 md:py-6">
                    <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-transparent" onClick={() => setRulesOpen(false)} />
                    <div role="dialog" aria-modal="true" className="relative z-[1] max-h-[min(88dvh,calc(100dvh-1.25rem))] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-900 md:max-h-[88vh]">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Reglas del grupo</p>
                            <button
                                type="button"
                                onClick={() => setRulesOpen(false)}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-600"
                            >
                                Cerrar
                            </button>
                        </div>
                        {groupRulesList.length ? (
                            <ul className="mt-3 space-y-2">
                                {groupRulesList.map((rule, idx) => (
                                    <li
                                        key={`rule-${idx}`}
                                        className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm dark:border-slate-700 dark:bg-slate-950/60"
                                    >
                                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--app-accent)]/15 text-[11px] font-black text-[var(--app-accent)]">
                                            {idx + 1}
                                        </span>
                                        <span>{rule}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">Este grupo no tiene reglas definidas.</p>
                        )}
                    </div>
                </div>,
                document.body
            )
                : null}

            {editOpen && group && typeof document !== 'undefined'
                ? createPortal(
                <div className="fixed inset-0 z-[400] flex max-md:items-start max-md:justify-center max-md:overflow-y-auto max-md:p-3 max-md:pt-[max(0.5rem,env(safe-area-inset-top))] max-md:pb-[max(0.5rem,env(safe-area-inset-bottom))] md:items-center md:justify-center md:overflow-hidden md:p-2 md:pl-72 md:pr-6 md:py-6">
                    <button
                        type="button"
                        aria-label="Cerrar"
                        className="absolute inset-0 bg-transparent"
                        onClick={() => {
                            setEditOpen(false)
                            clearEditCover()
                        }}
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="relative z-[1] max-h-[min(92dvh,calc(100dvh-1.25rem))] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-900 md:max-h-[92vh] md:p-5"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Editar grupo</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditOpen(false)
                                    clearEditCover()
                                }}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-600"
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className="mt-3 space-y-3">
                            <input
                                value={editGroupName}
                                onChange={(e) => setEditGroupName(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-50"
                                placeholder="Nombre"
                            />
                            <textarea
                                value={editGroupDesc}
                                onChange={(e) => setEditGroupDesc(e.target.value)}
                                rows={3}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-50"
                                placeholder="Descripción"
                            />
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-xs font-bold text-slate-500">Color</span>
                                <input type="color" value={editGroupColor} onChange={(e) => setEditGroupColor(e.target.value)} className="h-9 w-14 rounded-xl border" />
                            </div>
                            <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-600">
                                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Reglas</p>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <p className="text-xs text-slate-500">Activa para editar reglas numeradas.</p>
                                    <button
                                        type="button"
                                        onClick={() => setEditIncludeRules((v) => !v)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${editIncludeRules ? 'bg-[var(--app-accent)]' : 'bg-slate-300 dark:bg-slate-700'}`}
                                    >
                                        <span
                                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${editIncludeRules ? 'translate-x-5' : 'translate-x-0.5'}`}
                                        />
                                    </button>
                                </div>
                                {editIncludeRules ? (
                                    <div className="mt-3 space-y-2">
                                        {editRuleList.map((rule, idx) => (
                                            <div key={`er-${idx}`} className="flex items-center gap-2">
                                                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--app-accent)]/15 text-xs font-black text-[var(--app-accent)]">
                                                    {idx + 1}
                                                </span>
                                                <input
                                                    value={rule}
                                                    onChange={(e) => {
                                                        const next = [...editRuleList]
                                                        next[idx] = e.target.value
                                                        setEditRuleList(next)
                                                    }}
                                                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
                                                    placeholder={`Regla ${idx + 1}`}
                                                />
                                                {editRuleList.length > 1 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditRuleList(editRuleList.filter((_, j) => j !== idx))}
                                                        className="text-xs font-bold text-red-600"
                                                    >
                                                        Quitar
                                                    </button>
                                                ) : null}
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setEditRuleList((p) => [...p, ''])}
                                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-600"
                                        >
                                            + Agregar regla
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                            <div>
                                <input
                                    ref={editCoverInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={async (e) => {
                                        const raw = e.target.files?.[0]
                                        const input = e.target
                                        window.queueMicrotask(() => {
                                            input.value = ''
                                        })
                                        if (!raw) return
                                        clearEditCover()
                                        let file = raw
                                        try {
                                            file = await compressImageForUpload(raw)
                                        } catch {
                                            file = raw
                                        }
                                        setEditCoverEntry({ file, previewUrl: URL.createObjectURL(file) })
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => editCoverInputRef.current?.click()}
                                    className="rounded-xl border-2 border-dashed border-slate-300 px-4 py-2 text-xs font-bold text-[var(--app-accent)] dark:border-slate-600"
                                >
                                    Cambiar portada
                                </button>
                                {editCoverEntry ? (
                                    <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 p-2 dark:border-slate-600">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={editCoverEntry.previewUrl} alt="" className="h-20 w-32 rounded-lg object-cover" />
                                        <button type="button" onClick={clearEditCover} className="text-xs font-bold text-slate-600">
                                            Quitar
                                        </button>
                                    </div>
                                ) : null}
                            </div>

                            <div className="rounded-2xl border border-slate-200 dark:border-slate-600">
                                <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-slate-950/50">
                                    Miembros
                                </p>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[520px] text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                                                <th className="px-3 py-2 font-bold">Usuario</th>
                                                <th className="px-2 py-2 font-bold">Rol</th>
                                                <th className="px-2 py-2 font-bold">Publicar</th>
                                                <th className="px-2 py-2 font-bold">Comentar</th>
                                                <th className="px-3 py-2 font-bold">Admin / acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(group.members || []).map((m) => {
                                                const isRowOwner = m.role === 'owner'
                                                const canPostM = m.can_post !== false
                                                const canCommentM = m.can_comment !== false
                                                return (
                                                    <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800">
                                                        <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100">{m.user?.name || '—'}</td>
                                                        <td className="px-2 py-2 uppercase text-slate-500">{m.role}</td>
                                                        <td className="px-2 py-2">
                                                            {isRowOwner ? (
                                                                <span className="text-slate-400">—</span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => patchMemberFlags(m.id, { can_post: !canPostM })}
                                                                    className={`rounded-full px-2 py-0.5 font-bold ${canPostM ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
                                                                >
                                                                    {canPostM ? 'Sí' : 'No'}
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            {isRowOwner ? (
                                                                <span className="text-slate-400">—</span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => patchMemberFlags(m.id, { can_comment: !canCommentM })}
                                                                    className={`rounded-full px-2 py-0.5 font-bold ${canCommentM ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
                                                                >
                                                                    {canCommentM ? 'Sí' : 'No'}
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {isRowOwner ? (
                                                                <span className="text-slate-400">—</span>
                                                            ) : (
                                                                <div className="flex flex-col gap-1.5">
                                                                    {isOwner ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleMemberAdmin(m)}
                                                                            className="text-left text-[11px] font-bold text-[var(--app-accent)]"
                                                                        >
                                                                            {m.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                                                                        </button>
                                                                    ) : null}
                                                                    {isOwner ? (
                                                                        <>
                                                                            <button type="button" onClick={() => removeMember(m.id, false)} className="text-left text-[11px] font-bold text-red-600">
                                                                                Expulsar
                                                                            </button>
                                                                            <button type="button" onClick={() => removeMember(m.id, true)} className="text-left text-[11px] font-bold text-red-800">
                                                                                Expulsar y bloquear
                                                                            </button>
                                                                        </>
                                                                    ) : canModerate ? (
                                                                        <button type="button" onClick={() => removeMember(m.id, false)} className="text-left text-[11px] font-bold text-red-600">
                                                                            Expulsar
                                                                        </button>
                                                                    ) : null}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {isOwner ? (
                                    <p className="border-t border-slate-200 px-3 py-2 text-[10px] text-slate-500 dark:border-slate-700">
                                        «Expulsar y bloquear» impide que esa cuenta vuelva a unirse.
                                    </p>
                                ) : null}
                            </div>

                            <button
                                type="button"
                                onClick={saveGroupSettings}
                                disabled={savingGroup || !editGroupName.trim()}
                                className="w-full rounded-2xl bg-[var(--app-accent)] py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
                            >
                                {savingGroup ? 'Guardando…' : 'Guardar cambios'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )
                : null}

            {deleteOpen && typeof document !== 'undefined'
                ? createPortal(
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-3 md:pl-72 md:pr-6">
                    <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-transparent" onClick={() => setDeleteOpen(false)} />
                    <div className="relative z-[1] w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-900">
                        <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50">¿Eliminar este grupo para siempre?</p>
                        <p className="mt-1 text-xs text-slate-500">Se borrarán publicaciones y miembros asociados.</p>
                        <div className="mt-4 flex gap-2">
                            <button
                                type="button"
                                onClick={confirmDeleteGroup}
                                disabled={deletingGroup}
                                className="rounded-2xl bg-red-600 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-60"
                            >
                                {deletingGroup ? 'Eliminando…' : 'Sí, eliminar'}
                            </button>
                            <button type="button" onClick={() => setDeleteOpen(false)} className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-bold dark:border-slate-600">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )
                : null}
        </PageFade>
    )
}
