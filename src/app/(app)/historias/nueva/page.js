'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from '@/lib/axios'
import AmbientPostImage from '@/components/coleccionador/AmbientPostImage'
import AppHero from '@/components/coleccionador/AppHero'
import PageFade from '@/components/coleccionador/PageFade'
import { prepareStoryImageForUpload } from '@/lib/prepareStoryImage'
import { storageUrl } from '@/lib/storageUrl'

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

const serializeOverlayList = (items) => {
    const cleaned = (items || [])
        .map((item) => ({
            text: String(item?.text ?? '').trim(),
            x: Math.max(5, Math.min(95, Number(item?.x ?? 50))),
            y: Math.max(8, Math.min(92, Number(item?.y ?? 50))),
        }))
        .filter((item) => item.text)
    return cleaned.length ? JSON.stringify(cleaned) : null
}

export default function NuevaHistoriaPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const editId = Number(searchParams.get('edit') || 0)
    const fileRef = useRef(null)
    const previewRef = useRef(null)
    const [imageEntry, setImageEntry] = useState(null)
    const [existingImagePath, setExistingImagePath] = useState('')
    const [overlayTexts, setOverlayTexts] = useState([])
    const [publishing, setPublishing] = useState(false)
    const [preparingImage, setPreparingImage] = useState(false)
    const [loadingEdit, setLoadingEdit] = useState(false)
    const [error, setError] = useState('')
    const [draggingIndex, setDraggingIndex] = useState(null)
    const dragStateRef = useRef(null)

    const clearImage = useCallback(() => {
        setImageEntry((prev) => {
            if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl)
            return null
        })
        if (fileRef.current) fileRef.current.value = ''
    }, [])

    useEffect(
        () => () => {
            clearImage()
        },
        [clearImage]
    )

    useEffect(() => {
        if (!editId) {
            setExistingImagePath('')
            return
        }
        let cancelled = false
        ;(async () => {
            setLoadingEdit(true)
            setError('')
            try {
                const { data } = await axios.get(`/stories/${editId}`)
                if (cancelled) return
                if (!data?.is_owner) {
                    setError('No puedes editar esta historia.')
                    setExistingImagePath('')
                    return
                }
                const st = data?.story
                setExistingImagePath(st?.image_path || '')
                setOverlayTexts(parseOverlayToList(st?.text_overlay))
                clearImage()
            } catch {
                if (!cancelled) setError('No se pudo cargar la historia.')
            } finally {
                if (!cancelled) setLoadingEdit(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [editId, clearImage])

    const publish = async () => {
        const isEdit = Boolean(editId)
        if (isEdit) {
            if (!existingImagePath && !imageEntry?.file) return
        } else if (!imageEntry?.file) {
            return
        }
        setPublishing(true)
        setError('')
        try {
            let imagePath = existingImagePath
            if (imageEntry?.file) {
                const fd = new FormData()
                fd.append('file', imageEntry.file)
                const up = await axios.post('/uploads', fd)
                imagePath = up.data?.path
                if (!imagePath) throw new Error('No se pudo subir la imagen')
            }
            if (isEdit) {
                await axios.patch(`/stories/${editId}`, {
                    image_path: imagePath,
                    text_overlay: serializeOverlayList(overlayTexts),
                })
                router.replace(`/historias/${editId}`)
            } else {
                const { data } = await axios.post('/stories', {
                    image_path: imagePath,
                    text_overlay: serializeOverlayList(overlayTexts),
                })
                router.replace(`/historias/${data?.id || ''}`)
            }
        } catch (err) {
            const apiMsg = err?.response?.data?.message
            const validation =
                err?.response?.data?.errors &&
                typeof err.response.data.errors === 'object' &&
                Object.values(err.response.data.errors).flat()?.[0]
            const status = err?.response?.status
            let fallback = isEdit ? 'No se pudo guardar la historia.' : 'No se pudo publicar la historia.'
            if (status === 413) fallback = 'La imagen sigue siendo demasiado pesada. Prueba otra foto o recorta antes de subir.'
            else if (status === 422) fallback = 'Formato o tamaño no válido en el servidor.'
            setError(String(apiMsg || validation || err?.message || fallback))
        } finally {
            setPublishing(false)
        }
    }

    const previewSrc = imageEntry?.previewUrl || (existingImagePath ? storageUrl(existingImagePath) : '')
    const isEdit = Boolean(editId)
    const canSubmit = isEdit ? Boolean(existingImagePath || imageEntry?.file) : Boolean(imageEntry?.file)
    const addOverlayText = (event) => {
        if (!previewRef.current) return
        const rect = previewRef.current.getBoundingClientRect()
        const clickX = ((event.clientX - rect.left) / rect.width) * 100
        const clickY = ((event.clientY - rect.top) / rect.height) * 100
        const x = Math.max(5, Math.min(95, clickX))
        const y = Math.max(8, Math.min(92, clickY))
        setOverlayTexts((prev) => [...prev, { text: '', x, y }])
    }

    useEffect(() => {
        const onPointerMove = (event) => {
            const drag = dragStateRef.current
            const rect = previewRef.current?.getBoundingClientRect()
            if (!drag || !rect) return
            event.preventDefault()
            const dxPct = ((event.clientX - drag.startX) / rect.width) * 100
            const dyPct = ((event.clientY - drag.startY) / rect.height) * 100
            const nextX = Math.max(5, Math.min(95, drag.originX + dxPct))
            const nextY = Math.max(8, Math.min(92, drag.originY + dyPct))
            setOverlayTexts((prev) => prev.map((row, i) => (i === drag.index ? { ...row, x: nextX, y: nextY } : row)))
        }

        const onPointerUp = () => {
            dragStateRef.current = null
            setDraggingIndex(null)
        }

        window.addEventListener('pointermove', onPointerMove, { passive: false })
        window.addEventListener('pointerup', onPointerUp)
        window.addEventListener('pointercancel', onPointerUp)
        return () => {
            window.removeEventListener('pointermove', onPointerMove)
            window.removeEventListener('pointerup', onPointerUp)
            window.removeEventListener('pointercancel', onPointerUp)
        }
    }, [])

    return (
        <PageFade>
            <AppHero
                eyebrow="Historias"
                title={isEdit ? 'Editar historia' : 'Nueva historia'}
                subtitle={isEdit ? 'Cambia la imagen o el texto y guarda.' : 'Sube una foto y agrega texto como en Instagram.'}
            />
            <div className="relative z-[1] mx-auto max-w-6xl space-y-3 px-4 pb-14 -mt-3">
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    {loadingEdit ? <p className="text-sm text-slate-500">Cargando…</p> : null}
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={async (e) => {
                            const file = e.target.files?.[0]
                            const input = e.target
                            window.queueMicrotask(() => {
                                input.value = ''
                            })
                            if (!(file instanceof File) || file.size <= 0) return
                            clearImage()
                            setError('')
                            setPreparingImage(true)
                            try {
                                const prepared = await prepareStoryImageForUpload(file)
                                setImageEntry({
                                    file: prepared,
                                    previewUrl: URL.createObjectURL(prepared),
                                })
                            } catch (prepErr) {
                                setError(prepErr?.message || 'No se pudo preparar la imagen.')
                            } finally {
                                setPreparingImage(false)
                            }
                        }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                        >
                            {isEdit ? 'Cambiar imagen' : 'Seleccionar imagen'}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                clearImage()
                                if (isEdit) setExistingImagePath('')
                            }}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                        >
                            Quitar
                        </button>
                    </div>

                    {preparingImage ? (
                        <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
                            Optimizando imagen para subir…
                        </p>
                    ) : null}

                    {previewSrc && !preparingImage ? (
                        <div
                            ref={previewRef}
                            onClick={(e) => addOverlayText(e)}
                            className="relative mt-3 block w-full overflow-hidden rounded-xl border border-slate-200 bg-[var(--app-card)] dark:border-slate-600"
                        >
                            <AmbientPostImage
                                src={previewSrc}
                                containerClassName="min-h-[62vh] h-[62vh]"
                                innerClassName="min-h-[62vh] h-full w-full"
                                foregroundClassName="max-h-[62vh] w-full object-contain"
                            />
                            {overlayTexts.map((item, idx) => (
                                <div
                                    key={`preview-${idx}`}
                                    style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%, -50%)' }}
                                    className="absolute z-10 flex max-w-[75%] items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        type="button"
                                        aria-label="Mover texto"
                                        onPointerDown={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            dragStateRef.current = {
                                                index: idx,
                                                startX: e.clientX,
                                                startY: e.clientY,
                                                originX: item.x,
                                                originY: item.y,
                                            }
                                            setDraggingIndex(idx)
                                        }}
                                        className={`cursor-grab touch-none rounded-lg px-2 py-1 text-xs font-black text-white ${draggingIndex === idx ? 'bg-[var(--app-accent)]' : 'bg-black/55'}`}
                                    >
                                        ↕
                                    </button>
                                    <input
                                        value={item.text}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            setOverlayTexts((prev) => prev.map((row, i) => (i === idx ? { ...row, text: v } : row)))
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        placeholder="Escribe aqui..."
                                        className="w-full rounded-xl border border-white/40 bg-black/45 px-3 py-1.5 text-center text-sm font-semibold text-white placeholder:text-white/75"
                                    />
                                    <button
                                        type="button"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={() => setOverlayTexts((prev) => prev.filter((_, i) => i !== idx))}
                                        className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white"
                                    >
                                        X
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="mt-3 grid h-[62vh] w-full place-items-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-center transition hover:border-[var(--app-accent)] dark:border-slate-600 dark:bg-slate-950/60"
                        >
                            <div>
                                <p className="text-4xl font-black text-[var(--app-accent)]">+</p>
                                <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">Toca para cargar una historia</p>
                            </div>
                        </button>
                    )}

                    {previewSrc ? <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Toca la imagen para crear texto justo en ese punto.</p> : null}

                    {error ? <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">{error}</p> : null}

                    <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => router.back()} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-bold dark:border-slate-600">
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={publish}
                            disabled={publishing || preparingImage || !canSubmit || loadingEdit}
                            className="flex-1 rounded-xl bg-[var(--app-accent)] py-2 text-sm font-bold text-white disabled:opacity-60"
                        >
                            {publishing ? (isEdit ? 'Guardando…' : 'Publicando…') : isEdit ? 'Guardar cambios' : 'Publicar historia'}
                        </button>
                    </div>
                </div>
            </div>
        </PageFade>
    )
}
