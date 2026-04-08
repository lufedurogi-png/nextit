'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { CARDS } from '@/data/cards'

const STORAGE_KEY = 'collected_cards'

export default function ScanClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const numberParam = parseInt(searchParams.get('number') || '0', 10)

    const videoRef = useRef(null)
    const [scanInput, setScanInput] = useState('')

    const matchedCard = numberParam > 0 ? CARDS.find((c) => c.number === numberParam) : null

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
        if (!numberParam) return
        try {
            const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
            const set = new Set(Array.isArray(list) ? list : [])
            set.add(numberParam)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)))
        } catch {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([numberParam]))
        }
        router.push('/collection')
    }, [numberParam, router])

    const numberText = numberParam ? String(numberParam).padStart(4, '0') : ''

    return (
        <>
            <section className="hero-top px-4 pt-5 pb-6">
                <div className="max-w-2xl mx-auto">
                    <p className="text-white/80 text-sm">Registro inteligente</p>
                    <h1 className="text-4xl font-extrabold text-white leading-tight">Escanear carta</h1>
                    <p className="text-white/75 mt-1">Alinea la carta dentro del marco</p>
                </div>
            </section>

            <div className="max-w-2xl mx-auto px-4 -mt-3">
                <div className="rounded-3xl app-card border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4">
                        <div className="rounded-2xl bg-gray-50 border border-slate-200 overflow-hidden relative">
                            <video ref={videoRef} className="w-full aspect-[3/4] bg-black" autoPlay playsInline />
                            <div className="pointer-events-none absolute inset-0 grid place-items-center">
                                <div className="w-52 h-64 border-2 border-white/80 rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.35)]" />
                            </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={startCamera}
                                className="rounded-xl bg-[#0b1b3c] px-4 py-3 text-white text-sm font-semibold active:scale-[0.99]"
                            >
                                Activar cámara
                            </button>
                            <Link
                                href="/collection"
                                className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700"
                            >
                                Ver colección
                            </Link>
                        </div>

                        <div className="mt-5 rounded-2xl border border-slate-200 p-3">
                            <label className="text-sm font-semibold app-text" htmlFor="scanNumber">
                                Número de carta
                            </label>
                            <div className="mt-2 flex gap-2 items-center">
                                <input
                                    id="scanNumber"
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={scanInput}
                                    onChange={(e) => setScanInput(e.target.value)}
                                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white theme-dark:bg-slate-900 theme-dark:border-slate-600"
                                    placeholder="Ej: 2"
                                />
                                <button
                                    type="button"
                                    onClick={onSimulateScan}
                                    className="rounded-xl bg-[#c9a227] px-4 py-2 text-[#0b1b3c] text-sm font-extrabold active:scale-[0.99]"
                                >
                                    Buscar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {numberParam > 0 && (
                    <div className="mt-4 rounded-3xl app-card border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-3 border-b border-slate-200">
                            <div className="text-sm font-bold app-text">Carta detectada</div>
                        </div>
                        <div className="p-4">
                            {matchedCard ? (
                                <>
                                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-slate-200">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={matchedCard.imageUrl}
                                            alt={`Carta ${numberText}`}
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                        <div className="absolute top-2 left-2 rounded-lg bg-black/60 px-2 py-0.5 text-xs font-bold text-white">
                                            {numberText}
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <button
                                            type="button"
                                            onClick={saveScanned}
                                            className="w-full rounded-xl bg-[#0b1b3c] px-4 py-3 text-white text-sm font-semibold active:scale-[0.99]"
                                        >
                                            Guardar carta en mi colección
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm app-subtle">
                                    No hay carta con el número {numberText} en el catálogo local (<code className="text-xs">src/data/cards.js</code>).
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
