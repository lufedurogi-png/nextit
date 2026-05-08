'use client'

import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState } from 'react'

function blobToFile(blob, name) {
    return new File([blob], name, { type: blob.type || 'image/jpeg' })
}

export default function ItemPhotoCaptureModal({ open, onClose, onCapture, onFallbackFile }) {
    const videoRef = useRef(null)
    const streamRef = useRef(null)
    const [mounted, setMounted] = useState(false)
    const [cameraError, setCameraError] = useState(false)
    const [capturing, setCapturing] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop())
            streamRef.current = null
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null
        }
    }, [])

    useEffect(() => {
        if (!open || !mounted) {
            stopCamera()
            if (!open) {
                setCameraError(false)
                setCapturing(false)
            }
            return undefined
        }
        setCameraError(false)
        let cancelled = false
        ;(async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
                    audio: false,
                })
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop())
                    return
                }
                streamRef.current = stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    await videoRef.current.play().catch(() => {})
                }
            } catch {
                if (!cancelled) setCameraError(true)
            }
        })()
        return () => {
            cancelled = true
            stopCamera()
        }
    }, [open, mounted, stopCamera])

    useEffect(() => {
        if (!open || typeof document === 'undefined') return undefined
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [open])

    useEffect(
        () => () => {
            stopCamera()
        },
        [stopCamera]
    )

    const handleCapture = useCallback(async () => {
        const video = videoRef.current
        if (!video || video.readyState < 2 || capturing) return
        const w = video.videoWidth
        const h = video.videoHeight
        if (!w || !h) return
        setCapturing(true)
        try {
            const canvas = document.createElement('canvas')
            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext('2d')
            if (!ctx) return
            ctx.drawImage(video, 0, 0, w, h)
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
            if (!blob) return
            const file = blobToFile(blob, `producto-${Date.now()}.jpg`)
            stopCamera()
            onCapture?.(file)
            onClose?.()
        } finally {
            setCapturing(false)
        }
    }, [capturing, onCapture, onClose, stopCamera])

    const handleRegresar = useCallback(() => {
        stopCamera()
        onClose?.()
    }, [onClose, stopCamera])

    const handleFallback = useCallback(() => {
        stopCamera()
        onFallbackFile?.()
        onClose?.()
    }, [onClose, onFallbackFile, stopCamera])

    if (!open || !mounted || typeof document === 'undefined') return null

    /** Portal a `body` evita el `transform` de `PageFade`. Los bordes imitan `ColeccionadorShell` → `<main>` (no tapa sidebar ni cabecera en md+). */
    return createPortal(
        <div className="fixed left-0 right-0 top-0 bottom-24 z-[220] flex min-h-0 flex-col overflow-hidden bg-black md:bottom-0 md:left-72 md:right-0 md:top-16 xl:right-[22rem]">
            <div className="relative min-h-0 flex-1 bg-black">
                {cameraError ? (
                    <>
                        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end bg-gradient-to-b from-black/95 to-transparent px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-10">
                            <button
                                type="button"
                                onClick={handleRegresar}
                                className="pointer-events-auto inline-flex h-11 min-w-[5.5rem] shrink-0 items-center justify-center rounded-xl bg-white/15 px-3 text-sm font-extrabold text-white backdrop-blur-sm hover:bg-white/25 sm:min-w-0"
                            >
                                Regresar
                            </button>
                        </div>
                        <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-20 text-center">
                            <p className="max-w-sm text-sm font-semibold text-white/90">No se pudo abrir la cámara de este dispositivo.</p>
                            <button
                                type="button"
                                onClick={handleFallback}
                                className="rounded-2xl bg-[var(--app-accent)] px-5 py-3 text-sm font-extrabold text-white shadow-lg"
                            >
                                Elegir imagen del dispositivo
                            </button>
                            <button type="button" onClick={handleRegresar} className="text-sm font-bold text-white/70 underline-offset-2 hover:text-white hover:underline">
                                Cerrar
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(42%,14rem)] bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
                        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 bg-gradient-to-b from-black/90 via-black/45 to-transparent px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-14">
                            <p className="pointer-events-auto min-w-0 max-w-[65%] truncate pt-0.5 text-xs font-bold text-white sm:max-w-[55%]">
                                Foto del producto <span className="font-semibold opacity-75">· paso 2/2</span>
                            </p>
                            <button
                                type="button"
                                onClick={handleRegresar}
                                className="pointer-events-auto inline-flex h-11 min-w-[5.5rem] shrink-0 items-center justify-center rounded-xl bg-white/15 px-3 text-sm font-extrabold text-white backdrop-blur-sm hover:bg-white/25 sm:min-w-0"
                            >
                                Regresar
                            </button>
                        </div>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom),12px)]">
                            <button
                                type="button"
                                onClick={handleCapture}
                                disabled={capturing}
                                aria-label="Capturar foto"
                                className="pointer-events-auto relative flex size-[clamp(3.5rem,14vmin,5rem)] shrink-0 items-center justify-center rounded-full border-[0.28rem] border-white bg-white/20 shadow-[0_0_0_0.35rem_rgba(255,255,255,0.1)] transition active:scale-[0.97] disabled:opacity-50 sm:border-[0.32rem] sm:shadow-[0_0_0_0.4rem_rgba(255,255,255,0.1)]"
                            >
                                <span className="size-[72%] rounded-full bg-white shadow-inner" />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    )
}
