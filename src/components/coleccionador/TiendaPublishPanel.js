'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from '@/lib/axios'
import { storageUrl } from '@/lib/storageUrl'
import { TIENDA_CATEGORIAS } from '@/lib/tiendaCategories'
import { getTiendaFieldClass, IconList, IconSell, tiendaHeaderGradient, tiendaIconBox, tiendaSectionShell } from '@/components/coleccionador/TiendaSectionCard'

const TIENDA_INTERNAL_NAME = '__ventas_tienda__'

function PrettyDropdown({ value, onChange, options, placeholder = 'Selecciona…', className = '', disabled = false }) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef(null)

    useEffect(() => {
        const onDocClick = (ev) => {
            if (!rootRef.current?.contains(ev.target)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [])

    const selected = options.find((opt) => String(opt.value) === String(value))

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (disabled) return
                    setOpen((v) => !v)
                }}
                className={`relative w-full rounded-2xl border px-3 py-2.5 text-left text-sm font-semibold shadow-sm transition ${
                    disabled
                        ? 'cursor-not-allowed border-slate-200/70 bg-slate-100/90 text-slate-400 dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-slate-500'
                        : 'border-slate-200/80 bg-white/95 text-slate-700 hover:border-[var(--app-accent)]/40 dark:border-slate-600/80 dark:bg-slate-900/80 dark:text-slate-200'
                }`}
            >
                <span className="block truncate pr-8">{selected?.label || placeholder}</span>
                <span
                    className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition ${
                        open ? 'rotate-180 text-[var(--app-accent)]' : ''
                    }`}
                    aria-hidden
                >
                    ▾
                </span>
            </button>

            {open && !disabled ? (
                <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl ring-1 ring-slate-100 dark:border-slate-600/60 dark:bg-slate-900 dark:ring-slate-700">
                    <div className="max-h-64 overflow-y-auto p-1.5">
                        {options.map((opt) => {
                            const active = String(opt.value) === String(value)
                            return (
                                <button
                                    key={String(opt.value)}
                                    type="button"
                                    onClick={() => {
                                        onChange(String(opt.value))
                                        setOpen(false)
                                    }}
                                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                                        active
                                            ? 'bg-[var(--app-accent)]/12 font-bold text-[var(--app-accent)]'
                                            : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-800/70'
                                    }`}
                                >
                                    <span className="line-clamp-1">{opt.label}</span>
                                    {active ? <span aria-hidden>✓</span> : null}
                                </button>
                            )
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    )
}

/**
 * Bloque plegable “cortina” con dos flujos: publicación manual con fotos o desde inventario.
 */
