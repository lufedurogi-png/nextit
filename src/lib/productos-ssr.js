/**
 * Solo para uso en Server Components (SSR).
 * No importar axios ni nada que use React/context para evitar "useContext" null en el servidor.
 */

import { getServerBackendApiBase } from '@/lib/serverBackendUrl'

export async function getSubcategoriaDataForSSR(categoria, subcategoria) {
    if (!categoria || !subcategoria) {
        return { catalogDisponible: false, productos: [], marcas: [] }
    }
    const BASE = getServerBackendApiBase()
    if (!BASE) {
        return { catalogDisponible: false, productos: [], marcas: [] }
    }
    try {
        const isVerTodo = subcategoria === 'ver-todo'
        const params = new URLSearchParams()
        if (isVerTodo) params.set('categoria_principal', categoria)
        else params.set('grupo', subcategoria)
        params.set('per_page', '24')
        params.set('page', '1')

        const marcasUrl = isVerTodo
            ? `${BASE}/catalogos/marcas?categoria_principal=${encodeURIComponent(categoria)}`
            : `${BASE}/catalogos/marcas?grupo=${encodeURIComponent(subcategoria)}`
        const opts = { next: { revalidate: 120 } }
        const [estadoRes, productosRes, marcasRes] = await Promise.all([
            fetch(`${BASE}/productos/estado`, opts),
            fetch(`${BASE}/productos?${params.toString()}`, opts),
            fetch(marcasUrl, opts),
        ])
        const estado = await estadoRes.json()
        const productosData = await productosRes.json()
        const marcasData = await marcasRes.json()
        const catalogDisponible = estado?.data?.disponible ?? false
        const productos = productosData?.success && productosData?.data?.productos
            ? productosData.data.productos
            : []
        const marcas = marcasData?.success && Array.isArray(marcasData?.data) ? marcasData.data : []
        const meta = productosData?.success && productosData?.data ? productosData.data : {}
        return {
            catalogDisponible,
            productos,
            marcas,
            total: meta.total ?? productos.length,
            current_page: meta.current_page ?? 1,
            last_page: meta.last_page ?? 1,
        }
    } catch {
        return { catalogDisponible: false, productos: [], marcas: [] }
    }
}

/** Un solo producto por clave, para vista de detalle (SSR). */
export async function getProductoByClaveForSSR(clave) {
    if (!clave) return { producto: null, errorCatalog: false }
    const BASE = getServerBackendApiBase()
    if (!BASE) return { producto: null, errorCatalog: false }
    try {
        const res = await fetch(`${BASE}/productos/${encodeURIComponent(clave)}`, { next: { revalidate: 60 } })
        const data = await res.json()
        if (data?.success && data?.data) return { producto: data.data, errorCatalog: false }
        if (res.status === 503) return { producto: null, errorCatalog: true }
        return { producto: null, errorCatalog: false }
    } catch {
        return { producto: null, errorCatalog: false }
    }
}
