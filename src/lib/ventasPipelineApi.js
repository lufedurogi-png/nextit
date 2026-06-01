'use client'

import axios from '@/lib/axios'

export async function fetchVentasPipelineResumen(params = {}) {
    const { data } = await axios.get('/ventas/pipeline/resumen', { params })
    return data?.data ?? null
}

export async function fetchVentasPipelineList(params = {}) {
    const { data } = await axios.get('/ventas/pipeline', { params })
    return {
        items: data?.data ?? [],
        meta: data?.meta ?? { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    }
}

export async function updateVentasPipeline(id, payload) {
    const { data } = await axios.put(`/ventas/pipeline/${id}`, payload)
    return data?.data ?? null
}
