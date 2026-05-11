/** Carga del dashboard: barra superior + esqueleto de panel. */
export default function LoadingDashboard() {
    return (
        <>
            <div className="fixed inset-x-0 top-0 z-[9999] h-1 bg-gray-100 dark:bg-tienda-elevated">
                <div className="h-full bg-[#FF8000] animate-loading-bar" style={{ width: '40%' }} />
            </div>
            <div className="min-h-screen bg-gray-50 dark:bg-tienda-canvas flex">
                <div className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-tienda-elevated animate-pulse" />
                <div className="flex-1 p-8">
                    <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-8" />
                    <div className="h-64 bg-white dark:bg-tienda-elevated rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse" />
                </div>
            </div>
        </>
    )
}
