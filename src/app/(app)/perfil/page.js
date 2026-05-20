'use client'

import { motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useAuth } from '@/hooks/auth'
import { useCallback, useEffect, useRef, useState } from 'react'
import PageFade from '@/components/coleccionador/PageFade'
import ProfileFeedPost from '@/components/coleccionador/ProfileFeedPost'
import ProfileNewPostForm from '@/components/coleccionador/ProfileNewPostForm'
import axios from '@/lib/axios'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import { storageUrl } from '@/lib/storageUrl'
import { profileHref } from '@/lib/profileUrl'
export default function PerfilPage() {
    const { user, mutate: mutateUser } = useAuth({})
    const [name, setName] = useState('')
    const [saving, setSaving] = useState(false)
    const [collectionsCount, setCollectionsCount] = useState(0)
    const [posts, setPosts] = useState([])
    const [loadingPosts, setLoadingPosts] = useState(true)
    const [mediaMessage, setMediaMessage] = useState('')
    const [imgBust, setImgBust] = useState(0)
    const avatarInputRef = useRef(null)
    const coverInputRef = useRef(null)
    const [friends, setFriends] = useState([])
    const [incomingRequests, setIncomingRequests] = useState([])
    const [outgoingRequests, setOutgoingRequests] = useState([])
    const [friendsModalOpen, setFriendsModalOpen] = useState(false)
    const [friendsTab, setFriendsTab] = useState('friends')

    useEffect(() => {
        setName(user?.name || '')
    }, [user?.name])

    const loadPosts = useCallback(async () => {
        setLoadingPosts(true)
        try {
            const { data } = await axios.get('/profile/posts')
            setPosts(Array.isArray(data) ? data : [])
        } catch {
            setPosts([])
        } finally {
            setLoadingPosts(false)
        }
    }, [])

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const { data } = await axios.get('/collections')
                if (!cancelled) setCollectionsCount(Array.isArray(data) ? data.length : 0)
            } catch {
                if (!cancelled) setCollectionsCount(0)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        loadPosts()
    }, [loadPosts])

    const loadFriendData = useCallback(async () => {
        if (!user?.id) return
        try {
            const [{ data: list }, { data: req }] = await Promise.all([axios.get(`/friendships/users/${user.id}`), axios.get('/friendships/requests')])
            setFriends(Array.isArray(list) ? list : [])
            setIncomingRequests(Array.isArray(req?.incoming) ? req.incoming : [])
            setOutgoingRequests(Array.isArray(req?.outgoing) ? req.outgoing : [])
        } catch {
            setFriends([])
            setIncomingRequests([])
            setOutgoingRequests([])
        }
    }, [user?.id])

    useEffect(() => {
        loadFriendData()
    }, [loadFriendData])

    useEffect(() => {
        if (!friendsModalOpen) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [friendsModalOpen])

    const persistSessionUser = async (nextUser) => {
        if (nextUser) {
            localStorage.setItem('auth_user', JSON.stringify(nextUser))
            await mutateUser(nextUser, false)
        }
    }

    const saveName = async () => {
        const trimmed = name.trim()
        if (!trimmed || trimmed === user?.name) return
        setSaving(true)
        try {
            const { data } = await axios.patch('/profile', { name: trimmed })
            await persistSessionUser(data)
        } catch {
            // ignorar
        } finally {
            setSaving(false)
        }
    }

    const onAvatarChange = async (e) => {
        const input = e.currentTarget
        const raw = input.files?.[0]
        if (!raw) return
        setMediaMessage('Optimizando foto de perfil…')
        let file = raw
        try {
            file = await compressImageForUpload(raw)
        } catch {
            file = raw
        }
        const fd = new FormData()
        fd.append('avatar', file)
        setMediaMessage('Guardando foto de perfil…')
        try {
            const { data } = await axios.post('/profile/media', fd)
            await persistSessionUser(data)
            setImgBust((n) => n + 1)
            setMediaMessage('Foto de perfil actualizada.')
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                (err.response?.status === 422
                    ? 'No se pudo validar la imagen (formato no admitido).'
                    : 'No se pudo guardar la foto. Revisa tu conexión e inténtalo de nuevo.')
            setMediaMessage(msg)
        } finally {
            input.value = ''
            window.setTimeout(() => setMediaMessage(''), 4000)
        }
    }

    const onCoverChange = async (e) => {
        const input = e.currentTarget
        const raw = input.files?.[0]
        if (!raw) return
        setMediaMessage('Optimizando portada…')
        let file = raw
        try {
            file = await compressImageForUpload(raw)
        } catch {
            file = raw
        }
        const fd = new FormData()
        fd.append('cover', file)
        setMediaMessage('Guardando portada…')
        try {
            const { data } = await axios.post('/profile/media', fd)
            await persistSessionUser(data)
            setImgBust((n) => n + 1)
            setMediaMessage('Portada actualizada.')
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                (err.response?.status === 422
                    ? 'No se pudo validar la imagen (formato no admitido).'
                    : 'No se pudo guardar la portada. Revisa tu conexión e inténtalo de nuevo.')
            setMediaMessage(msg)
        } finally {
            input.value = ''
            window.setTimeout(() => setMediaMessage(''), 4000)
        }
    }

    const handlePostPublished = useCallback(
        (createdPost) => {
            if (createdPost?.id) {
                setPosts((prev) => [createdPost, ...prev])
            } else {
                loadPosts()
            }
        },
        [loadPosts]
    )

    const respondRequest = async (friendshipId, action) => {
        await axios.post(`/friendships/${friendshipId}/respond`, { action })
        await loadFriendData()
    }

    return (
        <PageFade>
            <div className="relative mx-auto w-full max-w-full px-4 pb-12 pt-4 sm:px-5 md:px-6 lg:px-8 xl:px-10">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_22px_70px_rgba(2,6,23,0.12)] dark:border-slate-700 dark:bg-[#101a2c]"
                >
                    <div className="relative z-0 h-44 overflow-hidden bg-[linear-gradient(125deg,#1e293b_0%,#334155_52%,#4f46e5_130%)]">
                        {user?.cover_path ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={`${storageUrl(user.cover_path)}?v=${imgBust}`}
                                    alt=""
                                    className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                                />
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-black/10" />
                            </>
                        ) : (
                            <>
                                <div className="pointer-events-none foil-back-pattern absolute inset-0 opacity-35 mix-blend-screen" />
                                <motion.div
                                    className="pointer-events-none absolute -left-24 top-0 h-56 w-56 rounded-full bg-white/15 blur-3xl"
                                    animate={{ x: [0, 18, 0], y: [0, -10, 0] }}
                                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                                />
                            </>
                        )}
                        <div className="pointer-events-auto absolute right-4 top-4 z-30 rounded-full border border-white/25 bg-black/20 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.25em] text-white">
                            Tu perfil
                        </div>
                        <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={onCoverChange}
                        />
                        <button
                            type="button"
                            onClick={() => coverInputRef.current?.click()}
                            className="absolute bottom-3 right-3 z-30 rounded-full border border-white/30 bg-black/35 px-3 py-1.5 text-[0.65rem] font-bold text-white backdrop-blur transition hover:bg-black/50"
                        >
                            Cambiar portada
                        </button>
                    </div>

                    <div className="relative z-20 -mt-14 px-5 pb-6 pointer-events-none">
                        <div className="pointer-events-none flex justify-center">
                            <motion.div
                                initial={{ scale: 0.92, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                className="pointer-events-auto relative mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.35rem] border-[5px] border-white bg-slate-100 shadow-[0_18px_45px_rgba(2,6,23,0.22)] dark:border-slate-800 dark:bg-slate-800"
                            >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={user?.avatar_path ? `${storageUrl(user.avatar_path)}?v=${imgBust}` : storageUrl(null)}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={onAvatarChange}
                            />
                            <button
                                type="button"
                                onClick={() => avatarInputRef.current?.click()}
                                className="absolute inset-0 z-[1] flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent pb-2 text-[0.65rem] font-bold text-white opacity-0 transition hover:opacity-100"
                            >
                                Cambiar foto
                            </button>
                            </motion.div>
                        </div>

                        {mediaMessage ? (
                            <p className="pointer-events-auto mt-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                                {mediaMessage}
                            </p>
                        ) : null}

                        <div className="pointer-events-auto mt-4 text-center">
                            <div className="relative mx-auto w-full max-w-md">
                                <p className="text-[0.72rem] font-bold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Coleccionista</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (typeof window !== 'undefined') {
                                            window.dispatchEvent(new Event('open-account-menu'))
                                        }
                                    }}
                                    className="absolute right-0 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-slate-200 bg-slate-100/85 transition hover:scale-[1.03] hover:bg-[var(--app-accent)]/12 dark:border-slate-600 dark:bg-slate-800/90 dark:hover:bg-[var(--app-accent)]/18 md:hidden"
                                    aria-label="Abrir ajustes de cuenta"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src="/Imagenes/icon_engrane.png"
                                        alt=""
                                        className="h-[18px] w-[18px] object-contain opacity-90 [filter:brightness(0)_saturate(100%)] dark:[filter:brightness(0)_saturate(100%)_invert(1)]"
                                    />
                                </button>
                            </div>
                            <div className="mx-auto mt-2 flex w-full max-w-[30rem] flex-col items-center gap-2">
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full max-w-[22rem] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-lg font-extrabold text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-50 sm:text-xl"
                                />
                                <button
                                    type="button"
                                    onClick={saveName}
                                    disabled={saving}
                                    className="shrink-0 rounded-2xl bg-[var(--app-accent)] px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
                                >
                                    {saving ? 'Guardando…' : 'Guardar nombre'}
                                </button>
                            </div>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{user?.email || '—'}</p>
                        </div>

                        <div className="pointer-events-auto mt-6 grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 dark:border-slate-700 dark:bg-slate-950/40">
                                <p className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Colecciones</p>
                                <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-50">{collectionsCount}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 dark:border-slate-700 dark:bg-slate-950/40">
                                <p className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Publicaciones</p>
                                <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-50">{posts.length}</p>
                            </div>
                            <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 sm:col-span-1 dark:border-slate-700 dark:bg-slate-950/40">
                                <p className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actividad</p>
                                <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-50">En la red</p>
                            </div>
                            <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 sm:col-span-1 dark:border-slate-700 dark:bg-slate-950/40">
                                <p className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Amigos</p>
                                <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-50">{friends.length}</p>
                            </div>
                        </div>

                        <div className="pointer-events-auto mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/55">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Amigos</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Tus conexiones dentro de la app.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFriendsTab('friends')
                                        setFriendsModalOpen(true)
                                    }}
                                    className="rounded-xl bg-[var(--app-accent)]/10 px-3 py-1.5 text-xs font-extrabold text-[var(--app-accent)]"
                                >
                                    Ver más
                                </button>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                                {friends.slice(0, 6).map((f) => (
                                    <Link
                                        key={f.id}
                                        href={profileHref({ id: f.id, name: f.name, currentUserId: user?.id })}
                                        className="group relative mx-auto flex w-full max-w-[215px] flex-col items-center gap-2.5 overflow-hidden rounded-3xl border border-slate-200 bg-white px-3 py-3 text-center shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-[var(--app-accent)]/45 hover:shadow-[0_16px_34px_rgba(79,70,229,0.22)] dark:border-slate-700 dark:bg-slate-900/75"
                                    >
                                        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-indigo-100/70 to-transparent dark:from-indigo-500/10" />
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={storageUrl(f.avatar_path)} alt="" className="h-24 w-24 rounded-3xl object-cover ring-2 ring-white shadow-lg transition group-hover:scale-[1.03] dark:ring-slate-700" />
                                        <span className="line-clamp-2 text-[0.95rem] font-black leading-tight text-slate-800 group-hover:text-[var(--app-accent)] dark:text-slate-100">
                                            {f.name}
                                        </span>
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                            Ver perfil
                                        </span>
                                    </Link>
                                ))}
                                {friends.length === 0 ? <p className="text-xs text-slate-500">Aún no tienes amigos agregados.</p> : null}
                            </div>
                        </div>

                        <div className="pointer-events-auto mt-6 rounded-2xl border border-[var(--app-subtle)]/25 bg-[var(--app-card)] p-4">
                            <ProfileNewPostForm onPublished={handlePostPublished} />
                        </div>

                        <div className="pointer-events-auto mt-5 space-y-3">
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Tus publicaciones</p>
                            {loadingPosts ? (
                                <p className="text-sm text-slate-500">Cargando…</p>
                            ) : posts.length === 0 ? (
                                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-600">
                                    Aún no tienes publicaciones en tu perfil.
                                </p>
                            ) : (
                                posts.map((p) => (
                                    <ProfileFeedPost
                                        key={p.id}
                                        post={p}
                                        currentUserId={user?.id}
                                        onRefresh={loadPosts}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
            {friendsModalOpen && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          className="fixed inset-0 z-[220] flex items-end justify-center bg-transparent p-0 md:items-center md:pl-72"
                          role="dialog"
                          aria-modal="true"
                          onMouseDown={(e) => {
                              if (e.target === e.currentTarget) setFriendsModalOpen(false)
                          }}
                      >
                          <div className="w-full max-w-4xl rounded-t-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 shadow-2xl dark:border-slate-600 dark:from-slate-900 dark:to-slate-950 md:rounded-3xl">
                              <div className="mb-4 flex items-center justify-between">
                                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-50">Red de amistades</h3>
                                  <button type="button" onClick={() => setFriendsModalOpen(false)} className="rounded-full p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                                      ✕
                                  </button>
                              </div>
                              <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100/90 p-1.5 dark:bg-slate-800/90">
                                  <button
                                      type="button"
                                      onClick={() => setFriendsTab('friends')}
                                      className={`rounded-lg px-3 py-2 text-xs font-extrabold ${friendsTab === 'friends' ? 'bg-white text-[var(--app-accent)] dark:bg-slate-900' : 'text-slate-600 dark:text-slate-300'}`}
                                  >
                                      Amigos ({friends.length})
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => setFriendsTab('requests')}
                                      className={`rounded-lg px-3 py-2 text-xs font-extrabold ${friendsTab === 'requests' ? 'bg-white text-[var(--app-accent)] dark:bg-slate-900' : 'text-slate-600 dark:text-slate-300'}`}
                                  >
                                      Solicitudes ({incomingRequests.length})
                                  </button>
                              </div>

                              {friendsTab === 'friends' ? (
                                  <div className="max-h-[62vh] grid grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
                                      {friends.map((f) => (
                                          <Link key={f.id} href={profileHref({ id: f.id, name: f.name, currentUserId: user?.id })} className="group relative mx-auto flex w-full max-w-[190px] flex-col items-center gap-2.5 overflow-hidden rounded-3xl border border-slate-200 bg-white px-3 py-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:border-[var(--app-accent)]/45 hover:shadow-[0_18px_36px_rgba(79,70,229,0.22)] dark:border-slate-700 dark:bg-slate-900/75">
                                              <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-indigo-100/70 to-transparent dark:from-indigo-500/10" />
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img src={storageUrl(f.avatar_path)} alt="" className="h-28 w-28 rounded-3xl object-cover ring-2 ring-white shadow-lg transition group-hover:scale-[1.03] dark:ring-slate-700" />
                                              <p className="line-clamp-2 text-[0.95rem] font-black leading-tight text-slate-900 group-hover:text-[var(--app-accent)] dark:text-slate-100">{f.name}</p>
                                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                                  Abrir perfil
                                              </span>
                                          </Link>
                                      ))}
                                      {friends.length === 0 ? <p className="text-sm text-slate-500">Aún no tienes amigos.</p> : null}
                                  </div>
                              ) : (
                                  <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-1">
                                      <div>
                                          <p className="mb-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Recibidas</p>
                                          <div className="space-y-2">
                                              {incomingRequests.map((r) => (
                                                  <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900/50">
                                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                                      <img src={storageUrl(r.requester?.avatar_path)} alt="" className="h-12 w-12 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-600" />
                                                      <div className="min-w-0 flex-1">
                                                          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{r.requester?.name}</p>
                                                          <p className="truncate text-xs text-slate-500">{r.requester?.email}</p>
                                                      </div>
                                                      <div className="flex gap-1">
                                                          <button type="button" onClick={() => respondRequest(r.id, 'accept')} className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white">
                                                              Aceptar
                                                          </button>
                                                          <button type="button" onClick={() => respondRequest(r.id, 'reject')} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold dark:border-slate-600">
                                                              Rechazar
                                                          </button>
                                                      </div>
                                                  </div>
                                              ))}
                                              {incomingRequests.length === 0 ? <p className="text-xs text-slate-500">Sin solicitudes pendientes.</p> : null}
                                          </div>
                                      </div>
                                      <div>
                                          <p className="mb-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Enviadas</p>
                                          <div className="space-y-2">
                                              {outgoingRequests.map((r) => (
                                                  <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/50">
                                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                                      <img src={storageUrl(r.addressee?.avatar_path)} alt="" className="h-12 w-12 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-600" />
                                                      <div className="min-w-0 flex-1">
                                                          <p className="truncate font-bold text-slate-900 dark:text-slate-100">{r.addressee?.name}</p>
                                                          <p className="truncate text-xs text-slate-500">Solicitud enviada</p>
                                                      </div>
                                                  </div>
                                              ))}
                                              {outgoingRequests.length === 0 ? <p className="text-xs text-slate-500">No has enviado solicitudes.</p> : null}
                                          </div>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>,
                      document.body
                  )
                : null}
        </PageFade>
    )
}
