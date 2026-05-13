import axios from '@/lib/axios'

/**
 * Promoción pública (productos en orden).
 * @returns {Promise<{ titulo: string, descripcion: string|null, slug: string, productos: array }|null>}
 */
export async function getPromocionPublica(slug) {
    try {
        const { data } = await axios.get(`/promociones/${encodeURIComponent(slug)}`)
        if (data?.success && data?.data) return data.data
    } catch (e) {
        if (e.response?.status === 404) return null
        throw e
    }
    return null
}
