'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/hooks/auth'
import { formatPrecio, resolveStorageUrl } from '@/lib/productos'
import { registrarSeleccionBusqueda } from '@/lib/busqueda'
import { useCarrito } from '@/lib/carrito'
import { useFavoritos } from '@/lib/favoritos'
import { useCotizacion } from '@/lib/cotizaciones'

const FALLBACK_IMAGE = '/Imagenes/caja.png'

function getFirstImageUrl(producto) {
    if (producto?.imagen) return resolveStorageUrl(producto.imagen)
    const imagenes = producto?.imagenes
    if (Array.isArray(imagenes) && imagenes.length > 0) return resolveStorageUrl(imagenes[0])
    return null
}

export default function ProductCard({
    producto,
    darkMode,
    busquedaId = null,
    comparar = false,
    seleccionado = false,
    onCompararChange,
    compararLleno = false,
    returnUrl = null,
    cuadricula = false,
}) {
    const { user } = useAuth({ middleware: 'guest' })
    const [hasToken, setHasToken] = useState(false)
    useEffect(() => {
        setHasToken(typeof window !== 'undefined' && !!localStorage.getItem('auth_token'))
    }, [])
    const [imgError, setImgError] = useState(false)
    const [togglingFavorito, setTogglingFavorito] = useState(false)
    const isLogged = !!user || hasToken
    const { isFavorito, toggle: toggleFavorito } = useFavoritos(isLogged)
    const { isInCart } = useCarrito(isLogged)
    const { modoActivo, isInQuote, cantidad: quoteCantidad, toggleItem, setCantidad } = useCotizacion(user)
    const imageUrl = getFirstImageUrl(producto)
    const titulo = producto?.descripcion || ''
    const precioFormateado = formatPrecio(producto?.precio, producto?.moneda)
    const grupo = producto?.grupo || ''
    const clave = producto?.clave
    const disponible = Number(producto?.disponible) || 0
    const disponibleCd = Number(producto?.disponible_cd) || 0
    const totalStock = disponible + disponibleCd
    const hayStock = totalStock > 0
    const src = imgError || !imageUrl ? FALLBACK_IMAGE : imageUrl

    if (!clave) return null

    const shellClass = cuadricula
        ? darkMode
            ? 'group relative overflow-hidden rounded-none border-0 bg-tienda-elevated shadow-none transition-colors duration-150 hover:bg-white/[0.035]'
            : 'group relative overflow-hidden rounded-none border-0 bg-white shadow-none transition-colors duration-150 hover:bg-gray-50'
        : darkMode
            ? 'group relative overflow-hidden rounded-xl border border-gray-700/40 bg-tienda-elevated shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-brand/45 hover:shadow-md'
            : 'group relative overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-brand/50 hover:shadow-md'

    return (
        <div className={shellClass}>
            <Link
                href={returnUrl ? `/tienda/producto/${encodeURIComponent(clave)}?from=${encodeURIComponent(returnUrl)}` : `/tienda/producto/${encodeURIComponent(clave)}`}
                className="block"
                onClick={() => {
                    if (busquedaId) registrarSeleccionBusqueda(busquedaId, clave)
                }}
            >
                <div
                    className={`relative h-48 cursor-pointer overflow-hidden ${
                        darkMode ? 'bg-black/25' : 'bg-gray-50'
                    }`}
                >
                    {user && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (togglingFavorito) return
                                toggleFavorito(clave).finally(() => setTogglingFavorito(false))
                            }}
                            className="absolute left-2 top-2 z-10 flex h-9 w-9 flex-col items-center justify-center rounded-full border border-white/15 bg-black/35 text-white shadow-sm backdrop-blur-sm transition-colors hover:border-red-400/50 hover:bg-red-600/90"
                            aria-label={isFavorito(clave) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                        >
                            <Image
                                src="/Imagenes/icon_favoritos.png"
                                alt=""
                                width={16}
                                height={16}
                                className="object-contain brightness-0 invert shrink-0"
                            />
                            {isFavorito(clave) && (
                                <svg className="w-3 h-3 shrink-0 -mt-0.5 text-white" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                                    <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                                </svg>
                            )}
                        </button>
                    )}
                    {comparar && !modoActivo && (
                        <div
                            className="absolute top-2 right-2 z-10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <input
                                type="checkbox"
                                checked={seleccionado}
                                disabled={!seleccionado && compararLleno}
                                onChange={(e) => onCompararChange?.(clave, e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-5 w-5 rounded border-2 border-gray-400 bg-white/90 text-brand focus:ring-2 focus:ring-brand focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label={`Comparar ${titulo.slice(0, 40)}`}
                            />
                        </div>
                    )}
                    {modoActivo && (
                        <div
                            className="absolute top-2 right-2 z-10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <input
                                type="checkbox"
                                checked={isInQuote(clave)}
                                onChange={(e) => toggleItem(clave, e.target.checked, quoteCantidad(clave) || 1)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-5 w-5 rounded border-2 border-gray-400 bg-white/90 text-brand focus:ring-2 focus:ring-brand focus:ring-offset-0"
                                aria-label={`Cotizar ${titulo.slice(0, 40)}`}
                            />
                        </div>
                    )}
                    <Image
                        src={src}
                        alt={titulo.slice(0, 60) || 'Producto'}
                        fill
                        className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        onError={() => setImgError(true)}
                        unoptimized={src.startsWith('http')}
                    />
                    {grupo && (
                        <span
                            className={`absolute bottom-2 right-2 rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                                darkMode ? 'bg-black/35 text-gray-300 ring-1 ring-white/10' : 'bg-white/90 text-gray-600 ring-1 ring-gray-200/80'
                            }`}
                        >
                            {grupo}
                        </span>
                    )}
                </div>
                <div className="border-t border-gray-100/80 p-4 dark:border-white/[0.06]">
                    <h3
                        title={titulo}
                        className={`mb-2 line-clamp-2 cursor-pointer text-[15px] font-medium leading-snug ${
                            darkMode ? 'text-gray-100' : 'text-gray-900'
                        }`}
                    >
                        {titulo}
                    </h3>
                    <div className="flex flex-col gap-1.5">
                        {producto.tiene_descuento && producto.precio_anterior != null && (
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                <span className="line-through">{formatPrecio(producto.precio_anterior, producto.moneda)}</span>
                                {' → '}
                                <span className={`font-semibold tabular-nums ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                    {formatPrecio(producto.precio_actual ?? producto.precio, producto.moneda)}
                                </span>
                                {producto.porcentaje_descuento > 0 && (
                                    <span className={`ml-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>({Math.round(producto.porcentaje_descuento)}%)</span>
                                )}
                            </p>
                        )}
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
                            <span
                                className={`shrink-0 text-base font-semibold tabular-nums ${
                                    darkMode ? 'text-gray-100' : 'text-gray-900'
                                }`}
                            >
                                {precioFormateado}
                            </span>
                            <span
                                className={`inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tabular-nums leading-tight ${
                                    hayStock
                                        ? darkMode
                                            ? 'border-white/[0.1] bg-white/[0.03] text-gray-400'
                                            : 'border-gray-200 bg-white text-gray-600'
                                        : darkMode
                                            ? 'border-rose-500/20 bg-rose-950/25 text-rose-200/85'
                                            : 'border-rose-200/80 bg-rose-50/90 text-rose-800'
                                }`}
                            >
                                {hayStock ? `Stock: ${totalStock}` : 'Sin stock'}
                            </span>
                        </div>
                    </div>
                </div>
            </Link>
            {isInCart(clave) && (
                <div
                    className={`px-4 pb-2 pt-1 ${cuadricula ? 'border-t border-gray-200/70 dark:border-white/[0.08]' : '-mt-1'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Link
                        href="/tienda/carrito"
                        className={`inline-flex text-sm font-medium underline decoration-brand/35 underline-offset-2 transition-colors hover:decoration-brand ${
                            darkMode ? 'text-brand hover:text-brand-hover' : 'text-brand hover:text-brand-hover'
                        }`}
                    >
                        Ver carrito →
                    </Link>
                </div>
            )}
            {modoActivo && isInQuote(clave) && (
                <div
                    className={`flex items-center gap-2 px-4 py-2 ${cuadricula ? 'border-t border-gray-200/70 dark:border-white/[0.08]' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <label className="shrink-0 text-sm font-medium text-brand" htmlFor={`qty-quote-${clave}`}>
                        Cantidad a cotizar:
                    </label>
                    <div
                        className={`relative flex items-center gap-0 overflow-hidden rounded-lg border border-l-[3px] border-l-brand ${
                            darkMode ? 'border-gray-600/50 bg-black/20' : 'border-gray-300 bg-gray-100'
                        }`}
                    >
                        <span className="shrink-0 pl-2.5 text-sm font-semibold text-brand" aria-hidden>
                            #
                        </span>
                        <input
                            id={`qty-quote-${clave}`}
                            type="number"
                            min={1}
                            max={Math.max(1, totalStock)}
                            value={Math.min(Math.max(1, quoteCantidad(clave) || 1), Math.max(1, totalStock))}
                            onChange={(e) => {
                                const raw = e.target.value
                                if (raw === '' || raw === null || raw === undefined) {
                                    setCantidad(clave, 1)
                                    return
                                }
                                const v = Math.max(1, Math.min(totalStock, Number(raw) || 1))
                                setCantidad(clave, v)
                            }}
                            onBlur={(e) => {
                                const raw = e.target.value
                                if (raw === '' || Number(raw) < 1 || Number.isNaN(Number(raw))) {
                                    setCantidad(clave, 1)
                                    return
                                }
                                const v = Math.max(1, Math.min(totalStock, Number(raw)))
                                setCantidad(clave, v)
                            }}
                            className={`w-14 py-2 pr-0 text-sm font-semibold text-center bg-transparent border-0 focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                darkMode ? 'text-white' : 'text-gray-900'
                            }`}
                        />
                        <div className={`flex flex-col shrink-0 border-l ${darkMode ? 'border-gray-600' : 'border-gray-400'}`}>
                            <button
                                type="button"
                                aria-label="Aumentar cantidad a cotizar"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    const q = quoteCantidad(clave) || 1
                                    const maxQ = Math.max(1, totalStock)
                                    setCantidad(clave, Math.min(maxQ, q + 1))
                                }}
                                className={`p-1 flex items-center justify-center ${darkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-300 text-gray-600'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                            </button>
                            <button
                                type="button"
                                aria-label="Disminuir cantidad a cotizar"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    const q = quoteCantidad(clave) || 1
                                    setCantidad(clave, Math.max(1, q - 1))
                                }}
                                className={`p-1 flex items-center justify-center border-t ${darkMode ? 'border-gray-600 hover:bg-gray-600 text-gray-300' : 'border-gray-400 hover:bg-gray-300 text-gray-600'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
