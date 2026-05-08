'use client'

import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from '@/lib/axios'
import { storageUrl } from '@/lib/storageUrl'
import PageFade from '@/components/coleccionador/PageFade'
import ProfileFeedPost from '@/components/coleccionador/ProfileFeedPost'
import GroupPostCard from '@/components/coleccionador/GroupPostCard'
import { useAuth } from '@/hooks/auth'

export default function InicioPage() {
    const router = useRouter()
    const { user } = useAuth({})
    const searchParams = useSearchParams()
    const [posts, setPosts] = useState([])
    const [savedPosts, setSavedPosts] = useState([])
    const [recentUsers, setRecentUsers] = useState([])
    const [missingPosts, setMissingPosts] = useState([])
    const [discovery, setDiscovery] = useState({ trending_collections: [], recommended_users: [], recommended_groups: [] })
    const [groupPosts, setGroupPosts] = useState([])
    const [stories, setStories] = useState([])
    const [tab, setTab] = useState('discover')
    const [error, setError] = useState('')
    const [focusedPostAnchor, setFocusedPostAnchor] = useState('')
    const [recommendedGroupsOpen, setRecommendedGroupsOpen] = useState(false)
    const [recommendedUsersOpen, setRecommendedUsersOpen] = useState(false)
    const focusTimerRef = useRef(null)
    const didForceDiscoverRef = useRef(false)

    const loadGroupPosts = useCallback(async () => {
        const { data } = await axios.get('/groups')
        const myGroups = (Array.isArray(data) ? data : []).filter((g) => g?.is_member)
        if (myGroups.length === 0) {
            setGroupPosts([])
            return
        }

        const details = await Promise.all(
            myGroups.slice(0, 12).map(async (g) => {
                try {
                    const { data: detail } = await axios.get(`/groups/${g.id}`)
                    return detail
                } catch {
                    return null
                }
            })
        )

        const merged = details
            .filter(Boolean)
            .flatMap((group) =>
                (Array.isArray(group?.posts) ? group.posts : []).map((post) => ({
                    ...post,
                    __feedType: 'group',
                    __group: {
                        id: group.id,
                        name: group.name,
                        accent_color: group.accent_color,
                        cover_path: group.cover_path,
                    },
                }))
            )
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))

        setGroupPosts(merged)
    }, [])

    const loadStories = useCallback(async () => {
        try {
            const { data } = await axios.get('/stories')
            setStories(Array.isArray(data) ? data : [])
        } catch {
            setStories([])
        }
    }, [])

    const loadFeed = useCallback(async () => {
        try {
            const feedTab = tab === 'for_you' ? 'for_you' : 'discover'
            const { data } = await axios.get('/feed', { params: { tab: feedTab } })
            setPosts(Array.isArray(data) ? data : [])
            const hi = await axios.get('/feed/highlights')
            setRecentUsers(Array.isArray(hi.data?.recent_users) ? hi.data.recent_users : [])
            setMissingPosts(Array.isArray(hi.data?.missing_posts) ? hi.data.missing_posts : [])
            const sv = await axios.get('/feed/saved/list')
            setSavedPosts(Array.isArray(sv.data) ? sv.data : [])
            const dis = await axios.get('/social/discovery')
            setDiscovery({
                trending_collections: Array.isArray(dis.data?.trending_collections) ? dis.data.trending_collections : [],
                recommended_users: Array.isArray(dis.data?.recommended_users) ? dis.data.recommended_users : [],
                recommended_groups: Array.isArray(dis.data?.recommended_groups) ? dis.data.recommended_groups : [],
            })
            await loadGroupPosts()
            await loadStories()
            setError('')
        } catch {
            setError('No se pudo cargar el feed todavía.')
        }
    }, [tab, loadGroupPosts, loadStories])

    useEffect(() => {
        loadFeed()
    }, [loadFeed])

    const react = async (postId, reaction) => {
        try {
            await axios.post(`/feed/${postId}/react`, { reaction })
            await loadFeed()
        } catch {
            // ignorar
        }
    }

    const savePost = async (postId) => {
        await axios.post(`/feed/${postId}/save`)
        await loadFeed()
    }

    const postAnchor = useCallback((post) => {
        if (!post) return ''
        const type = post.__feedType === 'group' ? 'group' : 'feed'
        return `${type}-${post.id}`
    }, [])

    const sharePost = useCallback(async (post) => {
        if (!post || typeof window === 'undefined') return
        const anchor = postAnchor(post)
        const type = post.__feedType === 'group' ? 'group' : 'feed'
        const url = `${window.location.origin}/inicio?type=${type}&post=${post.id}#inicio-post-${anchor}`
        const shareText = `Mira esta publicación en Coleccionador Mundial`

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Compartir publicación',
                    text: shareText,
                    url,
                })
                return
            } catch (err) {
                if (err?.name === 'AbortError') return
            }
        }

        try {
            await navigator.clipboard.writeText(url)
            window.alert('Enlace copiado al portapapeles.')
        } catch {
            window.prompt('Copia este enlace:', url)
        }
    }, [postAnchor])

    useEffect(() => {
        return () => {
            if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current)
        }
    }, [])

    const mixedPosts = useMemo(() => [...posts, ...groupPosts].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)), [posts, groupPosts])
    const visiblePosts = tab === 'saved' ? savedPosts : mixedPosts

    const orderedStoryGroups = useMemo(() => {
        const uid = user?.id
        if (!uid) return stories
        const mine = stories.filter((g) => Number(g?.user?.id) === Number(uid))
        const rest = stories.filter((g) => Number(g?.user?.id) !== Number(uid))
        return [...mine, ...rest]
    }, [stories, user?.id])

    useEffect(() => {
        const linkedPostId = searchParams.get('post')
        if (!linkedPostId || didForceDiscoverRef.current) return
        if (tab !== 'discover') {
            didForceDiscoverRef.current = true
            setTab('discover')
        }
    }, [searchParams, tab])

    useEffect(() => {
        const linkedPostId = searchParams.get('post')
        const linkedType = searchParams.get('type')
        if (!linkedPostId) return
        if (tab !== 'discover') return

        const normalizedType = linkedType === 'group' ? 'group' : 'feed'
        const target = mixedPosts.find((p) => Number(p.id) === Number(linkedPostId) && (p.__feedType === 'group' ? 'group' : 'feed') === normalizedType)
        if (!target) return

        const anchor = postAnchor(target)
        const elementId = `inicio-post-${anchor}`
        const node = document.getElementById(elementId)
        if (!node) return

        node.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setFocusedPostAnchor(anchor)
        if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current)
        focusTimerRef.current = window.setTimeout(() => setFocusedPostAnchor(''), 2600)
    }, [searchParams, tab, mixedPosts, postAnchor])

    const follow = async (userId) => {
        await axios.post(`/users/${userId}/follow`)
        await loadFeed()
    }

    return (
        <PageFade>
            <div className="relative z-[1] mx-auto max-w-6xl space-y-3 px-4 pb-14 pt-4">
                <section className="rounded-3xl border border-slate-200 bg-white/90 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Historias</p>
                        <button
                            type="button"
                            onClick={() => router.push('/historias/nueva')}
                            className="rounded-xl bg-[var(--app-accent)]/10 px-3 py-1.5 text-xs font-extrabold text-[var(--app-accent)]"
                        >
                            Crear
                        </button>
                    </div>
                    <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                        <button
                            type="button"
                            onClick={() => router.push('/historias/nueva')}
                            className="group h-44 w-28 shrink-0 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-2 text-left transition hover:border-[var(--app-accent)] dark:border-slate-600 dark:bg-slate-800/70"
                        >
                            <div className="grid h-full place-items-center rounded-xl bg-white dark:bg-slate-900">
                                <div className="text-center">
                                    <p className="text-3xl font-black text-[var(--app-accent)]">+</p>
                                    <p className="mt-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">Agregar historia</p>
                                </div>
                            </div>
                        </button>
                        {orderedStoryGroups.map((g, idx) => {
                            const cover = g?.stories?.[0]?.image_path ? storageUrl(g.stories[0].image_path) : '/Imagenes/caja.png'
                            return (
                                <button
                                    key={g?.user?.id || idx}
                                    type="button"
                                    onClick={() => {
                                        const firstStoryId = Number(g?.stories?.[0]?.id || 0)
                                        if (firstStoryId) router.push(`/historias/${firstStoryId}`)
                                    }}
                                    className="group relative h-44 w-28 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-600 dark:bg-slate-800"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={cover} alt="" className="h-full w-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                    <div className="absolute left-2 top-2 flex items-center gap-1.5">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={storageUrl(g?.user?.avatar_path)} alt="" className="h-7 w-7 rounded-full border-2 border-white object-cover" />
                                        <span className="line-clamp-1 text-[11px] font-bold text-white">{g?.user?.name}</span>
                                    </div>
                                    <p className="absolute bottom-2 left-2 text-[10px] font-semibold text-white/90">{(g?.stories || []).length} historia(s)</p>
                                </button>
                            )
                        })}
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white/90 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="grid grid-cols-3 gap-1 text-xs font-bold">
                        <button type="button" onClick={() => setTab('discover')} className={`rounded-xl px-3 py-2 ${tab === 'discover' ? 'bg-[var(--app-accent)] text-white' : 'text-slate-600'}`}>Descubrir</button>
                        <button type="button" onClick={() => setTab('for_you')} className={`rounded-xl px-3 py-2 ${tab === 'for_you' ? 'bg-[var(--app-accent)] text-white' : 'text-slate-600'}`}>Para ti</button>
                        <button type="button" onClick={() => setTab('saved')} className={`rounded-xl px-3 py-2 ${tab === 'saved' ? 'bg-[var(--app-accent)] text-white' : 'text-slate-600'}`}>Guardadas</button>
                    </div>
                </section>

                {/*
                <section className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Recién se unieron</p>
                        <div className="mt-2 space-y-2">
                            {recentUsers.slice(0, 4).map((u) => (
                                <div key={u.id} className="rounded-2xl border border-slate-200 p-2 text-xs dark:border-slate-700">
                                    <div className="flex items-center gap-2">
                                        <img src={storageUrl(u.avatar_path)} alt="" className="h-7 w-7 rounded-lg object-cover" />
                                        <p className="font-bold">{u.name}</p>
                                        {u.id !== user?.id ? (
                                            <button type="button" onClick={() => follow(u.id)} className="ml-auto rounded-lg bg-[var(--app-accent)] px-2 py-0.5 text-[10px] font-bold text-white">
                                                Seguir
                                            </button>
                                        ) : null}
                                    </div>
                                    <p className="mt-1 text-slate-500">Colecciones: {(u.collections || []).join(', ') || 'Sin colecciones aún'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Faltantes reportados</p>
                        <div className="mt-2 space-y-2">
                            {missingPosts.slice(0, 3).map((p) => (
                                <div key={p.id} className="rounded-2xl border border-slate-200 p-2 text-xs dark:border-slate-700">
                                    <p className="font-bold">{p.user?.name}</p>
                                    <p className="mt-1 line-clamp-2 text-slate-600 dark:text-slate-300">{p.body}</p>
                                </div>
                            ))}
                            {missingPosts.length === 0 ? <p className="text-xs text-slate-500">Aún no hay faltantes publicados.</p> : null}
                        </div>
                    </div>
                </section>

                <section className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Tendencias</p>
                        <div className="mt-2 space-y-2">
                            {(discovery.trending_collections || []).slice(0, 4).map((t) => (
                                <div key={t.user_id} className="flex items-center gap-2 rounded-2xl border border-slate-200 p-2 text-xs dark:border-slate-700">
                                    <img src={storageUrl(t.avatar_path)} alt="" className="h-7 w-7 rounded-lg object-cover" />
                                    <p className="font-bold">{t.name}</p>
                                    <span className="ml-auto text-slate-500">{t.collections_count} colecciones</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
                */}

                <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <button
                        type="button"
                        onClick={() => setRecommendedGroupsOpen((v) => !v)}
                        aria-expanded={recommendedGroupsOpen}
                        className="flex w-full items-center justify-between gap-3 text-left"
                    >
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Grupos recomendados</p>
                        <span
                            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-transform duration-300 dark:border-slate-600 dark:text-slate-300 ${
                                recommendedGroupsOpen ? 'rotate-180' : ''
                            }`}
                            aria-hidden
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </span>
                    </button>
                    <div
                        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                            recommendedGroupsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                        }`}
                    >
                        <div className="min-h-0 overflow-hidden">
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                {(discovery.recommended_groups || []).slice(0, 4).map((g) => (
                                    <a key={g.id} href={`/comunidad/${g.id}`} className="flex items-center gap-2 rounded-2xl border border-slate-200 p-2 text-xs dark:border-slate-700">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={g.cover_path ? storageUrl(g.cover_path) : '/Imagenes/caja.png'} alt="" className="h-7 w-7 rounded-lg object-cover" />
                                        <p className="font-bold">{g.name}</p>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <button
                        type="button"
                        onClick={() => setRecommendedUsersOpen((v) => !v)}
                        aria-expanded={recommendedUsersOpen}
                        className="flex w-full items-center justify-between gap-3 text-left"
                    >
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Usuarios recomendados</p>
                        <span
                            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-transform duration-300 dark:border-slate-600 dark:text-slate-300 ${
                                recommendedUsersOpen ? 'rotate-180' : ''
                            }`}
                            aria-hidden
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </span>
                    </button>
                    <div
                        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                            recommendedUsersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                        }`}
                    >
                        <div className="min-h-0 overflow-hidden">
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                {(discovery.recommended_users || []).slice(0, 4).map((u) => (
                                    <div key={u.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 p-2 text-xs dark:border-slate-700">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={storageUrl(u.avatar_path)} alt="" className="h-8 w-8 rounded-xl object-cover" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-bold">{u.name}</p>
                                            <p className="truncate text-[10px] text-slate-500">{u.email}</p>
                                        </div>
                                        <button type="button" onClick={() => follow(u.id)} className="rounded-lg bg-[var(--app-accent)] px-2 py-1 text-[10px] font-bold text-white">
                                            Seguir
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {error ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                        {error}
                    </div>
                ) : null}

                {visiblePosts.length === 0 && !error ? (
                    <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 text-center text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                        Aún no hay publicaciones. Ve a <span className="font-bold">Perfil</span> y comparte tu primera novedad.
                    </div>
                ) : null}

                {visiblePosts.map((p, idx) => (
                    <motion.div
                        key={p.__feedType === 'group' ? `g-${p.id}` : `f-${p.id}`}
                        id={`inicio-post-${postAnchor(p)}`}
                        className={`scroll-mt-28 rounded-2xl transition ${
                            focusedPostAnchor && focusedPostAnchor === postAnchor(p) ? 'ring-2 ring-[var(--app-accent)] ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-950' : ''
                        }`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.04 * idx }}
                    >
                        {p.__feedType === 'group' ? (
                            <GroupPostCard
                                post={p}
                                groupId={p.__group?.id}
                                groupMeta={p.__group}
                                currentUserId={user?.id}
                                canModerate={false}
                                canComment
                                canInteract
                                showShare
                                onSharePost={() => sharePost(p)}
                                onRefresh={loadFeed}
                            />
                        ) : (
                            <ProfileFeedPost
                                post={p}
                                currentUserId={user?.id}
                                onRefresh={loadFeed}
                                showSaveShare
                                onSavePost={() => savePost(p.id)}
                                onSharePost={() => sharePost(p)}
                            />
                        )}
                    </motion.div>
                ))}

            </div>
        </PageFade>
    )
}
