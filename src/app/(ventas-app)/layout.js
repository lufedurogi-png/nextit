'use client'

import { AdminThemeProvider } from '@/contexts/AdminThemeContext'
import VentasChrome from '@/components/ventas/VentasChrome'

export default function VentasAppLayout({ children }) {
    return (
        <AdminThemeProvider storageKey="ventas_dark_mode">
            <VentasChrome>{children}</VentasChrome>
        </AdminThemeProvider>
    )
}
