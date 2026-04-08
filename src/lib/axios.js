import Axios from 'axios'

const raw = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const baseURL = raw.endsWith('/api') ? raw : `${raw}/api`

const axios = Axios.create({
    baseURL,
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
})

axios.interceptors.request.use(
    config => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    error => Promise.reject(error)
)

axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            const path = typeof window !== 'undefined' ? window.location?.pathname : ''
            const isAdminPath = path.startsWith('/admin')
            const isVentasPath = path.startsWith('/ventas')
            if (typeof window !== 'undefined') {
                localStorage.removeItem('auth_token')
                localStorage.removeItem('auth_user')
                if (isAdminPath) localStorage.removeItem('auth_admin')
                if (isVentasPath) localStorage.removeItem('auth_ventas')
                if (isAdminPath) window.location.href = '/admin-login'
                else if (isVentasPath) window.location.href = '/ventas-login'
                else window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

export default axios
