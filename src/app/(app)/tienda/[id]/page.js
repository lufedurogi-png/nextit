'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from '@/lib/axios'
import { useAuth } from '@/hooks/auth'
import AppHero from '@/components/coleccionador/AppHero'
import PageFade from '@/components/coleccionador/PageFade'
import { storageUrl } from '@/lib/storageUrl'
import { listingAllImages, listingTitle } from '@/lib/tiendaListingUtils'

function fmtDate(value) {
    if (!value) return '—'
    try {
        return new Date(value).toLocaleString()
    } catch {
        return '—'
    }
}

export default function TiendaDetallePage() {
    const params = useParams()
    const listingId = Number(params?.id)
    const { user } = useAuth({})
    const myId = user?.id

    const [listing, setListing] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [activeImageIdx, setActiveImageIdx] = useState(0)
    const [ownerChats, setOwnerChats] = useState([])

    const load = useCallback(async () => {
        if (!listingId) return
        try {
            setLoading(true)
            const { data } = await axios.get(`/listings/${listingId}`)
            setListing(data || null)
            setError('')
        } catch {
            setError('No se pudo cargar el producto.')
        } finally {
            setLoading(false)
        }
    }, [listingId])

    useEffect(() => {
        load()
    }, [load])

    const isOwner = Number(listing?.seller_id) === Number(myId)
    const imgs = useMemo(() => listingAllImages(listing || {}), [listing])

    useEffect(() => {
        setActiveImageIdx(0)
    }, [listing?.id])

    useEffect(() => {
        if (!isOwner || !listing?.id) {
            setOwnerChats([])
            return
        }
        let cancelled = false
        ;(async () => {
            try {
                const { data } = await axios.get(`/listings/${listing.id}/chats`)
                if (!cancelled) setOwnerChats(Array.isArray(data) ? data : [])
            } catch {
                if (!cancelled) setOwnerChats([])
            }
        })()
        return () => {
            cancelled = true
        }
    }, [isOwner, listing?.id])

    return (
        <PageFade>
            <AppHero eyebrow="Marketplace" title="Detalle del producto" subtitle="Vista ampliada para revisar mejor imágenes y datos." />
            <div className="relative z-[1] mx-auto max-w-6xl space-y-4 px-4 pb-16 -mt-3">
                <Link
                    href="/tienda"
                    className="group inline-flex items-center gap-2 rounded-2xl border border-[var(--app-accent)]/25 bg-gradient-to-r from-[var(--app-accent)]/12 to-teal-600/10 px-3.5 py-2 text-sm font-extrabold text-[var(--app-accent)] shadow-sm shadow-[var(--app-accent)]/10 transition hover:-translate-y-0.5 hover:border-[var(--app-accent)]/45 hover:shadow-md hover:shadow-[var(--app-accent)]/20"
                >
                    <span
                        aria-hidden
                        className="grid h-6 w-6 place-items-center rounded-xl bg-white/80 text-base leading-none shadow-inner transition group-hover:-translate-x-0.5 dark:bg-slate-900/70"
                    >
                        ←
                    </span>
                    <span>Volver a tienda</span>
                </Link>

                {loading ? <p className="text-sm text-slate-500">Cargando producto...</p> : null}
                {error ? <p className="text-sm text-red-600">{error}</p> : null}

                {listing ? (
                    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                        <section className="rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/90 p-3 shadow-lg shadow-slate-200/40 dark:border-slate-700/70 dark:from-slate-900/70 dark:to-slate-900/40 dark:shadow-none">
                            <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-100 ring-1 ring-slate-100 dark:border-slate-700/70 dark:bg-slate-800 dark:ring-slate-700/50">
                                {imgs[activeImageIdx] ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={storageUrl(imgs[activeImageIdx])} alt="" className="h-[24rem] w-full object-contain bg-slate-50 dark:bg-slate-900" />
                                ) : (
                                    <div className="grid h-[24rem] place-items-center text-4xl opacity-30">📦</div>
                                )}
                                <div className="pointer-events-none absolute left-2 top-2 inline-flex rounded-full bg-black/55 px-2 py-1 text-[0.65rem] font-bold text-white backdrop-blur">
                                    {imgs.length > 0 ? `${activeImageIdx + 1}/${imgs.length}` : 'Sin fotos'}
                                </div>
                            </div>
                            {imgs.length > 1 ? (
                                <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-7">
                                    {imgs.map((img, i) => (
                                        <button
                                            key={`${img}-${i}`}
                                            type="button"
                                            onClick={() => setActiveImageIdx(i)}
                                            className={`overflow-hidden rounded-xl border ${
                                                i === activeImageIdx
                                                    ? 'border-[var(--app-accent)] ring-2 ring-[var(--app-accent)]/20'
                                                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                                            }`}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={storageUrl(img)} alt="" className="h-14 w-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </section>

                        <section className="space-y-4 rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/90 p-4 shadow-lg shadow-slate-200/40 dark:border-slate-700/70 dark:from-slate-900/70 dark:to-slate-900/40 dark:shadow-none">
                            <div className="flex flex-wrap items-center gap-2">
                                {listing.marketplace_category ? (
                                    <span className="rounded-full bg-[var(--app-accent)]/12 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-[var(--app-accent)]">
                                        {listing.marketplace_category}
                                    </span>
                                ) : null}
                                {listing.marketplace_brand ? (
                                    <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:text-slate-300">
                                        {listing.marketplace_brand}
                                    </span>
                                ) : null}
                            </div>
                            <h1 className="text-2xl font-black leading-tight text-slate-900 dark:text-slate-100">{listingTitle(listing)}</h1>
                            <div className="rounded-2xl border border-[var(--app-accent)]/25 bg-[var(--app-accent)]/10 px-3 py-2">
                                <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--app-accent)]/80">Precio de venta</p>
                                <p className="text-3xl font-black text-[var(--app-accent)]">${Number(listing.price).toFixed(2)}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/60">
                                    <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-slate-400">Stock</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{listing.quantity} unidad(es)</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/60">
                                    <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-slate-400">Publicado</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmtDate(listing.created_at)}</p>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/60">
                                <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-slate-400">Vendedor</p>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{listing.seller?.name || 'Usuario'}</p>
                            </div>
                            {listing.extra_description ? (
                                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-800/60">
                                    <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-slate-400">Descripción</p>
                                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{listing.extra_description}</p>
                                </div>
                            ) : null}

                            {!isOwner ? (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            const { data } = await axios.post(`/listings/${listing.id}/contact`)
                                            window.location.href = `/mensajes?chat=${data.id}`
                                        } catch {
                                            alert('No se pudo iniciar el chat.')
                                        }
                                    }}
                                    className="w-full rounded-2xl bg-gradient-to-r from-[var(--app-accent)] to-teal-600 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-[var(--app-accent)]/20 transition hover:opacity-95"
                                >
                                    Contactar
                                </button>
                            ) : (
                                <p className="rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-400">
                                    Esta publicación es tuya. El botón de contacto se oculta para el propietario.
                                </p>
                            )}
                        </section>
                    </div>
                ) : null}

                {isOwner && listing ? (
                    <section className="rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/90 p-4 shadow-lg shadow-slate-200/40 dark:border-slate-700/70 dark:from-slate-900/70 dark:to-slate-900/40 dark:shadow-none">
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--app-accent)]/70">Gestión del vendedor</p>
                        <h2 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-slate-50">Chats de esta publicación</h2>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            Accesos rápidos para ver conversaciones activas de este producto.
                        </p>
                        {ownerChats.length === 0 ? (
                            <p className="mt-3 rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/80 px-3 py-3 text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-800/50 dark:text-slate-400">
                                Aún no hay chats para esta publicación.
                            </p>
                        ) : (
                            <div className="mt-3 space-y-2">
                                {ownerChats.map((chat) => {
                                    const peer = (chat.participants || []).map((p) => p.user).find((u) => Number(u?.id) !== Number(myId))
                                    const last = chat.last_message
                                    return (
                                        <Link
                                            key={chat.id}
                                            href={`/mensajes?chat=${chat.id}`}
                                            className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-2 transition hover:-translate-y-0.5 hover:border-[var(--app-accent)]/40 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/70"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={storageUrl(peer?.avatar_path)} alt="" className="h-9 w-9 rounded-xl object-cover" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{peer?.name || 'Comprador'}</p>
                                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{last?.body || 'Sin texto (puede ser imagen)'}</p>
                                                <p className="mt-0.5 text-[0.65rem] text-slate-400">{fmtDate(last?.created_at || chat.updated_at)}</p>
                                            </div>
                                            <span className="rounded-lg bg-[var(--app-accent)]/10 px-2 py-1 text-[0.65rem] font-bold text-[var(--app-accent)]">Abrir</span>
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                    </section>
                ) : null}
            </div>
        </PageFade>
    )
}
