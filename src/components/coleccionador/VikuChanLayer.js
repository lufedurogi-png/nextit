'use client'

import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { VIKU_CHAN_EVENT } from '@/lib/vikuChanSignals'
import {
    vikuSpriteUrl,
    VIKU_PATROL_IDLE_INDICES,
    VIKU_WALK_CYCLE,
    VIKU_INTERRUPT_SPRITES,
    VIKU_TELEPORT_SPRITE,
    VIKU_SLEEP_SPRITE,
} from '@/lib/vikuChanSprites'

const EXCLUDE_CLOSEST =
    'nav.bottom-nav-shell, header, aside[aria-label="Navegación principal"], .viku-exclude-rail'

const IDLE_MS = 20000
const MICRO_MS = 1500
const TELEPORT_MS = 480
const PATROL_FRAME_MS = 760
const ANCHOR_MS_MIN = 4500
const ANCHOR_MS_MAX = 8000
const STROLL_MS = 95
const SPRITE_HALF_W = 38
const MIN_ANCHOR_W_FOR_STROLL = 108

function isPathAllowed(pathname) {
    if (!pathname) return false
    if (pathname === '/' || pathname === '/login' || pathname === '/register') return false
    if (pathname.startsWith('/admin')) return false
    return true
}

function fingerprintFor(el) {
    if (!el) return null
    const id = el.id ? `#${el.id}` : ''
    const cls = (typeof el.className === 'string' ? el.className : '')
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .join('.')
    return `${el.tagName}${id}.${cls}`
}

function loadWeights(userId) {
    try {
        const raw = localStorage.getItem(`viku_touch_weights_${userId}`)
        if (!raw) return {}
        const j = JSON.parse(raw)
        return j && typeof j === 'object' ? j : {}
    } catch {
        return {}
    }
}

function saveWeights(userId, w) {
    try {
        localStorage.setItem(`viku_touch_weights_${userId}`, JSON.stringify(w))
    } catch {
        void 0
    }
}

