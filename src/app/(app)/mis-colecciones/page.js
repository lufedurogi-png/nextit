'use client'

import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from '@/lib/axios'
import { misColeccionPath } from '@/lib/misColeccionPath'
import AppHero from '@/components/coleccionador/AppHero'
import PageFade from '@/components/coleccionador/PageFade'
import CollectionFolderCard from '@/components/coleccionador/CollectionFolderCard'
import CollectionEditModal from '@/components/coleccionador/CollectionEditModal'

export default function MisColeccionesPage() {
    const router = useRouter()
    const [rows, setRows] = useState([])
    const [error, setError] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [draftName, setDraftName] = useState('')
    const [draftColor, setDraftColor] = useState('#6366f1')
    const [coverEntry, setCoverEntry] = useState(null)
    const coverInputRef = useRef(null)
    const [savingEdit, setSavingEdit] = useState(false)
    const [editError, setEditError] = useState('')

    const loadCollections = async () => {
        try {
            const { data } = await axios.get('/collections')
            setRows(Array.isArray(data) ? data : [])
            setError('')
        } catch {
            setError('No se pudieron cargar tus colecciones.')
        }
    }

    useEffect(() => {
        loadCollections()
    }, [])

    const clearCoverEntry = useCallback(() => {
        setCoverEntry((prev) => {
            if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl)
            return null
        })
    }, [])

    useEffect(
        () => () => {
            clearCoverEntry()
        },
        [clearCoverEntry]
    )

    const closeEditModal = () => {
        setEditingId(null)
        setEditError('')
        clearCoverEntry()
        if (coverInputRef.current) coverInputRef.current.value = ''
    }

    const openEdit = (c) => {
        setEditingId(c.id)
        setDraftName(c.name || '')
        setDraftColor(c.accent_color || '#6366f1')
        setEditError('')
        clearCoverEntry()
        if (coverInputRef.current) coverInputRef.current.value = ''
    }

    const editingRow = rows.find((r) => Number(r.id) === Number(editingId))
    const currentCoverPath = editingRow?.cover_path || null

    const saveEdit = async () => {
        if (!editingId || !draftName.trim()) return
        setSavingEdit(true)
        setEditError('')
        try {
            let coverPath
            if (coverEntry?.file) {
                const fd = new FormData()
                fd.append('file', coverEntry.file)
                const up = await axios.post('/uploads', fd)
                coverPath = up.data?.path || null
            }
            await axios.patch(`/collections/${editingId}`, {
                name: draftName.trim(),
                accent_color: draftColor,
                ...(coverPath ? { cover_path: coverPath } : {}),
            })
            closeEditModal()
            await loadCollections()
        } catch (err) {
            const msg = err?.response?.data?.message
            setEditError(typeof msg === 'string' && msg.trim() ? msg : 'No se pudo guardar.')
        } finally {
            setSavingEdit(false)
        }
    }

    return (
        <PageFade>
            <div className="relative z-[1] mx-auto max-w-6xl px-4 pb-14 pt-4">
                {error ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                        {error}
                    </div>
                ) : null}

                {rows.length === 0 && !error ? (
                    <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200/80 shadow-sm dark:border-slate-700">
                        <AppHero eyebrow="Organiza tu álbum" title="Mis colecciones" subtitle="Aquí aparecerán las colecciones que vayas creando." />
                    </div>
                ) : (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {rows.map((c, idx) => (
                            <motion.div
                                key={c.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.04 * idx }}
                            >
                                <CollectionFolderCard
                                    collection={c}
                                    selected={Number(editingId) === Number(c.id)}
                                    onAddPiece={() => {
                                        router.push(`/escanear?collectionId=${c.id}`)
                                    }}
                                    onEdit={() => openEdit(c)}
                                    onOpen={() => {
                                        router.push(misColeccionPath(c.id, c.name))
                                    }}
                                    onDelete={async () => {
                                        await axios.delete(`/collections/${c.id}`)
                                        await loadCollections()
                                    }}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}

                <CollectionEditModal
                    open={Boolean(editingId)}
                    onClose={closeEditModal}
                    name={draftName}
                    onNameChange={setDraftName}
                    accentColor={draftColor}
                    onAccentColorChange={setDraftColor}
                    currentCoverPath={currentCoverPath}
                    newCoverPreviewUrl={coverEntry?.previewUrl || null}
                    fileInputRef={coverInputRef}
                    onCoverFileChange={(e) => {
                        const file = e.target.files?.[0]
                        const input = e.target
                        window.queueMicrotask(() => {
                            input.value = ''
                        })
                        if (!(file instanceof File) || file.size <= 0) return
                        clearCoverEntry()
                        setCoverEntry({ file, previewUrl: URL.createObjectURL(file) })
                    }}
                    onPickCover={() => coverInputRef.current?.click()}
                    onClearNewCover={() => {
                        clearCoverEntry()
                        if (coverInputRef.current) coverInputRef.current.value = ''
                    }}
                    onSave={saveEdit}
                    saving={savingEdit}
                    errorText={editError}
                />
            </div>
        </PageFade>
    )
}
