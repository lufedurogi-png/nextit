<?php

use App\Jobs\ActualizarTipoCambioJob;
use App\Models\ClienteVentasMensaje;
use App\Models\ProductoCva;
use App\Models\ProductoManual;
use App\Services\CatalogoStockPublicoService;
use App\Services\CVAService;
use App\Services\DescuentoPrecioService;
use App\Support\CatalogStockCache;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('cva:sync', function () {
    $cva = app(CVAService::class);
    if (! $cva->isConfigured()) {
        $this->warn('CVA no está configurado (CVA_USER / CVA_PASSWORD en .env).');

        return 1;
    }
    $this->info('Sincronizando catálogo CVA...');
    $result = $cva->syncFullCatalog();
    if (! empty($result['error'])) {
        $this->error('Error: '.$result['error']);

        return 1;
    }
    $this->info('Sincronizados '.($result['synced'] ?? 0).' productos en '.($result['pages'] ?? 0).' páginas.');

    return 0;
})->purpose('Sincronizar catálogo de productos CVA a la base de datos');

Artisan::command('precios:sync-referencia', function () {
    $service = app(DescuentoPrecioService::class);
    $this->info('Sincronizando precios de referencia (snapshot cada 3 días)...');
    $result = $service->syncPreciosReferencia();
    $this->info('Actualizados '.($result['updated'] ?? 0).' precios de referencia.');

    return 0;
})->purpose('Copiar precios actuales de productos_cva a precios_referencia (ejecutar cada 3 días)');

Artisan::command('precios:comparar-descuentos', function () {
    $service = app(DescuentoPrecioService::class);
    $this->info('Comparando precios actuales con referencia (descuentos)...');
    $result = $service->compararPrecios();
    $this->info('Con descuento: '.($result['con_descuento'] ?? 0).', sin descuento actualizado: '.($result['sin_descuento'] ?? 0).'.');

    return 0;
})->purpose('Comparar precios cada 12 h y actualizar tabla producto_descuento');

Artisan::command('catalogo:sync-stock-publico', function () {
    $svc = app(CatalogoStockPublicoService::class);
    $n = 0;
    ProductoCva::query()->select(['clave', 'disponible', 'disponible_cd'])->orderBy('id')->chunkById(500, function ($rows) use ($svc, &$n) {
        foreach ($rows as $p) {
            $svc->sincronizarDesdeFuente($p->clave, (int) $p->disponible, (int) $p->disponible_cd, false);
            $n++;
        }
    });
    ProductoManual::query()->select(['clave', 'disponible', 'disponible_cd'])->where('anulado', false)->orderBy('id')->chunkById(200, function ($rows) use ($svc, &$n) {
        foreach ($rows as $p) {
            $svc->sincronizarDesdeFuente(
                $p->clave,
                (int) ($p->disponible ?? 0),
                (int) ($p->disponible_cd ?? 0),
                false
            );
            $n++;
        }
    });
    CatalogStockCache::bump();
    $this->info("Filas en catalogo_stock_publico actualizadas desde catálogo ({$n} claves).");

    return 0;
})->purpose('Rellenar/actualizar catalogo_stock_publico desde productos_cva y productos_manuales activos');

Artisan::command('tipo-cambio:actualizar', function () {
    $this->info('Actualizando tipo de cambio USD → MXN...');
    ActualizarTipoCambioJob::dispatchSync();
    $this->info('Tipo de cambio actualizado.');

    return 0;
})->purpose('Obtener tipo de cambio actual de la API y guardarlo en BD (también se ejecuta diariamente a las 06:30)');

// CVA sync cada 5 min (token se renueva solo)
Schedule::command('cva:sync')->everyFiveMinutes();

// Precios de referencia: actualizar cada 3 días (a las 02:00)
Schedule::command('precios:sync-referencia')->cron('0 2 */3 * *');

// Comparación de descuentos: cada 12 horas (06:00 y 18:00)
Schedule::command('precios:comparar-descuentos')->twiceDaily(6, 18);

// Tipo de cambio USD → MXN: actualizar diariamente a las 06:30
Schedule::job(new ActualizarTipoCambioJob)->dailyAt('06:30');

Artisan::command('chat:diagnostico', function () {
    $this->info('Chat administración (cliente_ventas_mensajes): '.ClienteVentasMensaje::count().' mensajes');
    $this->info('Chat vendedor (cliente_vendedor_mensajes): '.(\App\Models\ClienteVendedorMensaje::count()).' mensajes');

    $this->newLine();
    $this->info('Últimos 3 mensajes admin:');
    ClienteVentasMensaje::query()
        ->orderByDesc('id')
        ->limit(3)
        ->get(['id', 'user_id', 'sender_type', 'body', 'created_at'])
        ->each(function ($m) {
            $this->line("#{$m->id} user={$m->user_id} from={$m->sender_type} «".mb_substr($m->body, 0, 40).'»');
        });

    $this->newLine();
    $this->info('Últimos 3 mensajes vendedor:');
    \App\Models\ClienteVendedorMensaje::query()
        ->orderByDesc('id')
        ->limit(3)
        ->get(['id', 'user_id', 'sender_type', 'body', 'created_at'])
        ->each(function ($m) {
            $this->line("#{$m->id} user={$m->user_id} from={$m->sender_type} «".mb_substr($m->body, 0, 40).'»');
        });

    return 0;
})->purpose('Diagnóstico de chats cliente (admin vs vendedor)');
