import useSWR from 'swr'
import axios from '@/lib/axios'
import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ADMIN_AUTH_PREFIX = '/admin/'

function isAdminUserPayload(userData) {
    return !!(userData && (userData.tipo === 1 || userData.roles?.includes?.('admin')))
}

export const useAdminAuth = ({ middleware, redirectIfAuthenticated } = {}) => {
    const router = useRouter()

    const getUser = async () => {
        const token = localStorage.getItem('auth_token')
        if (!token) throw new Error('No token')

        try {
            const response = await axios.get('/auth/profile')
            const userData = response.data?.data || response.data?.user || response.data
            if (!isAdminUserPayload(userData)) {
                localStorage.removeItem('auth_token')
                localStorage.removeItem('auth_user')
                localStorage.removeItem('auth_admin')
                throw new Error('No admin')
            }
            localStorage.setItem('auth_user', JSON.stringify(userData))
            return userData
        } catch (error) {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_user')
            localStorage.removeItem('auth_admin')
            throw error
        }
    }

    const { data: user, error, mutate } = useSWR(
        typeof window !== 'undefined' && localStorage.getItem('auth_token') && localStorage.getItem('auth_admin')
            ? 'admin-session'
            : null,
        getUser,
        { revalidateOnFocus: false, revalidateOnReconnect: false }
    )

    const register = async ({ setErrors, ...props }) => {
        setErrors([])
        try {
            const response = await axios.post(ADMIN_AUTH_PREFIX + 'auth/register', {
                name: props.name,
                email: props.email,
                password: props.password,
                password_confirmation: props.password_confirmation,
            })
            if (response.data?.success && response.data?.token) {
                localStorage.removeItem('auth_ventas')
                localStorage.setItem('auth_token', response.data.token)
                localStorage.setItem('auth_admin', 'true')
                if (response.data?.data) {
                    localStorage.setItem('auth_user', JSON.stringify(response.data.data))
                } else if (response.data?.user) {
                    localStorage.setItem('auth_user', JSON.stringify(response.data.user))
                }
                await mutate()
                router.push(redirectIfAuthenticated || '/admin-home')
            } else {
                setErrors({ general: [response.data?.message || 'Error al registrar'] })
            }
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data?.errors || {})
            } else {
                setErrors({ general: [err.response?.data?.message || 'Error al registrar'] })
            }
        }
    }

    const login = async ({ setErrors, setStatus, ...props }) => {
        setErrors?.([])
        setStatus?.(null)
        try {
            const response = await axios.post(ADMIN_AUTH_PREFIX + 'auth/token', {
                email: props.email,
                password: props.password,
            })
            if (response.data?.success && response.data?.token) {
                localStorage.removeItem('auth_ventas')
                localStorage.setItem('auth_token', response.data.token)
                localStorage.setItem('auth_admin', 'true')
                if (response.data?.data) {
                    localStorage.setItem('auth_user', JSON.stringify(response.data.data))
                } else if (response.data?.user) {
                    localStorage.setItem('auth_user', JSON.stringify(response.data.user))
                }
                await mutate()
                router.push(redirectIfAuthenticated || '/admin-home')
            } else {
                setErrors({
                    email: [response.data?.message || 'Solo administradores pueden acceder'],
                })
            }
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data?.errors || {})
            } else {
                setErrors({
                    email: [err.response?.data?.message || 'Credenciales incorrectas o no tienes permisos de administrador'],
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
            localStorage.removeItem('auth_admin')
            await mutate(null, false)
            if (typeof window !== 'undefined') {
                window.location.href = '/admin-login'
            }
        }
    }, [mutate])

    useEffect(() => {
        if (middleware === 'guest' && redirectIfAuthenticated && user) {
            if (isAdminUserPayload(user)) router.push(redirectIfAuthenticated)
        }
        if (middleware === 'auth' && error) logout()
    }, [middleware, redirectIfAuthenticated, user, error, router, logout])

    return { user, register, login, logout }
}
