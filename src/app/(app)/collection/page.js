'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LegacyCollectionRedirect() {
    const router = useRouter()
    useEffect(() => {
        router.replace('/mis-colecciones')
    }, [router])
    return null
}