export default function VikuChanLayer({ mainRef, userId, active }) {
    const pathname = usePathname()
    const allowed = isPathAllowed(pathname) && active

    const [viewportPos, setViewportPos] = useState({ x: 120, y: 200 })
    const [displaySprite, setDisplaySprite] = useState(VIKU_PATROL_IDLE_INDICES[0])
    const [facingRight, setFacingRight] = useState(false)

    const interruptUntilRef = useRef(0)
    const phaseRef = useRef('patrol')
    const patrolCursorRef = useRef(0)
    const anchorElRef = useRef(null)
    const hopTimerRef = useRef(null)
    const frameTimerRef = useRef(null)
    const strollTimerRef = useRef(null)
    const weightsRef = useRef({})

    const offsetXRef = useRef(0)
    const wanderTargetRef = useRef(null)
    const dwellUntilRef = useRef(0)
    const walkTickRef = useRef(0)
    const isWalkingRef = useRef(false)

    const reducedMotion = useMemo(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return false
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }, [])

    useEffect(() => {
        if (!userId) return
        weightsRef.current = loadWeights(userId)
    }, [userId])

    const bumpWeight = useCallback(
        (el) => {
            if (!userId || !el) return
            const fp = fingerprintFor(el)
            if (!fp) return
            const w = { ...weightsRef.current }
            w[fp] = (w[fp] || 0) + 1
            weightsRef.current = w
            saveWeights(userId, w)
        },
        [userId]
    )

    const collectCandidates = useCallback(() => {
        const root = mainRef?.current
        if (!root || typeof window === 'undefined') return []
        const nodes = root.querySelectorAll('button, a[href], input, textarea, select, [role="button"]')
        const out = []
        const vh = window.innerHeight
        const bottomSafe = vh - 76
        for (const el of nodes) {
            if (!(el instanceof HTMLElement)) continue
            if (el.closest(EXCLUDE_CLOSEST)) continue
            if (!root.contains(el)) continue
            const r = el.getBoundingClientRect()
            if (r.width < 36 || r.height < 20) continue
            if (r.top > bottomSafe) continue
            if (r.bottom < 72) continue
            if (r.right < 8 || r.left > window.innerWidth - 8) continue
            const area = r.width * r.height
            if (area < 800) continue
            const fp = fingerprintFor(el)
            const weight = (fp && weightsRef.current[fp]) || 0
            out.push({ el, score: weight + Math.random() * 4 })
        }
        out.sort((a, b) => b.score - a.score)
        return out.slice(0, 36).map((x) => x.el)
    }, [mainRef])

    const syncViewportFromAnchor = useCallback(() => {
        const el = anchorElRef.current
        if (!el || !document.body.contains(el)) return false
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2
        setViewportPos({ x: cx + offsetXRef.current, y: r.top })
        return true
    }, [])

    const resetStroll = useCallback(() => {
        offsetXRef.current = 0
        wanderTargetRef.current = null
        dwellUntilRef.current = 0
        walkTickRef.current = 0
        isWalkingRef.current = false
    }, [])

    const moveToRandomAnchor = useCallback(() => {
        resetStroll()
        const candidates = collectCandidates()
        if (!candidates.length) {
            setViewportPos({ x: window.innerWidth * 0.52, y: window.innerHeight * 0.42 })
            anchorElRef.current = null
            return
        }
        const k = Math.min(5, candidates.length)
        const pick = candidates[Math.floor(Math.random() * k)]
        anchorElRef.current = pick
        const r = pick.getBoundingClientRect()
        setViewportPos({ x: r.left + r.width / 2, y: r.top })
        patrolCursorRef.current = Math.floor(Math.random() * VIKU_PATROL_IDLE_INDICES.length)
        setDisplaySprite(VIKU_PATROL_IDLE_INDICES[patrolCursorRef.current] || 8)
    }, [collectCandidates, resetStroll])

    const applyAnchorFromRef = useCallback(() => {
        const el = anchorElRef.current
        if (!el || !document.body.contains(el)) {
            moveToRandomAnchor()
            return
        }
        syncViewportFromAnchor()
    }, [moveToRandomAnchor, syncViewportFromAnchor])

    const hopAnchor = useCallback(() => {
        if (!allowed) return
        if (Date.now() < interruptUntilRef.current) return
        setDisplaySprite(VIKU_TELEPORT_SPRITE)
        phaseRef.current = 'teleport'
        isWalkingRef.current = false
        window.setTimeout(() => {
            moveToRandomAnchor()
            phaseRef.current = 'patrol'
        }, TELEPORT_MS)
    }, [allowed, moveToRandomAnchor])

    const lastActRef = useRef(Date.now())
    const [sleeping, setSleeping] = useState(false)

    useEffect(() => {
        if (!allowed) return undefined
        const idleTimer = window.setInterval(() => {
            if (Date.now() < interruptUntilRef.current) return
            if (Date.now() - lastActRef.current > IDLE_MS) {
                setSleeping(true)
                isWalkingRef.current = false
                setDisplaySprite(VIKU_SLEEP_SPRITE)
            }
        }, 1800)
        return () => window.clearInterval(idleTimer)
    }, [allowed])

    useEffect(() => {
        if (!allowed) return undefined
        const onAct = () => {
            lastActRef.current = Date.now()
            setSleeping(false)
            if (Date.now() >= interruptUntilRef.current) {
                setDisplaySprite(VIKU_PATROL_IDLE_INDICES[patrolCursorRef.current] || 8)
            }
        }
        window.addEventListener('pointerdown', onAct, true)
        window.addEventListener('keydown', onAct, true)
        window.addEventListener('scroll', onAct, true)
        return () => {
            window.removeEventListener('pointerdown', onAct, true)
            window.removeEventListener('keydown', onAct, true)
            window.removeEventListener('scroll', onAct, true)
        }
    }, [allowed])

    useEffect(() => {
        if (!allowed || !userId) return undefined
        const root = mainRef?.current
        if (!root) return undefined
        const onDown = (e) => {
            const t = e.target
            if (!(t instanceof Node) || !root.contains(t)) return
            const interactive =
                t instanceof Element ? t.closest('button, a[href], input, textarea, select, [role="button"]') : null
            if (!interactive || !(interactive instanceof HTMLElement)) return
            if (interactive.closest(EXCLUDE_CLOSEST)) return
            bumpWeight(interactive)
        }
        document.addEventListener('pointerdown', onDown, true)
        return () => document.removeEventListener('pointerdown', onDown, true)
    }, [allowed, userId, mainRef, bumpWeight])

    useEffect(() => {
        if (!allowed) return undefined
        const onSig = (e) => {
            const type = e.detail?.type
            const sprite = VIKU_INTERRUPT_SPRITES[type]
            if (!sprite) return
            interruptUntilRef.current = Date.now() + MICRO_MS
            isWalkingRef.current = false
            setDisplaySprite(sprite)
            window.setTimeout(() => {
                interruptUntilRef.current = 0
                setSleeping(false)
                lastActRef.current = Date.now()
                setDisplaySprite(VIKU_PATROL_IDLE_INDICES[patrolCursorRef.current] || 8)
            }, MICRO_MS)
        }
        window.addEventListener(VIKU_CHAN_EVENT, onSig)
        return () => window.removeEventListener(VIKU_CHAN_EVENT, onSig)
    }, [allowed])

    useEffect(() => {
        if (!allowed) {
            anchorElRef.current = null
            if (hopTimerRef.current) window.clearTimeout(hopTimerRef.current)
            return undefined
        }
        moveToRandomAnchor()
        let cancelled = false
        const loop = () => {
            const ms = ANCHOR_MS_MIN + Math.random() * (ANCHOR_MS_MAX - ANCHOR_MS_MIN)
            hopTimerRef.current = window.setTimeout(() => {
                if (cancelled) return
                if (Date.now() < interruptUntilRef.current) {
                    loop()
                    return
                }
                if (!sleeping) hopAnchor()
                loop()
            }, ms)
        }
        loop()
        return () => {
            cancelled = true
            if (hopTimerRef.current) window.clearTimeout(hopTimerRef.current)
        }
    }, [allowed, sleeping, hopAnchor, moveToRandomAnchor])

    /** Carrusel de poses cuando no está de paseo (quietas en la plataforma). */
    useEffect(() => {
        if (!allowed || reducedMotion) {
            if (frameTimerRef.current) window.clearInterval(frameTimerRef.current)
            return undefined
        }
        frameTimerRef.current = window.setInterval(() => {
            if (Date.now() < interruptUntilRef.current || sleeping) return
            if (phaseRef.current === 'teleport') return
            if (isWalkingRef.current) return
            const next = (patrolCursorRef.current + 1) % VIKU_PATROL_IDLE_INDICES.length
            patrolCursorRef.current = next
            setDisplaySprite(VIKU_PATROL_IDLE_INDICES[next])
        }, PATROL_FRAME_MS)
        return () => {
            if (frameTimerRef.current) window.clearInterval(frameTimerRef.current)
        }
    }, [allowed, reducedMotion, sleeping])

    /** Paseo horizontal sobre el ancho del componente + frames de paso. */
    useEffect(() => {
        if (!allowed || reducedMotion || sleeping) {
            if (strollTimerRef.current) window.clearInterval(strollTimerRef.current)
            return undefined
        }
        strollTimerRef.current = window.setInterval(() => {
            if (Date.now() < interruptUntilRef.current) return
            if (phaseRef.current === 'teleport') return

            const el = anchorElRef.current
            if (!el || !document.body.contains(el)) return

            const r = el.getBoundingClientRect()
            const maxDelta = Math.max(0, r.width / 2 - SPRITE_HALF_W)

            if (r.width < MIN_ANCHOR_W_FOR_STROLL || maxDelta < 16) {
                isWalkingRef.current = false
                offsetXRef.current = 0
                syncViewportFromAnchor()
                return
            }

            const now = Date.now()
            if (wanderTargetRef.current == null) {
                if (now < dwellUntilRef.current) {
                    syncViewportFromAnchor()
                    return
                }
                wanderTargetRef.current = (Math.random() * 2 - 1) * maxDelta * (0.65 + Math.random() * 0.3)
            }

            const target = wanderTargetRef.current
            const cur = offsetXRef.current
            const diff = target - cur
            const stepMag = Math.min(8, Math.abs(diff))
            const step = Math.sign(diff) * stepMag

            if (Math.abs(diff) < 2.5) {
                offsetXRef.current = target
                wanderTargetRef.current = null
                isWalkingRef.current = false
                dwellUntilRef.current = now + 400 + Math.random() * 1400
                syncViewportFromAnchor()
                return
            }

            const next = cur + step
            offsetXRef.current = next
            isWalkingRef.current = true
            if (Math.abs(step) > 0.2) {
                setFacingRight(step > 0)
                walkTickRef.current += 1
                setDisplaySprite(VIKU_WALK_CYCLE[walkTickRef.current % VIKU_WALK_CYCLE.length])
            }
            syncViewportFromAnchor()
        }, STROLL_MS)
        return () => {
            if (strollTimerRef.current) window.clearInterval(strollTimerRef.current)
        }
    }, [allowed, reducedMotion, sleeping, syncViewportFromAnchor])

    useEffect(() => {
        if (!allowed) return undefined
        const t = window.setInterval(() => {
            if (Date.now() < interruptUntilRef.current) return
            syncViewportFromAnchor()
        }, 320)
        return () => window.clearInterval(t)
    }, [allowed, syncViewportFromAnchor])

    if (!allowed) return null

    const sprite = reducedMotion && !sleeping ? 39 : displaySprite
    const faceScale = facingRight ? -1 : 1

    const layer = (
        <div className="pointer-events-none fixed inset-0 z-[100] overflow-visible" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={vikuSpriteUrl(sprite)}
                alt=""
                className="pointer-events-none fixed z-[101] h-auto w-[72px] max-w-[22vw] select-none object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)] motion-safe:transition-[opacity,transform] motion-safe:duration-[180ms]"
                style={{
                    left: viewportPos.x,
                    top: viewportPos.y,
                    transform: `translate(-50%, calc(-100% - 4px)) scaleX(${faceScale})`,
                }}
            />
        </div>
    )

    if (typeof document === 'undefined') return null
    return createPortal(layer, document.body)
}
