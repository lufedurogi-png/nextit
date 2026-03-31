<?php

namespace App\Providers;

use App\Services\CatalogoStockPublicoService;
use App\Services\MargenVentaService;
use App\Services\ProductoSyncOrchestrator;
use App\Services\Providers\Cva\CvaSyncService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(MargenVentaService::class, function () {
            return new MargenVentaService;
        });

        $this->app->singleton(CatalogoStockPublicoService::class, function () {
            return new CatalogoStockPublicoService;
        });

        $this->app->singleton(ProductoSyncOrchestrator::class, function ($app) {
            return new ProductoSyncOrchestrator(
                proveedores: [
                    $app->make(CvaSyncService::class),
                    // Agregar más proveedores aquí: ExelSyncService, SyscomSyncService, etc.
                ],
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