export default function TiendaPublishPanel({ onPublished, activeListingsCount = 0 }) {
    const [open, setOpen] = useState(false)
    const [mode, setMode] = useState('manual')
    const [saving, setSaving] = useState(false)
    const [err, setErr] = useState('')

    const [collections, setCollections] = useState([])
    const [collectionId, setCollectionId] = useState('')
    const [items, setItems] = useState([])
    const [itemId, setItemId] = useState('')

    const [manualName, setManualName] = useState('')
    const [manualBrand, setManualBrand] = useState('')
    const [manualCategory, setManualCategory] = useState(TIENDA_CATEGORIAS[0] || 'Otros')
    const [manualDesc, setManualDesc] = useState('')
    const [manualQty, setManualQty] = useState(1)
    const [manualPrice, setManualPrice] = useState('')
    const [manualPreviews, setManualPreviews] = useState([])

    const [colBrand, setColBrand] = useState('')
    const [colTitle, setColTitle] = useState('')
    const [colCategory, setColCategory] = useState(TIENDA_CATEGORIAS[0] || 'Otros')
    const [colDesc, setColDesc] = useState('')
    const [colQty, setColQty] = useState(1)
    const [colPrice, setColPrice] = useState('')
    const [colExtraPreviews, setColExtraPreviews] = useState([])
    const [includeItemImage, setIncludeItemImage] = useState(true)

    const apiErrMsg = (e, fallback) => {
        const data = e?.response?.data
        if (typeof data?.message === 'string' && data.message.trim()) return data.message
        if (typeof data === 'string' && data.trim()) return data.slice(0, 220)
        if (data?.errors && typeof data.errors === 'object') {
            const first = Object.values(data.errors).flat()?.[0]
            if (typeof first === 'string' && first.trim()) return first
        }
        if (typeof e?.message === 'string' && e.message.trim()) return e.message
        return fallback
    }

    const loadCols = useCallback(async () => {
        try {
            const { data } = await axios.get('/collections')
            const list = (Array.isArray(data) ? data : []).filter(
                (c) => (c.items_count || 0) > 0 && c.name !== TIENDA_INTERNAL_NAME && c.category !== 'tienda_interna'
            )
            setCollections(list)
        } catch {
            setCollections([])
        }
    }, [])

    useEffect(() => {
        if (open) loadCols()
    }, [open, loadCols])

    const selectedItem = useMemo(() => items.find((it) => String(it.id) === String(itemId)) || null, [items, itemId])
    const selectedCollection = useMemo(() => collections.find((c) => String(c.id) === String(collectionId)) || null, [collections, collectionId])

    useEffect(() => {
        if (!itemId) return
        const it = items.find((i) => String(i.id) === String(itemId))
        if (!it) return
        setColTitle(it.title || '')
        setColDesc(it.description || '')
        setColQty(1)
        setColBrand(selectedCollection?.brand || '')
        const inferredCategory = (selectedCollection?.category || '').trim()
        if (inferredCategory && TIENDA_CATEGORIAS.includes(inferredCategory)) {
            setColCategory(inferredCategory)
        }
    }, [itemId, items, selectedCollection])

    useEffect(() => {
        if (!collectionId) {
            setItems([])
            setItemId('')
            return
        }
        let ok = true
        ;(async () => {
            try {
                const { data } = await axios.get(`/collections/${collectionId}/items`)
                if (!ok) return
                setItems(Array.isArray(data) ? data : [])
                if (data?.[0]) setItemId(String(data[0].id))
                else setItemId('')
            } catch {
                setItems([])
                setItemId('')
            }
        })()
        return () => {
            ok = false
        }
    }, [collectionId])

    const appendManualFiles = (fileList) => {
        const files = Array.from(fileList || []).filter((f) => f && f.size > 0)
        if (!files.length) return
        setManualPreviews((prev) => {
            const next = [...prev]
            for (const file of files) {
                next.push({ id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`, file, url: URL.createObjectURL(file) })
            }
            return next
        })
    }

    const removeManualPreview = (id) => {
        setManualPreviews((prev) => {
            const f = prev.find((x) => x.id === id)
            if (f?.url) URL.revokeObjectURL(f.url)
            return prev.filter((x) => x.id !== id)
        })
    }

    const appendColExtra = (fileList) => {
        const files = Array.from(fileList || []).filter((f) => f && f.size > 0)
        if (!files.length) return
        setColExtraPreviews((prev) => {
            const next = [...prev]
            for (const file of files) {
                next.push({ id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`, file, url: URL.createObjectURL(file) })
            }
            return next
        })
    }

    const removeColExtra = (id) => {
        setColExtraPreviews((prev) => {
            const f = prev.find((x) => x.id === id)
            if (f?.url) URL.revokeObjectURL(f.url)
            return prev.filter((x) => x.id !== id)
        })
    }

    useEffect(
        () => () => {
            manualPreviews.forEach((p) => p.url && URL.revokeObjectURL(p.url))
            colExtraPreviews.forEach((p) => p.url && URL.revokeObjectURL(p.url))
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )

    const uploadPaths = async (previews) => {
        const paths = []
        for (const p of previews) {
            if (!p.file) continue
            const fd = new FormData()
            fd.append('file', p.file)
            const { data } = await axios.post('/uploads', fd)
            if (data?.path) paths.push(data.path)
        }
        return paths
    }

    const submitManual = async () => {
        const t = manualName.trim()
        if (!t || !manualPrice) {
            setErr('Nombre y precio son obligatorios.')
            return
        }
        if (manualPreviews.length === 0) {
            setErr('Añade al menos una imagen del producto.')
            return
        }
        setSaving(true)
        setErr('')
        try {
            const paths = await uploadPaths(manualPreviews)
            if (paths.length === 0) {
                setErr('No se pudieron subir las imágenes.')
                setSaving(false)
                return
            }
            await axios.post('/listings', {
                source: 'manual',
                title: t,
                marketplace_brand: manualBrand.trim() || null,
                marketplace_category: manualCategory,
                description: manualDesc.trim() || null,
                images: paths,
                quantity: Math.max(1, Number(manualQty) || 1),
                price: Number(manualPrice),
            })
            setManualName('')
            setManualBrand('')
            setManualDesc('')
            setManualPrice('')
            setManualPreviews((prev) => {
                prev.forEach((p) => p.url && URL.revokeObjectURL(p.url))
                return []
            })
            onPublished?.()
        } catch (e) {
            setErr(apiErrMsg(e, 'No se pudo publicar. Revisa los datos.'))
        } finally {
            setSaving(false)
        }
    }

    const submitCollection = async () => {
        const itemIdNum = Number(itemId)
        const qtyNum = Math.max(1, Number(colQty) || 1)
        const priceNum = Number(colPrice)

        if (!itemId || !Number.isInteger(itemIdNum) || itemIdNum <= 0 || !Number.isFinite(priceNum) || priceNum < 0) {
            setErr('Elige un producto y un precio.')
            return
        }
        if (!includeItemImage && colExtraPreviews.length === 0) {
            setErr('Si ocultas la foto del inventario, sube al menos una imagen.')
            return
        }
        setSaving(true)
        setErr('')
        try {
            const extra = await uploadPaths(colExtraPreviews)
            await axios.post('/listings', {
                source: 'collection',
                collection_item_id: itemIdNum,
                quantity: Math.max(1, Math.min(qtyNum, selectedItem ? Number(selectedItem.quantity) : 1)),
                price: priceNum,
                marketplace_title: colTitle.trim() || (selectedItem?.title ?? null),
                extra_description: colDesc.trim() || null,
                extra_images: extra.length ? extra : null,
                marketplace_brand: colBrand.trim() || null,
                marketplace_category: colCategory,
                include_primary_item_image: includeItemImage,
            })
            setColPrice('')
            setColExtraPreviews((prev) => {
                prev.forEach((p) => p.url && URL.revokeObjectURL(p.url))
                return []
            })
            onPublished?.()
        } catch (e) {
            setErr(apiErrMsg(e, 'No se pudo publicar. Verifica stock y permisos.'))
        } finally {
            setSaving(false)
        }
    }

    const fc = getTiendaFieldClass()
    return (
        <section className={tiendaSectionShell}>
            <div className={`${tiendaHeaderGradient} flex w-full flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-stretch sm:gap-3 sm:px-5 sm:py-4`}>
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left transition hover:opacity-95"
                >
                    <div className={tiendaIconBox} aria-hidden>
                        <IconSell />
                    </div>
                    <div className="min-w-0 flex-1 pr-1">
                        <p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-[var(--app-accent)]/90">Vender</p>
                        <h2 className="mt-0.5 text-base font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-lg">Publicar venta</h2>
                        <p className="mt-0.5 text-sm leading-snug text-slate-500 dark:text-slate-400">
                            {open
                                ? 'Pulsa la flecha para plegar el formulario y ver más ofertas abajo.'
                                : 'Abre y elige: fotos desde el dispositivo, o un artículo de tus colecciones.'}
                        </p>
                    </div>
                    <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200/90 bg-white text-slate-500 shadow-sm transition dark:border-slate-600 dark:bg-slate-800/90 ${
                            open ? 'rotate-180 text-[var(--app-accent)]' : ''
                        }`}
                        aria-hidden
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </span>
                </button>

                <Link
                    href="/tienda/mis-publicaciones"
                    className="group flex shrink-0 items-center gap-2.5 self-center rounded-2xl border border-slate-200/90 bg-white/90 px-3 py-2.5 shadow-sm ring-1 ring-slate-100/80 transition hover:border-[var(--app-accent)]/35 hover:shadow-md hover:ring-[var(--app-accent)]/15 dark:border-slate-600/80 dark:bg-slate-800/90 dark:ring-slate-700/50 dark:hover:border-[var(--app-accent)]/40 sm:self-stretch sm:py-2"
                >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--app-accent)]/15 to-teal-600/10 text-[var(--app-accent)] transition group-hover:from-[var(--app-accent)]/25 group-hover:to-teal-600/15">
                        <IconList className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 text-left">
                        <span className="block text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Tus ofertas</span>
                        <span className="block text-sm font-extrabold text-slate-900 dark:text-white">Mis publicaciones</span>
                    </span>
                    <span
                        className="ml-0.5 inline-flex min-h-[1.85rem] min-w-[1.85rem] items-center justify-center rounded-xl bg-slate-900 px-2 text-sm font-black tabular-nums text-white shadow-inner dark:bg-white/10 dark:text-white"
                        title="Publicaciones activas"
                    >
                        {activeListingsCount}
                    </span>
                </Link>
            </div>

            <div
                className={`grid border-t border-slate-200/30 transition-all duration-300 ease-out dark:border-slate-700/40 ${
                    open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-95'
                }`}
            >
                <div className="min-h-0 overflow-hidden">
                    <div className="space-y-4 bg-gradient-to-b from-transparent to-emerald-50/10 p-4 pt-3.5 sm:px-5 sm:pb-5 dark:to-slate-900/40">
                        {err ? (
                            <p className="rounded-2xl border border-red-200/80 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                                {err}
                            </p>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setMode('manual')}
                                className={`rounded-2xl px-4 py-2.5 text-xs font-extrabold shadow-sm transition ${
                                    mode === 'manual'
                                        ? 'bg-gradient-to-r from-[var(--app-accent)] to-teal-600 text-white shadow-md shadow-[var(--app-accent)]/25'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                Fotos y formulario
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('collection')}
                                className={`rounded-2xl px-4 py-2.5 text-xs font-extrabold shadow-sm transition ${
                                    mode === 'collection'
                                        ? 'bg-gradient-to-r from-[var(--app-accent)] to-teal-600 text-white shadow-md shadow-[var(--app-accent)]/25'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                Desde mis colecciones
                            </button>
                        </div>

                        {mode === 'manual' ? (
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">Fotos del producto (varias)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="w-full text-sm file:mr-2 file:rounded-2xl file:border-0 file:bg-gradient-to-r file:from-slate-200 file:to-slate-100 file:px-4 file:py-2.5 file:text-xs file:font-extrabold file:text-slate-700 hover:file:from-slate-300/90 dark:file:from-slate-600 dark:file:to-slate-700 dark:file:text-slate-100"
                                    onChange={(e) => {
                                        appendManualFiles(e.target.files)
                                        e.target.value = ''
                                    }}
                                />
                                {manualPreviews.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {manualPreviews.map((p) => (
                                            <div key={p.id} className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={p.url} alt="" className="h-full w-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeManualPreview(p.id)}
                                                    className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}

                                <div className="grid gap-2 sm:grid-cols-2">
                                    <input
                                        value={manualName}
                                        onChange={(e) => setManualName(e.target.value)}
                                        placeholder="Nombre del producto"
                                        className={fc}
                                    />
                                    <input
                                        value={manualBrand}
                                        onChange={(e) => setManualBrand(e.target.value)}
                                        placeholder="Marca (opcional)"
                                        className={fc}
                                    />
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <PrettyDropdown
                                        value={manualCategory}
                                        onChange={setManualCategory}
                                        options={TIENDA_CATEGORIAS.map((c) => ({ value: c, label: c }))}
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            min={1}
                                            value={manualQty}
                                            onChange={(e) => setManualQty(e.target.value)}
                                            className={fc}
                                        />
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={manualPrice}
                                            onChange={(e) => setManualPrice(e.target.value)}
                                            placeholder="Precio"
                                            className={fc}
                                        />
                                    </div>
                                </div>
                                <textarea
                                    value={manualDesc}
                                    onChange={(e) => setManualDesc(e.target.value)}
                                    rows={3}
                                    maxLength={5000}
                                    placeholder="Descripción"
                                    className={fc}
                                />
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={submitManual}
                                    className="w-full rounded-2xl bg-gradient-to-r from-[var(--app-accent)] to-teal-600 py-3 text-sm font-extrabold text-white shadow-lg shadow-[var(--app-accent)]/25 transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving ? 'Publicando…' : 'Crear publicación'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="rounded-2xl border border-sky-200/60 bg-sky-50/80 px-3.5 py-2.5 text-xs text-sky-900/90 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-100/90">
                                    Solo ves colecciones con piezas. La colección interna de &quot;ventas sueltas&quot; no se lista aquí.
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <PrettyDropdown
                                        value={collectionId}
                                        onChange={setCollectionId}
                                        placeholder="Colección..."
                                        options={[
                                            { value: '', label: 'Colección...' },
                                            ...collections.map((c) => ({
                                                value: String(c.id),
                                                label: `${c.name} (${c.items_count} piezas)`,
                                            })),
                                        ]}
                                    />
                                    <PrettyDropdown
                                        value={itemId}
                                        onChange={setItemId}
                                        placeholder={collectionId ? 'Producto...' : 'Primero elige colección'}
                                        disabled={!collectionId}
                                        options={
                                            items.length
                                                ? items.map((it) => ({
                                                      value: String(it.id),
                                                      label: `${it.title} (stock: ${it.quantity})`,
                                                  }))
                                                : [{ value: '', label: 'Sin productos disponibles' }]
                                        }
                                    />
                                </div>

                                {selectedItem ? (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {selectedItem.image_path && includeItemImage ? (
                                            <div className="h-32 overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/80 ring-1 ring-slate-100 dark:border-slate-600/80 dark:bg-slate-800/40 dark:ring-slate-600/30">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={storageUrl(selectedItem.image_path)} alt="" className="h-full w-full object-contain" />
                                            </div>
                                        ) : (
                                            <p className="self-center text-xs text-slate-500">Foto de inventario oculta. Añade imágenes abajo.</p>
                                        )}
                                        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                                            <p>
                                                <span className="font-bold">Pieza:</span> {selectedItem.title}
                                            </p>
                                            <label className="inline-flex items-center gap-2 font-bold">
                                                <input type="checkbox" checked={includeItemImage} onChange={(e) => setIncludeItemImage(e.target.checked)} />
                                                Incluir foto de inventario
                                            </label>
                                        </div>
                                    </div>
                                ) : null}

                                <label className="block text-xs font-bold">Imágenes adicionales (opcional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="w-full text-sm file:mr-2 file:rounded-2xl file:border-0 file:bg-gradient-to-r file:from-slate-200 file:to-slate-100 file:px-4 file:py-2.5 file:text-xs file:font-extrabold file:text-slate-700 dark:file:from-slate-600 dark:file:to-slate-700"
                                    onChange={(e) => {
                                        appendColExtra(e.target.files)
                                        e.target.value = ''
                                    }}
                                />
                                {colExtraPreviews.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {colExtraPreviews.map((p) => (
                                            <div key={p.id} className="relative h-16 w-16 overflow-hidden rounded-lg border dark:border-slate-600">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={p.url} alt="" className="h-full w-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeColExtra(p.id)}
                                                    className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-black/60 text-[10px] font-bold text-white"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}

                                <div className="grid gap-2 sm:grid-cols-2">
                                    <input
                                        value={colTitle}
                                        onChange={(e) => setColTitle(e.target.value)}
                                        placeholder="Nombre de la publicación"
                                        className={`${fc} sm:col-span-2`}
                                    />
                                    <input
                                        value={colBrand}
                                        onChange={(e) => setColBrand(e.target.value)}
                                        placeholder="Marca (opcional)"
                                        className={fc}
                                    />
                                    <PrettyDropdown
                                        value={colCategory}
                                        onChange={setColCategory}
                                        options={TIENDA_CATEGORIAS.map((c) => ({ value: c, label: c }))}
                                    />
                                </div>
                                <textarea
                                    value={colDesc}
                                    onChange={(e) => setColDesc(e.target.value)}
                                    maxLength={5000}
                                    rows={3}
                                    className={fc}
                                />
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    <input
                                        type="number"
                                        min={1}
                                        max={selectedItem ? selectedItem.quantity : 9999}
                                        value={colQty}
                                        onChange={(e) => setColQty(e.target.value)}
                                        className={fc}
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={colPrice}
                                        onChange={(e) => setColPrice(e.target.value)}
                                        placeholder="Precio"
                                        className={`${fc} col-span-1 sm:col-span-3`}
                                    />
                                </div>
                                <button
                                    type="button"
                                    disabled={saving || !collectionId || !itemId}
                                    onClick={submitCollection}
                                    className="w-full rounded-2xl bg-gradient-to-r from-[var(--app-accent)] to-teal-600 py-3 text-sm font-extrabold text-white shadow-lg shadow-[var(--app-accent)]/25 transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving ? 'Publicando…' : 'Publicar'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}
