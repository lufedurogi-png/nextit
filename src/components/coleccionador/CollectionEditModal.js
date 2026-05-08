'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { storageUrl } from '@/lib/storageUrl'

/**
 * Modal para editar nombre, color y portada de una colección.
 * Vista previa de la imagen nueva antes de guardar.
 */
export default function CollectionEditModal({
    open,
    onClose,
    name,
    onNameChange,
    accentColor,
    onAccentColorChange,
    currentCoverPath,
    newCoverPreviewUrl,
    fileInputRef,
    onCoverFileChange,
    onPickCover,
    onClearNewCover,
    onSave,
    saving = false,
    errorText = '',
}) {
    const titleId = useId()
    const panelRef = useRef(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!open) return
        const onKey = (e) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = prev
        }
    }, [open, onClose])

    useEffect(() => {
        if (!open) return
        const nameInput = panelRef.current?.querySelector('input[name="collection-edit-name"]')
        nameInput?.focus()
    }, [open])

    if (!open || !mounted) return null

    const showCurrent = !newCoverPreviewUrl && currentCoverPath

    return createPortal(
        <div
            className="fixed inset-0 z-[300] flex items-end justify-center p-2 sm:items-center sm:p-4 md:pl-72 xl:pr-[22rem]"
            role="presentation"
        >
            <button
                type="button"
                className="absolute inset-0 bg-transparent"
                aria-label="Cerrar"
                onClick={onClose}
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative z-[1] max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-900 sm:p-5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <p id={titleId} className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                            Editar colección
                        </p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Nombre, color de acento y portada.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 dark:border-slate-600 dark:text-slate-200"
                    >
                        Cerrar
                    </button>
                </div>

                <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
                        Nombre
                        <input
                            name="collection-edit-name"
                            type="text"
                            value={name}
                            onChange={(e) => onNameChange(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold dark:border-slate-600 dark:bg-slate-950 dark:text-slate-50"
                            placeholder="Nombre de la colección"
                        />
                    </label>

                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Color</span>
                        <input
                            type="color"
                            value={accentColor}
                            onChange={(e) => onAccentColorChange(e.target.value)}
                            className="h-10 w-14 cursor-pointer rounded-xl border border-slate-200 bg-white dark:border-slate-600"
                        />
                        <span className="text-xs font-mono text-slate-500">{accentColor}</span>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Portada</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={onCoverFileChange}
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={onPickCover}
                                className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-2 text-xs font-bold text-[var(--app-accent)] dark:border-slate-600 dark:bg-slate-800/80"
                            >
                                Elegir imagen
                            </button>
                            {newCoverPreviewUrl ? (
                                <button
                                    type="button"
                                    onClick={onClearNewCover}
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300"
                                >
                                    Quitar nueva
                                </button>
                            ) : null}
                        </div>
                        <div className="mt-3 flex items-start gap-3">
                            <div className="relative h-28 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-800">
                                {newCoverPreviewUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={newCoverPreviewUrl} alt="" className="h-full w-full object-cover" />
                                ) : showCurrent ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={storageUrl(currentCoverPath)} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src="/Imagenes/caja.png" alt="" className="h-12 w-12 object-contain opacity-70" />
                                        <span className="text-[10px] font-semibold text-slate-500">Sin portada aún</span>
                                    </div>
                                )}
                            </div>
                            <p className="max-w-[12rem] text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                                {newCoverPreviewUrl
                                    ? 'Así se verá la portada al guardar. Pulsa «Guardar cambios» para subirla.'
                                    : 'La imagen actual de la colección. Elige otra para reemplazarla.'}
                            </p>
                        </div>
                    </div>
                </div>

                {errorText ? <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-400">{errorText}</p> : null}

                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saving || !name.trim()}
                        className="rounded-2xl bg-[var(--app-accent)] px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
                    >
                        {saving ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
