'use client'

import { useState } from 'react'
import { storageUrl } from '@/lib/storageUrl'

export default function CollectionFolderCard({
    collection,
    selected = false,
    onAddPiece,
    onEdit,
    onOpen,
    onDelete,
}) {
    const accent = collection?.accent_color || '#6366f1'
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)

    return (
        <div
            role={onOpen ? 'button' : undefined}
            tabIndex={onOpen ? 0 : undefined}
            onClick={() => onOpen?.()}
            onKeyDown={(e) => {
                if (!onOpen) return
                // Evita que Enter/Espacio en un botón interno dispare el "open" del contenedor.
                if (e.target instanceof HTMLElement && e.target.closest('button')) return
                if (e.key === 'Enter' || e.key === ' ') onOpen?.()
            }}
            className={`overflow-hidden rounded-3xl border bg-white/95 shadow-sm transition dark:bg-slate-900/75 ${
                onOpen ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/40' : ''
            } ${
                selected
                    ? 'border-[var(--app-accent)] ring-2 ring-[var(--app-accent)]/35'
                    : 'border-slate-200 dark:border-slate-700'
            }`}
        >
            <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={collection?.cover_path ? storageUrl(collection.cover_path) : '/Imagenes/caja.png'}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                />
            </div>
            <div className="p-3">
                <div
                    className="mb-2 h-1.5 w-full rounded-full"
                    style={{ backgroundColor: accent }}
                    aria-hidden
                />
                <p className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-50">{collection?.name || 'Colección'}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{collection?.items_count ?? 0} piezas</p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            onAddPiece?.()
                        }}
                        className="w-full rounded-lg bg-[var(--app-accent)] px-2 py-1.5 text-[11px] font-bold text-white"
                    >
                        Agregar
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            onEdit?.()
                        }}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-bold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                    >
                        Editar
                    </button>
                </div>
                {onDelete ? (
                    !confirmDeleteOpen ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                setConfirmDeleteOpen(true)
                            }}
                            className="mt-1.5 w-full rounded-lg border border-red-200 px-2 py-1.5 text-[11px] font-bold text-red-600 dark:border-red-900/60 dark:text-red-400"
                        >
                            Eliminar
                        </button>
                    ) : (
                        <div
                            className="mt-1.5 rounded-lg border border-red-200 bg-red-50 p-2 dark:border-red-900/60 dark:bg-red-950/30"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <p className="text-[11px] font-semibold text-red-700 dark:text-red-300">¿Eliminar esta colección?</p>
                            <div className="mt-1.5 flex gap-1.5">
                                <button
                                    type="button"
                                    onClick={async (e) => {
                                        e.stopPropagation()
                                        if (!onDelete || deleting) return
                                        setDeleting(true)
                                        try {
                                            await onDelete()
                                            setConfirmDeleteOpen(false)
                                        } catch {
                                            // Evita error no controlado en UI si backend responde 404/403/etc.
                                        } finally {
                                            setDeleting(false)
                                        }
                                    }}
                                    disabled={deleting}
                                    className="flex-1 rounded-md bg-red-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                    {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setConfirmDeleteOpen(false)
                                    }}
                                    className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )
                ) : null}
            </div>
        </div>
    )
}
