/**
 * Plan Pro Coleccionista vigente (fecha fin en el futuro).
 */
export function isProSubscriptionActive(user) {
    if (!user?.pro_subscription_ends_at) return false
    const end = new Date(user.pro_subscription_ends_at).getTime()
    if (Number.isNaN(end)) return false
    return end > Date.now()
}
