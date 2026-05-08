'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useState } from 'react'
import axios from '@/lib/axios'
import PageFade from '@/components/coleccionador/PageFade'
import AppHero from '@/components/coleccionador/AppHero'
import ProfileFeedPost from '@/components/coleccionador/ProfileFeedPost'
import GroupPostCard from '@/components/coleccionador/GroupPostCard'
import { storageUrl } from '@/lib/storageUrl'
import { profileHref } from '@/lib/profileUrl'
import { useAuth } from '@/hooks/auth'
import { listingAllImages, listingTitle } from '@/lib/tiendaListingUtils'

export default function BuscarPage() {
    const { user } = useAuth({})
    const [q, setQ] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState({ users: [], groups: [], posts: [], group_posts: [], listings: [] })

    const runSearch = async () => {
        try {
            setLoading(true)
            const { data } = await axios.get('/search/global', { params: { q } })
            setResult({
                users: Array.isArray(data?.users) ? data.users : [],
                groups: Array.isArray(data?.groups) ? data.groups : [],
                posts: Array.isArray(data?.posts) ? data.posts : [],
                group_posts: Array.isArray(data?.group_posts) ? data.group_posts : [],
                listings: Array.isArray(data?.listings) ? data.listings : [],
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <PageFade>
            <AppHero eyebrow="Explorar" title="Búsqueda global" subtitle="Encuentra usuarios, grupos, publicaciones y productos de tienda." />
            <div className="relative z-[1] mx-auto max-w-6xl space-y-3 px-4 pb-12 -mt-3">
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="flex gap-2">
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') runSearch()
                            }}
                            placeholder="Buscar..."
                            className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                        />
                        <button type="button" onClick={runSearch} className="rounded-2xl bg-[var(--app-accent)] px-4 py-2 text-sm font-extrabold text-white">
                            {loading ? 'Buscando…' : 'Buscar'}
                        </button>
                    </div>
                </div>
                <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Usuarios</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {result.users.map((u, idx) => (
                            <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 * idx }}>
                                <Link
                                    href={profileHref({ id: u.id, name: u.name, currentUserId: user?.id })}
                                    className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/75"
                                >
                                    <div className="relative h-24 bg-slate-100 dark:bg-slate-800">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={u.cover_path ? storageUrl(u.cover_path) : '/Imagenes/caja.png'} alt="" className="h-full w-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                    </div>
                                    <div className="px-3 pb-3 pt-2">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={storageUrl(u.avatar_path)} alt="" className="h-12 w-12 rounded-2xl border-2 border-white object-cover shadow dark:border-slate-800" />
                                        <p className="mt-2 truncate text-sm font-extrabold text-slate-900 group-hover:text-[var(--app-accent)] dark:text-slate-50">{u.name}</p>
                                        <p className="truncate text-xs text-slate-500">{u.email || 'Sin correo visible'}</p>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                        {result.users.length === 0 ? <p className="text-sm text-slate-500">Sin resultados de usuarios.</p> : null}
                    </div>
                </section>
                <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Grupos</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {result.groups.map((g, idx) => (
                            <motion.div key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 * idx }}>
                                <Link
                                    href={`/comunidad/${g.id}`}
                                    className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/75"
                                >
                                    <div className="relative h-28 bg-slate-100 dark:bg-slate-800">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={g.cover_path ? storageUrl(g.cover_path) : '/Imagenes/caja.png'} alt="" className="h-full w-full object-cover" />
                                    </div>
                                    <div className="space-y-1 p-3">
                                        <p className="line-clamp-1 text-sm font-extrabold text-slate-900 group-hover:text-[var(--app-accent)] dark:text-slate-50">{g.name}</p>
                                        <p className="line-clamp-2 text-xs text-slate-500">{g.description || 'Grupo de coleccionistas.'}</p>
                                        <p className="text-[11px] font-semibold text-slate-500">{g.members_count ?? 0} miembros</p>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                        {result.groups.length === 0 ? <p className="text-sm text-slate-500">Sin resultados de grupos.</p> : null}
                    </div>
                </section>
                <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Publicaciones</p>
                    <div className="mt-3 space-y-3">
                        {[...result.posts.map((p) => ({ ...p, __feedType: 'feed' })), ...result.group_posts.map((p) => ({ ...p, __feedType: 'group' }))]
                            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                            .map((p, idx) => (
                                <motion.div
                                    key={`${p.__feedType}-${p.id}`}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.02 * idx }}
                                >
                                    {p.__feedType === 'group' ? (
                                        <GroupPostCard
                                            post={{ ...p, comments: Array.isArray(p.comments) ? p.comments : [] }}
                                            groupId={p.group_id}
                                            groupMeta={p.group || null}
                                            currentUserId={user?.id}
                                            canModerate={false}
                                            canComment={false}
                                            canInteract={false}
                                            onRefresh={runSearch}
                                        />
                                    ) : (
                                        <ProfileFeedPost post={p} currentUserId={user?.id} onRefresh={runSearch} />
                                    )}
                                </motion.div>
                            ))}
                        {result.posts.length === 0 && result.group_posts.length === 0 ? <p className="text-sm text-slate-500">Sin resultados de publicaciones.</p> : null}
                    </div>
                </section>
                <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Tienda</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {result.listings.map((l, idx) => {
                            const imgs = listingAllImages(l)
                            return (
                                <motion.div
                                    key={l.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.02 * idx }}
                                >
                                    <Link
                                        href={`/tienda/${l.id}`}
                                        className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 text-[15px] shadow-md shadow-slate-200/40 ring-1 ring-slate-100/80 transition hover:-translate-y-0.5 hover:shadow-lg dark:from-slate-900/90 dark:to-slate-900/70 dark:border-slate-600/60 dark:shadow-none dark:ring-slate-700/40"
                                    >
                                        <div className="relative h-40 w-full bg-slate-100 dark:bg-slate-800">
                                            {imgs[0] ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={storageUrl(imgs[0])} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src="/Imagenes/caja.png" alt="" className="h-full w-full object-cover" />
                                            )}
                                        </div>
                                        {l.marketplace_category ? (
                                            <p className="px-2 pt-2 text-[0.6rem] font-bold uppercase tracking-wide text-[var(--app-accent)]">{l.marketplace_category}</p>
                                        ) : null}
                                        <div className="min-h-0 flex-1 space-y-0.5 px-3 py-2">
                                            <p className="line-clamp-2 font-extrabold text-slate-900 dark:text-slate-50">{listingTitle(l)}</p>
                                            {l.marketplace_brand ? <p className="text-xs text-slate-500">Marca: {l.marketplace_brand}</p> : null}
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Vendedor: {l.seller?.name}</p>
                                            <p className="text-base font-black text-[var(--app-accent)]">${Number(l.price || 0).toFixed(2)}</p>
                                        </div>
                                    </Link>
                                </motion.div>
                            )
                        })}
                        {result.listings.length === 0 ? <p className="text-sm text-slate-500">Sin resultados de productos en tienda.</p> : null}
                    </div>
                </section>
            </div>
        </PageFade>
    )
}

