<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PlanProPaymentLogService;
use App\Services\PlanSubscriptionService;
use App\Support\MetodoPagoToggle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlanTarjetaController extends Controller
{
    public function checkout(Request $request): JsonResponse
    {
        if (! MetodoPagoToggle::isEnabled('tarjeta')) {
            return response()->json([
                'success' => false,
                'message' => 'El pago con tarjeta está temporalmente desactivado.',
            ], 422);
        }

        $user = $request->user();
        $ref = 'tarjeta_sim_'.uniqid('', true);
        $pricing = PlanSubscriptionService::planTotalAndCurrency();
        PlanSubscriptionService::activate($user, 'tarjeta', $ref);

        PlanProPaymentLogService::record(
            $user->fresh(),
            'tarjeta',
            (float) $pricing['total'],
            (string) $pricing['currency'],
            $ref
        );

        return response()->json([
            'success' => true,
            'message' => 'Suscripción activada (simulación de tarjeta).',
        ], 201);
    }
}
