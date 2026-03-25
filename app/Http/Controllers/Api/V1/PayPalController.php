<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DatoFacturacion;
use App\Models\DireccionEnvio;
use App\Models\Pedido;
use App\Models\ProductoCva;
use App\Models\ProductoManual;
use App\Services\PayPalService;
use App\Services\ProductoStockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

class PayPalController extends Controller
{
    private const PAYPAL_CACHE_TTL_MINUTES = 120;

    public function __construct(
        private readonly PayPalService $paypal,
        private readonly ProductoStockService $productoStock,
    ) {}

    private static function cartCacheKey(int $userId): string
    {
        return 'carrito_index_'.$userId;
    }

    private function normalizePayPalCurrency(string $rawCurrency): string
    {
        $currency = strtoupper(trim($rawCurrency));
        if ($currency === '' || $currency === 'PESOS' || $currency === 'PESO' || $currency === 'MXN$') {
            return 'MXN';
        }
        if ($currency === 'DOLARES' || $currency === 'DOLAR' || $currency === 'USD$') {
            return 'USD';
        }

        return $currency;
    }

    /** Crea orden en PayPal a partir del carrito y devuelve URL de aprobación. */
    public function createOrder(Request $request): JsonResponse
    {
        if (! $this->paypal->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'PayPal no está configurado en el servidor.',
            ], 503);
        }

        $valid = $request->validate([
            'return_url' => 'required|string|max:2048',
            'cancel_url' => 'required|string|max:2048',
            'direccion_envio_id' => 'required|integer',
            'datos_facturacion_id' => 'required|integer',
        ]);

        foreach (['return_url' => $valid['return_url'], 'cancel_url' => $valid['cancel_url']] as $label => $u) {
            if (filter_var($u, FILTER_VALIDATE_URL) === false) {
                return response()->json([
                    'success' => false,
                    'message' => 'URL inválida ('.$label.').',
                ], 422);
            }
        }

        $user = Auth::user();

        $dir = DireccionEnvio::query()
            ->where('user_id', $user->id)
            ->where('id', $valid['direccion_envio_id'])
            ->first();
        if (! $dir) {
            return response()->json(['success' => false, 'message' => 'Dirección de envío no válida.'], 422);
        }

        $fac = DatoFacturacion::query()
            ->where('user_id', $user->id)
            ->where('id', $valid['datos_facturacion_id'])
            ->first();
        if (! $fac) {
            return response()->json(['success' => false, 'message' => 'Datos de facturación no válidos.'], 422);
        }

        $items = $user->carritoItems()->orderBy('updated_at', 'desc')->get();
        if ($items->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'El carrito está vacío.'], 422);
        }

        $currency = null;
        $lines = [];
        foreach ($items as $it) {
            $producto = str_starts_with($it->clave, 'MANUAL-')
                ? ProductoManual::query()->where('clave', $it->clave)->where('anulado', false)->first()
                : ProductoCva::query()->where('clave', $it->clave)->first();
            if (! $producto) {
                return response()->json(['success' => false, 'message' => 'Producto no encontrado: '.$it->clave], 422);
            }
            $moneda = $this->normalizePayPalCurrency((string) ($producto->moneda ?? ''));
            if ($currency === null) {
                $currency = $moneda;
            } elseif ($moneda !== $currency) {
                return response()->json([
                    'success' => false,
                    'message' => 'El carrito mezcla monedas; no se puede pagar con PayPal en un solo cobro.',
                ], 422);
            }

            $d = (int) ($producto->disponible ?? 0);
            $cd = (int) ($producto->disponible_cd ?? 0);
            $max = $this->productoStock->stockEfectivoTotal($it->clave, $d, $cd);
            if ((int) $it->cantidad > $max) {
                return response()->json([
                    'success' => false,
                    'message' => 'Stock insuficiente para '.$it->nombre_producto.' (máx. '.$max.').',
                ], 422);
            }

            $lines[] = [
                'clave' => $it->clave,
                'cantidad' => (int) $it->cantidad,
                'precio_unitario' => (float) $it->precio_unitario,
                'nombre_producto' => $it->nombre_producto,
            ];
        }

        $total = 0.0;
        foreach ($lines as $ln) {
            $total += $ln['cantidad'] * $ln['precio_unitario'];
        }
        $total = round($total, 2);
        $valueStr = number_format($total, 2, '.', '');

        $payload = [
            'intent' => 'CAPTURE',
            'purchase_units' => [[
                'reference_id' => 'default',
                'custom_id' => (string) $user->id,
                'amount' => [
                    'currency_code' => $currency,
                    'value' => $valueStr,
                ],
            ]],
            'application_context' => [
                'return_url' => $valid['return_url'],
                'cancel_url' => $valid['cancel_url'],
                'shipping_preference' => 'NO_SHIPPING',
                'user_action' => 'PAY_NOW',
                'brand_name' => (string) config('app.name', 'Tienda'),
            ],
        ];

        try {
            $res = $this->paypal->createOrder($payload);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 502);
        }

        $paypalOrderId = is_string($res['id'] ?? null) ? $res['id'] : null;
        if ($paypalOrderId === null || $paypalOrderId === '') {
            return response()->json(['success' => false, 'message' => 'PayPal no devolvió id de orden.'], 502);
        }

        $approveUrl = PayPalService::extractApproveUrl($res);
        if ($approveUrl === null || $approveUrl === '') {
            return response()->json(['success' => false, 'message' => 'PayPal no devolvió enlace de aprobación.'], 502);
        }

        $snapshot = [
            'user_id' => $user->id,
            'total' => $total,
            'currency' => $currency,
            'direccion_envio_id' => (int) $valid['direccion_envio_id'],
            'datos_facturacion_id' => (int) $valid['datos_facturacion_id'],
            'direccion_etiqueta' => trim($dir->nombre.' · '.$dir->calle.' '.$dir->numero_exterior.', '.$dir->colonia.', '.$dir->ciudad),
            'facturacion_etiqueta' => trim($fac->razon_social.' · RFC '.$fac->rfc),
            'items' => $lines,
        ];

        Cache::put(
            'paypal_order_'.$paypalOrderId,
            $snapshot,
            now()->addMinutes(self::PAYPAL_CACHE_TTL_MINUTES)
        );

        return response()->json([
            'success' => true,
            'data' => [
                'paypal_order_id' => $paypalOrderId,
                'approve_url' => $approveUrl,
            ],
        ]);
    }

    /** Captura pago y crea pedido + descuento de inventario vendido. */
    public function capture(Request $request): JsonResponse
    {
        if (! $this->paypal->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'PayPal no está configurado en el servidor.',
            ], 503);
        }

        $valid = $request->validate([
            'order_id' => 'required|string|max:80',
        ]);

        $user = Auth::user();
        $cacheKey = 'paypal_order_'.$valid['order_id'];
        $snapshot = Cache::get($cacheKey);
        if (! is_array($snapshot) || (int) ($snapshot['user_id'] ?? 0) !== (int) $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Orden de pago no encontrada o expirada. Vuelve a iniciar el pago.',
            ], 404);
        }

        try {
            $order = $this->paypal->getOrder($valid['order_id']);
            $status = strtoupper((string) ($order['status'] ?? ''));
            if ($status !== 'APPROVED' && $status !== 'COMPLETED') {
                return response()->json([
                    'success' => false,
                    'message' => 'La orden de PayPal no está aprobada todavía.',
                ], 422);
            }

            $cap = $this->paypal->captureOrder($valid['order_id']);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 502);
        }

        $captureStatus = '';
        $pus = $cap['purchase_units'] ?? [];
        if (is_array($pus) && $pus !== []) {
            $pu = $pus[0];
            if (is_array($pu)) {
                $caps = $pu['payments']['captures'] ?? [];
                if (is_array($caps) && $caps !== []) {
                    $c0 = $caps[0];
                    if (is_array($c0)) {
                        $captureStatus = strtoupper((string) ($c0['status'] ?? ''));
                    }
                }
            }
        }
        if ($captureStatus !== 'COMPLETED') {
            return response()->json([
                'success' => false,
                'message' => 'El cobro en PayPal no se completó.',
            ], 422);
        }

        $captured = PayPalService::capturedAmount($cap);
        if ($captured === null) {
            return response()->json(['success' => false, 'message' => 'No se pudo leer el monto capturado.'], 502);
        }

        if (strtoupper($captured['currency_code']) !== strtoupper((string) $snapshot['currency'])) {
            return response()->json(['success' => false, 'message' => 'Moneda del pago no coincide.'], 422);
        }

        $paid = round((float) $captured['value'], 2);
        $expected = round((float) ($snapshot['total'] ?? 0), 2);
        if (abs($paid - $expected) > 0.02) {
            return response()->json(['success' => false, 'message' => 'El monto pagado no coincide con el pedido.'], 422);
        }

        $captureId = PayPalService::captureId($cap) ?? $valid['order_id'];

        $itemsPayload = $snapshot['items'] ?? [];
        if (! is_array($itemsPayload) || $itemsPayload === []) {
            return response()->json(['success' => false, 'message' => 'Snapshot de carrito inválido.'], 500);
        }

        try {
            $pedido = DB::transaction(function () use ($user, $snapshot, $itemsPayload, $captureId) {
                foreach ($itemsPayload as $ln) {
                    if (! is_array($ln)) {
                        continue;
                    }
                    $clave = (string) ($ln['clave'] ?? '');
                    $cantidad = (int) ($ln['cantidad'] ?? 0);
                    $producto = str_starts_with($clave, 'MANUAL-')
                        ? ProductoManual::query()->where('clave', $clave)->where('anulado', false)->first()
                        : ProductoCva::query()->where('clave', $clave)->first();
                    if (! $producto) {
                        throw new \RuntimeException('Producto ya no existe: '.$clave);
                    }
                    $d = (int) ($producto->disponible ?? 0);
                    $cd = (int) ($producto->disponible_cd ?? 0);
                    $max = $this->productoStock->stockEfectivoTotal($clave, $d, $cd);
                    if ($cantidad > $max) {
                        throw new \RuntimeException('Stock insuficiente al confirmar el pago.');
                    }
                }

                $lastId = (int) Pedido::withTrashed()->max('id');
                $folio = str_pad((string) ($lastId + 1), 6, '0', STR_PAD_LEFT);

                $p = $user->pedidos()->create([
                    'folio' => $folio,
                    'fecha' => now()->toDateString(),
                    'monto' => 0,
                    'metodo_pago' => 'paypal',
                    'referencia_pago_externa' => $captureId,
                    'estado_pago' => 'pagado',
                    'estatus_pedido' => 'completado',
                    'direccion_envio_id' => (int) $snapshot['direccion_envio_id'],
                    'datos_facturacion_id' => (int) $snapshot['datos_facturacion_id'],
                ]);

                $monto = 0.0;
                foreach ($itemsPayload as $ln) {
                    if (! is_array($ln)) {
                        continue;
                    }
                    $clave = (string) ($ln['clave'] ?? '');
                    $cantidad = (int) ($ln['cantidad'] ?? 0);
                    $precio = (float) ($ln['precio_unitario'] ?? 0);
                    $nombre = (string) ($ln['nombre_producto'] ?? $clave);
                    $subtotal = round($cantidad * $precio, 2);
                    $p->items()->create([
                        'clave' => $clave,
                        'nombre_producto' => $nombre,
                        'cantidad' => $cantidad,
                        'precio_unitario' => $precio,
                        'subtotal' => $subtotal,
                    ]);
                    $monto += $subtotal;
                }

                $p->update(['monto' => round($monto, 2)]);

                $this->productoStock->registrarVentasConfirmadas($p->id, $itemsPayload);

                $user->carritoItems()->delete();
                Cache::forget(self::cartCacheKey($user->id));

                return $p;
            });
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        Cache::forget($cacheKey);

        return response()->json([
            'success' => true,
            'message' => 'Pago completado.',
            'data' => [
                'id' => $pedido->id,
                'folio' => $pedido->folio,
            ],
        ], 201);
    }
}
