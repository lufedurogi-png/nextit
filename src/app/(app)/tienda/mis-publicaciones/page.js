'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import axios from '@/lib/axios'
import AppHero from '@/components/coleccionador/AppHero'
import PageFade from '@/components/coleccionador/PageFade'
import { storageUrl } from '@/lib/storageUrl'
import { IconList } from '@/components/coleccionador/TiendaSectionCard'
import { listingAllImages, listingTitle } from '@/lib/tiendaListingUtils'

export default function TiendaMisPublicacionesPage() {
    const [mine, setMine] = useState([])
    const [error, setError] = useState('')
    const [editing, setEditing] = useState(null)
    const [editPrice, setEditPrice] = useState('')
    const [editQty, setEditQty] = useState(1)
    const [editDesc, setEditDesc] = useState('')

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get('/listings/mine')
            setMine(Array.isArray(data) ? data : [])
            setError('')
        } catch {
            setError('No se pudieron cargar tus publicaciones.')
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const openEdit = (l) => {
        setEditing(l)
        setEditPrice(String(l.price ?? ''))
        setEditQty(Number(l.quantity) || 1)
        setEditDesc(l.extra_description || '')
    }

    const saveEdit = async () => {
        if (!editing?.id) return
        try {
            await axios.patch(`/listings/${editing.id}`, {
                price: Number(editPrice),
                quantity: Math.max(1, Number(editQty) || 1),
                extra_description: editDesc.trim() || null,
            })
            setEditing(null)
            await load()
        } catch {
            setError('No se pudo guardar el cambio.')
        }
    }

    const removeListing = async (l) => {
        if (!window.confirm('¿Dar de baja esta publicación de la tienda?')) return
        try {
            await axios.delete(`/listings/${l.id}`)
            await load()
        } catch {
            setError('No se pudo eliminar.')
        }
    }

    return (
        <PageFade>
            <AppHero
                eyebrow="Tienda"
                title="Mis publicaciones"
                subtitle="Ajusta precio y cantidad o da de baja. Las ventas solo con fotos usan un inventario interno."
            />

            <div className="relative z-[1] mx-auto max-w-3xl space-y-4 px-4 pb-16 -mt-3">
                <Link
                    href="/tienda"
                    className="inline-flex items-center gap-2 text-sm font-bold text-[var(--app-accent)] transition hover:underline"
                >
                    <span aria-hidden>←</span> Volver a la tienda
                </Link>

                {error ? <p className="text-sm text-red-600">{error}</p> : null}

                {mine.length === 0 && !error ? (
                    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white py-14 text-center shadow-inner dark:border-slate-600/50 dark:from-slate-900/40 dark:to-slate-900/20">
                        <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--app-accent)]/10 text-[var(--app-accent)]">
                            <IconList className="h-7 w-7" />
                        </div>
                        <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">Aún no tienes ofertas activas</p>
                        <p className="mt-2 max-w-sm px-4 text-sm text-slate-500 dark:text-slate-400">
                            Publica desde la tienda: fotos sueltas o un artículo de tus colecciones.
                        </p>
                        <Link
                            href="/tienda"
                            className="mt-6 inline-flex rounded-2xl bg-gradient-to-r from-[var(--app-accent)] to-teal-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-md shadow-[var(--app-accent)]/25"
                        >
                            Ir a publicar
                        </Link>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {mine.map((l) => (
                            <li
                                key={l.id}
                                className="group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white to-slate-50/80 p-4 text-sm shadow-sm transition hover:border-[var(--app-accent)]/30 hover:shadow-md dark:from-slate-900/60 dark:to-slate-900/40 dark:border-slate-600/60"
                            >
                                <div className="relative h-[5rem] w-[5rem] shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-inner dark:border-slate-600/80">
                                    {listingAllImages(l)[0] ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={storageUrl(listingAllImages(l)[0])}
                                            alt=""
                                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="grid h-full w-full place-items-center text-2xl opacity-30">📦</div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="line-clamp-2 font-bold leading-snug text-slate-900 dark:text-slate-50">{listingTitle(l)}</p>
                                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                                        {l.quantity} uds. ·{' '}
                                        <span className="font-extrabold text-[var(--app-accent)]">${Number(l.price).toFixed(2)}</span>
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openEdit(l)}
                                            className="rounded-full bg-[var(--app-accent)]/10 px-4 py-1.5 text-[0.7rem] font-extrabold text-[var(--app-accent)] transition hover:bg-[var(--app-accent)]/20"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeListing(l)}
                                            className="rounded-full border border-red-200/80 px-4 py-1.5 text-[0.7rem] font-extrabold text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/20"
                                        >
                                            Dar de baja
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {editing ? (
                <div className="fixed inset-0 z-[300] flex items-end justify-center p-2 md:items-center md:pl-72">
                    <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} aria-label="Cerrar" />
                    <div className="relative z-[1] w-full max-w-md rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-900">
                        <p className="text-sm font-extrabold">Editar publicación</p>
                        <p className="line-clamp-1 text-xs text-slate-500">{listingTitle(editing)}</p>
                        <div className="mt-3 space-y-2">
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600"
                            />
                            <input
                                type="number"
                                min={1}
                                value={editQty}
                                onChange={(e) => setEditQty(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600"
                            />
                            <textarea
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                rows={3}
                                placeholder="Descripción (visible en anuncio)"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600"
                            />
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button type="button" onClick={() => setEditing(null)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-bold">
                                Cancelar
                            </button>
                            <button type="button" onClick={saveEdit} className="flex-1 rounded-xl bg-[var(--app-accent)] py-2 text-sm font-extrabold text-white">
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </PageFade>
    )
}
