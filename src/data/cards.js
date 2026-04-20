/**
 * Catálogo plano para escaneo: números alineados con worldCupDashboardData.
 */
import { WORLD_CUP_DASHBOARD_DATA } from '@/data/worldCupDashboardData'

function flattenCards() {
    const out = []
    for (const g of WORLD_CUP_DASHBOARD_DATA) {
        for (const t of g.teams) {
            for (const c of t.cards) {
                out.push({
                    number: c.id,
                    key: c.key,
                    imageUrl: c.imageUrl,
                })
            }
        }
    }
    return out.sort((a, b) => a.number - b.number)
}

export const CARDS = flattenCards()
