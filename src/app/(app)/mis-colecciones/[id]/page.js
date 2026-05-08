'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import axios from '@/lib/axios'
import { misColeccionPath, parseMisColeccionRouteParam } from '@/lib/misColeccionPath'
import AppHero from '@/components/coleccionador/AppHero'
import PageFade from '@/components/coleccionador/PageFade'
import RaritySelect from '@/components/coleccionador/RaritySelect'
import { RARITY_OPTIONS } from '@/lib/rarityOptions'
import { storageUrl } from '@/lib/storageUrl'

function parseMaybeJsonObject(value) {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null
    try {
        const parsed = JSON.parse(trimmed)
        return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
        return null
    }
}

/**
 * Payload del escáner en `description`:
 * - Nuevo: `catalog` (datos canónicos de BD) + `ocr_reading` (lo que leyó Vision) + `matched_stamp_id` / `score`.
 * - Legado: `ocr` (parser) anidado, sin `catalog`.
 */
function parseScanPayload(item) {
    const root = parseMaybeJsonObject(item?.description)
    if (!root) return null
    const catalog = root.catalog && typeof root.catalog === 'object' ? root.catalog : null
    const nested = root.ocr && typeof root.ocr === 'object' ? root.ocr : null
    const flat = !catalog && !nested && (root.raw_text != null || root.player_name != null) ? root : null
    const display = catalog || nested || flat
    if (!display) return null
    const isScan =
        catalog != null ||
        nested != null ||
        typeof root.matched_stamp_id === 'number' ||
        typeof root.score === 'number' ||
        display.raw_text != null ||
        display.player_name != null
    if (!isScan) return null
    return { root, ocr: display, fromCatalog: !!catalog }
}

