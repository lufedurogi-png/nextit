'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const EMAIL = 'lufedurogi@gmail.com'
const WHATSAPP = 'https://wa.me/523322147524'
const MAIL_HREF = `mailto:${EMAIL}?subject=${encodeURIComponent('Proyecto / consulta')}`

export default function ContactChooser({
    className = '',
    label = 'Contactar',
    showArrow = true,
}) {
    const [open, setOpen] = useState(false)
    const reduce = useReducedMotion()
    const titleId = useId()
    const panelRef = useRef(null)
    const triggerRef = useRef(null)

    useEffect(() => {
        if (!open) return undefined

        const onKey = e => {
            if (e.key === 'Escape') setOpen(false)
        }
        const onPointer = e => {
            if (
                panelRef.current?.contains(e.target) ||
                triggerRef.current?.contains(e.target)
            ) {
                return
            }
            setOpen(false)
        }

        document.addEventListener('keydown', onKey)
        document.addEventListener('mousedown', onPointer)
        document.addEventListener('touchstart', onPointer)
        return () => {
            document.removeEventListener('keydown', onKey)
            document.removeEventListener('mousedown', onPointer)
            document.removeEventListener('touchstart', onPointer)
        }
    }, [open])

    useEffect(() => {
        if (!open) return undefined
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [open])

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(true)}
                className={
                    className ||
                    'pf-mono inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[var(--pf-mute)] transition-colors hover:text-[var(--pf-signal)]'
                }
                aria-haspopup="dialog"
                aria-expanded={open}>
                {label}
                {showArrow ? <span aria-hidden>→</span> : null}
            </button>

            <AnimatePresence>
                {open ? (
                    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
                        <motion.button
                            type="button"
                            aria-label="Cerrar"
                            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
                            initial={reduce ? false : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={reduce ? undefined : { opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setOpen(false)}
                        />

                        <motion.div
                            ref={panelRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={titleId}
                            className="relative z-10 w-full max-w-sm border border-[var(--pf-line-strong)] bg-[var(--pf-bg-elev)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
                            initial={
                                reduce ? false : { opacity: 0, y: 16, scale: 0.98 }
                            }
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={
                                reduce
                                    ? undefined
                                    : { opacity: 0, y: 10, scale: 0.98 }
                            }
                            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
                            <div className="mb-6 flex items-start justify-between gap-4">
                                <div>
                                    <p
                                        id={titleId}
                                        className="pf-mono text-[10px] uppercase tracking-[0.22em] text-[var(--pf-signal)]">
                                        Contacto
                                    </p>
                                    <p className="mt-2 text-sm font-light text-[var(--pf-mute)]">
                                        Elige cómo prefieres escribirme.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="pf-mono text-[10px] uppercase tracking-[0.16em] text-[var(--pf-mute)] transition-colors hover:text-[var(--pf-ink)]"
                                    aria-label="Cerrar diálogo">
                                    Cerrar
                                </button>
                            </div>

                            <div className="flex flex-col gap-3">
                                <a
                                    href={MAIL_HREF}
                                    onClick={() => setOpen(false)}
                                    className="pf-cta group flex items-center justify-between border border-[var(--pf-line-strong)] px-4 py-3.5 transition-colors hover:border-[var(--pf-signal)]">
                                    <span>
                                        <span className="block text-[13px] font-light text-[var(--pf-ink)]">
                                            Mandar correo
                                        </span>
                                        <span className="pf-mono mt-1 block text-[9px] uppercase tracking-[0.14em] text-[var(--pf-mute)]">
                                            {EMAIL}
                                        </span>
                                    </span>
                                    <span
                                        className="pf-mono text-[10px] text-[var(--pf-mute)] transition-colors group-hover:text-[var(--pf-signal)]"
                                        aria-hidden>
                                        →
                                    </span>
                                </a>

                                <a
                                    href={WHATSAPP}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setOpen(false)}
                                    className="pf-cta group flex items-center justify-between border border-[var(--pf-line-strong)] px-4 py-3.5 transition-colors hover:border-[var(--pf-signal)]">
                                    <span>
                                        <span className="block text-[13px] font-light text-[var(--pf-ink)]">
                                            Mensaje de WhatsApp
                                        </span>
                                        <span className="pf-mono mt-1 block text-[9px] uppercase tracking-[0.14em] text-[var(--pf-mute)]">
                                            33 2214 7524
                                        </span>
                                    </span>
                                    <span
                                        className="pf-mono text-[10px] text-[var(--pf-mute)] transition-colors group-hover:text-[var(--pf-signal)]"
                                        aria-hidden>
                                        ↗
                                    </span>
                                </a>
                            </div>
                        </motion.div>
                    </div>
                ) : null}
            </AnimatePresence>
        </>
    )
}
