/* Tarjetas de sección reutilizables (Tienda) — gradiente, borde suave, cabecera con icono. */

const shell =
    'overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/40 to-emerald-50/30 shadow-[0_6px_28px_-8px_rgba(13,148,136,0.18),0_2px_6px_rgba(15,23,42,0.04)] ring-1 ring-white/60 dark:from-slate-900/95 dark:via-slate-900/75 dark:to-emerald-950/20 dark:border-slate-600/50 dark:shadow-[0_8px_32px_-6px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.04)] dark:ring-slate-700/35'

export const tiendaHeaderGradient =
    'border-b border-slate-200/50 bg-gradient-to-r from-white/90 via-emerald-50/30 to-cyan-50/20 dark:border-slate-700/50 dark:from-slate-800/30 dark:via-slate-900/40 dark:to-emerald-950/20'

const headerBase = tiendaHeaderGradient

const iconBox =
    'grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--app-accent)] to-teal-600 text-white shadow-md shadow-[var(--app-accent)]/30 ring-1 ring-white/20'

export { iconBox as tiendaIconBox }

const inputClass =
    'w-full rounded-2xl border border-slate-200/90 bg-white/80 px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--app-accent)]/50 focus:ring-2 focus:ring-[var(--app-accent)]/20 dark:border-slate-600 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-[var(--app-accent)]/25'

const tiendaFieldClass =
    'w-full rounded-2xl border border-slate-200/90 bg-white/80 px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[var(--app-accent)]/50 focus:ring-2 focus:ring-[var(--app-accent)]/20 dark:border-slate-600 dark:bg-slate-950/80 dark:text-slate-100 dark:focus:ring-[var(--app-accent)]/25'

export function getTiendaFieldClass() {
    return tiendaFieldClass
}

export { inputClass as tiendaInputClass, shell as tiendaSectionShell }

/**
 * @param {object} props
 * @param {React.ReactNode} props.icon — SVG o emoji dentro del círculo
 * @param {string} props.kicker
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {React.ReactNode} [props.badge]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {string} [props.bodyClassName]
 */
export function TiendaSectionCard({ icon, kicker, title, subtitle, badge, children, className = '', bodyClassName = '' }) {
    return (
        <section className={`${shell} ${className}`}>
            <div className={`flex items-start gap-3 px-4 py-3.5 sm:px-5 sm:py-4 ${headerBase}`}>
                <div className={iconBox} aria-hidden>
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    {kicker ? <p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-[var(--app-accent)]/90 dark:text-[var(--app-accent)]/80">{kicker}</p> : null}
                    <h2 className="mt-0.5 text-base font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-lg">{title}</h2>
                    {subtitle ? <p className="mt-0.5 text-sm leading-snug text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
                </div>
                {badge ? <div className="shrink-0">{badge}</div> : null}
            </div>
            <div className={`p-4 pt-3.5 sm:px-5 sm:pb-5 ${bodyClassName}`}>{children}</div>
        </section>
    )
}

export function IconSearch({ className = 'h-5 w-5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M20 20l-4-4" strokeLinecap="round" />
        </svg>
    )
}

export function IconList({ className = 'h-5 w-5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M8 6h13M8 12h13M8 18h13" strokeLinecap="round" />
            <circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none" />
        </svg>
    )
}

export function IconSell({ className = 'h-5 w-5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 9h16l-1 12H5L4 9z" strokeLinejoin="round" />
            <path d="M8 9V7a4 4 0 0 1 8 0v2" strokeLinecap="round" />
            <path d="M12 14v3" strokeLinecap="round" />
        </svg>
    )
}
