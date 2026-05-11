<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlanMercadoPagoSnapshot;
use App\Models\User;
use App\Services\MercadoPagoService;
use App\Services\PlanProPaymentLogService;
use App\Services\PlanSubscriptionService;
use App\Support\MetodoPagoToggle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class PlanMercadoPagoController extends Controller
{
    private const SNAPSHOT_TTL_MINUTES = 120;

    public function __construct(
        private readonly MercadoPagoService $mercadopago,
    ) {}

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

        $full = $base.'/api/mercadopago/plan/webhook';
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

        if (preg_match('/^172\.(1[6-9]|2[0-9]|3[0-1])\./', $hostLower) === 1) {
            return null;
        }

        return $full;
    }

    public function createPreference(Request $request): JsonResponse
    {
        if (! MetodoPagoToggle::isEnabled('mercadopago')) {
            return response()->json([
                'success' => false,
                'message' => 'Mercado Pago está temporalmente desactivado.',
            ], 422);
        }

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
        ]);

        foreach (['success' => $valid['back_urls']['success'], 'failure' => $valid['back_urls']['failure'], 'pending' => $valid['back_urls']['pending']] as $label => $u) {
            if (filter_var($u, FILTER_VALIDATE_URL) === false) {
                return response()->json([
                    'success' => false,
                    'message' => 'URL inválida (back_urls.'.$label.').',
                ], 422);
            }
        }

        $user = $request->user();
        $pricing = PlanSubscriptionService::planTotalAndCurrency();
        $total = $pricing['total'];
        $currency = $pricing['currency'];

        $notificationUrl = self::mercadoPagoNotificationUrlForPreference();

        $payerEmail = trim((string) ($user->email ?? ''));

        $preferenceBody = [
            'items' => [[
                'title' => substr((string) config('app.name', 'Coleccionador').' — Pro Coleccionista (1 mes)', 0, 256),
                'quantity' => 1,
                'currency_id' => $currency,
                'unit_price' => (float) $total,
            ]],
            'back_urls' => [
                'success' => $valid['back_urls']['success'],
                'failure' => $valid['back_urls']['failure'],
                'pending' => $valid['back_urls']['pending'],
            ],
            'external_reference' => 'plan_pro_user_'.$user->id.'_'.uniqid('', true),
            'statement_descriptor' => substr(preg_replace('/[^a-zA-Z0-9 ]/', '', (string) config('app.name', 'Coleccionador')), 0, 22),
        ];

        if ($notificationUrl !== null) {
            $preferenceBody['notification_url'] = $notificationUrl;
        }

        if ($payerEmail !== '' && ! $this->mercadopago->isTestCredentials()) {
            $preferenceBody['payer'] = ['email' => $payerEmail];
        }

        if (self::canUseMercadoPagoAutoReturn((string) $valid['back_urls']['success'])) {
            $preferenceBody['auto_return'] = 'approved';
        }

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
            'kind' => 'pro_plan',
        ];

        PlanMercadoPagoSnapshot::query()->where('expires_at', '<', now())->whereNull('applied_at')->delete();

        PlanMercadoPagoSnapshot::updateOrCreate(
            ['preference_id' => $preferenceId],
            [
                'user_id' => $user->id,
                'snapshot' => $snapshot,
                'expires_at' => now()->addMinutes(self::SNAPSHOT_TTL_MINUTES),
                'applied_at' => null,
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

        $user = $request->user();

        return $this->finalizeFromPaymentId($user, $valid['payment_id'], $valid['preference_id'] ?? null, false);
    }

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
            Log::info('Mercado Pago plan webhook sin payment id', ['body' => $request->all()]);

            return response('OK', 200);
        }

        $paymentId = (string) $paymentId;

        try {
            $payment = $this->mercadopago->getPayment($paymentId);
        } catch (Throwable $e) {
            Log::warning('Mercado Pago plan webhook: no se pudo leer pago', ['id' => $paymentId, 'e' => $e->getMessage()]);

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

        $uid = PlanMercadoPagoSnapshot::query()->where('preference_id', $prefId)->value('user_id');
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

        $row = PlanMercadoPagoSnapshot::query()
            ->where('preference_id', $preferenceId)
            ->where('user_id', $user->id)
            ->first();

        if ($row !== null && $row->applied_at !== null) {
            return $webhookSilent ? response('OK', 200) : response()->json([
                'success' => true,
                'message' => 'Pago ya confirmado.',
            ], 200);
        }

        if ($row === null) {
            return $webhookSilent ? response('OK', 200) : response()->json([
                'success' => false,
                'message' => 'Preferencia de pago no encontrada o expirada. Vuelve a iniciar el pago.',
            ], 404);
        }

        if ($row->expires_at !== null && $row->expires_at->isPast() && $row->applied_at === null) {
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
                'message' => 'El monto pagado no coincide con el plan.',
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

        $refExterna = (string) ($payment['id'] ?? $paymentId);

        try {
            DB::transaction(function () use ($user, $refExterna, $preferenceId, $paid, $currencyPaid, $snapshot) {
                $rowLocked = PlanMercadoPagoSnapshot::query()
                    ->where('preference_id', $preferenceId)
                    ->where('user_id', $user->id)
                    ->lockForUpdate()
                    ->first();

                if ($rowLocked === null) {
                    throw new \RuntimeException('Preferencia de pago no encontrada o expirada. Vuelve a iniciar el pago.');
                }

                if ($rowLocked->applied_at !== null) {
                    return;
                }

                $freshUser = $user->fresh();
                PlanSubscriptionService::activate($freshUser, 'mercadopago', $refExterna);

                $currencyForFee = $currencyPaid !== ''
                    ? $currencyPaid
                    : strtoupper((string) ($snapshot['currency'] ?? 'MXN'));
                PlanProPaymentLogService::record(
                    $freshUser->fresh(),
                    'mercadopago',
                    $paid,
                    $currencyForFee,
                    $refExterna
                );

                $rowLocked->applied_at = now();
                $rowLocked->expires_at = now()->addDays(30);
                $rowLocked->save();
            });
        } catch (Throwable $e) {
            return $webhookSilent ? response('OK', 200) : response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        return $webhookSilent ? response('OK', 200) : response()->json([
            'success' => true,
            'message' => 'Pago completado.',
        ], 201);
    }
}
