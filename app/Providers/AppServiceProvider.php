<?php

namespace App\Providers;

use App\Services\CatalogoStockPublicoService;
use App\Services\MargenVentaService;
use App\Services\ProductoSyncOrchestrator;
use App\Services\Providers\Cva\CvaSyncService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
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
        RateLimiter::for('auth-credentials', function (Request $request) {
            $email = strtolower((string) $request->input('email', ''));
            $byCredential = $email !== '' ? $email.'|'.$request->ip() : 'ip:'.$request->ip();

            return [
                Limit::perMinute(7)->by(sha1($byCredential)),
                Limit::perMinute(35)->by(sha1('auth-ip|'.$request->ip())),
            ];
        });

        RateLimiter::for('public-search', function (Request $request) {
            return Limit::perMinute(90)->by(sha1('public-search|'.$request->ip()));
        });

        RateLimiter::for('anonymous-tracking', function (Request $request) {
            return Limit::perMinute(45)->by(sha1('anon-track|'.$request->ip()));
        });
    }
}
