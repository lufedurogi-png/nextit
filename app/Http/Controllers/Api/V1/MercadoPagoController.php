<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DatoFacturacion;
use App\Models\DireccionEnvio;
use App\Models\MercadoPagoPreferenceSnapshot;
use App\Models\Pedido;
use App\Models\ProductoCva;
use App\Models\ProductoManual;
use App\Models\User;
use App\Services\MercadoPagoService;
use App\Services\ProductoStockService;
use App\Support\DocumentoNumeracion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class MercadoPagoController extends Controller
{
    private const SNAPSHOT_TTL_MINUTES = 120;

    public function __construct(
        private readonly MercadoPagoService $mercadopago,
        private readonly ProductoStockService $productoStock,
    ) {}

    private static function cartCacheKey(int $userId): string
    {
        return 'carrito_index_'.$userId;
    }

    private function normalizeCurrency(string $rawCurrency): string
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

    /**
     * Con `auto_return`, Mercado Pago valida la URL de éxito: HTTP o localhost suelen provocar
     * 400 `invalid_auto_return` / `back_url.success must be defined`.
     */
    private static function canUseMercadoPagoAutoReturn(string $successUrl): bool
    {
        if (filter_var($successUrl, FILTER_VALIDATE_URL) === false) {
            return false;
        }

        $lower = strtolower($successUrl);

        if (! str_starts_with($lower, 'https://')) {
            return false;
        }

        return ! str_contains($lower, 'localhost')
            && ! str_contains($lower, '127.0.0.1');
    }

    /**
     * Mercado Pago rechaza notification_url con localhost, HTTP o IP no públicas.
     * En local: omitir o definir MERCADOPAGO_NOTIFICATION_URL (HTTPS público, ej. ngrok).
     */
    private static function mercadoPagoNotificationUrlForPreference(): ?string
    {
        $explicit = trim((string) config('services.mercadopago.notification_url', ''));
        if ($explicit !== '' && filter_var($explicit, FILTER_VALIDATE_URL)) {
            $e = strtolower($explicit);

            return str_starts_with($e, 'https://') ? $explicit : null;
        }

        $base = rtrim((string) config('app.url'), '/');
        if ($base === '') {
            return null;
        }

        $full = $base.'/api/v1/mercadopago/webhook';
        if (filter_var($full, FILTER_VALIDATE_URL) === false) {
            return null;
        }

        $lower = strtolower($full);
        if (! str_starts_with($lower, 'https://')) {
            return null;
        }

        $host = parse_url($full, PHP_URL_HOST);
        if (! is_string($host) || $host === '') {
            return null;
        }

        $hostLower = strtolower($host);
        if ($hostLower === 'localhost'
            || $hostLower === '127.0.0.1'
            || str_starts_with($hostLower, '192.168.')
            || str_starts_with($hostLower, '10.')
        ) {
            return null;
        }

        // 172.16.0.0 – 172.31.255.255
        if (preg_match('/^172\.(1[6-9]|2[0-9]|3[0-1])\./', $hostLower) === 1) {
            return null;
        }

        return $full;
    }

    /** Preferencia Checkout Pro + snapshot (mismo criterio que PayPal createOrder). */
    public function createPreference(Request $request): JsonResponse
    {
        if (! $this->mercadopago->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'Mercado Pago no está configurado en el servidor.',
            ], 503);
        }

        $valid = $request->validate([
            'back_urls' => 'required|array',
            'back_urls.success' => 'required|string|max:2048',
            'back_urls.failure' => 'required|string|max:2048',
            'back_urls.pending' => 'required|string|max:2048',
            'direccion_envio_id' => 'required|integer',
            'datos_facturacion_id' => 'required|integer',
        ]);

        foreach (['success' => $valid['back_urls']['success'], 'failure' => $valid['back_urls']['failure'], 'pending' => $valid['back_urls']['pending']] as $label => $u) {
            if (filter_var($u, FILTER_VALIDATE_URL) === false) {
                return response()->json([
                    'success' => false,
                    'message' => 'URL inválida (back_urls.'.$label.').',
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
            $moneda = $this->normalizeCurrency((string) ($producto->moneda ?? ''));
            if ($currency === null) {
                $currency = $moneda;
            } elseif ($moneda !== $currency) {
                return response()->json([
                    'success' => false,
                    'message' => 'El carrito mezcla monedas; no se puede pagar con Mercado Pago en un solo cobro.',
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

        $notificationUrl = self::mercadoPagoNotificationUrlForPreference();

        $payerEmail = trim((string) ($user->email ?? ''));

        $preferenceBody = [
            'items' => [[
                'title' => substr((string) config('app.name', 'Tienda').' — pedido', 0, 256),
                'quantity' => 1,
                'currency_id' => $currency,
                'unit_price' => (float) $total,
            ]],
            'back_urls' => [
                'success' => $valid['back_urls']['success'],
                'failure' => $valid['back_urls']['failure'],
                'pending' => $valid['back_urls']['pending'],
            ],
            'external_reference' => 'cart_user_'.$user->id.'_'.uniqid('', true),
            'statement_descriptor' => substr(preg_replace('/[^a-zA-Z0-9 ]/', '', (string) config('app.name', 'Tienda')), 0, 22),
        ];

        if ($notificationUrl !== null) {
            $preferenceBody['notification_url'] = $notificationUrl;
        }

        // En TEST- no enviar email del usuario Laravel: en sandbox el pagador es la cuenta MP de prueba
        // (login TESTUSER…); si mezclamos correo "real" con sesión de prueba, MP suele responder "parte de prueba".
        if ($payerEmail !== '' && ! $this->mercadopago->isTestCredentials()) {
            $preferenceBody['payer'] = ['email' => $payerEmail];
        }

        if (self::canUseMercadoPagoAutoReturn((string) $valid['back_urls']['success'])) {
            $preferenceBody['auto_return'] = 'approved';
        }

        // En sandbox, SPEI/transferencias/tickets y "Dinero en cuenta" suelen terminar en /fatal/ con "parte de prueba".
        // MP no permite excluir account_money por API (doc oficial). Tarjeta de prueba es el flujo estable.
        if ($this->mercadopago->isTestCredentials()) {
            $preferenceBody['payment_methods'] = [
                'excluded_payment_types' => [
                    ['id' => 'ticket'],
                    ['id' => 'atm'],
                    ['id' => 'bank_transfer'],
                ],
            ];
            $preferenceBody['binary_mode'] = true;
        }

        try {
            $res = $this->mercadopago->createPreference($preferenceBody);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 502);
        }

        $preferenceId = is_string($res['id'] ?? null) ? $res['id'] : null;
        if ($preferenceId === null || $preferenceId === '') {
            return response()->json(['success' => false, 'message' => 'Mercado Pago no devolvió id de preferencia.'], 502);
        }

        $checkoutUrl = MercadoPagoService::checkoutUrl($res, $this->mercadopago->isTestCredentials());
        if ($checkoutUrl === null || $checkoutUrl === '') {
            return response()->json(['success' => false, 'message' => 'Mercado Pago no devolvió URL de pago.'], 502);
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

        MercadoPagoPreferenceSnapshot::query()->where('expires_at', '<', now())->whereNull('pedido_id')->delete();

        MercadoPagoPreferenceSnapshot::updateOrCreate(
            ['preference_id' => $preferenceId],
            [
                'user_id' => $user->id,
                'snapshot' => $snapshot,
                'expires_at' => now()->addMinutes(self::SNAPSHOT_TTL_MINUTES),
                'pedido_id' => null,
            ]
        );

        return response()->json([
            'success' => true,
            'data' => [
                'preference_id' => $preferenceId,
                'init_point' => $checkoutUrl,
            ],
        ]);
    }

    /** Confirma pago tras volver del checkout (mismo rol que PayPal capture). */
    public function confirm(Request $request): JsonResponse|Response
    {
        if (! $this->mercadopago->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'Mercado Pago no está configurado en el servidor.',
            ], 503);
        }

        $valid = $request->validate([
            'payment_id' => 'required|string|max:64',
            'preference_id' => 'nullable|string|max:64',
        ]);

        $user = Auth::user();

        return $this->finalizeFromPaymentId($user, $valid['payment_id'], $valid['preference_id'] ?? null, false);
    }

    /**
     * Webhook (notificaciones). Sin sesión: identifica por preference_id del pago.
     */
    public function webhook(Request $request): Response
    {
        if (! $this->mercadopago->isConfigured()) {
            return response('No configurado', 503);
        }

        $paymentId = $request->query('id')
            ?? data_get($request->input('data'), 'id')
            ?? $request->input('data.id');

        if (is_array($paymentId)) {
            $paymentId = null;
        }

        if ($paymentId === null || $paymentId === '') {
            Log::info('Mercado Pago webhook sin payment id', ['body' => $request->all()]);

            return response('OK', 200);
        }

        $paymentId = (string) $paymentId;

        try {
            $payment = $this->mercadopago->getPayment($paymentId);
        } catch (Throwable $e) {
            Log::warning('Mercado Pago webhook: no se pudo leer pago', ['id' => $paymentId, 'e' => $e->getMessage()]);

            return response('OK', 200);
        }

        $status = strtolower((string) ($payment['status'] ?? ''));
        if ($status !== 'approved') {
            return response('OK', 200);
        }

        $prefId = $payment['preference_id'] ?? null;
        if (! is_string($prefId) || $prefId === '') {
            return response('OK', 200);
        }

        $uid = MercadoPagoPreferenceSnapshot::query()->where('preference_id', $prefId)->value('user_id');
        $user = $uid ? User::query()->find((int) $uid) : null;
        if ($user === null) {
            return response('OK', 200);
        }

        $this->finalizeFromPaymentId($user, $paymentId, $prefId, true);

        return response('OK', 200);
    }

    private function finalizeFromPaymentId(User $user, string $paymentId, ?string $preferenceIdHint, bool $webhookSilent): JsonResponse|Response
    {
        try {
            $payment = $this->mercadopago->getPayment($paymentId);
        } catch (Throwable $e) {
            return $webhookSilent ? response('OK', 200) : response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 502);
        }

        $status = strtolower((string) ($payment['status'] ?? ''));
        if ($status !== 'approved') {
            return $webhookSilent ? response('OK', 200) : response()->json([
                'success' => false,
                'message' => 'El pago no está aprobado en Mercado Pago.',
            ], 422);
        }

        $preferenceId = is_string($payment['preference_id'] ?? null) ? $payment['preference_id'] : $preferenceIdHint;
        if ($preferenceId === null || $preferenceId === '') {
            return $webhookSilent ? response('OK', 200) : response()->json([
                'success' => false,
                'message' => 'Pago sin preferencia asociada.',
            ], 422);
        }

        $row = MercadoPagoPreferenceSnapshot::query()
            ->where('preference_id', $preferenceId)
            ->where('user_id', $user->id)
            ->first();

        if ($row !== null && $row->pedido_id !== null) {
            $existente = Pedido::query()
                ->where('user_id', $user->id)
                ->whereKey($row->pedido_id)
                ->first();
            if ($existente !== null) {
                return $webhookSilent ? response('OK', 200) : response()->json([
                    'success' => true,
                    'message' => 'Pago ya confirmado.',
                    'data' => [
                        'id' => $existente->id,
                        'folio' => $existente->folio,
                    ],
                ], 200);
            }
        }

        if ($row === null) {
            return $webhookSilent ? response('OK', 200) : response()->json([
                'success' => false,
                'message' => 'Preferencia de pago no encontrada o expirada. Vuelve a iniciar el pago.',
            ], 404);
        }

        if ($row->expires_at !== null && $row->expires_at->isPast() && $row->pedido_id === null) {
            return $webhookSilent ? response('OK', 200) : response()->json([
                'success' => false,
                'message' => 'Preferencia de pago no encontrada o expirada. Vuelve a iniciar el pago.',
            ], 404);
        }

        $snapshot = $row->snapshot;
        if (! is_array($snapshot) || (int) ($snapshot['user_id'] ?? 0) !== (int) $user->id) {
            return $webhookSilent ? response('OK', 200) : response()->json([
                'success' => false,
                'message' => 'Preferencia de pago no encontrada o expirada. Vuelve a iniciar el pago.',
            ], 404);
        }

        $paid = round((float) ($payment['transaction_amount'] ?? 0), 2);
        $expected = round((float) ($snapshot['total'] ?? 0), 2);
        if (abs($paid - $expected) > 0.02) {
            return $webhookSilent ? response('OK', 200) : response()->json([
                'success' => false,
                'message' => 'El monto pagado no coincide con el pedido.',
            ], 422);
        }

        $currencyPaid = strtoupper((string) ($payment['currency_id'] ?? ''));
        $currencyExpected = strtoupper((string) ($snapshot['currency'] ?? ''));
        if ($currencyPaid !== '' && $currencyExpected !== '' && $currencyPaid !== $currencyExpected) {
            return $webhookSilent ? response('OK', 200) : response()->json([
                'success' => false,
                'message' => 'Moneda del pago no coincide.',
            ], 422);
        }

        $itemsPayload = $snapshot['items'] ?? [];
        if (! is_array($itemsPayload) || $itemsPayload === []) {
            return $webhookSilent ? response('OK', 200) : response()->json(['success' => false, 'message' => 'Snapshot de carrito inválido.'], 500);
        }

        $refExterna = (string) ($payment['id'] ?? $paymentId);

        try {
            $pedido = DB::transaction(function () use ($user, $refExterna, $preferenceId) {
                $rowLocked = MercadoPagoPreferenceSnapshot::query()
                    ->where('preference_id', $preferenceId)
                    ->where('user_id', $user->id)
                    ->lockForUpdate()
                    ->first();

                if ($rowLocked === null) {
                    throw new \RuntimeException('Preferencia de pago no encontrada o expirada. Vuelve a iniciar el pago.');
                }

                if ($rowLocked->pedido_id !== null) {
                    $existente = Pedido::query()
                        ->where('user_id', $user->id)
                        ->whereKey($rowLocked->pedido_id)
                        ->first();

                    if ($existente !== null) {
                        $user->carritoItems()->delete();
                        Cache::forget(self::cartCacheKey($user->id));

                        return $existente;
                    }
                }

                $snapshotLocal = $rowLocked->snapshot;
                $itemsPayloadLocal = $snapshotLocal['items'] ?? [];
                if (! is_array($itemsPayloadLocal) || $itemsPayloadLocal === []) {
                    throw new \RuntimeException('Snapshot de carrito inválido.');
                }

                foreach ($itemsPayloadLocal as $ln) {
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

                $p = null;
                for ($i = 0; $i < 5; $i++) {
                    try {
                        $folio = DocumentoNumeracion::siguienteFolioPedido();
                        $p = $user->pedidos()->create([
                            'folio' => $folio,
                            'fecha' => now()->toDateString(),
                            'monto' => 0,
                            'metodo_pago' => 'mercadopago',
                            'referencia_pago_externa' => $refExterna,
                            'estado_pago' => 'pagado',
                            'estatus_pedido' => 'pendiente',
                            'direccion_envio_id' => (int) ($snapshotLocal['direccion_envio_id'] ?? 0),
                            'datos_facturacion_id' => (int) ($snapshotLocal['datos_facturacion_id'] ?? 0),
                        ]);
                        break;
                    } catch (QueryException $qe) {
                        $msg = strtolower($qe->getMessage());
                        if (! str_contains($msg, 'pedidos_folio_unique') && ! str_contains($msg, 'duplicate')) {
                            throw $qe;
                        }
                    }
                }
                if (! $p) {
                    throw new \RuntimeException('No se pudo generar un folio único para el pedido.');
                }

                $monto = 0.0;
                foreach ($itemsPayloadLocal as $ln) {
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

                $this->productoStock->registrarVentasConfirmadas($p->id, $itemsPayloadLocal);

                $user->carritoItems()->delete();
                Cache::forget(self::cartCacheKey($user->id));

                $rowLocked->pedido_id = $p->id;
                $rowLocked->expires_at = now()->addDays(30);
                $rowLocked->save();

                return $p;
            });
        } catch (Throwable $e) {
            if (str_contains(strtolower($e->getMessage()), 'duplicate key') || str_contains(strtolower($e->getMessage()), 'duplicate')) {
                $pedidoExistente = Pedido::query()
                    ->where('user_id', $user->id)
                    ->where('metodo_pago', 'mercadopago')
                    ->where('referencia_pago_externa', $refExterna)
                    ->first();

                if ($pedidoExistente !== null) {
                    $user->carritoItems()->delete();
                    Cache::forget(self::cartCacheKey($user->id));

                    return $webhookSilent ? response('OK', 200) : response()->json([
                        'success' => true,
                        'message' => 'Pago completado (idempotente).',
                        'data' => [
                            'id' => $pedidoExistente->id,
                            'folio' => $pedidoExistente->folio,
                        ],
                    ], 201);
                }
            }

            return $webhookSilent ? response('OK', 200) : response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        return $webhookSilent ? response('OK', 200) : response()->json([
            'success' => true,
            'message' => 'Pago completado.',
            'data' => [
                'id' => $pedido->id,
                'folio' => $pedido->folio,
            ],
        ], 201);
    }
}
