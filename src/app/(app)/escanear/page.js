'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import axios from '@/lib/axios'
import { fetchPlanSubscription } from '@/lib/planCheckout'
import { misColeccionPath } from '@/lib/misColeccionPath'
import { useRouter, useSearchParams } from 'next/navigation'
import PageFade from '@/components/coleccionador/PageFade'
import CollectionFolderCard from '@/components/coleccionador/CollectionFolderCard'
import CollectionEditModal from '@/components/coleccionador/CollectionEditModal'
import RaritySelect from '@/components/coleccionador/RaritySelect'
import FranchiseScanModal from '@/components/coleccionador/FranchiseScanModal'
import ItemPhotoCaptureModal from '@/components/coleccionador/ItemPhotoCaptureModal'

const SUG_CATS = ['Carritos', 'Cartas', 'Figuras', 'Monedas', 'Videojuegos', 'Otros']

function apiErrorMessage(err, fallback) {
    const errors = err?.response?.data?.errors
    if (errors && typeof errors === 'object') {
        const first = Object.values(errors).flat().find(Boolean)
        if (typeof first === 'string') return first
    }
    if (typeof err?.response?.data?.message === 'string' && err.response.data.message.trim()) {
        return err.response.data.message
    }
    const status = err?.response?.status
    if (status) return `${fallback} (HTTP ${status})`
    return fallback
}

