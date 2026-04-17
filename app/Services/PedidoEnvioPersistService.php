<?php

namespace App\Services;

use App\Models\Pedido;
use App\Models\PedidoEnvio;
use App\Models\PedidoItem;
use App\Models\PedidoItemEnvio;

class PedidoEnvioPersistService
{
    /**
     * @param  array<string, mixed>|null  $envio  Bloque 'envio' del snapshot de pago (ver CarritoEnvioCotizacionService::cotizarParaUsuario).
     */
    public function persistirDesdeSnapshot(Pedido $pedido, ?array $envio): void
    {
        if ($envio === null || $envio === []) {
            return;
        }

        $pedido->loadMissing('items');

        $pe = PedidoEnvio::query()->create([
            'pedido_id' => $pedido->id,
            'subtotal_productos' => (float) ($envio['subtotal_productos'] ?? 0),
            'costo_envio' => (float) ($envio['costo_envio'] ?? 0),
            'moneda' => (string) ($envio['moneda'] ?? 'MXN'),
            'fecha_entrega_centro' => $envio['fecha_entrega_centro'] ?? null,
            'fecha_entrega_desde' => $envio['fecha_entrega_desde'] ?? null,
            'fecha_entrega_hasta' => $envio['fecha_entrega_hasta'] ?? null,
            'detalle_cotizacion' => $envio['detalle_cotizacion'] ?? null,
        ]);

        $porClave = $envio['costo_envio_por_clave'] ?? [];
        $lineas = $envio['lineas'] ?? [];

        /** @var \Illuminate\Support\Collection<int, PedidoItem> $items */
        $items = $pedido->items()->orderBy('id')->get();

        foreach ($items as $item) {
            $clave = (string) $item->clave;
            $linea = collect($lineas)->firstWhere('clave', $clave);
            $prorrateo = (float) ($porClave[$clave] ?? 0.0);
            $origen = is_array($linea) ? ($linea['origen'] ?? null) : null;
            $meta = is_array($linea) ? ($linea['meta_linea'] ?? null) : null;

            $cpOrigen = null;
            if (is_array($linea) && ! ($linea['es_manual'] ?? false)) {
                $metaOrigen = (string) ($meta['origen'] ?? '');
                if ($metaOrigen === 'CEDIS' || ($meta['desde_cedis'] ?? 0) > 0) {
                    $cpOrigen = (string) (int) config('envio.cva_cp_cedis_gdl', 45640);
                } elseif ($metaOrigen === 'Sucursal' || ($meta['desde_sucursal'] ?? 0) > 0) {
                    $cpOrigen = (string) (int) config('envio.cva_cp_sucursal_gdl', 44900);
                }
            }

            PedidoItemEnvio::query()->create([
                'pedido_item_id' => $item->id,
                'pedido_envio_id' => $pe->id,
                'almacen_origen_label' => $origen,
                'almacen_cp_origen' => $cpOrigen,
                'costo_envio_prorrateado' => round($prorrateo, 2),
                'meta_linea' => $meta,
            ]);
        }
    }
}
