'use client'

import { motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import PageFade from '@/components/coleccionador/PageFade'
import ProfileFeedPost from '@/components/coleccionador/ProfileFeedPost'
import axios from '@/lib/axios'
import { storageUrl } from '@/lib/storageUrl'
import { useAuth } from '@/hooks/auth'
import { parseProfileIdFromParam, profileHref } from '@/lib/profileUrl'

export default function PublicProfilePage() {
    const { user: me } = useAuth({})
    const router = useRouter()
    const params = useParams()
    const rawParam = String(params?.id || '')
    const profileUserId = parseProfileIdFromParam(params?.id)
    const [meta, setMeta] = useState(null)
    const [posts, setPosts] = useState([])
    const [friends, setFriends] = useState([])
    const [friendStatus, setFriendStatus] = useState('none')
    const [friendshipId, setFriendshipId] = useState(null)
    const [msg, setMsg] = useState('')
    const [friendsModalOpen, setFriendsModalOpen] = useState(false)
    const [friendsTab, setFriendsTab] = useState('friends')
    const [confirmUnfriendOpen, setConfirmUnfriendOpen] = useState(false)
    const [unfriending, setUnfriending] = useState(false)

    const load = useCallback(async () => {
        if (!profileUserId) return
        try {
            const [{ data: p }, { data: list }, { data: fs }] = await Promise.all([
                axios.get(`/profile/${profileUserId}`),
                axios.get(`/profile/${profileUserId}/posts`),
                axios.get(`/friendships/status/${profileUserId}`),
            ])
            setMeta(p || null)
            setPosts(Array.isArray(list) ? list : [])
            setFriendStatus(fs?.status || p?.friend_status || 'none')
            setFriendshipId(fs?.friendship_id || p?.friendship_id || null)
            const { data: fr } = await axios.get(`/friendships/users/${profileUserId}`)
            setFriends(Array.isArray(fr) ? fr : [])
        } catch {
            setMeta(null)
            setPosts([])
        }
    }, [profileUserId])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        if (!meta?.user) return
        const canonicalHref = profileHref({
            id: meta.user.id,
            name: meta.user.name,
            currentUserId: me?.id,
        })
        const currentHref = `/perfil/${rawParam}`
        if (canonicalHref && canonicalHref !== currentHref) {
            router.replace(canonicalHref, { scroll: false })
        }
    }, [meta?.user, me?.id, rawParam, router])

    useEffect(() => {
        if (!friendsModalOpen) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [friendsModalOpen])

    const requestFriendship = async () => {
        try {
            await axios.post(`/friendships/request/${profileUserId}`)
            setFriendStatus('outgoing')
            setMsg('Se envío solicitud de amistad.')
        } catch {
            setMsg('No se pudo enviar solicitud.')
        }
    }

    const openChatWithUser = async () => {
        if (!profileUserId) {
            setMsg('No se pudo abrir el chat (usuario inválido).')
            return
        }
        if (!me?.id) {
            setMsg('No se pudo abrir el chat (inicia sesión).')
            return
        }
        if (Number(profileUserId) === Number(me.id)) {
            setMsg('No puedes chatear contigo mismo.')
            return
        }
        try {
            const { data } = await axios.post('/chats/direct', { user_id: profileUserId })
            const id = data?.id
            if (id) {
                router.replace(`/mensajes?chat=${id}`, { scroll: false })
            } else {
                setMsg('No se pudo abrir el chat.')
            }
        } catch (err) {
            const backendMsg = err?.response?.data?.message
            setMsg(typeof backendMsg === 'string' && backendMsg.trim() ? backendMsg : 'No se pudo abrir el chat.')
        }
    }

    const respondIncoming = async (action) => {
        if (!friendshipId) return
        await axios.post(`/friendships/${friendshipId}/respond`, { action })
        await load()
        setMsg(action === 'accept' ? 'Solicitud aceptada.' : 'Solicitud rechazada.')
    }

    const removeFriendship = async () => {
        if (!profileUserId) return
        setUnfriending(true)
        try {
            await axios.delete(`/friendships/users/${profileUserId}`)
            setConfirmUnfriendOpen(false)
            await load()
            setFriendStatus('none')
            setMsg('Ya no son amigos.')
        } catch {
            setMsg('No se pudo eliminar la amistad.')
        } finally {
            setUnfriending(false)
        }
    }

    if (!meta?.user) {
        return (
            <PageFade>
                <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-slate-500">Cargando perfil…</div>
            </PageFade>
        )
    }

    const u = meta.user
    const isOwn = Number(u.id) === Number(me?.id)

    return (
        <PageFade>
            <div className="relative mx-auto w-full max-w-full px-4 pb-12 pt-4 sm:px-5 md:px-6 lg:px-8 xl:px-10">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_22px_70px_rgba(2,6,23,0.12)] dark:border-slate-700 dark:bg-[#101a2c]">
                    <div className="relative z-0 h-44 overflow-hidden bg-[linear-gradient(125deg,#1e293b_0%,#334155_52%,#4f46e5_130%)]">
                        {u.cover_path ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={storageUrl(u.cover_path)} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-black/10" />
                            </>
                        ) : null}
                        <div className="pointer-events-auto absolute right-4 top-4 z-30 rounded-full border border-white/25 bg-black/20 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.25em] text-white">
                            Perfil público
                        </div>
                    </div>

                    <div className="relative z-20 -mt-14 px-5 pb-6">
                        <div className="flex justify-center">
                            <div className="relative mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.35rem] border-[5px] border-white bg-slate-100 shadow-[0_18px_45px_rgba(2,6,23,0.22)] dark:border-slate-800 dark:bg-slate-800">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={u.avatar_path ? storageUrl(u.avatar_path) : storageUrl(null)} alt="" className="h-full w-full object-cover" />
                            </div>
                        </div>

                        <div className="mt-4 text-center">
                            <p className="text-[0.72rem] font-bold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Coleccionista</p>
                            <p className="mt-2 text-xl font-extrabold text-slate-900 dark:text-slate-50">{u.name}</p>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{u.email || '—'}</p>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 dark:border-slate-700 dark:bg-slate-950/40">
                                <p className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Colecciones</p>
                                <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-50">{meta.collections_count ?? 0}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 dark:border-slate-700 dark:bg-slate-950/40">
                                <p className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Publicaciones</p>
                                <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-50">{posts.length}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 dark:border-slate-700 dark:bg-slate-950/40">
                                <p className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Amigos</p>
                                <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-50">{friends.length}</p>
                            </div>
                        </div>

                        {!isOwn ? (
                            <div className="mx-auto mt-4 max-w-md">
                                {friendStatus === 'none' ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={openChatWithUser}
                                            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 text-sm font-extrabold text-[var(--app-accent)] transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-950 dark:text-[var(--app-accent)]"
                                        >
                                            Enviar mensaje
                                        </button>
                                        <button type="button" onClick={requestFriendship} className="w-full rounded-2xl bg-[var(--app-accent)] py-2.5 text-sm font-extrabold text-white">
                                            Agregar amigo
                                        </button>
                                    </div>
                                ) : null}
                                {friendStatus === 'outgoing' ? <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-center text-xs font-semibold text-sky-700">Solicitud enviada.</p> : null}
                                {friendStatus === 'incoming' ? (
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => respondIncoming('accept')} className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white">
                                            Aceptar solicitud
                                        </button>
                                        <button type="button" onClick={() => respondIncoming('reject')} className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold dark:border-slate-600">
                                            Rechazar
                                        </button>
                                    </div>
                                ) : null}
                                {friendStatus === 'accepted' ? (
                                    <div className="mt-2 grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={openChatWithUser}
                                            className="w-full rounded-xl border border-[var(--app-accent)] bg-[var(--app-accent)]/10 py-2 text-xs font-extrabold text-[var(--app-accent)] transition hover:bg-[var(--app-accent)]/15"
                                        >
                                            Enviar mensaje
                                        </button>
                                        <button
                                            type="button"
                                            disabled
                                            className="w-full rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-xs font-extrabold text-emerald-700"
                                        >
                                            Amigos
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmUnfriendOpen(true)}
                                            className="w-full rounded-xl border border-red-200 bg-red-50 py-2 text-xs font-extrabold text-red-700 transition hover:bg-red-100"
                                        >
                                            Dejar de ser amigos
                                        </button>
                                    </div>
                                ) : null}
                                {msg ? <p className="mt-2 text-center text-xs text-slate-500">{msg}</p> : null}
                            </div>
                        ) : null}

                        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/55">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Amigos</p>
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
                                    <Link key={f.id} href={profileHref({ id: f.id, name: f.name, currentUserId: me?.id })} className="group relative mx-auto flex w-full max-w-[215px] flex-col items-center gap-2.5 overflow-hidden rounded-3xl border border-slate-200 bg-white px-3 py-3 text-center shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-[var(--app-accent)]/45 hover:shadow-[0_16px_34px_rgba(79,70,229,0.22)] dark:border-slate-700 dark:bg-slate-900/75">
                                        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-indigo-100/70 to-transparent dark:from-indigo-500/10" />
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={storageUrl(f.avatar_path)} alt="" className="h-24 w-24 rounded-3xl object-cover ring-2 ring-white shadow-lg transition group-hover:scale-[1.03] dark:ring-slate-700" />
                                        <span className="line-clamp-2 text-[0.95rem] font-black leading-tight text-slate-800 group-hover:text-[var(--app-accent)] dark:text-slate-100">{f.name}</span>
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                            Ver perfil
                                        </span>
                                    </Link>
                                ))}
                                {friends.length === 0 ? <p className="text-xs text-slate-500">Sin amigos visibles.</p> : null}
                            </div>
                        </div>

                        <div className="mt-5 space-y-3">
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Publicaciones</p>
                            {posts.length === 0 ? (
                                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-600">Aún no hay publicaciones.</p>
                            ) : (
                                posts.map((p) => <ProfileFeedPost key={p.id} post={p} currentUserId={me?.id} onRefresh={load} />)
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
                              <div className="mb-3 flex items-center justify-between">
                                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-50">Amistades de {u.name}</h3>
                                  <button type="button" onClick={() => setFriendsModalOpen(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
                              </div>
                              <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100/90 p-1.5 dark:bg-slate-800/90">
                                  <button type="button" onClick={() => setFriendsTab('friends')} className={`rounded-lg px-3 py-2 text-xs font-extrabold ${friendsTab === 'friends' ? 'bg-white text-[var(--app-accent)] dark:bg-slate-900' : 'text-slate-600 dark:text-slate-300'}`}>
                                      Todos los amigos
                                  </button>
                                  <button type="button" onClick={() => setFriendsTab('requests')} className={`rounded-lg px-3 py-2 text-xs font-extrabold ${friendsTab === 'requests' ? 'bg-white text-[var(--app-accent)] dark:bg-slate-900' : 'text-slate-600 dark:text-slate-300'}`}>
                                      Solicitudes
                                  </button>
                              </div>
                              {friendsTab === 'friends' ? (
                                  <div className="max-h-[62vh] grid grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
                                      {friends.map((f) => (
                                          <Link key={f.id} href={profileHref({ id: f.id, name: f.name, currentUserId: me?.id })} className="group relative mx-auto flex w-full max-w-[190px] flex-col items-center gap-2.5 overflow-hidden rounded-3xl border border-slate-200 bg-white px-3 py-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:border-[var(--app-accent)]/45 hover:shadow-[0_18px_36px_rgba(79,70,229,0.22)] dark:border-slate-700 dark:bg-slate-900/75">
                                              <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-indigo-100/70 to-transparent dark:from-indigo-500/10" />
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img src={storageUrl(f.avatar_path)} alt="" className="h-28 w-28 rounded-3xl object-cover ring-2 ring-white shadow-lg transition group-hover:scale-[1.03] dark:ring-slate-700" />
                                              <p className="line-clamp-2 text-[0.95rem] font-black leading-tight text-slate-900 group-hover:text-[var(--app-accent)] dark:text-slate-100">{f.name}</p>
                                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                                  Abrir perfil
                                              </span>
                                          </Link>
                                      ))}
                                  </div>
                              ) : (
                                  <p className="text-sm text-slate-500">Las solicitudes de amistad se gestionan desde el perfil del dueño de esta cuenta.</p>
                              )}
                          </div>
                      </div>,
                      document.body
                  )
                : null}
            {confirmUnfriendOpen && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          className="fixed inset-0 z-[230] flex items-center justify-center bg-black/20 p-4 md:pl-72"
                          role="dialog"
                          aria-modal="true"
                          onMouseDown={(e) => {
                              if (e.target === e.currentTarget && !unfriending) setConfirmUnfriendOpen(false)
                          }}
                      >
                          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-900">
                              <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Confirmar acción</h4>
                              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                  ¿Seguro que quieres dejar de ser amigo de <span className="font-extrabold">{u.name}</span>?
                              </p>
                              <div className="mt-4 flex gap-2">
                                  <button
                                      type="button"
                                      onClick={() => setConfirmUnfriendOpen(false)}
                                      disabled={unfriending}
                                      className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold dark:border-slate-600"
                                  >
                                      Cancelar
                                  </button>
                                  <button
                                      type="button"
                                      onClick={removeFriendship}
                                      disabled={unfriending}
                                      className="flex-1 rounded-xl bg-red-600 py-2 text-xs font-bold text-white disabled:opacity-60"
                                  >
                                      {unfriending ? 'Eliminando…' : 'Sí, eliminar'}
                                  </button>
                              </div>
                          </div>
                      </div>,
                      document.body
                  )
                : null}
        </PageFade>
    )
}

