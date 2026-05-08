'use client'

import { UI_THEMES, getUiThemeById } from '@/lib/uiThemes'

/**
 * Selector de tema (misma rejilla que en Perfil → Apariencia).
 * @param {{ uiTheme: number, savingThemeId: number | null, onSelectTheme: (id: number) => void, className?: string, compact?: boolean }} props
 */
export default function AppearanceThemePanel({ uiTheme, savingThemeId, onSelectTheme, className = '', compact = false }) {
    return (
        <div className={className}>
            {!compact ? (
                <>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Apariencia</p>
                    <p className="mt-1 text-lg font-extrabold text-slate-900 dark:text-slate-50">
                        Modo: <span className="text-[var(--app-accent)]">{getUiThemeById(uiTheme).name}</span>
                    </p>
                </>
            ) : null}
            <p className={`text-xs text-slate-500 dark:text-slate-400 ${compact ? '' : 'mt-1'}`}>
                Elige una combinación; se guarda en tu cuenta y se aplica en todos tus dispositivos.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                {UI_THEMES.map((t) => {
                    const active = uiTheme === t.id
                    const busy = savingThemeId === t.id
                    return (
                        <button
                            key={t.id}
                            type="button"
                            disabled={busy}
                            onClick={() => onSelectTheme(t.id)}
                            className={`relative rounded-2xl border p-2.5 text-left transition ${
                                active
                                    ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/10 ring-2 ring-[var(--app-accent)]/40'
                                    : 'border-slate-200 bg-slate-50/80 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-950/40 dark:hover:border-slate-500'
                            } ${busy ? 'opacity-70' : ''}`}
                        >
                            <span className="block text-center text-[11px] font-extrabold leading-tight text-slate-800 dark:text-slate-100">{t.name}</span>
                            {t.hint ? (
                                <span className="mt-0.5 block text-center text-[9px] font-medium text-slate-500 dark:text-slate-400">{t.hint}</span>
                            ) : null}
                            <div
                                className="mt-2 flex h-11 overflow-hidden rounded-xl border border-slate-200/80 shadow-inner dark:border-slate-600/60"
                                aria-hidden
                            >
                                <span className="flex-1" style={{ background: t.swatch[0] }} />
                                <span className="flex-1" style={{ background: t.swatch[1] }} />
                            </div>
                            {active ? (
                                <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[var(--app-accent)] text-white shadow-md">
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                            ) : null}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
