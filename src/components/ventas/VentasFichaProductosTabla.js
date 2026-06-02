'use client'

import Link from 'next/link'
import { resolveStorageUrl } from '@/lib/productos'

export function getProductoImagenesUrls(item) {
    if (!item || typeof item !== 'object') return []
    const seen = new Set()
    const out = []
    const push = (raw) => {
        if (raw == null || raw === '') return
        const u = typeof raw === 'string' ? resolveStorageUrl(raw) : ''
        if (u && !seen.has(u)) {
            seen.add(u)
            out.push(u)
        }
    }
    push(item.imagen)
    if (Array.isArray(item.imagenes)) item.imagenes.forEach(push)
    return out
}

export function hrefProductoTienda(clave) {
    const c = clave != null ? String(clave).trim() : ''
    return c ? `/tienda/producto/${encodeURIComponent(c)}` : null
}

export function VentasFichaProductoImagen({ urls, darkMode, rowKey }) {
    const list = (Array.isArray(urls) ? urls : []).filter(Boolean)
    if (list.length === 0) {
        return (
            <span
                className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border text-[9px] font-medium uppercase leading-tight text-center ${
                    darkMode ? 'border-orange-800/60 bg-[#262626] text-orange-400/80' : 'border-orange-100 bg-orange-50 text-orange-400'
                }`}
            >
                Sin img
            </span>
        )
    }
    return (
        <div
            className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border ${
                darkMode ? 'border-orange-800/50 bg-[#202020]' : 'border-orange-100 bg-white'
            }`}
        >
            <img src={list[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
    )
}

export function VentasFichaProductoNombre({ clave, nombre, darkMode }) {
    const href = hrefProductoTienda(clave)
    const className = `line-clamp-2 text-xs font-medium underline-offset-2 hover:underline ${
        darkMode ? 'text-orange-200 hover:text-orange-100' : 'text-orange-900 hover:text-orange-800'
    }`
    if (!href) {
        return (
            <span className={className} title={nombre}>
                {nombre}
            </span>
        )
    }
    return (
        <Link href={href} target="_blank" rel="noopener noreferrer" className={className} title={nombre}>
            {nombre}
        </Link>
    )
}

export function VentasFichaProductosTabla({ items, darkMode }) {
    if (!items?.length) {
        return <p className={`text-xs ${darkMode ? 'text-orange-300/60' : 'text-gray-500'}`}>Sin productos.</p>
    }
    return (
        <div className="overflow-x-auto rounded-xl border border-orange-100 dark:border-orange-800/50">
            <table className="w-full min-w-[520px] text-xs">
                <thead>
                    <tr
                        className={`text-left text-[10px] font-semibold uppercase tracking-wide ${
                            darkMode ? 'bg-orange-950/50 text-orange-200' : 'bg-orange-50 text-orange-900'
                        }`}
                    >
                        <th className="px-2 py-2 w-16">Imagen</th>
                        <th className="px-2 py-2 w-24">Clave</th>
                        <th className="px-2 py-2">Producto</th>
                        <th className="px-2 py-2 w-14 text-right">Stock</th>
                        <th className="px-2 py-2 w-12 text-right">Cant.</th>
                        <th className="px-2 py-2 w-24 text-right">Precio</th>
                    </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-orange-900/40' : 'divide-orange-50'}`}>
                    {items.map((it, idx) => {
                        const urls = getProductoImagenesUrls(it)
                        const clave = it.clave ?? '—'
                        const nombre = it.nombre_producto || clave
                        const precio =
                            typeof it.precio_unitario === 'number'
                                ? it.precio_unitario.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
                                : '—'
                        return (
                            <tr key={`${clave}-${idx}`} className={darkMode ? 'text-orange-100/90' : 'text-gray-800'}>
                                <td className="px-2 py-2 align-top">
                                    <VentasFichaProductoImagen urls={urls} darkMode={darkMode} rowKey={clave} />
                                </td>
                                <td className="px-2 py-2 align-top font-mono text-orange-700 dark:text-orange-300">{clave}</td>
                                <td className="px-2 py-2 align-top">
                                    <VentasFichaProductoNombre clave={it.clave} nombre={nombre} darkMode={darkMode} />
                                </td>
                                <td className="px-2 py-2 align-top text-right">{it.stock ?? '—'}</td>
                                <td className="px-2 py-2 align-top text-right">{it.cantidad ?? 1}</td>
                                <td className="px-2 py-2 align-top text-right font-medium">{precio}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
