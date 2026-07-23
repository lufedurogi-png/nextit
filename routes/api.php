<?php

use App\Http\Controllers\Api\V1\IaChatController;
use App\Http\Controllers\Api\V1\IaHealthController;
use App\Http\Middleware\VerifyIaApiToken;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/ia')->group(function () {
    Route::get('/health', [IaHealthController::class, 'show'])->name('ia.health');

    Route::middleware(VerifyIaApiToken::class)->group(function () {
        Route::post('/chat', [IaChatController::class, 'chat'])->name('ia.chat');
    });
});