export default function EscanearPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [step, setStep] = useState(1)
    const [collectionId, setCollectionId] = useState(null)

    const [cName, setCName] = useState('')
    const [cCat, setCCat] = useState(SUG_CATS[0])
    const [cBrand, setCBrand] = useState('')
    const [cColor, setCColor] = useState('#6366f1')

    const [title, setTitle] = useState('')
    const [refNumber, setRefNumber] = useState('')
    const [desc, setDesc] = useState('')
    const [qty, setQty] = useState(1)
    const [rarity, setRarity] = useState('C')
    const [itemImageEntry, setItemImageEntry] = useState(null)
    const itemFileInputRef = useRef(null)
    const [collections, setCollections] = useState([])
    const [savingCollection, setSavingCollection] = useState(false)
    const [savingItem, setSavingItem] = useState(false)
    const [formMessage, setFormMessage] = useState('')
    const [editingCollectionId, setEditingCollectionId] = useState(null)
    const [editCollectionName, setEditCollectionName] = useState('')
    const [editCollectionColor, setEditCollectionColor] = useState('#6366f1')
    const [editCollectionCoverEntry, setEditCollectionCoverEntry] = useState(null)
    const editCollectionCoverInputRef = useRef(null)
    const [collectionEditError, setCollectionEditError] = useState('')
    const [proScanUnlocked, setProScanUnlocked] = useState(false)
    const [franchises, setFranchises] = useState([])
    const [scanOpen, setScanOpen] = useState(false)
    const [scanSetupOpen, setScanSetupOpen] = useState(false)
    const [scanPendingFranchiseId, setScanPendingFranchiseId] = useState('')
    const [franchiseMenuOpen, setFranchiseMenuOpen] = useState(false)
    const [scanConfirming, setScanConfirming] = useState(false)
    const franchisePickerRef = useRef(null)
    const [itemPhotoModalOpen, setItemPhotoModalOpen] = useState(false)

    const loadCollections = useCallback(async () => {
        try {
            const { data } = await axios.get('/collections')
            setCollections(Array.isArray(data) ? data : [])
        } catch {
            setCollections([])
        }
    }, [])

    useEffect(() => {
        loadCollections()
    }, [loadCollections])

    const loadFranchises = useCallback(async () => {
        try {
            const { data } = await axios.get('/franchises')
            setFranchises(Array.isArray(data) ? data : [])
        } catch {
            setFranchises([])
        }
    }, [])

    useEffect(() => {
        if (step === 2) loadFranchises()
    }, [step, loadFranchises])

    const loadProPlanAccess = useCallback(async () => {
        try {
            if (typeof window === 'undefined' || !localStorage.getItem('auth_token')) {
                setProScanUnlocked(false)
                return
            }
            const sub = await fetchPlanSubscription()
            setProScanUnlocked(!!sub?.pro_scan_unlocked)
        } catch {
            setProScanUnlocked(false)
        }
    }, [])

    useEffect(() => {
        loadProPlanAccess()
    }, [loadProPlanAccess, step])

    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') loadProPlanAccess()
        }
        document.addEventListener('visibilitychange', onVisible)
        return () => document.removeEventListener('visibilitychange', onVisible)
    }, [loadProPlanAccess])

    useEffect(() => {
        const queryCollectionId = Number(searchParams.get('collectionId') || 0)
        if (!queryCollectionId) return
        setCollectionId(queryCollectionId)
        setStep(2)
    }, [searchParams])

    const clearItemImage = useCallback(() => {
        setItemImageEntry((prev) => {
            if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl)
            return null
        })
        if (itemFileInputRef.current) itemFileInputRef.current.value = ''
    }, [])

    const onSelectItemImage = useCallback(
        (file) => {
            if (!(file instanceof File) || file.size <= 0) return
            clearItemImage()
            setItemImageEntry({
                file,
                previewUrl: URL.createObjectURL(file),
            })
        },
        [clearItemImage]
    )

    useEffect(
        () => () => {
            clearItemImage()
        },
        [clearItemImage]
    )

    const clearEditCollectionCover = useCallback(() => {
        setEditCollectionCoverEntry((prev) => {
            if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl)
            return null
        })
    }, [])

    useEffect(
        () => () => {
            clearEditCollectionCover()
        },
        [clearEditCollectionCover]
    )

    const crearColeccion = async () => {
        if (!cName.trim()) return
        setSavingCollection(true)
        setFormMessage('')
        try {
            const { data } = await axios.post('/collections', {
                name: cName,
                category: cCat,
                brand: cBrand || null,
                accent_color: cColor,
            })
            setCollectionId(data.id)
            setStep(2)
            setCollections((prev) => [{ ...data, items_count: 0 }, ...prev.filter((c) => c.id !== data.id)])
        } catch (err) {
            setFormMessage(apiErrorMessage(err, 'No se pudo crear la colección.'))
        } finally {
            setSavingCollection(false)
        }
    }

    const subirYRegistrar = async () => {
        if (!collectionId || !title.trim()) return
        setSavingItem(true)
        setFormMessage('')
        let imagePath = null
        try {
            if (itemImageEntry?.file) {
                const fd = new FormData()
                fd.append('file', itemImageEntry.file)
                const up = await axios.post('/uploads', fd)
                imagePath = up.data?.path || null
            }

            await axios.post(`/collections/${collectionId}/items`, {
                title,
                ref_number: refNumber || null,
                description: desc || null,
                quantity: Number(qty) || 1,
                rarity_code: rarity,
                image_path: imagePath,
            })

            setTitle('')
            setRefNumber('')
            setDesc('')
            setQty(1)
            setRarity('C')
            clearItemImage()
            if (itemFileInputRef.current) itemFileInputRef.current.value = ''
            await loadCollections()
            setCollectionId(null)
            setStep(1)
            setFormMessage('Pieza agregada. Puedes crear otra colección o elegir una existente.')
        } catch (err) {
            setFormMessage(apiErrorMessage(err, 'No se pudo guardar la pieza.'))
        } finally {
            setSavingItem(false)
        }
    }

    const soloCrearCarpeta = async () => {
        if (!cName.trim()) return
        setSavingCollection(true)
        setFormMessage('')
        try {
            const { data } = await axios.post('/collections', {
                name: cName,
                category: cCat,
                brand: cBrand || null,
                accent_color: cColor,
            })
            setCollections((prev) => [{ ...data, items_count: 0 }, ...prev.filter((c) => c.id !== data.id)])
            router.push(misColeccionPath(data.id, data.name || cName))
        } catch (err) {
            setFormMessage(apiErrorMessage(err, 'No se pudo crear la colección.'))
        } finally {
            setSavingCollection(false)
        }
    }

    const startEditCollection = (c) => {
        setCollectionEditError('')
        setEditingCollectionId(c.id)
        setEditCollectionName(c.name || '')
        setEditCollectionColor(c.accent_color || '#6366f1')
        clearEditCollectionCover()
        if (editCollectionCoverInputRef.current) editCollectionCoverInputRef.current.value = ''
    }

    const cancelEditCollection = () => {
        setEditingCollectionId(null)
        setEditCollectionName('')
        setEditCollectionColor('#6366f1')
        setCollectionEditError('')
        clearEditCollectionCover()
        if (editCollectionCoverInputRef.current) editCollectionCoverInputRef.current.value = ''
    }

    const saveCollectionEdit = async () => {
        if (!editingCollectionId || !editCollectionName.trim()) return
        setSavingCollection(true)
        setCollectionEditError('')
        setFormMessage('')
        try {
            let coverPath
            if (editCollectionCoverEntry?.file) {
                const fd = new FormData()
                fd.append('file', editCollectionCoverEntry.file)
                const up = await axios.post('/uploads', fd)
                coverPath = up.data?.path || null
            }
            await axios.patch(`/collections/${editingCollectionId}`, {
                name: editCollectionName.trim(),
                accent_color: editCollectionColor,
                ...(coverPath ? { cover_path: coverPath } : {}),
            })
            await loadCollections()
            cancelEditCollection()
        } catch (err) {
            setCollectionEditError(apiErrorMessage(err, 'No se pudo editar la colección.'))
        } finally {
            setSavingCollection(false)
        }
    }

    const editingCollectionRow = collections.find((c) => Number(c.id) === Number(editingCollectionId))
    const editingCoverPath = editingCollectionRow?.cover_path || null

    const activeCollectionRow = collections.find((c) => Number(c.id) === Number(collectionId))
    const activeFranchiseLabel = franchises.find((f) => Number(f.id) === Number(activeCollectionRow?.franchise_id))?.name || ''

    const onFranchiseChange = async (franchiseIdStr) => {
        const fid = franchiseIdStr ? Number(franchiseIdStr) : null
        if (!collectionId) return false
        setFormMessage('')
        try {
            await axios.patch(`/collections/${collectionId}`, { franchise_id: fid })
            await loadCollections()
            return true
        } catch (err) {
            setFormMessage(apiErrorMessage(err, 'No se pudo asignar la franquicia.'))
            return false
        }
    }

    const dismissScanSetup = useCallback(() => {
        setScanSetupOpen(false)
        setFranchiseMenuOpen(false)
    }, [])

    useEffect(() => {
        dismissScanSetup()
        setItemPhotoModalOpen(false)
    }, [collectionId, step, dismissScanSetup])

    useEffect(() => {
        if (!franchiseMenuOpen) return undefined
        const onDocDown = (e) => {
            const el = franchisePickerRef.current
            if (el && !el.contains(e.target)) setFranchiseMenuOpen(false)
        }
        document.addEventListener('mousedown', onDocDown)
        return () => document.removeEventListener('mousedown', onDocDown)
    }, [franchiseMenuOpen])

    const openScanSetup = useCallback(() => {
        const row = collections.find((c) => Number(c.id) === Number(collectionId))
        setScanPendingFranchiseId(row?.franchise_id ? String(row.franchise_id) : '')
        setFranchiseMenuOpen(false)
        setScanSetupOpen(true)
    }, [collectionId, collections])

    const confirmScanAndOpenModal = async () => {
        if (!collectionId || !scanPendingFranchiseId) return
        setScanConfirming(true)
        setFormMessage('')
        try {
            const ok = await onFranchiseChange(scanPendingFranchiseId)
            if (!ok) return
            dismissScanSetup()
            setScanOpen(true)
        } finally {
            setScanConfirming(false)
        }
    }

    const pendingFranchise = franchises.find((f) => String(f.id) === scanPendingFranchiseId)

    return (
        <PageFade>
            <div className="relative z-[1] mx-auto max-w-6xl space-y-4 px-4 pb-16 pt-4">
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Paso {step} / 2</p>
                    {step === 1 ? (
                        <div className="mt-3 space-y-3">
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-50">¿Deseas registrar una nueva colección?</p>
                            <input
                                value={cName}
                                onChange={(e) => setCName(e.target.value)}
                                placeholder="Nombre de la colección"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                            />
                            <div>
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Categoría sugerida</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {SUG_CATS.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setCCat(c)}
                                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                                                cCat === c ? 'bg-[var(--app-accent)] text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
                                            }`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <input
                                value={cBrand}
                                onChange={(e) => setCBrand(e.target.value)}
                                placeholder="Marca (opcional)"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                            />
                            <div className="flex items-center gap-3">
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Color</label>
                                <input type="color" value={cColor} onChange={(e) => setCColor(e.target.value)} className="h-10 w-16 rounded-xl border border-slate-200 bg-white" />
                            </div>
                            <button
                                type="button"
                                onClick={crearColeccion}
                                disabled={savingCollection || !cName.trim()}
                                className="w-full rounded-2xl bg-[var(--app-accent)] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
                            >
                                {savingCollection ? 'Creando…' : 'Crear colección y continuar'}
                            </button>
                            <button
                                type="button"
                                onClick={soloCrearCarpeta}
                                disabled={savingCollection || !cName.trim()}
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                            >
                                Solo crear carpeta
                            </button>
                            {formMessage ? <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">{formMessage}</p> : null}
                        </div>
                    ) : (
                        <div className="mt-3 space-y-3">
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-50">Registrar pieza</p>
                            {collectionId ? (
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    Colección activa: <span className="font-bold">{collections.find((c) => Number(c.id) === Number(collectionId))?.name || `#${collectionId}`}</span>
                                </p>
                            ) : null}
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Nombre"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                            />
                            <input
                                value={refNumber}
                                onChange={(e) => setRefNumber(e.target.value)}
                                placeholder="Número / referencia"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                            />
                            <textarea
                                value={desc}
                                onChange={(e) => setDesc(e.target.value)}
                                placeholder="Descripción"
                                rows={3}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="number"
                                    min={1}
                                    value={qty}
                                    onChange={(e) => setQty(e.target.value)}
                                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                                />
                                <RaritySelect value={rarity} onChange={setRarity} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Foto (opcional)</p>
                                <input
                                    ref={itemFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(e) => {
                                        onSelectItemImage(e.target.files?.[0] || null)
                                        const input = e.target
                                        window.queueMicrotask(() => {
                                            input.value = ''
                                        })
                                    }}
                                />
                                <div
                                    className={`mt-2 grid auto-rows-fr gap-2 ${
                                        proScanUnlocked ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 min-[400px]:grid-cols-2'
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            dismissScanSetup()
                                            itemFileInputRef.current?.click()
                                        }}
                                        className="inline-flex min-h-[3rem] w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-2 py-2.5 text-center text-sm font-bold leading-tight text-[var(--app-accent)] transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-950 sm:min-h-[2.875rem] sm:px-3"
                                    >
                                        {itemImageEntry ? 'Cambiar imagen' : 'Elegir imagen'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            dismissScanSetup()
                                            setItemPhotoModalOpen(true)
                                        }}
                                        className="inline-flex min-h-[3rem] w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-2 py-2.5 text-center text-sm font-bold leading-tight text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200 sm:min-h-[2.875rem] sm:px-3"
                                    >
                                        {itemImageEntry ? 'Tomar foto' : 'Tomar fotografía'}
                                    </button>
                                    {proScanUnlocked ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!collectionId) {
                                                    setFormMessage('Primero activa o crea una colección.')
                                                    return
                                                }
                                                setFormMessage('')
                                                openScanSetup()
                                            }}
                                            className="inline-flex min-h-[3rem] w-full items-center justify-center rounded-xl border-2 border-dashed border-[var(--app-accent)]/50 bg-white px-2 py-2.5 text-center text-sm font-bold leading-tight text-[var(--app-accent)] transition hover:bg-slate-50 dark:border-[var(--app-accent)]/40 dark:bg-slate-950 sm:min-h-[2.875rem] sm:px-3"
                                        >
                                            Escanear
                                        </button>
                                    ) : null}
                                </div>
                                {scanSetupOpen && collectionId && proScanUnlocked ? (
                                    <div className="mt-3 overflow-visible rounded-2xl border border-[var(--app-accent)]/25 bg-gradient-to-br from-[var(--app-accent)]/[0.07] via-white to-slate-50/80 p-4 shadow-inner dark:from-[var(--app-accent)]/10 dark:via-slate-900/80 dark:to-slate-950 dark:border-[var(--app-accent)]/20">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--app-accent)]/15 text-[var(--app-accent)] dark:bg-[var(--app-accent)]/25">
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h10M4 17h7" />
                                                </svg>
                                            </div>
                                            <div className="min-w-0 flex-1 space-y-1">
                                                <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Catálogo para comparar</p>
                                                <p className="text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                                                    Selecciona la franquicia cuyo JSON cargó el administrador. Luego pulsa <span className="font-bold text-slate-800 dark:text-slate-200">Ir</span> para abrir el
                                                    escáner en vivo.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-4 space-y-3 overflow-visible">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Franquicia disponible</p>
                                            {franchises.length === 0 ? (
                                                <p className="rounded-xl border border-dashed border-slate-300 bg-white/80 px-3 py-3 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-950/60 dark:text-slate-400">
                                                    No hay franquicias en el sistema. Pide al administrador que importe un catálogo JSON.
                                                </p>
                                            ) : (
                                                <div ref={franchisePickerRef} className="relative z-30">
                                                    <button
                                                        type="button"
                                                        id="franchise-scan-trigger"
                                                        aria-haspopup="listbox"
                                                        aria-expanded={franchiseMenuOpen}
                                                        onClick={() => setFranchiseMenuOpen((o) => !o)}
                                                        className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-[var(--app-accent)]/40 hover:shadow-md dark:border-slate-600 dark:bg-slate-950 dark:hover:border-[var(--app-accent)]/35"
                                                    >
                                                        <span className="min-w-0">
                                                            <span className="block truncate text-sm font-bold text-slate-900 dark:text-slate-50">
                                                                {pendingFranchise?.name || 'Elige una franquicia…'}
                                                            </span>
                                                            {pendingFranchise && typeof pendingFranchise.stamps_count === 'number' ? (
                                                                <span className="mt-0.5 block text-[11px] font-semibold text-[var(--app-accent)]">
                                                                    {pendingFranchise.stamps_count} referencias en catálogo
                                                                </span>
                                                            ) : (
                                                                <span className="mt-0.5 block text-[11px] font-medium text-slate-500 dark:text-slate-400">Toca para ver todas las opciones</span>
                                                            )}
                                                        </span>
                                                        <span
                                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-transform dark:bg-slate-800 dark:text-slate-300 ${
                                                                franchiseMenuOpen ? 'rotate-180' : ''
                                                            }`}
                                                            aria-hidden
                                                        >
                                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </span>
                                                    </button>
                                                    {franchiseMenuOpen ? (
                                                        <ul
                                                            role="listbox"
                                                            aria-labelledby="franchise-scan-trigger"
                                                            className="absolute left-0 right-0 top-full z-[60] mt-2 max-h-[min(70vh,16rem)] overflow-auto rounded-2xl border border-slate-200/90 bg-white py-1 shadow-xl ring-1 ring-black/5 dark:border-slate-600 dark:bg-slate-900 dark:ring-white/10"
                                                        >
                                                            {franchises.map((f) => {
                                                                const selected = String(f.id) === scanPendingFranchiseId
                                                                return (
                                                                    <li key={f.id} role="presentation">
                                                                        <button
                                                                            type="button"
                                                                            role="option"
                                                                            aria-selected={selected}
                                                                            onClick={() => {
                                                                                setScanPendingFranchiseId(String(f.id))
                                                                                setFranchiseMenuOpen(false)
                                                                            }}
                                                                            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition ${
                                                                                selected
                                                                                    ? 'bg-[var(--app-accent)]/12 font-bold text-[var(--app-accent)] dark:bg-[var(--app-accent)]/20'
                                                                                    : 'font-semibold text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800/80'
                                                                            }`}
                                                                        >
                                                                            <span
                                                                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                                                                                    selected
                                                                                        ? 'bg-[var(--app-accent)] text-white'
                                                                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                                                }`}
                                                                            >
                                                                                {f.name?.charAt(0)?.toUpperCase() || '?'}
                                                                            </span>
                                                                            <span className="min-w-0 flex-1">
                                                                                <span className="block truncate">{f.name}</span>
                                                                                {typeof f.stamps_count === 'number' ? (
                                                                                    <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">{f.stamps_count} estampas</span>
                                                                                ) : null}
                                                                            </span>
                                                                            {selected ? (
                                                                                <svg className="h-4 w-4 shrink-0 text-[var(--app-accent)]" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                                                                                    <path
                                                                                        fillRule="evenodd"
                                                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                                        clipRule="evenodd"
                                                                                    />
                                                                                </svg>
                                                                            ) : null}
                                                                        </button>
                                                                    </li>
                                                                )
                                                            })}
                                                        </ul>
                                                    ) : null}
                                                </div>
                                            )}
                                            <div className="relative z-0">
                                                <button
                                                    type="button"
                                                    onClick={confirmScanAndOpenModal}
                                                    disabled={!scanPendingFranchiseId || scanConfirming || franchises.length === 0}
                                                    className="w-full rounded-2xl bg-[var(--app-accent)] px-4 py-3 text-sm font-extrabold text-white shadow-md transition hover:opacity-95 disabled:pointer-events-none disabled:opacity-40"
                                                >
                                                    {scanConfirming ? 'Guardando…' : 'Ir al escáner'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                                {itemImageEntry ? (
                                    <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={itemImageEntry.previewUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                                        <button
                                            type="button"
                                            onClick={clearItemImage}
                                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 dark:border-slate-600 dark:text-slate-200"
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                            <button
                                type="button"
                                onClick={subirYRegistrar}
                                disabled={savingItem || !title.trim()}
                                className="w-full rounded-2xl bg-[var(--app-accent)] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
                            >
                                {savingItem ? 'Guardando…' : 'Guardar en la colección'}
                            </button>
                            {formMessage ? <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{formMessage}</p> : null}
                        </div>
                    )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                    <p className="font-extrabold text-slate-900 dark:text-slate-50">Tus colecciones</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {collections.slice(0, 6).map((c) => (
                            <CollectionFolderCard
                                key={c.id}
                                collection={c}
                                selected={
                                    (Number(collectionId) === Number(c.id) && step === 2) ||
                                    Number(editingCollectionId) === Number(c.id)
                                }
                                onAddPiece={() => {
                                    setCollectionId(c.id)
                                    setStep(2)
                                    setFormMessage(`Colección activa: ${c.name}`)
                                }}
                                onEdit={() => startEditCollection(c)}
                                onOpen={() => router.push(misColeccionPath(c.id, c.name))}
                                onDelete={async () => {
                                    await axios.delete(`/collections/${c.id}`)
                                    if (Number(collectionId) === Number(c.id)) {
                                        setCollectionId(null)
                                        setStep(1)
                                    }
                                    if (Number(editingCollectionId) === Number(c.id)) {
                                        cancelEditCollection()
                                    }
                                    await loadCollections()
                                }}
                            />
                        ))}
                    </div>
                    <CollectionEditModal
                        open={Boolean(editingCollectionId)}
                        onClose={cancelEditCollection}
                        name={editCollectionName}
                        onNameChange={setEditCollectionName}
                        accentColor={editCollectionColor}
                        onAccentColorChange={setEditCollectionColor}
                        currentCoverPath={editingCoverPath}
                        newCoverPreviewUrl={editCollectionCoverEntry?.previewUrl || null}
                        fileInputRef={editCollectionCoverInputRef}
                        onCoverFileChange={(e) => {
                            const file = e.target.files?.[0]
                            const input = e.target
                            window.queueMicrotask(() => {
                                input.value = ''
                            })
                            if (!file) return
                            clearEditCollectionCover()
                            setEditCollectionCoverEntry({ file, previewUrl: URL.createObjectURL(file) })
                        }}
                        onPickCover={() => editCollectionCoverInputRef.current?.click()}
                        onClearNewCover={() => {
                            clearEditCollectionCover()
                            if (editCollectionCoverInputRef.current) editCollectionCoverInputRef.current.value = ''
                        }}
                        onSave={saveCollectionEdit}
                        saving={savingCollection}
                        errorText={collectionEditError}
                    />
                </div>
            </div>

            <FranchiseScanModal
                open={scanOpen}
                collectionId={collectionId}
                franchiseLabel={activeFranchiseLabel}
                onClose={() => setScanOpen(false)}
                onSaved={() => loadCollections()}
            />

            <ItemPhotoCaptureModal
                open={itemPhotoModalOpen}
                onClose={() => setItemPhotoModalOpen(false)}
                onCapture={(file) => onSelectItemImage(file)}
                onFallbackFile={() => itemFileInputRef.current?.click()}
            />
        </PageFade>
    )
}
