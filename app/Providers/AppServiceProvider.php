<?php

namespace App\Providers;

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
        //
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

        RateLimiter::for('public-catalog', function (Request $request) {
            return Limit::perMinute(120)->by(sha1('public-catalog|'.$request->ip()));
        });
    }
}
