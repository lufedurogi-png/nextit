'use client'

import { useState } from 'react'

/**
 * Preview en vivo con marco tipo navegador.
 * Si el sitio bloquea el iframe, se muestra un fallback con enlace externo.
 */
export default function SitePreview({
    url,
    title,
    label,
    loading = 'lazy',
}) {
    const [failed, setFailed] = useState(false)
    const host = (() => {
        try {
            return new URL(url).hostname.replace(/^www\./, '')
        } catch {
            return url
        }
    })()

    return (
        <div className="pf-preview mt-6 overflow-hidden border border-[var(--pf-line)] bg-[var(--pf-bg)]">
            <div className="flex items-center gap-3 border-b border-[var(--pf-line)] px-3 py-2.5 sm:px-4">
                <div className="flex items-center gap-1.5" aria-hidden>
                    <span className="h-2 w-2 rounded-full bg-[var(--pf-line-strong)]" />
                    <span className="h-2 w-2 rounded-full bg-[var(--pf-line-strong)]" />
                    <span className="h-2 w-2 rounded-full bg-[var(--pf-line-strong)]" />
                </div>
                <p className="pf-mono min-w-0 flex-1 truncate text-[10px] tracking-[0.12em] text-[var(--pf-mute)]">
                    {host}
                </p>
                {label ? (
                    <span className="pf-mono hidden text-[9px] uppercase tracking-[0.16em] text-[var(--pf-signal)] sm:inline">
                        {label}
                    </span>
                ) : null}
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pf-mono shrink-0 text-[10px] uppercase tracking-[0.14em] text-[var(--pf-mute)] transition-colors hover:text-[var(--pf-signal)]">
                    Abrir ↗
                </a>
            </div>

            <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--pf-bg-elev)]">
                {!failed ? (
                    <iframe
                        title={`Vista previa: ${title}`}
                        src={url}
                        loading={loading}
                        referrerPolicy="no-referrer-when-downgrade"
                        className="pointer-events-none absolute left-0 top-0 h-[200%] w-[200%] origin-top-left scale-50 border-0 bg-white"
                        onError={() => setFailed(true)}
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                        <p className="pf-mono text-[10px] uppercase tracking-[0.2em] text-[var(--pf-mute)]">
                            Preview no disponible
                        </p>
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-light text-[var(--pf-signal)] underline-offset-4 hover:underline">
                            Visitar {host}
                        </a>
                    </div>
                )}

                {/* Capa clickable hacia el sitio (el iframe no recibe clicks) */}
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 z-10"
                    aria-label={`Abrir ${title} en una nueva pestaña`}
                />
            </div>
        </div>
    )
}
