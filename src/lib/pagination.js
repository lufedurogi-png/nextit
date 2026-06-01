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
