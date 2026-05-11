<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PlanProPaymentLogService;
use App\Services\PlanSubscriptionService;
use App\Support\MetodoPagoToggle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlanPromocionalController extends Controller
{
    /**
     * Flujo paralelo al de tarjeta: activa Pro sin cobro durante la ventana promocional.
     */
    public function checkout(Request $request): JsonResponse
    {
        if (! MetodoPagoToggle::isEnabled('promocional')) {
            return response()->json([
                'success' => false,
                'message' => 'La opción promocional no está disponible en este momento.',
            ], 422);
        }

        $user = $request->user();

        $ref = 'promocional_'.uniqid('', true);
        PlanSubscriptionService::activate($user, 'promocional', $ref);

        PlanProPaymentLogService::record($user->fresh(), 'promocional', 0, PlanSubscriptionService::planTotalAndCurrency()['currency'], $ref);

        return response()->json([
            'success' => true,
            'message' => '¡Pro Coleccionista activado con la promoción!',
        ], 201);
    }
}
