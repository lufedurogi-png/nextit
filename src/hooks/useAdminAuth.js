import useSWR from 'swr'
import axios from '@/lib/axios'
import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const useAdminAuth = ({ middleware, redirectIfAuthenticated } = {}) => {
    const router = useRouter()

    const getUser = async () => {
        const token = localStorage.getItem('auth_token')
        if (!token) throw new Error('No token')

        try {
            const response = await axios.get('/auth/me')
            const userData = response.data
            if (userData?.role !== 'admin') {
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
        setErrors({ general: ['El registro de administrador no está disponible en la API actual.'] })
    }

    const login = async ({ setErrors, setStatus, ...props }) => {
        setErrors?.([])
        setStatus?.(null)
        try {
            const response = await axios.post('/auth/admin-login', {
                email: props.email,
                password: props.password,
            })
            if (response.data?.token) {
                localStorage.removeItem('auth_ventas')
                localStorage.setItem('auth_token', response.data.token)
                localStorage.setItem('auth_admin', 'true')
                if (response.data?.user) {
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
                    await axios.post('/auth/logout')
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
            if (user?.role === 'admin') router.push(redirectIfAuthenticated)
        }
        if (middleware === 'auth' && error) logout()
    }, [middleware, redirectIfAuthenticated, user, error, router, logout])

    return { user, register, login, logout }
}
