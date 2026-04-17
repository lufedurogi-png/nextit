<?php

namespace App\Services;

use App\Models\DireccionEnvio;
use App\Models\ProductoCva;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Cotiza envío del carrito (CVA flete) según CP destino y stock CEDIS vs sucursal en catálogo local.
 * Si CVA_FLETE_URL no está configurado, devuelve envío 0 y marca detalle como omitido.
 */
class CarritoEnvioCotizacionService
{
    public function cotizarParaUsuario(User $user, DireccionEnvio $direccion): array
    {
        $cpDestino = preg_replace('/\D/', '', (string) ($direccion->codigo_postal ?? ''));
        if (strlen($cpDestino) !== 5) {
            throw new \InvalidArgumentException('El código postal de la dirección de envío debe tener 5 dígitos.');
        }

        $items = $user->carritoItems()->orderBy('updated_at', 'desc')->get();
        if ($items->isEmpty()) {
            throw new \InvalidArgumentException('El carrito está vacío.');
        }

        $paqueteria = (int) config('envio.cva_paqueteria_id', 4);
        $cpCedis = (int) config('envio.cva_cp_cedis_gdl', 45640);
        $cpSucursal = (int) config('envio.cva_cp_sucursal_gdl', 44900);

        $subtotalProductos = 0.0;
        $productosCedis = [];
        $productosSucursal = [];
        $detalleDistribucion = [];
        $lineas = [];

        foreach ($items as $it) {
            $clave = (string) $it->clave;
            $cantidad = (int) $it->cantidad;
            $precioUnit = (float) $it->precio_unitario;
            $subLine = round($cantidad * $precioUnit, 2);
            $subtotalProductos += $subLine;

            $esManual = str_starts_with($clave, 'MANUAL-');
            if ($esManual) {
                $lineas[] = [
                    'clave' => $clave,
                    'cantidad' => $cantidad,
                    'subtotal' => $subLine,
                    'es_manual' => true,
                    'origen' => null,
                    'meta_linea' => ['nota' => 'Producto manual: sin cotización CVA de flete'],
                ];
                $detalleDistribucion[] = [
                    'clave' => $clave,
                    'cantidad_solicitada' => $cantidad,
                    'desde_cedis' => 0,
                    'desde_sucursal' => 0,
                    'origen' => 'Manual',
                ];

                continue;
            }

            $producto = ProductoCva::query()->where('clave', $clave)->first();
            if (! $producto) {
                throw new \InvalidArgumentException('Producto no encontrado: '.$clave);
            }

            $stockCedis = (int) ($producto->disponible_cd ?? 0);
            $stockSucursal = (int) ($producto->disponible ?? 0);
            $stockTotal = $stockCedis + $stockSucursal;

            if ($stockTotal < $cantidad) {
                throw new \InvalidArgumentException(
                    'Stock total insuficiente para '.$clave.' (solicitado: '.$cantidad.', disponible: '.$stockTotal.').'
                );
            }

            $origenLabel = null;
            $meta = [];

            if ($stockCedis >= $cantidad) {
                $productosCedis[] = ['clave' => $clave, 'cantidad' => $cantidad];
                $origenLabel = 'CEDIS Guadalajara';
                $meta = ['desde_cedis' => $cantidad, 'desde_sucursal' => 0, 'origen' => 'CEDIS'];
                $detalleDistribucion[] = [
                    'clave' => $clave,
                    'cantidad_solicitada' => $cantidad,
                    'desde_cedis' => $cantidad,
                    'desde_sucursal' => 0,
                    'origen' => 'CEDIS',
                ];
            } elseif ($stockSucursal >= $cantidad) {
                $productosSucursal[] = ['clave' => $clave, 'cantidad' => $cantidad];
                $origenLabel = 'Sucursal Guadalajara';
                $meta = ['desde_cedis' => 0, 'desde_sucursal' => $cantidad, 'origen' => 'Sucursal'];
                $detalleDistribucion[] = [
                    'clave' => $clave,
                    'cantidad_solicitada' => $cantidad,
                    'desde_cedis' => 0,
                    'desde_sucursal' => $cantidad,
                    'origen' => 'Sucursal',
                ];
            } else {
                $desdeCedis = $stockCedis;
                $desdeSuc = $cantidad - $stockCedis;
                if ($desdeCedis > 0) {
                    $productosCedis[] = ['clave' => $clave, 'cantidad' => $desdeCedis];
                }
                if ($desdeSuc > 0) {
                    $productosSucursal[] = ['clave' => $clave, 'cantidad' => $desdeSuc];
                }
                $origenLabel = 'CEDIS + Sucursal';
                $meta = ['desde_cedis' => $desdeCedis, 'desde_sucursal' => $desdeSuc, 'origen' => 'Ambos (distribuido)'];
                $detalleDistribucion[] = [
                    'clave' => $clave,
                    'cantidad_solicitada' => $cantidad,
                    'desde_cedis' => $desdeCedis,
                    'desde_sucursal' => $desdeSuc,
                    'origen' => 'Ambos (distribuido)',
                ];
            }

            $lineas[] = [
                'clave' => $clave,
                'cantidad' => $cantidad,
                'subtotal' => $subLine,
                'es_manual' => false,
                'origen' => $origenLabel,
                'meta_linea' => $meta,
            ];
        }

        $fleteUrl = trim((string) config('services.cva.flete_url', ''));
        $envios = [];
        $totalesCot = ['subtotal' => 0.0, 'iva' => 0.0, 'monto_total' => 0.0];

        if ($fleteUrl === '') {
            $detalleApi = [
                'omitido' => true,
                'motivo' => 'CVA_FLETE_URL no configurado en el servidor.',
                'cp_destino' => (int) $cpDestino,
                'distribucion_productos' => $detalleDistribucion,
            ];
        } else {
            if (! empty($productosCedis)) {
                $respuesta = $this->postCotizarFlete($fleteUrl, [
                    'paqueteria' => $paqueteria,
                    'cp' => (int) $cpDestino,
                    'cp_sucursal' => $cpCedis,
                    'productos' => $productosCedis,
                ]);
                $cot = $this->normalizarArregloCotizacion($respuesta);
                $t = $this->leerTotalesCotizacionCva($cot);
                $envios['cedis'] = [
                    'origen' => 'CEDIS Guadalajara',
                    'cp_origen' => $cpCedis,
                    'productos' => $productosCedis,
                    'subtotal' => $t['subtotal'],
                    'iva' => $t['iva'],
                    'monto_total' => $t['monto_total'],
                ];
                $totalesCot['subtotal'] += $t['subtotal'];
                $totalesCot['iva'] += $t['iva'];
                $totalesCot['monto_total'] += $t['monto_total'];
            }

            if (! empty($productosSucursal)) {
                $respuesta = $this->postCotizarFlete($fleteUrl, [
                    'paqueteria' => $paqueteria,
                    'cp' => (int) $cpDestino,
                    'cp_sucursal' => $cpSucursal,
                    'productos' => $productosSucursal,
                ]);
                $cot = $this->normalizarArregloCotizacion($respuesta);
                $t = $this->leerTotalesCotizacionCva($cot);
                $envios['sucursal'] = [
                    'origen' => 'Sucursal Guadalajara',
                    'cp_origen' => $cpSucursal,
                    'productos' => $productosSucursal,
                    'subtotal' => $t['subtotal'],
                    'iva' => $t['iva'],
                    'monto_total' => $t['monto_total'],
                ];
                $totalesCot['subtotal'] += $t['subtotal'];
                $totalesCot['iva'] += $t['iva'];
                $totalesCot['monto_total'] += $t['monto_total'];
            }

            $detalleApi = [
                'omitido' => false,
                'cp_destino' => (int) $cpDestino,
                'envios' => $envios,
                'totales' => [
                    'subtotal' => round($totalesCot['subtotal'], 2),
                    'iva' => round($totalesCot['iva'], 2),
                    'monto_total' => round($totalesCot['monto_total'], 2),
                ],
                'requiere_envios_multiples' => count($envios) > 1,
                'distribucion_productos' => $detalleDistribucion,
            ];
        }

        $costoEnvio = $fleteUrl === '' ? 0.0 : round((float) ($totalesCot['monto_total'] ?? 0), 2);
        $subtotalProductos = round($subtotalProductos, 2);
        $total = round($subtotalProductos + $costoEnvio, 2);

        $avisoEnvio = null;
        if ($fleteUrl === '') {
            $avisoEnvio = 'No está configurada CVA_FLETE_URL en el servidor: el envío se muestra en $0.00. Las fechas de entrega son solo una estimación (días configurados), no vienen de la paquetería.';
        } elseif ($costoEnvio <= 0 && (! empty($productosCedis) || ! empty($productosSucursal))) {
            $avisoEnvio = 'La API de flete respondió con monto $0 o no se pudo leer el total. Revisa el formato de respuesta CVA (cotización) o la ruta CVA_FLETE_URL.';
        }

        $minD = max(1, (int) config('envio.dias_entrega_min', 3));
        $maxD = max($minD, (int) config('envio.dias_entrega_max', 7));
        $base = CarbonImmutable::now()->startOfDay();
        $fechaDesde = $base->addDays($minD);
        $fechaHasta = $base->addDays($maxD);
        $centroD = (int) round(($minD + $maxD) / 2);
        $fechaCentro = $base->addDays($centroD);

        $prorrateos = $this->prorratearEnvioPorLineas($lineas, $costoEnvio);

        return [
            'subtotal_productos' => $subtotalProductos,
            'costo_envio' => $costoEnvio,
            'total' => $total,
            'moneda' => 'MXN',
            'fecha_entrega_centro' => $fechaCentro->toDateString(),
            'fecha_entrega_desde' => $fechaDesde->toDateString(),
            'fecha_entrega_hasta' => $fechaHasta->toDateString(),
            'detalle_cotizacion' => $detalleApi,
            'lineas' => $lineas,
            'costo_envio_por_clave' => $prorrateos,
            'usa_api_flete_cva' => $fleteUrl !== '',
            'aviso_envio' => $avisoEnvio,
        ];
    }

