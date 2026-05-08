'use client'

import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import axios from '@/lib/axios'

function blobToFile(blob, name) {
    return new File([blob], name, { type: blob.type || 'image/jpeg' })
}

export default function FranchiseScanModal({ open, collectionId, franchiseLabel, onClose, onSaved }) {
    const videoRef = useRef(null)
    const streamRef = useRef(null)
    const [mounted, setMounted] = useState(false)
    const intervalRef = useRef(null)
    const busyRef = useRef(false)
    const [toast, setToast] = useState(null)
    const toastTimerRef = useRef(null)

    const showToast = useCallback((payload) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        setToast(payload)
        toastTimerRef.current = setTimeout(() => setToast(null), 2600)
    }, [])

    const stopCamera = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop())
            streamRef.current = null
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null
        }
    }, [])

    const sendFrame = useCallback(async () => {
        if (!open || !collectionId || busyRef.current) return
        const video = videoRef.current
        if (!video || video.readyState < 2) return
        const w = video.videoWidth
        const h = video.videoHeight
        if (!w || !h) return
        busyRef.current = true
        try {
            const canvas = document.createElement('canvas')
            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext('2d')
            if (!ctx) return
            ctx.drawImage(video, 0, 0, w, h)
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88))
            if (!blob) return
            const fd = new FormData()
            fd.append('frame', blobToFile(blob, 'frame.jpg'))
            const { data } = await axios.post(`/collections/${collectionId}/scan`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            if (data?.success === false) {
                showToast({ type: 'err', text: data?.message || 'No se pudo escanear.' })
                return
            }
            if (data?.duplicate_cooldown) {
                return
            }
            if (data?.saved && data?.item) {
                showToast({ type: 'ok', text: `Guardado: ${data.item.title || 'pieza'}` })
                onSaved?.(data.item)
            } else {
                showToast({ type: 'warn', text: 'Sin coincidencia con el catálogo.' })
            }
        } catch (e) {
            const msg = e?.response?.data?.message || e?.message || 'Error al escanear'
            showToast({ type: 'err', text: msg })
        } finally {
            busyRef.current = false
        }
    }, [collectionId, onSaved, open, showToast])

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!open || !mounted) {
            stopCamera()
            return undefined
        }
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
                intervalRef.current = setInterval(() => {
                    sendFrame()
                }, 1200)
            } catch {
                showToast({ type: 'err', text: 'No se pudo abrir la cámara.' })
            }
        })()
        return () => {
            cancelled = true
            stopCamera()
        }
    }, [open, mounted, sendFrame, showToast, stopCamera])

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
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        },
        [stopCamera]
    )

    if (!open || !mounted || typeof document === 'undefined') return null

    return createPortal(
        <div className="fixed left-0 right-0 top-0 bottom-24 z-[220] flex min-h-0 flex-col overflow-hidden bg-black md:bottom-0 md:left-72 md:right-0 md:top-16 xl:right-[22rem]">
            <div className="relative min-h-0 flex-1 bg-black">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 bg-gradient-to-b from-black/90 via-black/45 to-transparent px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-14">
                    <p className="pointer-events-auto min-w-0 max-w-[65%] truncate pt-0.5 text-xs font-bold text-white sm:max-w-[55%]">
                        Escaner · {franchiseLabel ? <span className="opacity-80">{franchiseLabel}</span> : null}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            stopCamera()
                            onClose?.()
                        }}
                        className="pointer-events-auto inline-flex h-11 min-w-[5.5rem] shrink-0 items-center justify-center rounded-xl bg-white/15 px-3 text-sm font-extrabold text-white backdrop-blur-sm hover:bg-white/25 sm:min-w-0"
                    >
                        Regresar
                    </button>
                </div>
            </div>
            {toast ? (
                <div
                    className={`pointer-events-none absolute left-1/2 top-20 z-30 w-[min(92%,22rem)] max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-2xl border px-4 py-3 text-center text-sm font-bold shadow-lg sm:top-24 ${
                        toast.type === 'ok'
                            ? 'border-emerald-400/40 bg-emerald-950/90 text-emerald-50'
                            : toast.type === 'warn'
                              ? 'border-amber-400/40 bg-amber-950/90 text-amber-50'
                              : 'border-red-400/40 bg-red-950/90 text-red-50'
                    }`}
                >
                    {toast.text}
                </div>
            ) : null}
        </div>,
        document.body
    )
}
