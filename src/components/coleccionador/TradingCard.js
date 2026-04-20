'use client'

import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion'
import { useCallback, useRef, useState } from 'react'

/**
 * Carta con volteo 3D, brillo tipo foil y acciones (colección).
 */
export default function TradingCard({
    imageUrl,
    idLabel,
    obtained = false,
    onToggleObtained,
    className = '',
    enableTilt = true,
    showObtainControl = true,
    readOnly = false,
    footnote,
}) {
    const [flipped, setFlipped] = useState(false)
    const wrapRef = useRef(null)
    const mx = useMotionValue(0.5)
    const my = useMotionValue(0.5)
    const sx = useSpring(mx, { stiffness: 260, damping: 28 })
    const sy = useSpring(my, { stiffness: 260, damping: 28 })

    const shine = useMotionTemplate`radial-gradient(520px circle at ${sx}% ${sy}%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 35%, transparent 55%)`

    const onMove = useCallback(
        (e) => {
            if (!enableTilt || !wrapRef.current) return
            const r = wrapRef.current.getBoundingClientRect()
            const px = (e.clientX - r.left) / r.width
            const py = (e.clientY - r.top) / r.height
            mx.set(Math.min(1, Math.max(0, px)))
            my.set(Math.min(1, Math.max(0, py)))
        },
        [enableTilt, mx, my]
    )

    const onLeave = useCallback(() => {
        mx.set(0.5)
        my.set(0.5)
    }, [mx, my])

    const flip = useCallback((e) => {
        e?.stopPropagation?.()
        setFlipped((v) => !v)
    }, [])

    const toggleObtained = useCallback(
        (e) => {
            e?.stopPropagation?.()
            if (readOnly) return
            onToggleObtained?.()
        },
        [onToggleObtained, readOnly]
    )

    const faceClass =
        'absolute inset-0 block w-full rounded-2xl border border-white/10 bg-slate-900/5 text-left shadow-[0_18px_50px_rgba(2,6,23,0.18)] outline-none ring-offset-2 ring-offset-slate-100 transition ' +
        (readOnly ? '' : 'focus-visible:ring-2 focus-visible:ring-[#c9a227] theme-dark:ring-offset-slate-950')

    const faceStyle = {
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: 'rotateY(0deg)',
    }

    const faceInner = (
        <>
            <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={imageUrl}
                    alt={`Carta ${idLabel}`}
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable={false}
                />
                <motion.span className="pointer-events-none absolute inset-0 mix-blend-screen" style={{ backgroundImage: shine }} />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/10" />
            </span>

            <span className="absolute left-2 top-2 rounded-lg bg-black/70 px-2.5 py-1 text-sm font-black tracking-wide text-white shadow-sm">
                {idLabel}
            </span>

            {showObtainControl ? (
                <span
                    className={`absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full border text-sm font-extrabold shadow-lg backdrop-blur ${
                        obtained ? 'border-emerald-300/60 bg-emerald-500/90 text-white' : 'border-white/25 bg-white/15 text-white'
                    }`}
                    aria-hidden
                >
                    {obtained ? '✓' : '+'}
                </span>
            ) : null}

            <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-white/90">
                {footnote ? footnote : readOnly ? 'Solo vista' : obtained ? 'En tu álbum' : 'Tap para marcar'}
            </span>
        </>
    )

    return (
        <div
            ref={wrapRef}
            className={`relative ${className}`}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
        >
            <motion.div
                className="relative mx-auto w-full [perspective:1200px]"
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                whileHover={enableTilt ? { y: -4 } : undefined}
            >
                <motion.div
                    className="relative aspect-[3/4] w-full"
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Frente */}
                    {readOnly ? (
                        <div className={faceClass} style={faceStyle} role="img" aria-label={`Carta ${idLabel}`}>
                            {faceInner}
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={toggleObtained}
                            className={faceClass}
                            style={faceStyle}
                            aria-pressed={obtained}
                            aria-label={obtained ? 'Marcar como faltante' : 'Marcar como obtenida'}
                        >
                            {faceInner}
                        </button>
                    )}

                    {/* Reverso */}
                    <div
                        className="absolute inset-0 overflow-hidden rounded-2xl border border-white/10 shadow-[0_18px_50px_rgba(2,6,23,0.18)]"
                        style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                        }}
                    >
                        <div className="relative h-full w-full bg-[linear-gradient(135deg,#070f24_0%,#12306b_45%,#0b1b3c_100%)]">
                            <div className="foil-back-pattern absolute inset-0 opacity-90" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(201,162,39,0.35),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(37,99,235,0.35),transparent_50%)]" />
                            <div className="relative flex h-full flex-col items-center justify-center px-4 text-center">
                                <p className="font-playfair text-2xl font-bold text-white/95 sm:text-3xl">Coleccionador</p>
                                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.35em] text-[#c9a227]">Mundial 2026</p>
                                <p className="mt-6 font-mono text-xs text-white/45">#{idLabel}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            <button
                type="button"
                onClick={flip}
                className="absolute bottom-2 right-2 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-[#0b1b3c]/85 text-white shadow-lg backdrop-blur transition hover:bg-[#0b1b3c] active:scale-95"
                aria-label={flipped ? 'Ver frente' : 'Ver reverso'}
                title="Voltear carta"
            >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M4 7h4l2-2h8v16H4V7z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 12h6M13 9l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
        </div>
    )
}
