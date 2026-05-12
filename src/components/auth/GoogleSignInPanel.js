'use client'

import NextImage from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { decodeGoogleCredentialPreview } from '@/lib/googleJwt'

const GIS_SRC = 'https://accounts.google.com/gsi/client'

function loadGisScript() {
    if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
    if (window.google?.accounts?.id) return Promise.resolve()
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${GIS_SRC}"]`)
        if (existing) {
            existing.addEventListener('load', () => resolve())
            existing.addEventListener('error', () => reject(new Error('GIS load error')))
            return
        }
        const s = document.createElement('script')
        s.src = GIS_SRC
        s.async = true
        s.defer = true
        s.onload = () => resolve()
        s.onerror = () => reject(new Error('GIS load error'))
        document.head.appendChild(s)
    })
}

/**
 * @param {object} props
 * @param {boolean} props.darkMode
 * @param {'register'|'login'} props.mode
 * @param {string | null} props.credential
 * @param {{ email: string, name: string, picture: string | null } | null} props.preview
 * @param {(credential: string, preview: { email: string, name: string, picture: string | null }) => void} props.onSelect
 * @param {() => void} props.onClear
 * @param {boolean} [props.busy]
 */
export default function GoogleSignInPanel({ darkMode, mode, credential, preview, onSelect, onClear, busy = false }) {
    const buttonMountRef = useRef(null)
    const initOnceRef = useRef(false)
    const [scriptError, setScriptError] = useState(null)
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

    const onSelectRef = useRef(onSelect)
    onSelectRef.current = onSelect

    const handleCredential = useCallback((response) => {
        const raw = response?.credential
        if (!raw || typeof raw !== 'string') return
        const prev = decodeGoogleCredentialPreview(raw)
        if (!prev?.email) return
        onSelectRef.current(raw, prev)
    }, [])

    useEffect(() => {
        if (!clientId || credential) return

        let cancelled = false

        const mount = async () => {
            try {
                await loadGisScript()
                if (cancelled || !buttonMountRef.current) return
                const g = window.google
                if (!g?.accounts?.id) {
                    setScriptError('No se pudo cargar Google Sign-In.')
                    return
                }
                if (!initOnceRef.current) {
                    g.accounts.id.initialize({
                        client_id: clientId,
                        callback: handleCredential,
                        auto_select: false,
                        itp_support: true,
                    })
                    initOnceRef.current = true
                }
                buttonMountRef.current.innerHTML = ''
                g.accounts.id.renderButton(buttonMountRef.current, {
                    type: 'standard',
                    theme: darkMode ? 'filled_black' : 'outline',
                    size: 'large',
                    text: mode === 'register' ? 'signup_with' : 'signin_with',
                    shape: 'pill',
                    width: 320,
                    locale: 'es',
                })
            } catch {
                if (!cancelled) setScriptError('No se pudo cargar Google Sign-In.')
            }
        }

        mount()
        return () => {
            cancelled = true
        }
    }, [clientId, credential, darkMode, handleCredential, mode])

    const border = darkMode ? 'border-gray-600 bg-gray-800/80' : 'border-gray-300 bg-white'
    const innerBg = darkMode ? 'bg-gray-900/40' : 'bg-gray-50'

    if (!clientId) {
        return (
            <div
                className={`rounded-xl border-2 px-3 py-3 text-center text-xs ${border} ${
                    darkMode ? 'text-amber-200' : 'text-amber-800'
                }`}
            >
                Falta <code className="rounded bg-black/10 px-1">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> en el front.
            </div>
        )
    }

    return (
        <div className={`relative overflow-hidden rounded-xl border-2 shadow-sm ${border}`}>
            {busy ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/25 backdrop-blur-[1px]">
                    <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Conectando…</span>
                </div>
            ) : null}
            <div className={`flex min-h-[52px] items-stretch gap-0 ${innerBg}`}>
                <div
                    className={`flex w-14 shrink-0 items-center justify-center border-r px-2 ${
                        darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                    }`}
                >
                    <NextImage
                        src="/Imagenes/logo-google.svg"
                        alt=""
                        width={28}
                        height={28}
                        className="object-contain"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none'
                        }}
                    />
                </div>
                <div className="min-w-0 flex-1 p-2">
                    {credential && preview ? (
                        <div className="flex items-center gap-3">
                            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-white/20 bg-slate-200 dark:bg-slate-700">
                                {preview.picture ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={preview.picture} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src="/Imagenes/usuario.png" alt="" className="h-full w-full object-cover" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className={`truncate text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {preview.email}
                                </p>
                                {preview.name ? (
                                    <p className={`truncate text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{preview.name}</p>
                                ) : null}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    try {
                                        window.google?.accounts?.id?.cancel?.()
                                    } catch {
                                        void 0
                                    }
                                    onClear()
                                }}
                                className={`shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold underline-offset-2 hover:underline ${
                                    darkMode ? 'text-blue-300' : 'text-[#2563eb]'
                                }`}
                            >
                                Cambiar cuenta
                            </button>
                        </div>
                    ) : (
                        <div className="flex min-h-[44px] items-center justify-center">
                            <div ref={buttonMountRef} className="flex w-full justify-center [&>div]:!w-full" />
                        </div>
                    )}
                </div>
            </div>
            {scriptError ? (
                <p className={`border-t px-3 py-2 text-center text-xs ${darkMode ? 'border-gray-600 text-red-300' : 'border-gray-200 text-red-600'}`}>
                    {scriptError}
                </p>
            ) : null}
        </div>
    )
}
