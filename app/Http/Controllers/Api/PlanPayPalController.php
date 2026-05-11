<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlanPayPalSnapshot;
use App\Services\PayPalService;
use App\Services\PlanProPaymentLogService;
use App\Services\PlanSubscriptionService;
use App\Support\MetodoPagoToggle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class PlanPayPalController extends Controller
{
    private const PAYPAL_CACHE_TTL_MINUTES = 120;

    public function __construct(
        private readonly PayPalService $paypal,
    ) {}

    public function createOrder(Request $request): JsonResponse
    {
        if (! MetodoPagoToggle::isEnabled('paypal')) {
            return response()->json([
                'success' => false,
                'message' => 'PayPal está temporalmente desactivado.',
            ], 422);
        }

        if (! $this->paypal->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'PayPal no está configurado en el servidor.',
            ], 503);
        }

        $valid = $request->validate([
            'return_url' => 'required|string|max:2048',
            'cancel_url' => 'required|string|max:2048',
        ]);

        foreach (['return_url' => $valid['return_url'], 'cancel_url' => $valid['cancel_url']] as $label => $u) {
            if (filter_var($u, FILTER_VALIDATE_URL) === false) {
                return response()->json([
                    'success' => false,
                    'message' => 'URL inválida ('.$label.').',
                ], 422);
            }
        }

        $user = $request->user();
        $pricing = PlanSubscriptionService::planTotalAndCurrency();
        $total = $pricing['total'];
        $currency = $pricing['currency'];
        $valueStr = number_format($total, 2, '.', '');

        $payload = [
            'intent' => 'CAPTURE',
            'purchase_units' => [[
                'reference_id' => 'plan_pro',
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
                'brand_name' => (string) config('app.name', 'Coleccionador'),
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
            'kind' => 'pro_plan',
        ];

        PlanPayPalSnapshot::query()->where('expires_at', '<', now())->whereNull('applied_at')->delete();

        PlanPayPalSnapshot::updateOrCreate(
            ['paypal_order_id' => $paypalOrderId],
            [
                'user_id' => $user->id,
                'snapshot' => $snapshot,
                'expires_at' => now()->addMinutes(self::PAYPAL_CACHE_TTL_MINUTES),
                'applied_at' => null,
            ]
        );

        return response()->json([
            'success' => true,
            'data' => [
                'paypal_order_id' => $paypalOrderId,
                'approve_url' => $approveUrl,
            ],
        ]);
    }

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

        $user = $request->user();

        $row = PlanPayPalSnapshot::query()
            ->where('paypal_order_id', $valid['order_id'])
            ->where('user_id', $user->id)
            ->first();

        if ($row !== null && $row->applied_at !== null) {
            return response()->json([
                'success' => true,
                'message' => 'Pago ya confirmado.',
            ], 200);
        }

        if ($row === null) {
            return response()->json([
                'success' => false,
                'message' => 'Orden de pago no encontrada o expirada. Vuelve a iniciar el pago.',
            ], 404);
        }

        if ($row->expires_at !== null && $row->expires_at->isPast() && $row->applied_at === null) {
            return response()->json([
                'success' => false,
                'message' => 'Orden de pago no encontrada o expirada. Vuelve a iniciar el pago.',
            ], 404);
        }

        $snapshot = $row->snapshot;
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

            $cap = $status === 'COMPLETED'
                ? $order
                : $this->paypal->captureOrder($valid['order_id']);
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
            return response()->json(['success' => false, 'message' => 'El monto pagado no coincide con el plan.'], 422);
        }

        $captureId = PayPalService::captureId($cap) ?? $valid['order_id'];
        $paypalOrderId = $valid['order_id'];

        try {
            DB::transaction(function () use ($user, $captureId, $paypalOrderId, $paid, $snapshot) {
                $rowLocked = PlanPayPalSnapshot::query()
                    ->where('paypal_order_id', $paypalOrderId)
                    ->where('user_id', $user->id)
                    ->lockForUpdate()
                    ->first();

                if ($rowLocked === null) {
                    throw new \RuntimeException('Orden de pago no encontrada o expirada. Vuelve a iniciar el pago.');
                }

                if ($rowLocked->applied_at !== null) {
                    return;
                }

                $freshUser = $user->fresh();
                PlanSubscriptionService::activate($freshUser, 'paypal', (string) $captureId);

                PlanProPaymentLogService::record(
                    $freshUser->fresh(),
                    'paypal',
                    $paid,
                    strtoupper((string) $snapshot['currency']),
                    $captureId
                );

                $rowLocked->applied_at = now();
                $rowLocked->expires_at = now()->addDays(30);
                $rowLocked->save();
            });
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Pago completado.',
        ], 201);
    }
}
