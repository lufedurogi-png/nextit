'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { storageUrl } from '@/lib/storageUrl'
import ProfileNewPostForm from '@/components/coleccionador/ProfileNewPostForm'

function IconPhoto({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
        </svg>
    )
}

/**
 * Barra “¿Qué estás pensando…?” que al tocarla se sustituye por el formulario de publicación (sin modal).
 */
export default function CreatePostPromptBar({ user, onPublished }) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef(null)
    const firstName = (user?.name || '').trim().split(/\s+/)[0] || 'coleccionista'

    const close = useCallback(() => setOpen(false), [])

    useEffect(() => {
        if (!open) return
        const onKey = (e) => {
            if (e.key === 'Escape') close()
        }
        const onPointerDown = (e) => {
            const el = rootRef.current
            if (!el || el.contains(e.target)) return
            close()
        }
        document.addEventListener('keydown', onKey)
        document.addEventListener('pointerdown', onPointerDown, true)
        return () => {
            document.removeEventListener('keydown', onKey)
            document.removeEventListener('pointerdown', onPointerDown, true)
        }
    }, [open, close])

    const handlePublished = useCallback(
        (post) => {
            onPublished?.(post)
            close()
        },
        [onPublished, close]
    )

    return (
        <section
            ref={rootRef}
            className="rounded-3xl border border-[var(--app-subtle)]/25 bg-[var(--app-card)] p-3 shadow-sm"
            aria-expanded={open}
        >
            {!open ? (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-[var(--app-subtle)]/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={storageUrl(user?.avatar_path)} alt="" className="h-full w-full object-cover" />
                    </div>
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="min-h-[44px] min-w-0 flex-1 rounded-full border border-[var(--app-subtle)]/30 bg-[color-mix(in_srgb,var(--app-bg)_88%,var(--app-card)_12%)] px-4 py-2.5 text-left text-sm font-semibold text-[var(--app-subtle)] transition hover:border-[var(--app-accent)]/35 hover:bg-[color-mix(in_srgb,var(--app-card)_92%,var(--app-bg)_8%)]"
                    >
                        ¿Qué estás pensando, {firstName}?
                    </button>
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-emerald-600 transition hover:bg-emerald-500/10"
                        aria-label="Añadir fotos a la publicación"
                    >
                        <IconPhoto className="h-6 w-6" />
                    </button>
                </div>
            ) : (
                <ProfileNewPostForm showCloseButton onClose={close} onPublished={handlePublished} />
            )}
        </section>
    )
}
