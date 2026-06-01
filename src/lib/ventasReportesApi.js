'use client'

import axios from '@/lib/axios'

export async function fetchVentasReportesResumen(params = {}) {
    const { data } = await axios.get('/ventas/reportes/resumen', { params })
    return data?.data ?? null
}

