'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const AUTOPLAY_MS = 4000
const RESUME_AFTER_INTERACT_MS = 3000

/**
 * Carrusel de capturas con marco tipo app de escritorio.
 * La altura sigue la captura; autoplay con pausa breve tras interacción.
 */
export default function ShotCarousel({
    shots = [],
    title,
    label = 'Capturas',
    loading = 'lazy',
}) {
    const reduce = useReducedMotion()
    const [index, setIndex] = useState(0)
    const total = shots.length
    const pausedUntilRef = useRef(0)

    const go = useCallback(
        (delta, fromUser = false) => {
            if (total < 2) return
            if (fromUser) {
                pausedUntilRef.current = Date.now() + RESUME_AFTER_INTERACT_MS
            }
            setIndex(i => (i + delta + total) % total)
        },
        [total],
    )

    const goTo = useCallback(
        (i, fromUser = false) => {
            if (fromUser) {
                pausedUntilRef.current = Date.now() + RESUME_AFTER_INTERACT_MS
            }
            setIndex(i)
        },
        [],
    )

    useEffect(() => {
        if (reduce || total < 2) return undefined

        const id = window.setInterval(() => {
            if (Date.now() < pausedUntilRef.current) return
            setIndex(i => (i + 1) % total)
        }, AUTOPLAY_MS)

        return () => window.clearInterval(id)
    }, [reduce, total])

    if (!total) return null

    const current = shots[index]
    const pad = n => String(n).padStart(2, '0')

    return (
        <div className="pf-preview mt-6 overflow-hidden border border-[var(--pf-line)] bg-[var(--pf-bg)]">
            <div className="flex items-center gap-3 border-b border-[var(--pf-line)] px-3 py-2.5 sm:px-4">
                <div className="flex items-center gap-1.5" aria-hidden>
                    <span className="h-2 w-2 rounded-full bg-[var(--pf-line-strong)]" />
                    <span className="h-2 w-2 rounded-full bg-[var(--pf-line-strong)]" />
                    <span className="h-2 w-2 rounded-full bg-[var(--pf-line-strong)]" />
                </div>
                <p className="pf-mono min-w-0 flex-1 truncate pf-type-label tracking-[0.12em] text-[var(--pf-mute)]">
                    {title}
                </p>
                {label ? (
                    <span className="pf-mono hidden pf-type-meta uppercase tracking-[0.16em] text-[var(--pf-signal)] sm:inline">
                        {label}
                    </span>
                ) : null}
                <span className="pf-mono shrink-0 pf-type-label tracking-[0.14em] text-[var(--pf-mute)]">
                    {pad(index + 1)} / {pad(total)}
                </span>
            </div>

            <div className="relative w-full bg-[var(--pf-bg-elev)]">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.img
                        key={current.src}
                        src={current.src}
                        alt={current.alt || `${title} — captura ${index + 1}`}
                        loading={index === 0 ? loading : 'lazy'}
                        draggable={false}
                        className="block h-auto w-full select-none"
                        initial={reduce ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduce ? undefined : { opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                </AnimatePresence>
            </div>

            {total > 1 ? (
                <div className="border-t border-[var(--pf-line)] px-3 py-3 sm:px-4 sm:py-3.5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div
                            className="flex flex-wrap items-center gap-1.5"
                            role="tablist"
                            aria-label={`Capturas de ${title}`}>
                            {shots.map((shot, i) => {
                                const active = i === index
                                return (
                                    <button
                                        key={shot.src}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        aria-label={`Ir a captura ${i + 1}`}
                                        onClick={() => goTo(i, true)}
                                        className={`pf-mono min-w-[2rem] border px-2 py-1.5 pf-type-meta tracking-[0.14em] transition-colors ${
                                            active
                                                ? 'border-[var(--pf-signal)] bg-[var(--pf-signal)]/10 text-[var(--pf-signal)]'
                                                : 'border-[var(--pf-line)] text-[var(--pf-mute)] hover:border-[var(--pf-line-strong)] hover:text-[var(--pf-ink)]'
                                        }`}>
                                        {pad(i + 1)}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => go(-1, true)}
                                aria-label="Captura anterior"
                                className="pf-mono inline-flex items-center gap-2 border border-[var(--pf-line-strong)] px-3 py-1.5 pf-type-meta uppercase tracking-[0.16em] text-[var(--pf-ink)] transition-colors hover:border-[var(--pf-signal)] hover:text-[var(--pf-signal)]">
                                <span aria-hidden>←</span>
                                Prev
                            </button>
                            <button
                                type="button"
                                onClick={() => go(1, true)}
                                aria-label="Captura siguiente"
                                className="pf-mono inline-flex items-center gap-2 border border-[var(--pf-ink)] bg-[var(--pf-ink)] px-3 py-1.5 pf-type-meta uppercase tracking-[0.16em] text-[var(--pf-bg)] transition-opacity hover:opacity-90">
                                Next
                                <span aria-hidden>→</span>
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
