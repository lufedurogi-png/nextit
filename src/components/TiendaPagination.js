'use client'

import { getPaginationRange } from '@/lib/pagination'

function NavButton({ darkMode, disabled, onClick, ariaLabel, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
            className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${
                darkMode
                    ? 'border-brand/35 bg-tienda-elevated text-gray-200 hover:border-brand hover:text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-brand hover:text-brand'
            }`}
        >
            {children}
        </button>
    )
}

export default function TiendaPagination({ currentPage, lastPage, onPageChange, darkMode = false, className = '' }) {
    if (!lastPage || lastPage <= 1) return null

    const page = Math.min(Math.max(1, currentPage), lastPage)
    const items = getPaginationRange(page, lastPage)

    const goTo = (p) => {
        const next = Math.min(Math.max(1, p), lastPage)
        if (next !== page) onPageChange(next)
    }

    const pageBtnClass = (isActive) =>
        `inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-2 text-sm font-semibold transition-colors ${
            isActive
                ? 'border-brand bg-brand text-white shadow-sm'
                : darkMode
                  ? 'border-brand/35 bg-tienda-elevated text-gray-200 hover:border-brand hover:text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-brand hover:text-brand'
        }`

    return (
        <nav
            className={`flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 ${className}`}
            aria-label="Paginación de productos"
        >
            <NavButton darkMode={darkMode} disabled={page <= 1} onClick={() => goTo(1)} ariaLabel="Primera página">
                «
            </NavButton>
            <NavButton darkMode={darkMode} disabled={page <= 1} onClick={() => goTo(page - 1)} ariaLabel="Página anterior">
                ‹
            </NavButton>

            {items.map((item, idx) =>
                item === 'ellipsis' ? (
                    <span
                        key={`ellipsis-${idx}`}
                        className={`inline-flex h-10 min-w-10 items-center justify-center px-1 text-sm ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                        }`}
                        aria-hidden
                    >
                        …
                    </span>
                ) : (
                    <button
                        key={item}
                        type="button"
                        onClick={() => goTo(item)}
                        aria-label={`Página ${item}`}
                        aria-current={item === page ? 'page' : undefined}
                        className={pageBtnClass(item === page)}
                    >
                        {item}
                    </button>
                )
            )}

            <NavButton darkMode={darkMode} disabled={page >= lastPage} onClick={() => goTo(page + 1)} ariaLabel="Página siguiente">
                ›
            </NavButton>
            <NavButton darkMode={darkMode} disabled={page >= lastPage} onClick={() => goTo(lastPage)} ariaLabel="Última página">
                »
            </NavButton>
        </nav>
    )
}
