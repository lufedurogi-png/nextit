'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import axios from '@/lib/axios'

const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5, 2, 2.5, 3]

function guessExtension(url, mime) {
    const m = String(mime || '').toLowerCase()
    if (m.includes('png')) return 'png'
    if (m.includes('webp')) return 'webp'
    if (m.includes('gif')) return 'gif'
    if (m.includes('jpeg') || m.includes('jpg')) return 'jpg'
    const path = String(url).split('?')[0]
    const ext = path.match(/\.([a-z0-9]+)$/i)
    if (ext) {
        const e = ext[1].toLowerCase()
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(e)) return e === 'jpeg' ? 'jpg' : e
    }
    return 'jpg'
}

function IconClose({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
    )
}

function IconChevronLeft({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function IconChevronRight({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function IconZoomIn({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35" strokeLinecap="round" />
            <path d="M11 8v6M8 11h6" strokeLinecap="round" />
        </svg>
    )
}

function IconZoomOut({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35M8 11h6" strokeLinecap="round" />
        </svg>
    )
}

function IconDownload({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 3v12m0 0l4-4m-4 4l-4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function IconMaximize({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

/**
 * Visor de imágenes (layout tipo Facebook).
 * - Con `sidebarHeader` + `sidebarBody`: en **móvil** todo (imagen + cabecera + comentarios + pie) va en **un solo scroll**.
 * - En **md+**: columna imagen + panel lateral con cabecera fija y solo comentarios con scroll.
 */
export default function PostMediaLightbox({
    open,
    onClose,
    imageUrls = [],
    startIndex = 0,
    children,
    sidebarHeader = null,
    sidebarBody = null,
    sidebarFooter = null,
    shellClassName = '',
}) {
    const [index, setIndex] = useState(0)
    const [zoomIdx, setZoomIdx] = useState(1)
    const shellRef = useRef(null)

    const n = Array.isArray(imageUrls) ? imageUrls.length : 0
    const currentUrl = n > 0 ? imageUrls[Math.min(Math.max(0, index), n - 1)] : ''
    const zoom = ZOOM_LEVELS[Math.min(Math.max(0, zoomIdx), ZOOM_LEVELS.length - 1)] ?? 1

    const useSplitSidebar = sidebarHeader != null && sidebarBody != null

    useEffect(() => {
        if (!open) return
        const i = Math.min(Math.max(0, startIndex), Math.max(n - 1, 0))
        setIndex(i)
        setZoomIdx(1)
    }, [open, startIndex, n])

    useEffect(() => {
        setZoomIdx(1)
    }, [index])

    useEffect(() => {
        if (!open) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [open])

    useEffect(() => {
        if (!open) return
        const onKey = (e) => {
            if (e.key === 'Escape') onClose()
            if (n > 1 && e.key === 'ArrowLeft') {
                e.preventDefault()
                setIndex((prev) => (prev - 1 + n) % n)
            }
            if (n > 1 && e.key === 'ArrowRight') {
                e.preventDefault()
                setIndex((prev) => (prev + 1) % n)
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, n, onClose])

    const goPrev = useCallback(() => {
        if (n <= 1) return
        setIndex((prev) => (prev - 1 + n) % n)
    }, [n])

    const goNext = useCallback(() => {
        if (n <= 1) return
        setIndex((prev) => (prev + 1) % n)
    }, [n])

    const zoomIn = useCallback(() => {
        setZoomIdx((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1))
    }, [])

    const zoomOut = useCallback(() => {
        setZoomIdx((i) => Math.max(i - 1, 0))
    }, [])

    const triggerBlobDownload = useCallback((blob, filename) => {
        const href = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = href
        a.download = filename
        a.rel = 'noopener'
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.setTimeout(() => URL.revokeObjectURL(href), 2500)
    }, [])

    const downloadCurrent = useCallback(async () => {
        if (!currentUrl) return
        const baseName = `imagen-${index + 1}`
        const extFromUrl = guessExtension(currentUrl, '')
        const filename = `${baseName}.${extFromUrl}`

        try {
            const qs = new URLSearchParams({ url: currentUrl, name: filename })
            const res = await fetch(`/api/download-media?${qs.toString()}`, {
                method: 'GET',
                credentials: 'same-origin',
            })
            if (!res.ok) throw new Error('proxy')
            const blob = await res.blob()
            const mime = blob.type || res.headers.get('content-type') || ''
            const ext = guessExtension(currentUrl, mime)
            triggerBlobDownload(blob, `${baseName}.${ext}`)
            return
        } catch {
            /* continuar con descarga directa */
        }

        try {
            const { data, headers } = await axios.get(currentUrl, {
                responseType: 'blob',
                timeout: 120000,
            })
            const blob = data instanceof Blob ? data : new Blob([data])
            const mime = blob.type || headers?.['content-type'] || ''
            const ext = guessExtension(currentUrl, mime)
            triggerBlobDownload(blob, `${baseName}.${ext}`)
        } catch {
            try {
                const res = await fetch(currentUrl, { mode: 'cors', credentials: 'include' })
                if (!res.ok) throw new Error('fetch')
                const blob = await res.blob()
                const ext = guessExtension(currentUrl, blob.type)
                triggerBlobDownload(blob, `${baseName}.${ext}`)
            } catch {
                try {
                    const res = await fetch(currentUrl, { mode: 'cors', credentials: 'omit' })
                    if (!res.ok) throw new Error('fetch2')
                    const blob = await res.blob()
                    const ext = guessExtension(currentUrl, blob.type)
                    triggerBlobDownload(blob, `${baseName}.${ext}`)
                } catch {
                    window.open(currentUrl, '_blank', 'noopener,noreferrer')
                }
            }
        }
    }, [currentUrl, index, triggerBlobDownload])

    const toggleFullscreen = useCallback(async () => {
        const el = shellRef.current
        if (!el) return
        try {
            if (!document.fullscreenElement) await el.requestFullscreen()
            else await document.exitFullscreen()
        } catch {
            /* ignorar */
        }
    }, [])

    if (!open || typeof document === 'undefined' || n === 0) return null

    const toolbar = (
        <div className="flex flex-wrap items-center justify-end gap-0.5 rounded-full border border-[var(--app-subtle)]/30 bg-[color-mix(in_srgb,var(--app-card)_88%,transparent)] px-1 py-1 text-[var(--app-text)] shadow-sm backdrop-blur-md">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    zoomOut()
                }}
                disabled={zoomIdx <= 0}
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--app-accent)]/18 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Alejar"
                title="Alejar"
            >
                <IconZoomOut className="h-5 w-5" />
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    zoomIn()
                }}
                disabled={zoomIdx >= ZOOM_LEVELS.length - 1}
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--app-accent)]/18 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Acercar"
                title="Acercar"
            >
                <IconZoomIn className="h-5 w-5" />
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    void downloadCurrent()
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--app-accent)]/18"
                aria-label="Descargar imagen"
                title="Descargar"
            >
                <IconDownload className="h-5 w-5" />
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    void toggleFullscreen()
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--app-accent)]/18"
                aria-label="Pantalla completa"
                title="Pantalla completa"
            >
                <IconMaximize className="h-5 w-5" />
            </button>
        </div>
    )

    const closeBtnClass =
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--app-subtle)]/35 bg-[color-mix(in_srgb,var(--app-card)_88%,transparent)] text-[var(--app-text)] shadow-sm backdrop-blur-md transition hover:bg-[var(--app-accent)]/15'

    const navArrowClassMobile =
        'flex h-12 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-[var(--app-subtle)]/30 bg-[color-mix(in_srgb,var(--app-card)_82%,transparent)] text-[var(--app-text)] shadow-sm backdrop-blur-sm transition hover:bg-[var(--app-accent)]/18'

    const navArrowClassDesktop =
        'flex h-14 w-12 -translate-y-1/2 items-center justify-center rounded-lg border border-[var(--app-subtle)]/30 bg-[color-mix(in_srgb,var(--app-card)_82%,transparent)] text-[var(--app-text)] shadow-sm backdrop-blur-sm transition hover:bg-[var(--app-accent)]/18'

    const indexBadgeClass =
        'rounded-full border border-[var(--app-subtle)]/35 bg-[color-mix(in_srgb,var(--app-card)_92%,transparent)] px-3 py-1 text-xs font-semibold tabular-nums text-[var(--app-text)] shadow-sm backdrop-blur-sm'

    return createPortal(
        <div
            ref={shellRef}
            className={`fixed inset-0 z-[250] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)] md:flex-row ${shellClassName}`.trim()}
            role="dialog"
            aria-modal="true"
            aria-label="Visor de imágenes"
        >
            {useSplitSidebar ? (
                <>
                    {/* Móvil: barra fija (encima del scroll) */}
                    <div className="pointer-events-none fixed inset-x-0 top-0 z-[260] flex items-start justify-between gap-2 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`pointer-events-auto ${closeBtnClass}`}
                            aria-label="Cerrar"
                        >
                            <IconClose className="h-6 w-6" />
                        </button>
                        <div className="pointer-events-auto shrink-0">{toolbar}</div>
                    </div>

                    {/* Móvil: un solo scroll — imagen ancha + publicación + comentarios */}
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
                        <div
                            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
                            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                        >
                            <section className="relative w-full bg-[color-mix(in_srgb,var(--app-bg)_92%,var(--app-card)_8%)]">
                                <div className="w-full pt-14">
                                    {n > 1 ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    goPrev()
                                                }}
                                                className={`absolute left-1 top-[40%] z-10 ${navArrowClassMobile}`}
                                                aria-label="Imagen anterior"
                                            >
                                                <IconChevronLeft className="h-8 w-8" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    goNext()
                                                }}
                                                className={`absolute right-1 top-[40%] z-10 ${navArrowClassMobile}`}
                                                aria-label="Imagen siguiente"
                                            >
                                                <IconChevronRight className="h-8 w-8" />
                                            </button>
                                        </>
                                    ) : null}

                                    <div className="relative w-full overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={currentUrl}
                                            alt=""
                                            aria-hidden
                                            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-90 scale-110 blur-3xl saturate-110 motion-reduce:blur-none motion-reduce:scale-100"
                                        />
                                        <div className="relative z-[1] w-full overflow-x-auto overflow-y-visible px-0.5 pb-1 pt-1">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                key={`m-${index}-${currentUrl}`}
                                                src={currentUrl}
                                                alt=""
                                                draggable={false}
                                                style={{ transform: `scale(${zoom})` }}
                                                className="mx-auto block h-auto w-full max-w-[100vw] object-contain motion-safe:transition-transform motion-safe:duration-200"
                                            />
                                        </div>
                                    </div>

                                    {n > 1 ? (
                                        <p className="pb-2 pt-1 text-center text-xs font-semibold tabular-nums text-[var(--app-subtle)]">
                                            {index + 1} / {n}
                                        </p>
                                    ) : null}
                                </div>
                            </section>

                            <div className="w-full border-t border-[var(--app-subtle)]/40 bg-[var(--app-card)] text-[var(--app-text)]">
                                {sidebarHeader}
                                {sidebarBody}
                                {sidebarFooter != null ? sidebarFooter : null}
                            </div>
                        </div>
                    </div>

                    {/* Escritorio: dos columnas + scroll solo en comentarios */}
                    <div className="relative hidden min-h-0 min-w-0 flex-[1.2] flex-col overflow-hidden bg-[color-mix(in_srgb,var(--app-bg)_92%,var(--app-card)_8%)] md:flex">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`absolute left-3 top-3 z-20 ${closeBtnClass}`}
                            aria-label="Cerrar"
                        >
                            <IconClose className="h-6 w-6" />
                        </button>
                        <div className="absolute right-3 top-3 z-20">{toolbar}</div>

                        {n > 1 ? (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        goPrev()
                                    }}
                                    className={`absolute left-2 top-1/2 z-10 ${navArrowClassDesktop}`}
                                    aria-label="Imagen anterior"
                                >
                                    <IconChevronLeft className="h-8 w-8" />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        goNext()
                                    }}
                                    className={`absolute right-2 top-1/2 z-10 ${navArrowClassDesktop}`}
                                    aria-label="Imagen siguiente"
                                >
                                    <IconChevronRight className="h-8 w-8" />
                                </button>
                            </>
                        ) : null}

                        <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden pt-16">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={currentUrl}
                                alt=""
                                aria-hidden
                                className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full object-cover opacity-90 scale-110 blur-3xl saturate-110 motion-reduce:blur-none motion-reduce:scale-100 md:block"
                            />
                            <div
                                className="relative z-[1] flex min-h-0 w-full flex-1 items-center justify-center overflow-auto px-6 pb-6"
                                onClick={(e) => {
                                    if (e.target === e.currentTarget) onClose()
                                }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    key={`d-${index}-${currentUrl}`}
                                    src={currentUrl}
                                    alt=""
                                    draggable={false}
                                    style={{ transform: `scale(${zoom})` }}
                                    className="max-h-[min(78vh,900px)] max-w-[min(96vw,1200px)] object-contain motion-safe:transition-transform motion-safe:duration-200"
                                />
                            </div>
                        </div>

                        {n > 1 ? (
                            <p className={`pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 ${indexBadgeClass}`}>
                                {index + 1} / {n}
                            </p>
                        ) : null}
                    </div>

                    <aside className="hidden h-full min-h-0 w-[min(100vw,420px)] shrink-0 flex-col overflow-hidden border-l border-[var(--app-subtle)]/40 bg-[var(--app-card)] text-[var(--app-text)] md:flex">
                        <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
                            <div className="shrink-0">{sidebarHeader}</div>
                            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">{sidebarBody}</div>
                            {sidebarFooter != null ? <div className="shrink-0">{sidebarFooter}</div> : null}
                        </div>
                    </aside>
                </>
            ) : (
                <>
                    <div className="relative flex h-[min(46dvh,340px)] w-full shrink-0 flex-col overflow-hidden bg-[color-mix(in_srgb,var(--app-bg)_92%,var(--app-card)_8%)] sm:h-[min(48dvh,380px)] md:h-auto md:min-h-0 md:flex-[1.2] md:max-h-none">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`absolute left-2 top-2 z-20 md:left-3 md:top-3 ${closeBtnClass}`}
                            aria-label="Cerrar"
                        >
                            <IconClose className="h-6 w-6" />
                        </button>
                        <div className="absolute right-2 top-2 z-20 md:right-3 md:top-3">{toolbar}</div>
                        {n > 1 ? (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        goPrev()
                                    }}
                                    className="absolute left-1 top-1/2 z-10 flex h-12 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-[var(--app-subtle)]/30 bg-[color-mix(in_srgb,var(--app-card)_82%,transparent)] text-[var(--app-text)] backdrop-blur-sm transition hover:bg-[var(--app-accent)]/18 md:left-2 md:h-14 md:w-12"
                                    aria-label="Imagen anterior"
                                >
                                    <IconChevronLeft className="h-8 w-8" />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        goNext()
                                    }}
                                    className="absolute right-1 top-1/2 z-10 flex h-12 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-[var(--app-subtle)]/30 bg-[color-mix(in_srgb,var(--app-card)_82%,transparent)] text-[var(--app-text)] backdrop-blur-sm transition hover:bg-[var(--app-accent)]/18 md:right-2 md:h-14 md:w-12"
                                    aria-label="Imagen siguiente"
                                >
                                    <IconChevronRight className="h-8 w-8" />
                                </button>
                            </>
                        ) : null}
                        <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden pt-14 md:pt-16">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={currentUrl}
                                alt=""
                                aria-hidden
                                className="pointer-events-none absolute inset-0 z-0 block h-full w-full object-cover opacity-90 scale-110 blur-3xl saturate-110 motion-reduce:blur-none motion-reduce:scale-100 md:hidden"
                            />
                            <div
                                className="relative z-[1] flex min-h-0 w-full flex-1 items-center justify-center overflow-auto px-2 pb-10 md:px-6 md:pb-6"
                                onClick={(e) => {
                                    if (e.target === e.currentTarget) onClose()
                                }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    key={`l-${index}-${currentUrl}`}
                                    src={currentUrl}
                                    alt=""
                                    draggable={false}
                                    style={{ transform: `scale(${zoom})` }}
                                    className="max-h-full max-w-full object-contain motion-safe:transition-transform motion-safe:duration-200 md:max-h-[min(78vh,900px)] md:max-w-[min(96vw,1200px)]"
                                />
                            </div>
                        </div>
                        {n > 1 ? (
                            <p className={`pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 ${indexBadgeClass}`}>
                                {index + 1} / {n}
                            </p>
                        ) : null}
                    </div>
                    <aside
                        className={`flex min-h-0 w-full flex-col overflow-hidden border-t border-[var(--app-subtle)]/40 bg-[var(--app-card)] text-[var(--app-text)] md:h-full md:w-[min(100vw,420px)] md:shrink-0 md:border-l md:border-t-0 ${
                            useSplitSidebar ? '' : 'max-h-[min(52vh,480px)] shrink-0 md:max-h-none'
                        }`}
                    >
                        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
                    </aside>
                </>
            )}
        </div>,
        document.body
    )
}
