'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/hooks/auth'
import { useUiThemePreference } from '@/hooks/useUiThemePreference'
import { storageUrl } from '@/lib/storageUrl'
import { getUiThemeById } from '@/lib/uiThemes'
import axios from '@/lib/axios'
import AppearanceThemePanel from '@/components/coleccionador/AppearanceThemePanel'

function Icon({ children, className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            {children}
        </svg>
    )
}

function IconHome({ className }) {
    return (
        <Icon className={className}>
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z" strokeLinecap="round" strokeLinejoin="round" />
        </Icon>
    )
}

function IconScan({ className }) {
    return (
        <Icon className={className}>
            <path d="M4 7h4l2-2h4l2 2h4a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="13" r="3.5" />
        </Icon>
    )
}

function IconFolder({ className }) {
    return (
        <Icon className={className}>
            <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" strokeLinecap="round" strokeLinejoin="round" />
        </Icon>
    )
}

function IconUsers({ className }) {
    return (
        <Icon className={className}>
            <path d="M16 21v-1a4 4 0 00-4-4H5a4 4 0 00-4 4v1" strokeLinecap="round" />
            <circle cx="8.5" cy="10" r="3" />
            <path d="M23 21v-1a4 4 0 00-3-3.87" strokeLinecap="round" />
            <path d="M16 3.13a3 3 0 010 5.74" strokeLinecap="round" />
        </Icon>
    )
}

function IconShop({ className }) {
    return (
        <Icon className={className}>
            <path d="M3 10h18l-1 10H4L3 10z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 10V7a5 5 0 0110 0v3" strokeLinecap="round" />
        </Icon>
    )
}

function IconChat({ className }) {
    return (
        <Icon className={className}>
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 21l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
        </Icon>
    )
}

function IconSparkles({ className }) {
    return (
        <Icon className={className}>
            <path d="M12 3l1.6 4.7H19l-3.8 2.8 1.5 4.7L12 14.9 7.3 15.2l1.5-4.7L5 7.7h5.4L12 3z" strokeLinejoin="round" />
        </Icon>
    )
}

function IconUser({ className }) {
    return (
        <Icon className={className}>
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20v-1a7 7 0 0114 0v1" strokeLinecap="round" />
        </Icon>
    )
}

function IconClose({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
    )
}

