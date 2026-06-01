'use client'

import { useMemo } from 'react'
import VentasCorreoDesplegable from '@/components/ventas/VentasCorreoDesplegable'

const MESES = [
    { value: '', label: 'Todos los meses' },
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
]

const ANIO_INICIO = 2026

function diasEnMes(anio, mes) {
    const y = Number(anio) || new Date().getFullYear()
    const m = Number(mes) || 1
    return new Date(y, m, 0).getDate()
}

export default function VentasCorreoHistorialFiltrosFecha({
    darkMode,
    anio,
    mes,
    dia,
    onAnioChange,
    onMesChange,
    onDiaChange,
}) {
    const anioActual = new Date().getFullYear()

    const opcionesAnio = useMemo(() => {
        const list = [{ value: '', label: 'Todos los años' }]
        const hasta = Math.max(anioActual, ANIO_INICIO)
        for (let y = hasta; y >= ANIO_INICIO; y--) {
            list.push({ value: String(y), label: String(y) })
        }
        return list
    }, [anioActual])

    const opcionesDia = useMemo(() => {
        const list = [{ value: '', label: 'Todos los días' }]
        if (!mes) return list
        const max = diasEnMes(anio || anioActual, mes)
        for (let d = 1; d <= max; d++) {
            list.push({ value: String(d), label: String(d) })
        }
        return list
    }, [anio, mes, anioActual])

    return (
        <div className="contents">
            <VentasCorreoDesplegable
                id="historial-filtro-anio"
                label="Año"
                value={anio}
                options={opcionesAnio}
                onChange={onAnioChange}
                darkMode={darkMode}
            />
            <VentasCorreoDesplegable
                id="historial-filtro-mes"
                label="Mes"
                value={mes}
                options={MESES}
                onChange={onMesChange}
                darkMode={darkMode}
            />
            <VentasCorreoDesplegable
                id="historial-filtro-dia"
                label="Día"
                value={dia}
                options={opcionesDia}
                onChange={onDiaChange}
                disabled={!mes}
                darkMode={darkMode}
            />
        </div>
    )
}
