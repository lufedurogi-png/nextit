'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/auth'
import { isClienteUser } from '@/lib/clientAuth'

const LoginLinks = () => {
    const { user } = useAuth({ middleware: 'guest' })

    return (
        <div className="hidden fixed top-0 right-0 px-6 py-4 sm:block">
            {isClienteUser(user) ? (
                <Link
                    href="/inicio"
                    className="ml-4 text-sm text-gray-700 underline"
                >
                    Inicio
                </Link>
            ) : (
                <>
                    <Link
                        href="/login"
                        className="text-sm text-gray-700 underline"
                    >
                        Login
                    </Link>

                    <Link
                        href="/register"
                        className="ml-4 text-sm text-gray-700 underline"
                    >
                        Register
                    </Link>
                </>
            )}
        </div>
    )
}

export default LoginLinks
