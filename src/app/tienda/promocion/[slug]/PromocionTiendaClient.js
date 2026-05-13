'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTiendaDarkMode } from '@/hooks/useTiendaDarkMode'
import TiendaNavHeader from '@/components/TiendaNavHeader'
import ProductCard from '@/components/ProductCard'
import ProductGrid from '@/components/ProductGrid'
import { getPromocionPublica } from '@/lib/promociones'

export default function PromocionTiendaClient({ slug, initialData = null }) {
    const { darkMode, setDarkMode } = useTiendaDarkMode()
    const [titulo, setTitulo] = useState(initialData?.titulo ?? '')
    const [descripcion, setDescripcion] = useState(initialData?.descripcion ?? '')
    const [productos, setProductos] = useState(initialData?.productos ?? [])
    const [noEncontrada, setNoEncontrada] = useState(!initialData)

    useEffect(() => {
        if (initialData) return undefined
        let cancelled = false
        ;(async () => {
            const data = await getPromocionPublica(slug)
            if (cancelled) return
            if (!data) {
                setNoEncontrada(true)
                return
            }
            setTitulo(data.titulo)
            setDescripcion(data.descripcion || '')
            setProductos(Array.isArray(data.productos) ? data.productos : [])
            setNoEncontrada(false)
        })()
        return () => {
            cancelled = true
        }
    }, [slug, initialData])

    if (noEncontrada) {
        return (
            <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-tienda-canvas text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
                <TiendaNavHeader darkMode={darkMode} setDarkMode={setDarkMode} onToggleLeftSidebar={() => {}} />
                <main className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <h1 className="text-2xl font-bold mb-2">Promoción no disponible</h1>
                        <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            No existe o no está activa esta promoción.
                        </p>
                        <Link href="/" className="text-brand font-semibold hover:underline">
                            Volver a la tienda
                        </Link>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-tienda-canvas text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
            <TiendaNavHeader darkMode={darkMode} setDarkMode={setDarkMode} onToggleLeftSidebar={() => {}} />
            <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                <nav className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Link href="/" className="hover:text-brand">
                        Inicio
                    </Link>
                    <span className="mx-2">/</span>
                    <span className="text-gray-500">Promoción</span>
                </nav>
                <h1 className={`text-3xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{titulo}</h1>
                {descripcion && <p className={`mb-8 max-w-3xl ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{descripcion}</p>}
                {productos.length === 0 ? (
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Esta promoción aún no tiene productos.</p>
                ) : (
                    <ProductGrid darkMode={darkMode}>
                        {productos.map((p) => (
                            <ProductCard key={p.clave} producto={p} darkMode={darkMode} returnUrl={`/tienda/promocion/${encodeURIComponent(slug)}`} />
                        ))}
                    </ProductGrid>
                )}
            </main>
        </div>
    )
}
