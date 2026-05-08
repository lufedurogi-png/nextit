'use client'

import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from '@/lib/axios'
import AppHero from '@/components/coleccionador/AppHero'
import PageFade from '@/components/coleccionador/PageFade'
import { storageUrl } from '@/lib/storageUrl'
import TiendaPublishPanel from '@/components/coleccionador/TiendaPublishPanel'
import { IconSearch, tiendaInputClass } from '@/components/coleccionador/TiendaSectionCard'
import { TIENDA_CATEGORIAS } from '@/lib/tiendaCategories'
import { listingAllImages, listingTitle } from '@/lib/tiendaListingUtils'
import { useAuth } from '@/hooks/auth'

export default function TiendaPage() {
    const router = useRouter()
    const { user } = useAuth({})
    const myId = user?.id
    const [rows, setRows] = useState([])
    const [mine, setMine] = useState([])
    const [error, setError] = useState('')
    const [q, setQ] = useState('')
    const [cat, setCat] = useState('todos')
    const [catOpen, setCatOpen] = useState(false)
    const [filters, setFilters] = useState({ q: '', cat: 'todos' })
    const catRef = useRef(null)

    const load = useCallback(async () => {
        try {
            const params = {}
            if (filters.q?.trim()) params.q = filters.q.trim()
            if (filters.cat && filters.cat !== 'todos') params.category = filters.cat
            const [{ data: all }, { data: my }] = await Promise.all([axios.get('/listings', { params }), axios.get('/listings/mine')])
            setRows(Array.isArray(all) ? all : [])
            setMine(Array.isArray(my) ? my : [])
            setError('')
        } catch {
            setError('No se pudieron cargar las publicaciones.')
        }
    }, [filters])

    useEffect(() => {
        const t = window.setTimeout(() => setFilters({ q, cat }), 400)
        return () => window.clearTimeout(t)
    }, [q, cat])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        const onDocClick = (ev) => {
            if (!catRef.current) return
            if (!catRef.current.contains(ev.target)) {
                setCatOpen(false)
            }
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [])

    const currentCategoryLabel = cat === 'todos' ? 'Todas' : cat

    return (
        <PageFade>
            <AppHero title="Tienda" contentClassName="max-w-6xl" allowOverflow>
                <div className="rounded-2xl border border-white/20 bg-white/90 p-3 shadow-lg shadow-slate-950/10 backdrop-blur dark:border-white/10 dark:bg-slate-900/75">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                            <label className="mb-1.5 block text-[0.68rem] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                                Buscar
                            </label>
                            <div className="group relative">
                                <span
                                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--app-accent)]"
                                    aria-hidden
                                >
                                    <IconSearch className="h-4 w-4" />
                                </span>
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Nombre, descripción, marca..."
                                    className={`${tiendaInputClass} h-11 border-slate-200/80 bg-white/95 pl-10`}
                                />
                            </div>
                        </div>
                        <div className="w-full sm:w-52 sm:shrink-0">
                            <label className="mb-1.5 block text-[0.68rem] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                                Categoría
                            </label>
                            <div ref={catRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setCatOpen((v) => !v)}
                                    className={`${tiendaInputClass} h-11 w-full border-slate-200/80 bg-white/95 text-left font-semibold text-slate-700 shadow-sm dark:text-slate-200`}
                                >
                                    <span className="truncate pr-8">{currentCategoryLabel}</span>
                                    <span
                                        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition ${
                                            catOpen ? 'rotate-180' : ''
                                        }`}
                                        aria-hidden
                                    >
                                        ▾
                                    </span>
                                </button>
                                {catOpen ? (
                                    <div className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl ring-1 ring-slate-100 dark:border-slate-600/60 dark:bg-slate-900 dark:ring-slate-700">
                                        <div className="max-h-64 overflow-y-auto p-1.5">
                                            {['todos', ...TIENDA_CATEGORIAS].map((value) => {
                                                const label = value === 'todos' ? 'Todas las categorías' : value
                                                const active = cat === value
                                                return (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        onClick={() => {
                                                            setCat(value)
                                                            setCatOpen(false)
                                                        }}
                                                        className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                                                            active
                                                                ? 'bg-[var(--app-accent)]/12 font-bold text-[var(--app-accent)]'
                                                                : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-800/70'
                                                        }`}
                                                    >
                                                        <span className="line-clamp-1">{label}</span>
                                                        {active ? <span aria-hidden>✓</span> : null}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </AppHero>

            <div className="relative z-[1] mx-auto max-w-6xl space-y-4 px-4 pb-16 -mt-3">
                {error ? <p className="text-sm text-red-600">{error}</p> : null}

                <TiendaPublishPanel
                    activeListingsCount={mine.length}
                    onPublished={async () => {
                        await load()
                    }}
                />

                {rows.length === 0 && !error ? (
                    <p className="rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/50 py-8 text-center text-sm text-slate-500 dark:border-slate-600/50 dark:bg-slate-800/20 dark:text-slate-400">
                        No hay resultados con estos filtros, o aún no hay ofertas en la tienda.
                    </p>
                ) : null}

                {rows.length > 0 ? (
                    <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200/60 pb-2 dark:border-slate-700/50">
                        <div>
                            <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-400">Catálogo</p>
                            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Ofertas de la comunidad</h3>
                        </div>
                        <p className="text-xs font-semibold text-slate-500">
                            {rows.length} {rows.length === 1 ? 'resultado' : 'resultados'}
                        </p>
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rows.map((l, idx) => {
                        const imgs = listingAllImages(l)
                        return (
                            <motion.div
                                key={l.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.03 * idx }}
                                role="button"
                                tabIndex={0}
                                onClick={() => router.push(`/tienda/${l.id}`)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        router.push(`/tienda/${l.id}`)
                                    }
                                }}
                                className="flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 text-[15px] shadow-md shadow-slate-200/40 ring-1 ring-slate-100/80 transition hover:-translate-y-0.5 hover:shadow-lg dark:from-slate-900/90 dark:to-slate-900/70 dark:border-slate-600/60 dark:shadow-none dark:ring-slate-700/40"
                            >
                                <div className="relative h-40 w-full bg-slate-100 dark:bg-slate-800">
                                    {imgs[0] ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={storageUrl(imgs[0])} alt="" className="h-full w-full object-cover" />
                                    ) : null}
                                </div>
                                {l.marketplace_category ? (
                                    <p className="px-2 pt-2 text-[0.6rem] font-bold uppercase tracking-wide text-[var(--app-accent)]">{l.marketplace_category}</p>
                                ) : null}
                                <div className="min-h-0 flex-1 space-y-0.5 px-3 py-2">
                                    <p className="line-clamp-2 font-extrabold text-slate-900 dark:text-slate-50">{listingTitle(l)}</p>
                                    {l.marketplace_brand ? <p className="text-xs text-slate-500">Marca: {l.marketplace_brand}</p> : null}
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Vendedor: {l.seller?.name}</p>
                                    <p className="text-base font-black text-[var(--app-accent)]">${Number(l.price).toFixed(2)}</p>
                                </div>
                                {imgs.length > 1 ? (
                                    <div className="grid grid-cols-4 gap-0.5 border-t border-slate-200 px-1 py-1 dark:border-slate-600">
                                        {imgs.slice(1, 5).map((p, i) => (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img key={i} src={storageUrl(p)} alt="" className="h-10 w-full object-cover" />
                                        ))}
                                    </div>
                                ) : null}
                                {Number(l.seller_id) !== Number(myId) ? (
                                    <div className="mt-auto p-2">
                                        <button
                                            type="button"
                                            onClick={async (e) => {
                                                e.stopPropagation()
                                                try {
                                                    const { data } = await axios.post(`/listings/${l.id}/contact`)
                                                    window.location.href = `/mensajes?chat=${data.id}`
                                                } catch {
                                                    alert('No se pudo iniciar el chat (¿eres el vendedor?)')
                                                }
                                            }}
                                            className="w-full rounded-xl bg-[var(--app-accent)] py-2 text-sm font-extrabold text-white"
                                        >
                                            Contactar
                                        </button>
                                    </div>
                                ) : null}
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </PageFade>
    )
}
