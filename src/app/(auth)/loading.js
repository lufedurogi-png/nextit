/** Carga de rutas de auth (login, register, etc.): barra superior. */
export default function LoadingAuth() {
    return (
        <div className="fixed inset-x-0 top-0 z-[9999] h-1 bg-gray-100 dark:bg-tienda-elevated">
            <div className="h-full bg-[#FF8000] animate-loading-bar" style={{ width: '40%' }} />
        </div>
    )
}
