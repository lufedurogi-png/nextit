'use client'

import { Children, cloneElement, isValidElement } from 'react'

/**
 * Cuadrícula de productos “pegada”: líneas de 1px entre celdas (sin huecos tipo tarjetas sueltas).
 * Pasa `cuadricula` a cada hijo válido (p. ej. ProductCard).
 */
export default function ProductGrid({ darkMode, className = '', children }) {
    const cells = Children.map(children, (child) => {
        if (!isValidElement(child)) return child
        return cloneElement(child, { cuadricula: true })
    })

    return (
        <div
            className={`overflow-hidden rounded-lg ${
                darkMode ? 'bg-gray-600/40' : 'bg-gray-200'
            } ${className}`}
        >
            <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{cells}</div>
        </div>
    )
}