    /**
     * Algunas respuestas envían la cotización en la raíz; otras bajo "cotizacion".
     *
     * @return array<string, mixed>
     */
    private function normalizarArregloCotizacion(array $respuesta): array
    {
        if (isset($respuesta['cotizacion']) && is_array($respuesta['cotizacion'])) {
            return $respuesta['cotizacion'];
        }
        $keys = ['montoTotal', 'monto_total', 'subtotal', 'iva'];
        foreach ($keys as $k) {
            if (array_key_exists($k, $respuesta)) {
                return $respuesta;
            }
        }

        return [];
    }

    /**
     * @param  array<string, mixed>  $cot
     * @return array{subtotal: float, iva: float, monto_total: float}
     */
    private function leerTotalesCotizacionCva(array $cot): array
    {
        $monto = (float) ($cot['montoTotal'] ?? $cot['monto_total'] ?? $cot['total'] ?? $cot['montoTotalConIva'] ?? 0);

        return [
            'subtotal' => (float) ($cot['subtotal'] ?? $cot['subTotal'] ?? 0),
            'iva' => (float) ($cot['iva'] ?? $cot['IVA'] ?? 0),
            'monto_total' => $monto,
        ];
    }

    /**
     * @param  array<int, array{clave: string, cantidad: int, subtotal: float, es_manual: bool, origen: ?string, meta_linea: array}>  $lineas
     * @return array<string, float>  costo prorrateado por clave (suma por línea si misma clave repetida — no debería ocurrir en carrito)
     */
    private function prorratearEnvioPorLineas(array $lineas, float $costoEnvio): array
    {
        $cvaSubtotal = 0.0;
        foreach ($lineas as $ln) {
            if (! ($ln['es_manual'] ?? true)) {
                $cvaSubtotal += (float) ($ln['subtotal'] ?? 0);
            }
        }
        $out = [];
        if ($costoEnvio <= 0 || $cvaSubtotal <= 0) {
            foreach ($lineas as $ln) {
                $out[$ln['clave']] = 0.0;
            }

            return $out;
        }

        $nonManual = array_values(array_filter($lineas, fn ($ln) => ! ($ln['es_manual'] ?? true)));
        $acc = 0.0;
        $lastIdx = count($nonManual) - 1;
        foreach ($nonManual as $idx => $ln) {
            $clave = $ln['clave'];
            $w = (float) $ln['subtotal'] / $cvaSubtotal;
            if ($idx === $lastIdx) {
                $part = round($costoEnvio - $acc, 2);
            } else {
                $part = round($costoEnvio * $w, 2);
                $acc += $part;
            }
            $out[$clave] = ($out[$clave] ?? 0) + $part;
        }
        foreach ($lineas as $ln) {
            if ($ln['es_manual'] ?? false) {
                $out[$ln['clave']] = 0.0;
            }
        }

        return $out;
    }

