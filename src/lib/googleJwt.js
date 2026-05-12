/**
 * Decodifica el payload de un JWT de Google (solo para vista previa en cliente).
 * La API valida la firma del token.
 */
export function decodeGoogleCredentialPreview(credential) {
    if (!credential || typeof credential !== 'string') return null
    try {
        const parts = credential.split('.')
        if (parts.length !== 3) return null
        const base64Url = parts[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
        const jsonPayload = decodeURIComponent(
            atob(padded)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        )
        const payload = JSON.parse(jsonPayload)
        return {
            email: typeof payload.email === 'string' ? payload.email : '',
            name: typeof payload.name === 'string' ? payload.name : '',
            picture: typeof payload.picture === 'string' ? payload.picture : null,
        }
    } catch {
        return null
    }
}
