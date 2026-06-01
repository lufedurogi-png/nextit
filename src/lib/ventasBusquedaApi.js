'use client'

import axios from '@/lib/axios'

export async function fetchVentasBusqueda(q) {
    const { data } = await axios.get('/ventas/busqueda', { params: { q } })
    return data?.data ?? []
}