    /**
     * Respuesta CVA: result "success", o numérico distinto de 0 en integraciones antiguas.
     */
    private function esResultadoErrorCotizacionFlete(mixed $result): bool
    {
        if ($result === null) {
            return false;
        }
        if ($result === 'success' || $result === true) {
            return false;
        }
        if (is_int($result) || is_float($result)) {
            return (int) $result === 0;
        }
        if (is_string($result)) {
            $lower = strtolower($result);

            return $lower === 'failed' || $lower === 'error' || $result === '0';
        }

        return false;
    }

    private function postCotizarFlete(string $url, array $payload): array
    {
        try {
            $response = Http::withHeaders(['Content-Type' => 'application/json'])
                ->timeout(25)
                ->post($url, $payload);
            $json = $response->json();
            // CVA devuelve result: "success" | "failed" (no usar (int) sobre strings: (int)"success" === 0 en PHP).
            $result = is_array($json) ? ($json['result'] ?? null) : null;
            if ($this->esResultadoErrorCotizacionFlete($result)) {
                $msg = (string) ($json['mensaje'] ?? $json['message'] ?? 'Error en cotización de flete CVA');
                throw new \RuntimeException($msg);
            }
            if ($response->failed()) {
                throw new \RuntimeException('Error HTTP al cotizar flete con CVA.');
            }

            return is_array($json) ? $json : [];
        } catch (\Throwable $e) {
            Log::warning('[CarritoEnvioCotizacion] Fallo cotización flete', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
