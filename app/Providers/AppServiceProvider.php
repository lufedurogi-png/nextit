<?php

namespace App\Providers;

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