/** Convierte `raw_text` del OCR en líneas legibles (sin llaves JSON ni ruido). */
function linesFromOcrRawText(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return []
    let t = raw.trim()
    if (t.startsWith('{')) t = t.replace(/^\{\s*/, '')
    if (t.endsWith('}')) t = t.replace(/\s*\}\s*$/, '')
    return t
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .filter((l) => !/^\s*["']?[\w_]+["']?\s*:\s*/.test(l))
}

function getStampViewData(item) {
    const payload = parseScanPayload(item)
    if (!payload) return null
    const { ocr, fromCatalog } = payload
    const detailLines = fromCatalog ? [] : linesFromOcrRawText(ocr.raw_text || '')
    const playerName = (ocr.player_name || detailLines[0] || item?.title || '').trim() || null
    const number = ocr.external_code || item?.ref_number || null

    return {
        playerName,
        number,
        country: ocr.country_code || null,
        club: ocr.club || null,
        dob: ocr.dob || null,
        height: ocr.height || null,
        weight: ocr.weight || null,
        statsLine: ocr.stats_line || null,
        detailLines: detailLines.filter((l) => l !== playerName),
    }
}

/** Texto plano para el textarea de edición (nunca JSON del sistema). */
function scanPayloadToEditNotes(item) {
    const view = getStampViewData(item)
    if (!view) return ''
    const parts = []
    if (view.country) parts.push(`País: ${view.country}`)
    if (view.club) parts.push(`Club: ${view.club}`)
    if (view.dob) parts.push(`Nacimiento: ${view.dob}`)
    if (view.height || view.weight) {
        const hw = [view.height ? `Altura: ${view.height}` : '', view.weight ? `Peso: ${view.weight}` : ''].filter(Boolean).join(' · ')
        if (hw) parts.push(hw)
    }
    if (view.statsLine) parts.push(`Datos: ${view.statsLine}`)
    if (view.detailLines?.length) parts.push(...view.detailLines)
    return parts.join('\n').trim()
}

export default function ColeccionDetallePage() {
    const params = useParams()
    const router = useRouter()
    const pathname = usePathname()
    const routeSegment = params?.id
    const collectionId = useMemo(() => parseMisColeccionRouteParam(routeSegment).id, [routeSegment])
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [editingItemId, setEditingItemId] = useState(null)
    const [draftTitle, setDraftTitle] = useState('')
    const [draftRefNumber, setDraftRefNumber] = useState('')
    const [draftDescription, setDraftDescription] = useState('')
    const [draftQuantity, setDraftQuantity] = useState(1)
    const [draftRarity, setDraftRarity] = useState('C')
    const [draftImagePath, setDraftImagePath] = useState(null)
    const [draftNewImageEntry, setDraftNewImageEntry] = useState(null)
    const draftFileInputRef = useRef(null)
    const [savingEdit, setSavingEdit] = useState(false)

    const loadCollection = useCallback(async () => {
        if (!collectionId) return
        try {
            const { data: payload } = await axios.get(`/collections/${collectionId}`)
            setData(payload)
            setError('')
        } catch {
            setError('No se pudo cargar la colección.')
        }
    }, [collectionId])

    useEffect(() => {
        if (!routeSegment) return
        if (!collectionId) {
            setError('Enlace de colección no válido.')
            setData(null)
            return
        }
        setError('')
        loadCollection()
    }, [loadCollection, collectionId, routeSegment])

    const canonicalPath = useMemo(() => (data?.id ? misColeccionPath(data.id, data.name) : null), [data?.id, data?.name])

    useEffect(() => {
        if (!canonicalPath || !pathname) return
        if (pathname === canonicalPath) return
        router.replace(canonicalPath, { scroll: false })
    }, [canonicalPath, pathname, router])

    const clearDraftNewImage = useCallback(() => {
        setDraftNewImageEntry((prev) => {
            if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl)
            return null
        })
    }, [])

    useEffect(
        () => () => {
            clearDraftNewImage()
        },
        [clearDraftNewImage]
    )

    const startEdit = useCallback(
        (it) => {
            clearDraftNewImage()
            setEditingItemId(it.id)
            setDraftTitle(it.title || '')
            setDraftRefNumber(it.ref_number || '')
            setDraftDescription(parseScanPayload(it) ? scanPayloadToEditNotes(it) : it.description || '')
            setDraftQuantity(it.quantity || 1)
            setDraftRarity(it.rarity_code || 'C')
            setDraftImagePath(it.image_path || null)
        },
        [clearDraftNewImage]
    )

    const cancelEdit = useCallback(() => {
        setEditingItemId(null)
        setDraftTitle('')
        setDraftRefNumber('')
        setDraftDescription('')
        setDraftQuantity(1)
        setDraftRarity('C')
        setDraftImagePath(null)
        clearDraftNewImage()
        if (draftFileInputRef.current) draftFileInputRef.current.value = ''
    }, [clearDraftNewImage])

    const rarityLabel = (code) => RARITY_OPTIONS.find((r) => r.code === code)?.label || code

    return (
        <PageFade>
            <AppHero
                eyebrow="Detalle"
                title={data?.name || 'Colección'}
                subtitle="Piezas registradas con número, nombre y rareza."
            >
                <Link href={`/escanear?collectionId=${collectionId}`} className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur">
                    Agregar pieza
                </Link>
            </AppHero>

            <div className="relative z-[1] mx-auto max-w-6xl space-y-3 px-4 pb-14 -mt-3">
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                {data?.items?.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900/50">
                        Esta colección aún no tiene piezas registradas.
                    </div>
                ) : null}
                <div
                    className="grid items-stretch gap-4 sm:gap-5"
                    style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))' }}
                >
                    {(data?.items || []).map((it) => (
                        (() => {
                            const stampData = getStampViewData(it)
                            const descriptionText = stampData ? '' : (it.description || '')
                            return (
                        <div
                            key={it.id}
                            className={`group relative flex h-full min-h-[16rem] min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-4 shadow-md ring-1 ring-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:ring-[var(--app-accent)]/25 dark:border-slate-600/70 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)] dark:ring-white/10 dark:hover:ring-[var(--app-accent)]/35 ${
                                editingItemId === it.id ? 'col-span-full' : ''
                            }`}
                        >
                        {editingItemId === it.id ? (
                            <div className="space-y-2">
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <input
                                        value={draftTitle}
                                        onChange={(e) => setDraftTitle(e.target.value)}
                                        placeholder="Nombre"
                                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                                    />
                                    <input
                                        value={draftRefNumber}
                                        onChange={(e) => setDraftRefNumber(e.target.value)}
                                        placeholder="Número / referencia"
                                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                                    />
                                </div>
                                <textarea
                                    value={draftDescription}
                                    onChange={(e) => setDraftDescription(e.target.value)}
                                    placeholder="Descripción"
                                    rows={3}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        min={1}
                                        value={draftQuantity}
                                        onChange={(e) => setDraftQuantity(e.target.value)}
                                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                                    />
                                    <RaritySelect value={draftRarity} onChange={setDraftRarity} />
                                </div>
                                <input
                                    ref={draftFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return
                                        clearDraftNewImage()
                                        setDraftNewImageEntry({ file, previewUrl: URL.createObjectURL(file) })
                                        const input = e.target
                                        window.queueMicrotask(() => {
                                            input.value = ''
                                        })
                                    }}
                                />
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => draftFileInputRef.current?.click()}
                                        className="rounded-xl border-2 border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-[var(--app-accent)] dark:border-slate-600"
                                    >
                                        {draftNewImageEntry ? 'Cambiar imagen' : 'Elegir imagen'}
                                    </button>
                                    {(draftNewImageEntry?.previewUrl || draftImagePath) ? (
                                        <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={draftNewImageEntry?.previewUrl || storageUrl(draftImagePath)} alt="" className="h-full w-full object-cover" />
                                        </div>
                                    ) : null}
                                    {draftNewImageEntry || draftImagePath ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                clearDraftNewImage()
                                                setDraftImagePath(null)
                                            }}
                                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 dark:border-slate-600 dark:text-slate-200"
                                        >
                                            Quitar
                                        </button>
                                    ) : null}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!draftTitle.trim()) return
                                            setSavingEdit(true)
                                            try {
                                                let nextImagePath = draftImagePath
                                                if (draftNewImageEntry?.file) {
                                                    const fd = new FormData()
                                                    fd.append('file', draftNewImageEntry.file)
                                                    const up = await axios.post('/uploads', fd)
                                                    nextImagePath = up.data?.path || null
                                                }
                                                await axios.patch(`/collections/${collectionId}/items/${it.id}`, {
                                                    title: draftTitle.trim(),
                                                    ref_number: draftRefNumber || null,
                                                    description: draftDescription || null,
                                                    quantity: Number(draftQuantity) || 1,
                                                    rarity_code: draftRarity,
                                                    image_path: nextImagePath || null,
                                                })
                                                await loadCollection()
                                                cancelEdit()
                                            } finally {
                                                setSavingEdit(false)
                                            }
                                        }}
                                        disabled={savingEdit || !draftTitle.trim()}
                                        className="rounded-xl bg-[var(--app-accent)] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                                    >
                                        {savingEdit ? 'Guardando…' : 'Guardar'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-600"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex min-h-0 flex-1 flex-col">
                                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--app-accent)] via-indigo-500 to-fuchsia-500 opacity-80" aria-hidden />
                                <div className="grid min-h-0 flex-1 grid-cols-[minmax(8.5rem,10.5rem)_1fr] items-stretch gap-4 sm:grid-cols-[minmax(10rem,12rem)_1fr] sm:gap-5">
                                    <div className="relative h-full min-h-[11rem] w-full min-w-0 self-stretch overflow-hidden rounded-2xl border-2 border-white/70 bg-slate-100 shadow-lg ring-2 ring-slate-900/10 dark:border-slate-600/80 dark:bg-slate-800 dark:ring-white/10">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={it.image_path ? storageUrl(it.image_path) : '/Imagenes/caja.png'}
                                            alt=""
                                            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                                        />
                                    </div>
                                    <div className="flex h-full min-h-0 min-w-0 flex-col justify-between rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-3.5 shadow-inner dark:border-slate-600/60 dark:from-slate-800/90 dark:to-slate-900/80 sm:p-4">
                                        <div>
                                            <p
                                                className={`text-base font-black tracking-tight text-slate-900 dark:text-white sm:text-lg ${
                                                    stampData ? 'uppercase' : ''
                                                }`}
                                            >
                                                {stampData?.playerName || it.title}
                                            </p>
                                            <div className="mt-2.5 flex flex-wrap gap-2">
                                                <span className="inline-flex items-center rounded-full bg-slate-200/90 px-3 py-1 text-xs font-extrabold text-slate-800 dark:bg-slate-700/90 dark:text-slate-100">
                                                    Número: {stampData?.number || it.ref_number || '—'}
                                                </span>
                                                <span className="inline-flex items-center rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-extrabold text-indigo-800 ring-1 ring-indigo-500/25 dark:bg-indigo-500/20 dark:text-indigo-100 dark:ring-indigo-400/30">
                                                    Rareza: {rarityLabel(it.rarity_code)}
                                                </span>
                                                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-extrabold text-emerald-800 ring-1 ring-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-100 dark:ring-emerald-400/30">
                                                    Cantidad: {it.quantity}
                                                </span>
                                            </div>

                                            {stampData ? (
                                                <div className="mt-3 space-y-2.5 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                                                    <div className="grid grid-cols-1 gap-1.5 text-[13px] sm:text-sm">
                                                        {stampData.country ? <p>País: {stampData.country}</p> : null}
                                                        {stampData.club ? <p>Club: {stampData.club}</p> : null}
                                                        {stampData.dob ? <p>Nacimiento: {stampData.dob}</p> : null}
                                                        {(stampData.height || stampData.weight) ? (
                                                            <p>
                                                                {stampData.height ? `Altura: ${stampData.height}` : ''}
                                                                {stampData.height && stampData.weight ? ' · ' : ''}
                                                                {stampData.weight ? `Peso: ${stampData.weight}` : ''}
                                                            </p>
                                                        ) : null}
                                                        {stampData.statsLine ? <p className="line-clamp-2">Datos: {stampData.statsLine}</p> : null}
                                                    </div>
                                                    {stampData.detailLines?.length ? (
                                                        <ul className="list-none space-y-1.5 border-t border-slate-200/80 pt-2.5 text-[13px] leading-snug text-slate-600 dark:border-slate-600/60 dark:text-slate-400 sm:text-sm">
                                                            {stampData.detailLines.slice(0, 12).map((line, idx) => (
                                                                <li key={idx} className="flex gap-2 break-words">
                                                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--app-accent)]" aria-hidden />
                                                                    <span>{line}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : null}
                                                </div>
                                            ) : (
                                                <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                                    {descriptionText || 'Sin descripcion.'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-auto flex shrink-0 flex-wrap gap-2 border-t border-slate-200/70 pt-3 dark:border-slate-700/70">
                                    <button
                                        type="button"
                                        onClick={() => startEdit(it)}
                                        className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-800 shadow-sm transition hover:border-[var(--app-accent)]/40 hover:text-[var(--app-accent)] dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-[var(--app-accent)]/50 sm:flex-none sm:min-w-[7.5rem]"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            await axios.delete(`/collections/${collectionId}/items/${it.id}`)
                                            await loadCollection()
                                        }}
                                        className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-xl border-2 border-red-300/80 bg-red-50/90 px-4 text-sm font-extrabold text-red-700 transition hover:bg-red-100 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70 sm:flex-none sm:min-w-[7.5rem]"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                            )
                        })()
                    ))}
                </div>
            </div>
        </PageFade>
    )
}
