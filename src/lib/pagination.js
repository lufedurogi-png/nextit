/** Productos por página en listados de tienda (subcategoría y búsqueda). */
export const PRODUCTOS_POR_PAGINA = 24

export function paginateArray(items, page, perPage = PRODUCTOS_POR_PAGINA) {
    const list = Array.isArray(items) ? items : []
    const lastPage = Math.max(1, Math.ceil(list.length / perPage) || 1)
    const safePage = Math.min(Math.max(1, page), lastPage)
    const start = (safePage - 1) * perPage

    return {
        items: list.slice(start, start + perPage),
        total: list.length,
        currentPage: safePage,
        lastPage,
        perPage,
    }
}

/** Rango de páginas con elipsis: p. ej. [1, 2, 3, 'ellipsis', 10] */
export function getPaginationRange(currentPage, lastPage) {
    if (lastPage <= 1) return lastPage === 1 ? [1] : []

    const delta = 1
    const range = []

    for (let i = 1; i <= lastPage; i++) {
        if (i === 1 || i === lastPage || (i >= currentPage - delta && i <= currentPage + delta)) {
            range.push(i)
        }
    }

    const withDots = []
    let prev = null

    for (const page of range) {
        if (prev !== null) {
            if (page - prev === 2) {
                withDots.push(prev + 1)
            } else if (page - prev > 1) {
                withDots.push('ellipsis')
            }
        }
        withDots.push(page)
        prev = page
    }

    return withDots
}

/**
 * Compatibilidad con vistas admin antiguas.
 * Retorna una ventana corta de páginas y banderas para elipsis/última página.
 */
export function getPaginationWindow(currentPage, lastPage) {
    const totalP = Math.max(1, Number(lastPage) || 1)
    const current = Math.min(Math.max(1, Number(currentPage) || 1), totalP)

    if (totalP <= 7) {
        return {
            windowPages: Array.from({ length: totalP }, (_, i) => i + 1),
            showEllipsis: false,
            showLastPage: false,
        }
    }

    // Muestra primeras páginas y entorno de la actual.
    const pages = new Set([1, current - 1, current, current + 1])
    if (current <= 3) {
        pages.add(2)
        pages.add(3)
        pages.add(4)
    }

    const windowPages = [...pages]
        .filter((p) => p >= 1 && p < totalP)
        .sort((a, b) => a - b)

    const showLastPage = totalP > 1 && !windowPages.includes(totalP)
    const lastWindowPage = windowPages[windowPages.length - 1] ?? 1
    const showEllipsis = showLastPage && lastWindowPage < totalP - 1

    return { windowPages, showEllipsis, showLastPage }
}
