'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import axios from '@/lib/axios'
import { createImageEntriesFromFileList } from '@/lib/compressImageForUpload'
import { emitVikuChanSignal } from '@/lib/vikuChanSignals'

/**
 * Formulario de nueva publicación de perfil (POST /feed).
 * Misma lógica que en /perfil; al publicar aparece en Inicio (Descubrir / Para ti).
 */
export default function ProfileNewPostForm({ onPublished, onClose, showCloseButton = false, className = '' }) {
    const [newPost, setNewPost] = useState('')
    const [newPostEntries, setNewPostEntries] = useState([])
    const [publishingPost, setPublishingPost] = useState(false)
    const [newPostMessage, setNewPostMessage] = useState('')
    const [compressingImages, setCompressingImages] = useState(false)
    const newPostFilesRef = useRef(null)

    const clearNewPostEntries = useCallback(() => {
        setNewPostEntries((prev) => {
            prev.forEach((e) => URL.revokeObjectURL(e.previewUrl))
            return []
        })
    }, [])

    const appendNewPostFiles = useCallback(async (fileList) => {
        const files = Array.from(fileList || []).filter((f) => f instanceof File && f.size > 0)
        if (files.length === 0) return
        setCompressingImages(true)
        try {
            const entries = await createImageEntriesFromFileList(files)
            if (entries.length === 0) return
            setNewPostEntries((prev) => [...prev, ...entries])
        } finally {
            setCompressingImages(false)
        }
    }, [])

    const removeNewPostEntry = useCallback((id) => {
        setNewPostEntries((prev) => {
            const found = prev.find((x) => x.id === id)
            if (found) URL.revokeObjectURL(found.previewUrl)
            return prev.filter((x) => x.id !== id)
        })
    }, [])

    useEffect(
        () => () => {
            clearNewPostEntries()
        },
        [clearNewPostEntries]
    )

    const publishPost = async () => {
        const body = newPost.trim()
        if (!body && newPostEntries.length === 0) return
        setPublishingPost(true)
        setNewPostMessage('')
        const fd = new FormData()
        if (body) fd.append('body', body)
        newPostEntries.forEach((e) => fd.append('images[]', e.file))
        try {
            const { data } = await axios.post('/feed', fd)
            const createdPost =
                data && typeof data === 'object'
                    ? {
                          ...data,
                          comments: Array.isArray(data.comments) ? data.comments : [],
                          likes_count: data.likes_count ?? 0,
                          dislikes_count: data.dislikes_count ?? 0,
                      }
                    : null

            setNewPost('')
            clearNewPostEntries()
            if (newPostFilesRef.current) newPostFilesRef.current.value = ''
            emitVikuChanSignal('compose')
            if (createdPost?.id) onPublished?.(createdPost)
            else onPublished?.()
            onClose?.()
        } catch (err) {
            const msg =
                err.response?.data?.errors?.images?.[0] ||
                err.response?.data?.errors?.['images.0']?.[0] ||
                err.response?.data?.message ||
                'No se pudo crear la publicación. Verifica que las imágenes sean jpeg, png, jpg, gif o webp.'
            setNewPostMessage(msg)
        } finally {
            setPublishingPost(false)
        }
    }

    return (
        <div className={`relative ${className}`.trim()}>
            {showCloseButton && onClose ? (
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-0 top-0 grid h-9 w-9 place-items-center rounded-full text-[var(--app-subtle)] transition hover:bg-[var(--app-accent)]/12 hover:text-[var(--app-text)]"
                    aria-label="Cerrar"
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                </button>
            ) : null}
            <p className={`text-sm font-bold text-[var(--app-text)] ${showCloseButton ? 'pr-10' : ''}`}>Nueva publicación</p>
            <p className="text-xs text-[var(--app-subtle)]">
                También aparecerá en Inicio para tus seguidores de la comunidad. Las fotos se optimizan al elegirlas.
            </p>
            <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                rows={3}
                maxLength={5000}
                className="mt-2 w-full rounded-2xl border border-[var(--app-subtle)]/35 bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] placeholder:text-[var(--app-subtle)]/60"
                placeholder="¿Qué coleccionas hoy? Muestra un hallazgo o busca un faltante…"
            />
            <div className="mt-2">
                <input
                    ref={newPostFilesRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="w-full text-xs text-[var(--app-subtle)] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--app-primary)]/15 file:px-2 file:py-1.5 file:text-xs file:font-bold file:text-[var(--app-text)]"
                    onChange={(e) => {
                        void appendNewPostFiles(e.target.files)
                        const input = e.target
                        window.queueMicrotask(() => {
                            input.value = ''
                        })
                    }}
                />
                {compressingImages ? (
                    <p className="mt-1 text-xs font-semibold text-[var(--app-subtle)]">Optimizando imágenes…</p>
                ) : null}
                {newPostEntries.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {newPostEntries.map((entry) => (
                            <div
                                key={entry.id}
                                className="relative h-16 w-16 overflow-hidden rounded-lg border border-[var(--app-subtle)]/35"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={entry.previewUrl} alt="" className="h-full w-full object-cover" />
                                <button
                                    type="button"
                                    title="Quitar"
                                    onClick={() => removeNewPostEntry(entry.id)}
                                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] font-bold text-white"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
            {newPostMessage ? <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">{newPostMessage}</p> : null}
            <button
                type="button"
                onClick={publishPost}
                disabled={publishingPost || compressingImages || (!newPost.trim() && newPostEntries.length === 0)}
                className="mt-2 w-full rounded-2xl bg-[var(--app-primary)] py-2.5 text-sm font-extrabold text-white shadow-md transition hover:opacity-95 disabled:opacity-45"
            >
                {publishingPost ? 'Publicando…' : 'Publicar'}
            </button>
        </div>
    )
}
