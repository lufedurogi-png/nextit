'use client'

export function buildPaginationItems(current, total) {
    if (total <= 0) return []
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1)
    }

    const pages = new Set([1, total, current])
    if (current > 1) pages.add(current - 1)
    if (current < total) pages.add(current + 1)
    if (current <= 3) {
        pages.add(2)
        pages.add(3)
    }
    if (current >= total - 2) {
        pages.add(total - 1)
        pages.add(total - 2)
    }

    const sorted = [...pages].sort((a, b) => a - b)
    const result = []
    let prev = 0
    for (const p of sorted) {
        if (prev && p - prev > 1) result.push('…')
        result.push(p)
        prev = p
    }
    return result
}

const btnBaseDefault =
    'inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed'

export default function VentasCorreosHistorialPaginacion({
    darkMode,
    currentPage,
    lastPage,
    onPageChange,
    compact = false,
}) {
    if (lastPage <= 1) return null

    const items = buildPaginationItems(currentPage, lastPage)

    const btnBase = compact
        ? 'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg border text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed'
        : btnBaseDefault

    const idle = darkMode
        ? 'border-orange-800/60 bg-[#202020] text-orange-200 hover:bg-orange-900/40'
        : 'border-orange-200 bg-white text-orange-900 hover:bg-orange-50'
    const active = darkMode
        ? 'border-orange-500 bg-orange-600 text-white'
        : 'border-orange-500 bg-orange-600 text-white'

    const go = (page) => {
        if (page >= 1 && page <= lastPage && page !== currentPage) onPageChange(page)
    }

    return (
        <nav className={`flex flex-wrap items-center justify-center gap-1.5 ${compact ? 'pt-2' : 'pt-6'}`} aria-label="Paginación">
            <button
                type="button"
                className={`${btnBase} ${idle}`}
                disabled={currentPage <= 1}
                onClick={() => go(1)}
                aria-label="Primera página"
            >
                «
            </button>
            <button
                type="button"
                className={`${btnBase} ${idle}`}
                disabled={currentPage <= 1}
                onClick={() => go(currentPage - 1)}
                aria-label="Página anterior"
            >
                ‹
            </button>

            {items.map((item, idx) =>
                item === '…' ? (
                    <span
                        key={`ellipsis-${idx}`}
                        className={`inline-flex h-9 min-w-[2.25rem] items-center justify-center text-sm ${
                            darkMode ? 'text-orange-400' : 'text-orange-500'
                        }`}
                        aria-hidden
                    >
                        …
                    </span>
                ) : (
                    <button
                        key={item}
                        type="button"
                        className={`${btnBase} ${item === currentPage ? active : idle}`}
                        onClick={() => go(item)}
                        aria-label={`Página ${item}`}
                        aria-current={item === currentPage ? 'page' : undefined}
                    >
                        {item}
                    </button>
                ),
            )}

            <button
                type="button"
                className={`${btnBase} ${idle}`}
                disabled={currentPage >= lastPage}
                onClick={() => go(currentPage + 1)}
                aria-label="Página siguiente"
            >
                ›
            </button>
            <button
                type="button"
                className={`${btnBase} ${idle}`}
                disabled={currentPage >= lastPage}
                onClick={() => go(lastPage)}
                aria-label="Última página"
            >
                »
            </button>
        </nav>
    )
}
