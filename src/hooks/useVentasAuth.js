import useSWR from 'swr'
import axios from '@/lib/axios'
import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const VENTAS_AUTH_PREFIX = '/ventas/auth/'

function isVentasUserPayload(userData) {
    if (!userData) return false
    if (userData.tipo === 3) return true
    if (Array.isArray(userData.roles) && userData.roles.includes('seller')) return true
    return false
}

export function useVentasAuth({ middleware, redirectIfAuthenticated } = {}) {
    const router = useRouter()

    const getUser = async () => {
        const token = localStorage.getItem('auth_token')
        if (!token) throw new Error('No token')

        try {
            const response = await axios.get('/auth/profile')
            const userData = response.data?.data || response.data?.user || response.data
            if (!isVentasUserPayload(userData)) {
                localStorage.removeItem('auth_token')
                localStorage.removeItem('auth_user')
                localStorage.removeItem('auth_ventas')
                throw new Error('No ventas')
            }
            localStorage.setItem('auth_user', JSON.stringify(userData))
            return userData
        } catch (error) {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_user')
            localStorage.removeItem('auth_ventas')
            throw error
        }
    }

    const { data: user, error, mutate } = useSWR(
        typeof window !== 'undefined' && localStorage.getItem('auth_token') && localStorage.getItem('auth_ventas') === 'true'
            ? 'ventas-session'
            : null,
        getUser,
        { revalidateOnFocus: false, revalidateOnReconnect: false }
    )

    const login = async ({ setErrors, setStatus, ...props }) => {
        setErrors?.([])
        setStatus?.(null)
        try {
            const response = await axios.post(`${VENTAS_AUTH_PREFIX}token`, {
                email: props.email,
                password: props.password,
            })
            if (response.data?.success && response.data?.token) {
                localStorage.removeItem('auth_admin')
                localStorage.setItem('auth_token', response.data.token)
                localStorage.setItem('auth_ventas', 'true')
                if (response.data?.data) {
                    localStorage.setItem('auth_user', JSON.stringify(response.data.data))
                } else if (response.data?.user) {
                    localStorage.setItem('auth_user', JSON.stringify(response.data.user))
                }
                await mutate()
                router.push(redirectIfAuthenticated || '/ventas-dashboard')
            } else {
                setErrors({
                    email: [response.data?.message || 'Solo vendedores pueden acceder al CRM de ventas.'],
                })
            }
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data?.errors || {})
            } else {
                setErrors({
                    email: [err.response?.data?.message || 'Credenciales incorrectas o sin rol de vendedor.'],
                })
            }
        }
    }

    const logout = useCallback(async () => {
        try {
            const token = localStorage.getItem('auth_token')
            if (token) {
                try {
                    await axios.post('/auth/revoke-tokens')
                } catch (_) {}
            }
        } catch (_) {}
        finally {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_user')
            localStorage.removeItem('auth_ventas')
            await mutate(null, false)
            if (typeof window !== 'undefined') {
                window.location.href = '/ventas-login'
            }
        }
    }, [mutate])

    useEffect(() => {
        if (middleware === 'guest' && redirectIfAuthenticated && user) {
            if (isVentasUserPayload(user)) router.push(redirectIfAuthenticated)
        }
        if (middleware === 'auth' && error) logout()
    }, [middleware, redirectIfAuthenticated, user, error, router, logout])

    return { user, login, logout }
}