function IconArrowLeft({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

/** Misma caja y posición que el menú de cuenta (esquina superior derecha, desplazada del sidebar md:pl-72). */
const USER_MODAL_BACKDROP =
    'fixed inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-4 sm:items-start sm:justify-end sm:pt-20 sm:pr-6 md:pl-72 md:pr-8 md:pt-24'

const ACCOUNT_MENU_BACKDROP = `${USER_MODAL_BACKDROP} z-[180]`

const APPEARANCE_MODAL_BACKDROP = `${USER_MODAL_BACKDROP} z-[190] bg-black/60`

const nav = [
    { href: '/inicio', label: 'Inicio', short: 'Inicio', Icon: IconHome },
    { href: '/escanear', label: 'Escanear', short: 'Scan', Icon: IconScan },
    { href: '/mis-colecciones', label: 'Mis colecciones', short: 'Colecc.', Icon: IconFolder },
    { href: '/comunidad', label: 'Comunidad', short: 'Social', Icon: IconUsers },
    { href: '/tienda', label: 'Tienda', short: 'Tienda', Icon: IconShop },
    { href: '/mensajes', label: 'Mensajes', short: 'Chat', Icon: IconChat },
    { href: '/planes', label: 'Planes', short: 'Planes', Icon: IconSparkles },
    { href: '/perfil', label: 'Perfil', short: 'Perfil', Icon: IconUser },
]

export default function ColeccionadorShell({ children }) {
    const pathname = usePathname()
    const router = useRouter()
    const { user, logout, mutate: mutateUser } = useAuth({})
    const { uiTheme, savingThemeId, selectUiTheme } = useUiThemePreference(mutateUser, user)
    const [notifications, setNotifications] = useState([])
    const [showNotif, setShowNotif] = useState(false)
    const [accountMenuOpen, setAccountMenuOpen] = useState(false)
    const [appearanceModalOpen, setAppearanceModalOpen] = useState(false)
    const accountMenuPanelRef = useRef(null)
    const unread = useMemo(() => notifications.filter((n) => !n.read_at).length, [notifications])

    /** Al abrir el desplegable de notificaciones, marcar todas como leídas en API y en estado local (el contador vuelve a 0). */
    useEffect(() => {
        if (!showNotif) return
        let cancelled = false
        const run = async () => {
            try {
                await axios.post('/notifications/read-all')
            } catch {
                return
            }
            if (cancelled) return
            const ts = new Date().toISOString()
            setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: ts })))
        }
        run()
        return () => {
            cancelled = true
        }
    }, [showNotif])

    const loadNotifications = useCallback(async () => {
        try {
            const { data } = await axios.get('/notifications')
            setNotifications(Array.isArray(data) ? data : [])
        } catch {
            setNotifications([])
        }
    }, [])

    const closeAccountMenu = useCallback(() => {
        setAccountMenuOpen(false)
    }, [])

    const closeAppearanceModal = useCallback(() => {
        setAppearanceModalOpen(false)
    }, [])

    /** Cierra apariencia y vuelve al menú de cuenta. Se aplaza un tick para que el mouseup del clic no caiga en el backdrop y cierre el menú al instante. */
    const backFromAppearanceToMenu = useCallback(() => {
        setAppearanceModalOpen(false)
        window.setTimeout(() => {
            setAccountMenuOpen(true)
        }, 50)
    }, [])

    const openAccountMenu = useCallback(() => {
        setAccountMenuOpen(true)
        setShowNotif(false)
    }, [])

    const openAppearanceFromMenu = useCallback(() => {
        setAccountMenuOpen(false)
        setAppearanceModalOpen(true)
    }, [])

    useEffect(() => {
        if (!accountMenuOpen && !appearanceModalOpen) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [accountMenuOpen, appearanceModalOpen])

    useEffect(() => {
        if (!accountMenuOpen && !appearanceModalOpen) return
        const onKey = (e) => {
            if (e.key !== 'Escape') return
            if (appearanceModalOpen) {
                backFromAppearanceToMenu()
                return
            }
            closeAccountMenu()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [accountMenuOpen, appearanceModalOpen, backFromAppearanceToMenu, closeAccountMenu])

    useEffect(() => {
        if (!accountMenuOpen) return undefined
        let onDown = null
        /** Retraso breve: el clic que cierra «Apariencia» no debe activar este listener y cerrar el menú al instante. */
        const arm = window.setTimeout(() => {
            onDown = (e) => {
                const el = accountMenuPanelRef.current
                if (el && !el.contains(e.target)) closeAccountMenu()
            }
            document.addEventListener('mousedown', onDown)
        }, 60)
        return () => {
            window.clearTimeout(arm)
            if (onDown) document.removeEventListener('mousedown', onDown)
        }
    }, [accountMenuOpen, closeAccountMenu])

    useEffect(() => {
        const onOpenAccountMenu = () => {
            openAccountMenu()
        }
        window.addEventListener('open-account-menu', onOpenAccountMenu)
        return () => {
            window.removeEventListener('open-account-menu', onOpenAccountMenu)
        }
    }, [openAccountMenu])

    useEffect(() => {
        loadNotifications()
    }, [pathname, loadNotifications])

    useEffect(() => {
        let timer = null
        const start = () => {
            if (timer) return
            timer = window.setInterval(() => {
                if (document.visibilityState === 'visible') {
                    loadNotifications()
                }
            }, 12000)
        }
        const stop = () => {
            if (!timer) return
            window.clearInterval(timer)
            timer = null
        }

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                loadNotifications()
                start()
            } else {
                stop()
            }
        }

        onVisibility()
        document.addEventListener('visibilitychange', onVisibility)
        return () => {
            stop()
            document.removeEventListener('visibilitychange', onVisibility)
        }
    }, [loadNotifications])

    const notificationTarget = useCallback((n) => {
        const p = n?.payload || {}
        if (n?.type === 'chat_message' && p.chat_id) return `/mensajes?chat=${p.chat_id}`
        if ((n?.type === 'friend_request' || n?.type === 'follow') && p.user_id) return `/perfil/${p.user_id}`
        if (n?.type === 'friend_request' && p.requester_id) return `/perfil/${p.requester_id}`
        if (n?.type === 'friend_accept' && p.user_id) return `/perfil/${p.user_id}`
        if ((n?.type === 'comment' || n?.type === 'comment_reply' || n?.type === 'comment_reaction' || n?.type === 'share') && p.post_id) {
            return `/inicio?type=feed&post=${p.post_id}#inicio-post-feed-${p.post_id}`
        }
        return '/inicio'
    }, [])

    const openNotification = useCallback(
        async (n) => {
            try {
                if (!n?.read_at) {
                    await axios.post(`/notifications/${n.id}/read`)
                    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)))
                }
            } catch {
                // ignorar y navegar de todas formas
            }
            setShowNotif(false)
            router.push(notificationTarget(n))
        },
        [notificationTarget, router]
    )

    return (
        <div className="min-h-screen bg-[var(--app-bg)] app-bg-pattern font-sans text-[var(--app-text)]">
            <header className="hidden md:fixed md:inset-x-0 md:top-0 md:z-[70] md:block md:h-16 md:border-b md:border-slate-200/80 md:bg-white/90 md:backdrop-blur md:dark:border-slate-600/50 md:dark:bg-slate-800/95">
                <div className="mx-auto flex h-full max-w-[1600px] items-center gap-4 px-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--app-accent)] text-lg text-white shadow-md">C</div>
                        <div className="relative hidden lg:block">
                            <input
                                readOnly
                                value="Buscar colecciones, grupos, usuarios..."
                                className="w-72 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-500 outline-none dark:border-slate-600/60 dark:bg-slate-900/80 dark:text-slate-300"
                            />
                        </div>
                    </div>

                    <nav className="mx-auto flex items-center gap-1 rounded-2xl bg-slate-100/80 px-2 py-1 dark:bg-slate-900/60">
                        {nav.slice(0, 5).map(({ href, label, Icon }) => {
                            const active = pathname === href
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                                        active
                                            ? 'bg-white text-[var(--app-accent)] shadow-sm dark:bg-slate-900/90 dark:text-[var(--app-accent)] dark:shadow-none'
                                            : 'text-slate-600 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-slate-700/80'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="hidden lg:inline">{label}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        <Link href="/buscar" className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                <circle cx="11" cy="11" r="7" />
                                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
                            </svg>
                        </Link>
                        <button
                            type="button"
                            onClick={async () => {
                                setShowNotif((v) => !v)
                            }}
                            className="relative grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5" strokeLinecap="round" />
                                <path d="M9 17a3 3 0 006 0" strokeLinecap="round" />
                            </svg>
                            {unread > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{unread}</span> : null}
                        </button>
                        <Link href="/mensajes" className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            <IconChat className="h-4 w-4" />
                        </Link>
                        <button
                            type="button"
                            onClick={() => (accountMenuOpen ? closeAccountMenu() : openAccountMenu())}
                            className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 ring-offset-2 transition hover:ring-2 hover:ring-[var(--app-accent)]/50 dark:border-slate-700 dark:bg-slate-800"
                            aria-expanded={accountMenuOpen}
                            aria-haspopup="dialog"
                            aria-label="Menú de tu cuenta"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={storageUrl(user?.avatar_path)} alt="" className="h-full w-full object-cover" />
                        </button>
                    </div>
                </div>
                {showNotif ? (
                    <div className="absolute right-4 top-14 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-600/50 dark:bg-slate-900/98">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Notificaciones</p>
                        <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
                            {notifications.slice(0, 12).map((n) => (
                                <button
                                    key={n.id}
                                    type="button"
                                    onClick={() => openNotification(n)}
                                    className={`w-full rounded-xl border p-2 text-left text-xs transition ${
                                        n.read_at
                                            ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100'
                                            : 'border-[var(--app-accent)]/35 bg-indigo-50/60 text-slate-800 hover:bg-indigo-50 dark:border-indigo-500/40 dark:bg-indigo-950/25 dark:text-slate-50'
                                    }`}
                                >
                                    <p className="font-semibold">{n.message}</p>
                                    <p className="mt-1 text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
                                </button>
                            ))}
                            {notifications.length === 0 ? <p className="text-xs text-slate-500">Sin notificaciones nuevas.</p> : null}
                        </div>
                    </div>
                ) : null}
            </header>

            <main className="relative z-0 pb-24 md:ml-72 md:pt-16 xl:mr-[22rem]">{children}</main>

            <aside
                className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:top-16 md:z-[60] md:w-72 md:flex-col md:border-r md:border-slate-200/80 md:bg-white/85 md:backdrop-blur md:px-3 md:py-4 md:dark:border-slate-600/50 md:dark:bg-slate-800/95"
                aria-label="Navegación principal"
            >
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600/50 dark:bg-slate-900/70">
                    <button
                        type="button"
                        onClick={openAccountMenu}
                        className="flex w-full items-center gap-2 rounded-xl text-left transition hover:bg-white/80 dark:hover:bg-slate-800/80"
                    >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={storageUrl(user?.avatar_path)} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{user?.name || 'Coleccionista'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Tu panel social</p>
                        </div>
                    </button>
                </div>
                <nav className="mt-3 flex flex-col gap-1 px-1">
                    {nav.map(({ href, label, Icon }) => {
                        const active = pathname === href
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition md:duration-200 ${
                                    active
                                        ? 'bg-[var(--app-accent)] text-white shadow-[0_8px_18px_rgba(99,102,241,0.35)]'
                                        : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-700/70 dark:hover:text-white'
                                }`}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span>{label}</span>
                                <span className="ml-auto font-bold opacity-70">&gt;</span>
                            </Link>
                        )
                    })}
                </nav>
            </aside>

            <aside className="hidden xl:fixed xl:inset-y-0 xl:right-0 xl:top-16 xl:z-[55] xl:block xl:w-[22rem] xl:border-l xl:border-slate-200/80 xl:bg-white/80 xl:px-4 xl:py-4 xl:backdrop-blur xl:dark:border-slate-600/50 xl:dark:bg-slate-800/95">
                <div className="space-y-3">
                    <section className="rounded-2xl border border-slate-200 bg-white/90 p-3 dark:border-slate-600/50 dark:bg-slate-900/75">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Actividad</p>
                        <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Comparte un faltante o un nuevo hallazgo desde Inicio y Perfil.</p>
                    </section>
                    <section className="rounded-2xl border border-slate-200 bg-white/90 p-3 dark:border-slate-600/50 dark:bg-slate-900/75">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Accesos rápidos</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <Link href="/escanear" className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                                Registrar
                            </Link>
                            <Link href="/comunidad" className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                                Grupos
                            </Link>
                            <Link href="/tienda" className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                                Tienda
                            </Link>
                            <Link href="/mensajes" className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                                Mensajes
                            </Link>
                        </div>
                    </section>
                </div>
            </aside>

            {accountMenuOpen && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          className={ACCOUNT_MENU_BACKDROP}
                          role="presentation"
                          onMouseDown={(e) => {
                              if (e.target === e.currentTarget) closeAccountMenu()
                          }}
                      >
                          <div
                              ref={accountMenuPanelRef}
                              role="dialog"
                              aria-modal="true"
                              aria-labelledby="account-menu-title"
                              className="pointer-events-auto relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 pt-12 shadow-2xl dark:border-slate-600 dark:bg-slate-900 sm:mr-0"
                          >
                              <h2 id="account-menu-title" className="sr-only">
                                  Tu cuenta
                              </h2>
                              <button
                                  type="button"
                                  onClick={closeAccountMenu}
                                  className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  aria-label="Cerrar"
                              >
                                  <IconClose className="h-5 w-5" />
                              </button>
                              <div className="flex flex-col items-center text-center">
                                  <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-slate-200 dark:border-slate-600">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={storageUrl(user?.avatar_path)} alt="" className="h-full w-full object-cover" />
                                  </div>
                                  <p className="mt-3 text-lg font-extrabold text-slate-900 dark:text-slate-50">{user?.name || 'Coleccionista'}</p>
                              </div>
                              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-800/80">
                                  <p className="min-w-0 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                      Modo:{' '}
                                      <span className="font-extrabold text-[var(--app-accent)]">{getUiThemeById(uiTheme).name}</span>
                                  </p>
                                  <button
                                      type="button"
                                      onClick={openAppearanceFromMenu}
                                      className="shrink-0 rounded-lg bg-[var(--app-accent)] px-3 py-1.5 text-xs font-extrabold text-white shadow-sm transition hover:opacity-95"
                                  >
                                      Cambiar
                                  </button>
                              </div>
                              <Link
                                  href="/perfil"
                                  onClick={closeAccountMenu}
                                  className="mt-3 block w-full rounded-xl border border-slate-200 py-2.5 text-center text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                  Ir a mi perfil
                              </Link>
                              <button
                                  type="button"
                                  onClick={() => {
                                      closeAccountMenu()
                                      logout()
                                  }}
                                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition active:scale-[0.99] dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                              >
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                      <path
                                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                      />
                                  </svg>
                                  Cerrar sesión
                              </button>
                          </div>
                      </div>,
                      document.body
                  )
                : null}

            {appearanceModalOpen && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          className={APPEARANCE_MODAL_BACKDROP}
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="appearance-modal-title"
                          onMouseDown={(e) => {
                              if (e.target === e.currentTarget) backFromAppearanceToMenu()
                          }}
                      >
                          <div className="pointer-events-auto flex max-h-[min(92vh,720px)] w-full max-w-sm flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-900 sm:rounded-2xl md:max-h-[min(88vh,680px)]">
                              <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-3 dark:border-slate-700 sm:px-4">
                                  <button
                                      type="button"
                                      onClick={backFromAppearanceToMenu}
                                      className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                      aria-label="Regresar al menú de cuenta"
                                  >
                                      <IconArrowLeft className="h-5 w-5 shrink-0" />
                                      <span className="whitespace-nowrap text-xs sm:text-sm">Regresar</span>
                                  </button>
                                  <h2 id="appearance-modal-title" className="min-w-0 flex-1 truncate text-center text-sm font-extrabold text-slate-900 dark:text-slate-50 sm:text-base">
                                      Apariencia
                                  </h2>
                                  <div className="flex w-[5.5rem] shrink-0 justify-end sm:w-24">
                                      <button
                                          type="button"
                                          onClick={closeAppearanceModal}
                                          className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                          aria-label="Cerrar"
                                      >
                                          <IconClose className="h-5 w-5" />
                                      </button>
                                  </div>
                              </div>
                              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                                  <AppearanceThemePanel
                                      compact
                                      uiTheme={uiTheme}
                                      savingThemeId={savingThemeId}
                                      onSelectTheme={selectUiTheme}
                                  />
                              </div>
                          </div>
                      </div>,
                      document.body
                  )
                : null}

            <nav
                className="bottom-nav-shell fixed bottom-0 left-0 right-0 z-50 border-t border-transparent bg-white/95 backdrop-blur nav-entrance dark:border-slate-600/40 dark:bg-slate-800/98 dark:shadow-[0_-10px_32px_rgba(0,0,0,0.35)] md:hidden"
                aria-label="Navegación principal"
            >
                <div className="flex overflow-x-auto px-2 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <div className="mx-auto flex min-w-full justify-between gap-0.5 px-1 py-1">
                        {nav.map(({ href, label, short, Icon }) => {
                            const active = pathname === href
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`nav-item relative min-w-[3.15rem] flex-1 py-2 text-center ${
                                        active ? 'text-slate-900 is-active dark:text-slate-50' : 'text-slate-500 dark:text-slate-300'
                                    }`}
                                >
                                    <span
                                        className={`nav-icon-wrap mx-auto block h-10 w-10 rounded-full ${
                                            active
                                                ? 'bg-[var(--app-accent)] shadow-lg text-white'
                                                : 'text-slate-600 dark:text-slate-200'
                                        } grid place-items-center`}
                                    >
                                        <Icon className="mx-auto h-5 w-5" />
                                    </span>
                                    <span className="mt-1 block truncate px-0.5 text-[9px] font-semibold leading-tight">{short}</span>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </nav>
        </div>
    )
}
