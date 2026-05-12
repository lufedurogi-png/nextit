import useSWR from 'swr'
import axios from '@/lib/axios'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { applyUiTheme, normalizeUiThemeId, persistUiThemeSideEffects } from '@/lib/uiThemes'

export const useAuth = ({ middleware, redirectIfAuthenticated } = {}) => {
    const router = useRouter()

    const getUser = async () => {
        const token = localStorage.getItem('auth_token')
        if (!token) {
            throw new Error('No token')
        }

        // Tema desde caché solo para evitar parpadeo mientras llega /auth/me (no devolver usuario en caché: quedaría desactualizado).
        const cachedUser = localStorage.getItem('auth_user')
        if (cachedUser) {
            try {
                const u = JSON.parse(cachedUser)
                if (u?.role !== 'admin' && u?.ui_theme != null) {
                    const tid = normalizeUiThemeId(u.ui_theme)
                    applyUiTheme(tid)
                    persistUiThemeSideEffects(tid)
                }
            } catch {
                // ignorar caché corrupto
            }
        }

        try {
            const response = await axios.get('/auth/me')
            const userData = response.data
            localStorage.setItem('auth_user', JSON.stringify(userData))
            if (userData?.role !== 'admin' && userData?.ui_theme != null) {
                const tid = normalizeUiThemeId(userData.ui_theme)
                applyUiTheme(tid)
                persistUiThemeSideEffects(tid)
            }
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

    const persistClientSession = async (token, u) => {
        if (u?.role === 'admin') {
            localStorage.setItem('auth_token', token)
            if (u) localStorage.setItem('auth_user', JSON.stringify(u))
            localStorage.setItem('auth_admin', 'true')
            await mutate()
            router.push('/admin-home')
            return true
        }
        localStorage.removeItem('auth_admin')
        localStorage.setItem('auth_token', token)
        if (u) {
            localStorage.setItem('auth_user', JSON.stringify(u))
            if (u?.ui_theme != null) {
                const tid = normalizeUiThemeId(u.ui_theme)
                applyUiTheme(tid)
                persistUiThemeSideEffects(tid)
            }
        }
        await mutate()
        router.push(redirectIfAuthenticated || '/inicio')
        return true
    }

    const registerWithGoogle = async ({ setErrors, credential }) => {
        setErrors([])

        try {
            const response = await axios.post('/auth/google/register', {
                credential,
                accepted_privacy: true,
            })

            if (response.data?.token) {
                await persistClientSession(response.data.token, response.data?.user)
                return
            }
            setErrors({
                general: [response.data?.message || 'Error al registrar con Google'],
            })
        } catch (error) {
            if (error.response?.status === 422) {
                const errors = error.response.data?.errors || {}
                setErrors(errors)
            } else {
                setErrors({
                    general: [error.response?.data?.message || 'Error al registrar con Google'],
                })
            }
        }
    }

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
                const u = response.data?.user
                await persistClientSession(response.data.token, u)
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
                const u = response.data?.user
                await persistClientSession(response.data.token, u)
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

    const loginWithGoogle = async ({ setErrors, credential, onRegistrationRequired }) => {
        setErrors([])

        try {
            const response = await axios.post('/auth/google/login', { credential })

            if (response.data?.token) {
                const u = response.data?.user
                await persistClientSession(response.data.token, u)
            } else {
                setErrors({
                    general: [response.data?.message || 'Error al iniciar sesión con Google'],
                })
            }
        } catch (error) {
            if (error.response?.status === 404 && error.response?.data?.code === 'REGISTRATION_REQUIRED') {
                onRegistrationRequired?.(error.response?.data?.message)
                return
            }
            if (error.response?.status === 422) {
                const errors = error.response.data?.errors || {}
                setErrors(errors)
            } else {
                setErrors({
                    general: [error.response?.data?.message || 'Error al iniciar sesión con Google'],
                })
            }
        }
    }

    const forgotPassword = async ({ setErrors, setStatus }) => {
        setErrors([])
        setStatus?.(null)
        setErrors({ email: ['Función no disponible con el backend actual.'] })
    }

    const resetPassword = async ({ setErrors, setStatus }) => {
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
        if (middleware === 'guest' && redirectIfAuthenticated && user) {
            if (user.role === 'admin') {
                try {
                    localStorage.setItem('auth_admin', 'true')
                } catch {
                    void 0
                }
                router.replace('/admin-home')
            } else {
                router.push(redirectIfAuthenticated)
            }
        }

        if (
            typeof window !== 'undefined' &&
            window.location.pathname === '/verify-email' &&
            user?.email_verified_at &&
            redirectIfAuthenticated
        )
            router.push(redirectIfAuthenticated)

        if (middleware === 'auth') {
            if (error) {
                logout()
                return
            }
            if (user?.role === 'admin') {
                try {
                    localStorage.setItem('auth_admin', 'true')
                } catch {
                    void 0
                }
                router.replace('/admin-home')
            }
        }
    }, [user, error, middleware, redirectIfAuthenticated, router])

    return {
        user,
        mutate,
        register,
        registerWithGoogle,
        login,
        loginWithGoogle,
        forgotPassword,
        resetPassword,
        resendEmailVerification,
        logout,
    }
}
