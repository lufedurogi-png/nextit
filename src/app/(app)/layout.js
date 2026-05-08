'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth'
import Loading from '@/app/(app)/Loading'
import ColeccionadorShell from '@/components/coleccionador/ColeccionadorShell'

const AppLayout = ({ children }) => {
    const router = useRouter()
    const { user } = useAuth({ middleware: 'auth' })
    const [checkedSession, setCheckedSession] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined') return
        const hasToken = !!localStorage.getItem('auth_token')
        if (!hasToken) {
            router.replace('/login')
            return
        }
        setCheckedSession(true)
    }, [router])

    useEffect(() => {
        if (!user || user.role !== 'admin') return
        try {
            localStorage.setItem('auth_admin', 'true')
        } catch {
            void 0
        }
        router.replace('/admin-home')
    }, [user, router])

    if (!checkedSession || !user) {
        return <Loading />
    }

    if (user.role === 'admin') {
        return <Loading />
    }

    return <ColeccionadorShell>{children}</ColeccionadorShell>
}

export default AppLayout
