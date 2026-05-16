'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/hooks/auth'
import { useUiThemePreference } from '@/hooks/useUiThemePreference'
import { storageUrl } from '@/lib/storageUrl'
import { getUiThemeById } from '@/lib/uiThemes'
import { isProSubscriptionActive } from '@/lib/proSubscription'
import { emitVikuChanSignal } from '@/lib/vikuChanSignals'
import axios from '@/lib/axios'
import AppearanceThemePanel from '@/components/coleccionador/AppearanceThemePanel'
import VikuChanLayer from '@/components/coleccionador/VikuChanLayer'

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
    const mainContentRef = useRef(null)
    const { uiTheme, savingThemeId, selectUiTheme } = useUiThemePreference(mutateUser, user)
    const [notifications, setNotifications] = useState([])
    const [showNotif, setShowNotif] = useState(false)
    const [accountMenuOpen, setAccountMenuOpen] = useState(false)
    const [appearanceModalOpen, setAppearanceModalOpen] = useState(false)
    const [vikuToggleSaving, setVikuToggleSaving] = useState(false)
    const accountMenuPanelRef = useRef(null)
    const unread = useMemo(() => notifications.filter((n) => !n.read_at).length, [notifications])
    const prevUnreadNotifRef = useRef(null)

    const proActive = useMemo(() => isProSubscriptionActive(user), [user])
    const vikuLayerActive = proActive && Number(user?.viku_chan_mode) === 1

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
            const arr = Array.isArray(data) ? data : []
            const unreadNow = arr.filter((n) => !n.read_at).length
            if (prevUnreadNotifRef.current !== null && unreadNow > prevUnreadNotifRef.current) {
                emitVikuChanSignal('notification')
            }
            prevUnreadNotifRef.current = unreadNow
            setNotifications(arr)
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
            <header className="hidden md:fixed md:inset-x-0 md:top-0 md:z-[70] md:block md:h-16 md:border-b md:border-[var(--app-subtle)]/22 md:bg-[color-mix(in_srgb,var(--app-card)_91%,var(--app-bg)_9%)] md:backdrop-blur">
                <div className="mx-auto flex h-full max-w-[1600px] items-center gap-4 px-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <Link
                            href="/inicio"
                            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--app-card)] shadow-md ring-1 ring-[var(--app-subtle)]/25"
                            aria-label="Viku — inicio"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/Imagenes/logo_viku.png" alt="" className="h-full w-full object-contain p-1" />
                        </Link>
                        <div className="relative hidden lg:block">
                            <input
                                readOnly
                                value="Buscar colecciones, grupos, usuarios..."
                                className="w-72 rounded-full border border-[var(--app-subtle)]/30 bg-[color-mix(in_srgb,var(--app-card)_82%,var(--app-bg)_18%)] px-4 py-2 text-xs font-semibold text-[var(--app-subtle)] outline-none"
                            />
                        </div>
                    </div>

                    <nav className="mx-auto flex items-center gap-1 rounded-2xl border border-[var(--app-subtle)]/15 bg-[color-mix(in_srgb,var(--app-card)_72%,var(--app-bg)_28%)] px-2 py-1">
                        {nav.slice(0, 5).map(({ href, label, Icon }) => {
                            const active = pathname === href
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                                        active
                                            ? 'bg-[var(--app-card)] text-[var(--app-accent)] shadow-sm'
                                            : 'text-[var(--app-subtle)] hover:bg-[color-mix(in_srgb,var(--app-card)_88%,var(--app-bg)_12%)]'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="hidden lg:inline">{label}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        <Link href="/buscar" className="grid h-9 w-9 place-items-center rounded-full bg-[color-mix(in_srgb,var(--app-card)_78%,var(--app-bg)_22%)] text-[var(--app-text)]">
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
                            className="relative grid h-9 w-9 place-items-center rounded-full bg-[color-mix(in_srgb,var(--app-card)_78%,var(--app-bg)_22%)] text-[var(--app-text)]"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5" strokeLinecap="round" />
                                <path d="M9 17a3 3 0 006 0" strokeLinecap="round" />
                            </svg>
                            {unread > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{unread}</span> : null}
                        </button>
                        <Link href="/mensajes" className="grid h-9 w-9 place-items-center rounded-full bg-[color-mix(in_srgb,var(--app-card)_78%,var(--app-bg)_22%)] text-[var(--app-text)]">
                            <IconChat className="h-4 w-4" />
                        </Link>
                        <button
                            type="button"
                            onClick={() => (accountMenuOpen ? closeAccountMenu() : openAccountMenu())}
                            className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-[var(--app-subtle)]/35 bg-[color-mix(in_srgb,var(--app-card)_78%,var(--app-bg)_22%)] ring-offset-2 ring-offset-[var(--app-bg)] transition hover:ring-2 hover:ring-[var(--app-accent)]/50"
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
                    <div className="absolute right-4 top-14 z-50 w-80 rounded-2xl border border-[var(--app-subtle)]/35 bg-[var(--app-card)] p-3 text-[var(--app-text)] shadow-xl">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--app-subtle)]">Notificaciones</p>
                        <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
                            {notifications.slice(0, 12).map((n) => (
                                <button
                                    key={n.id}
                                    type="button"
                                    onClick={() => openNotification(n)}
                                    className={`w-full rounded-xl border p-2 text-left text-xs transition ${
                                        n.read_at
                                            ? 'border-[var(--app-subtle)]/25 bg-[color-mix(in_srgb,var(--app-card)_92%,var(--app-bg)_8%)] text-[var(--app-text)] hover:border-[var(--app-subtle)]/40'
                                            : 'border-[var(--app-accent)]/40 bg-[color-mix(in_srgb,var(--app-accent)_16%,var(--app-card)_84%)] text-[var(--app-text)] hover:bg-[color-mix(in_srgb,var(--app-accent)_22%,var(--app-card)_78%)]'
                                    }`}
                                >
                                    <p className="font-semibold">{n.message}</p>
                                    <p className="mt-1 text-[10px] text-[var(--app-subtle)]">{new Date(n.created_at).toLocaleString()}</p>
                                </button>
                            ))}
                            {notifications.length === 0 ? <p className="text-xs text-[var(--app-subtle)]">Sin notificaciones nuevas.</p> : null}
                        </div>
                    </div>
                ) : null}
            </header>

            <main ref={mainContentRef} className="relative z-0 min-h-0 bg-[var(--app-bg)] pb-24 md:ml-72 md:pt-16 xl:mr-[22rem]">
                {children}
                <VikuChanLayer mainRef={mainContentRef} userId={user?.id} active={vikuLayerActive} />
            </main>

            <aside
                className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:top-16 md:z-[60] md:w-72 md:flex-col md:border-r md:border-[var(--app-subtle)]/22 md:bg-[color-mix(in_srgb,var(--app-card)_90%,var(--app-bg)_10%)] md:backdrop-blur md:px-3 md:py-4"
                aria-label="Navegación principal"
            >
                <div className="rounded-2xl border border-[var(--app-subtle)]/25 bg-[color-mix(in_srgb,var(--app-card)_88%,var(--app-bg)_12%)] p-3">
                    <button
                        type="button"
                        onClick={openAccountMenu}
                        className="flex w-full items-center gap-2 rounded-xl text-left transition hover:bg-[color-mix(in_srgb,var(--app-card)_94%,var(--app-accent)_6%)]"
                    >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={storageUrl(user?.avatar_path)} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-extrabold text-[var(--app-text)]">{user?.name || 'Coleccionista'}</p>
                            <p className="text-xs text-[var(--app-subtle)]">Tu panel social</p>
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
                                        ? 'bg-[var(--app-accent)] text-white shadow-lg'
                                        : 'text-[var(--app-subtle)] hover:bg-[color-mix(in_srgb,var(--app-card)_82%,var(--app-bg)_18%)] hover:text-[var(--app-text)]'
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

            <aside className="viku-exclude-rail hidden xl:fixed xl:inset-y-0 xl:right-0 xl:top-16 xl:z-[55] xl:block xl:w-[22rem] xl:border-l xl:border-[var(--app-subtle)]/22 xl:bg-[color-mix(in_srgb,var(--app-card)_90%,var(--app-bg)_10%)] xl:px-4 xl:py-4 xl:backdrop-blur">
                <div className="space-y-3">
                    <section className="rounded-2xl border border-[var(--app-subtle)]/25 bg-[color-mix(in_srgb,var(--app-card)_94%,var(--app-bg)_6%)] p-3">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--app-subtle)]">Actividad</p>
                        <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">Comparte un faltante o un nuevo hallazgo desde Inicio y Perfil.</p>
                    </section>
                    <section className="rounded-2xl border border-[var(--app-subtle)]/25 bg-[color-mix(in_srgb,var(--app-card)_94%,var(--app-bg)_6%)] p-3">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--app-subtle)]">Accesos rápidos</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <Link href="/escanear" className="rounded-xl bg-[color-mix(in_srgb,var(--app-card)_78%,var(--app-bg)_22%)] px-3 py-2 text-xs font-bold text-[var(--app-text)]">
                                Registrar
                            </Link>
                            <Link href="/comunidad" className="rounded-xl bg-[color-mix(in_srgb,var(--app-card)_78%,var(--app-bg)_22%)] px-3 py-2 text-xs font-bold text-[var(--app-text)]">
                                Grupos
                            </Link>
                            <Link href="/tienda" className="rounded-xl bg-[color-mix(in_srgb,var(--app-card)_78%,var(--app-bg)_22%)] px-3 py-2 text-xs font-bold text-[var(--app-text)]">
                                Tienda
                            </Link>
                            <Link href="/mensajes" className="rounded-xl bg-[color-mix(in_srgb,var(--app-card)_78%,var(--app-bg)_22%)] px-3 py-2 text-xs font-bold text-[var(--app-text)]">
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
                              className="pointer-events-auto relative w-full max-w-sm rounded-2xl border border-[var(--app-subtle)]/35 bg-[var(--app-card)] p-5 pt-12 text-[var(--app-text)] shadow-2xl sm:mr-0"
                          >
                              <h2 id="account-menu-title" className="sr-only">
                                  Tu cuenta
                              </h2>
                              <button
                                  type="button"
                                  onClick={closeAccountMenu}
                                  className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-[var(--app-subtle)] hover:bg-[var(--app-accent)]/12"
                                  aria-label="Cerrar"
                              >
                                  <IconClose className="h-5 w-5" />
                              </button>
                              <div className="flex flex-col items-center text-center">
                                  <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-[var(--app-subtle)]/40">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={storageUrl(user?.avatar_path)} alt="" className="h-full w-full object-cover" />
                                  </div>
                                  <p className="mt-3 text-lg font-extrabold text-[var(--app-text)]">{user?.name || 'Coleccionista'}</p>
                              </div>
                              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-subtle)]/30 bg-[color-mix(in_srgb,var(--app-card)_92%,var(--app-bg)_8%)] px-3 py-2.5">
                                  <p className="min-w-0 text-sm font-semibold text-[var(--app-text)]">
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
                              {proActive ? (
                                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[var(--app-subtle)]/30 bg-[color-mix(in_srgb,var(--app-card)_92%,var(--app-bg)_8%)] px-3 py-2.5">
                                      <p className="min-w-0 text-sm font-semibold text-[var(--app-text)]">Modo Viku chan</p>
                                      <button
                                          type="button"
                                          role="switch"
                                          aria-checked={Number(user?.viku_chan_mode) === 1}
                                          disabled={vikuToggleSaving}
                                          onClick={async () => {
                                              const next = Number(user?.viku_chan_mode) === 1 ? 0 : 1
                                              setVikuToggleSaving(true)
                                              try {
                                                  await axios.patch('/profile', { viku_chan_mode: next })
                                                  await mutateUser()
                                              } catch {
                                                  // silencioso; el usuario puede reintentar
                                              } finally {
                                                  setVikuToggleSaving(false)
                                              }
                                          }}
                                          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                                              Number(user?.viku_chan_mode) === 1 ? 'bg-emerald-600' : 'bg-[color-mix(in_srgb,var(--app-subtle)_45%,var(--app-card)_55%)]'
                                          } ${vikuToggleSaving ? 'opacity-60' : ''}`}
                                          aria-label="Activar o desactivar Modo Viku chan"
                                      >
                                          <span
                                              className={`inline-block h-5 w-5 transform rounded-full bg-[#ffffff] shadow transition-transform ${
                                                  Number(user?.viku_chan_mode) === 1 ? 'translate-x-6' : 'translate-x-1'
                                              }`}
                                          />
                                      </button>
                                  </div>
                              ) : null}
                              <Link
                                  href="/perfil"
                                  onClick={closeAccountMenu}
                                  className="mt-3 block w-full rounded-xl border border-[var(--app-subtle)]/35 py-2.5 text-center text-xs font-bold text-[var(--app-text)] transition hover:bg-[var(--app-accent)]/10"
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
                          <div className="pointer-events-auto flex max-h-[min(92vh,720px)] w-full max-w-sm flex-col rounded-t-2xl border border-[var(--app-subtle)]/35 bg-[var(--app-card)] text-[var(--app-text)] shadow-2xl sm:rounded-2xl md:max-h-[min(88vh,680px)]">
                              <div className="flex shrink-0 items-center gap-2 border-b border-[var(--app-subtle)]/20 px-3 py-3 sm:px-4">
                                  <button
                                      type="button"
                                      onClick={backFromAppearanceToMenu}
                                      className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-bold text-[var(--app-text)] transition hover:bg-[var(--app-accent)]/12"
                                      aria-label="Regresar al menú de cuenta"
                                  >
                                      <IconArrowLeft className="h-5 w-5 shrink-0" />
                                      <span className="whitespace-nowrap text-xs sm:text-sm">Regresar</span>
                                  </button>
                                  <h2 id="appearance-modal-title" className="min-w-0 flex-1 truncate text-center text-sm font-extrabold text-[var(--app-text)] sm:text-base">
                                      Apariencia
                                  </h2>
                                  <div className="flex w-[5.5rem] shrink-0 justify-end sm:w-24">
                                      <button
                                          type="button"
                                          onClick={closeAppearanceModal}
                                          className="grid h-9 w-9 place-items-center rounded-full text-[var(--app-subtle)] hover:bg-[var(--app-accent)]/12"
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
                className="bottom-nav-shell fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--app-subtle)]/22 bg-[color-mix(in_srgb,var(--app-card)_96%,var(--app-bg)_4%)] backdrop-blur nav-entrance shadow-[0_-10px_32px_rgba(0,0,0,0.12)] md:hidden dark:shadow-[0_-10px_32px_rgba(0,0,0,0.35)]"
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
                                        active ? 'text-[var(--app-text)] is-active' : 'text-[var(--app-subtle)]'
                                    }`}
                                >
                                    <span
                                        className={`nav-icon-wrap mx-auto block h-10 w-10 rounded-full ${
                                            active
                                                ? 'bg-[var(--app-accent)] shadow-lg text-white'
                                                : 'text-[var(--app-subtle)]'
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
