import useSWR from 'swr'
import axios from '@/lib/axios'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const useAuth = ({ middleware, redirectIfAuthenticated } = {}) => {
    const router = useRouter()

    const getUser = async () => {
        const token = localStorage.getItem('auth_token')
        if (!token) {
            throw new Error('No token')
        }

        const cachedUser = localStorage.getItem('auth_user')
        if (cachedUser) {
            try {
                return JSON.parse(cachedUser)
            } catch (e) {
                // continuar con API
            }
        }

        try {
            const response = await axios.get('/auth/me')
            const userData = response.data
            localStorage.setItem('auth_user', JSON.stringify(userData))
            return userData
        } catch (error) {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_user')
            throw error
        }
    }

    const { data: user, error, mutate } = useSWR(
        typeof window !== 'undefined' && localStorage.getItem('auth_token') ? '/auth/me' : null,
        getUser,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    )

    const register = async ({ setErrors, ...props }) => {
        setErrors([])

        try {
            const response = await axios.post('/auth/register', {
                name: props.name,
                email: props.email,
                password: props.password,
                password_confirmation: props.password_confirmation,
            })

            if (response.data?.token) {
                localStorage.removeItem('auth_admin')
                localStorage.setItem('auth_token', response.data.token)
                if (response.data?.user) {
                    localStorage.setItem('auth_user', JSON.stringify(response.data.user))
                }
                await mutate()
                router.push(redirectIfAuthenticated || '/dashboard')
            } else {
                setErrors({
                    general: [response.data?.message || 'Error al registrar usuario'],
                })
            }
        } catch (error) {
            if (error.response?.status === 422) {
                const errors = error.response.data?.errors || {}
                setErrors(errors)
            } else {
                setErrors({
                    general: [error.response?.data?.message || 'Error al registrar usuario'],
                })
            }
        }
    }

    const login = async ({ setErrors, setStatus, ...props }) => {
        setErrors([])
        setStatus?.(null)

        try {
            const response = await axios.post('/auth/login', {
                email: props.email,
                password: props.password,
            })

            if (response.data?.token) {
                localStorage.removeItem('auth_admin')
                localStorage.setItem('auth_token', response.data.token)
                if (response.data?.user) {
                    localStorage.setItem('auth_user', JSON.stringify(response.data.user))
                }
                await mutate()
                router.push(redirectIfAuthenticated || '/dashboard')
            } else {
                setErrors({
                    email: [response.data?.message || 'Las credenciales proporcionadas son incorrectas.'],
                })
            }
        } catch (error) {
            if (error.response?.status === 422) {
                const errors = error.response.data?.errors || {}
                setErrors(errors)
            } else if (error.response?.status === 401) {
                setErrors({
                    email: [error.response?.data?.message || 'Las credenciales proporcionadas son incorrectas.'],
                })
            } else {
                setErrors({
                    general: [error.response?.data?.message || 'Error al iniciar sesión'],
                })
            }
        }
    }

    const forgotPassword = async ({ setErrors, setStatus, email }) => {
        setErrors([])
        setStatus?.(null)
        setErrors({ email: ['Función no disponible con el backend actual.'] })
    }

    const resetPassword = async ({ setErrors, setStatus, ...props }) => {
        setErrors([])
        setStatus?.(null)
        setErrors({ general: ['Función no disponible con el backend actual.'] })
    }

    const resendEmailVerification = async ({ setStatus }) => {
        setStatus?.('Función no disponible con el backend actual.')
    }

    const logout = async () => {
        try {
            const token = localStorage.getItem('auth_token')
            if (token) {
                try {
                    await axios.post('/auth/logout')
                } catch (error) {
                    console.error('Error al cerrar sesión en servidor:', error)
                }
            }
        } catch (error) {
            console.error('Error en logout:', error)
        } finally {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_user')
            localStorage.removeItem('auth_admin')
            await mutate(null, false)
            if (typeof window !== 'undefined') {
                window.location.href = '/login'
            }
        }
    }

    useEffect(() => {
        if (middleware === 'guest' && redirectIfAuthenticated && user)
            router.push(redirectIfAuthenticated)

        if (
            typeof window !== 'undefined' &&
            window.location.pathname === '/verify-email' &&
            user?.email_verified_at
        )
            router.push(redirectIfAuthenticated)
        if (middleware === 'auth' && error) logout()
    }, [user, error])

    return {
        user,
        register,
        login,
        forgotPassword,
        resetPassword,
        resendEmailVerification,
        logout,
    }
}
