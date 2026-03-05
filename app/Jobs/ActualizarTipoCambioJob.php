<?php

namespace App\Jobs;

use App\Models\TipoCambioMoneda;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ActualizarTipoCambioJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private readonly float $porcentajeMargen = 2.00
    ) {}

    public function handle(): void
    {
        $apiKey = config('services.exchangerate.key');
        $urlBase = config('services.exchangerate.url');

        if (empty($apiKey) || empty($urlBase)) {
            Log::warning('ActualizarTipoCambioJob: faltan credenciales (EXCHANGERATE_API_URL, EXCHANGERATE_API_KEY)');

            return;
        }

        $url = rtrim($urlBase, '/').'/'.$apiKey.'/latest/USD';

        try {
            $respuesta = Http::timeout(10)->get($url);

            if (! $respuesta->successful()) {
                Log::warning('ActualizarTipoCambioJob: respuesta no exitosa', [
                    'status' => $respuesta->status(),
                ]);

                return;
            }

            $valorMxn = (float) $respuesta->json('conversion_rates.MXN');

            if ($valorMxn <= 0) {
                Log::warning('ActualizarTipoCambioJob: valor MXN inválido');

                return;
            }

            $tipoCambio = TipoCambioMoneda::create([
                'moneda_origen' => 'USD',
                'moneda_destino' => 'MXN',
                'porcentaje_margen' => $this->porcentajeMargen,
                'valor_api' => $valorMxn,
            ]);

            Cache::put('tipo_cambio_mxn', $tipoCambio->valor_final, now()->addHours(24));

            Log::info('Tipo de cambio actualizado', [
                'valor_api' => $valorMxn,
                'valor_final' => $tipoCambio->valor_final,
            ]);
        } catch (\Exception $e) {
            Log::error('ActualizarTipoCambioJob: '.$e->getMessage());
        }
    }
}
