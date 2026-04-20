'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useRef, useState } from 'react'
import { CARDS } from '@/data/cards'
import AppHero from '@/components/coleccionador/AppHero'
import PageFade from '@/components/coleccionador/PageFade'
import TradingCard from '@/components/coleccionador/TradingCard'
import { loadCollectedKeys, saveCollectedKeys } from '@/lib/collectionStorage'

export default function ScanClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const numberParam = parseInt(searchParams.get('number') || '0', 10)

    const videoRef = useRef(null)
    const [scanInput, setScanInput] = useState('')

    const matchedCard = numberParam > 0 ? CARDS.find((c) => c.number === numberParam) : null
    const [collectionStamp, setCollectionStamp] = useState(0)
    const isInCollection = useMemo(() => {
        if (!matchedCard) return false
        return loadCollectedKeys().includes(matchedCard.key)
        // eslint-disable-next-line react-hooks/exhaustive-deps -- recalcular al cambiar número o al guardar
    }, [matchedCard, collectionStamp, numberParam])

    const startCamera = async () => {
        const video = videoRef.current
        if (!video) return
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false,
            })
            video.srcObject = stream
        } catch {
            alert('No se pudo acceder a la cámara. Revisa permisos del navegador.')
        }
    }

    const onSimulateScan = () => {
        const n = parseInt(scanInput || '0', 10)
        if (!n || n < 0) {
            alert('Ingresa un número de carta válido')
            return
        }
        router.push(`/scan?number=${encodeURIComponent(String(n))}`)
    }

    const saveScanned = useCallback(() => {
        if (!matchedCard?.key) return
        const next = new Set(loadCollectedKeys())
        next.add(matchedCard.key)
        saveCollectedKeys(next)
        setCollectionStamp((s) => s + 1)
        router.push('/collection')
    }, [matchedCard, router])

    const toggleFromPreview = useCallback(() => {
        if (!matchedCard?.key) return
        const next = new Set(loadCollectedKeys())
        if (next.has(matchedCard.key)) next.delete(matchedCard.key)
        else next.add(matchedCard.key)
        saveCollectedKeys(next)
        setCollectionStamp((s) => s + 1)
    }, [matchedCard])

    const numberText = numberParam ? String(numberParam).padStart(4, '0') : ''

    return (
        <PageFade>
            <AppHero eyebrow="Registro inteligente" title="Escanear carta" />

            <div className="relative z-[1] mx-auto max-w-2xl px-4 pb-12 -mt-3">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-[0_18px_50px_rgba(2,6,23,0.08)] backdrop-blur theme-dark:border-slate-700 theme-dark:bg-slate-900/70"
                >
                    <div className="p-4">
                        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gray-50 theme-dark:border-slate-700 theme-dark:bg-slate-950">
                            <video ref={videoRef} className="aspect-[3/4] w-full bg-black object-cover" autoPlay playsInline />
                            <div className="pointer-events-none absolute inset-0 grid place-items-center">
                                <div className="relative h-64 w-52">
                                    <span className="absolute inset-0 rounded-2xl border-2 border-white/85 shadow-[0_0_0_9999px_rgba(2,6,23,0.38)]" />
                                    <motion.span
                                        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#c9a227] to-transparent"
                                        animate={{ top: ['18%', '82%', '18%'] }}
                                        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                                    />
                                </div>
                            </div>
                            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white">
                                Vista previa
                            </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={startCamera}
                                className="rounded-xl bg-[#0b1b3c] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/25 transition active:scale-[0.99] theme-dark:bg-[#1e3a8a]"
                            >
                                Activar cámara
                            </button>
                            <Link
                                href="/collection"
                                className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-[#c9a227] theme-dark:border-slate-600 theme-dark:text-slate-200"
                            >
                                Ver colección
                            </Link>
                        </div>

                        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 theme-dark:border-slate-700 theme-dark:bg-slate-950/40">
                            <label className="text-sm font-semibold app-text" htmlFor="scanNumber">
                                Escaneo por número
                            </label>
                            <div className="mt-3 flex items-center gap-2">
                                <input
                                    id="scanNumber"
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={scanInput}
                                    onChange={(e) => setScanInput(e.target.value)}
                                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold theme-dark:border-slate-600 theme-dark:bg-slate-900"
                                    placeholder="Ej: 12"
                                />
                                <button
                                    type="button"
                                    onClick={onSimulateScan}
                                    className="rounded-xl bg-[#c9a227] px-4 py-2.5 text-sm font-extrabold text-[#0b1b3c] shadow-md transition active:scale-[0.99]"
                                >
                                    Buscar
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {numberParam > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                        className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-[0_18px_50px_rgba(2,6,23,0.08)] backdrop-blur theme-dark:border-slate-700 theme-dark:bg-slate-900/70"
                    >
                        <div className="border-b border-slate-200 px-4 py-3 theme-dark:border-slate-700">
                            <p className="text-sm font-bold app-text">Resultado del escaneo</p>
                            <p className="text-xs app-subtle">Número detectado · {numberText}</p>
                        </div>
                        <div className="p-4">
                            {matchedCard ? (
                                <div className="space-y-4">
                                    <div className="mx-auto max-w-[220px]">
                                        <TradingCard
                                            imageUrl={matchedCard.imageUrl}
                                            idLabel={String(matchedCard.number).padStart(3, '0')}
                                            obtained={isInCollection}
                                            onToggleObtained={toggleFromPreview}
                                        />
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={saveScanned}
                                            className="w-full rounded-2xl bg-[#0b1b3c] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-[0.99]"
                                        >
                                            {isInCollection ? 'Ir a mi colección' : 'Guardar en mi colección'}
                                        </button>
                                        <Link
                                            href="/planes"
                                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-[#c9a227] theme-dark:border-slate-600 theme-dark:text-slate-200"
                                        >
                                            Ver planes Pro
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm app-subtle">
                                    No hay carta con el número {numberText} en el catálogo local. Revisa el rango generado en{' '}
                                    <code className="rounded bg-slate-100 px-1 text-xs theme-dark:bg-slate-800">worldCupDashboardData</code>.
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </div>
        </PageFade>
    )
}
