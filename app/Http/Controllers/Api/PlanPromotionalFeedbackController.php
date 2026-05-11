<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlanPromotionalFeedback;
use App\Services\PlanSubscriptionService;
use App\Support\MetodoPagoToggle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlanPromotionalFeedbackController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        if (! MetodoPagoToggle::isEnabled('promocional')) {
            return response()->json([
                'success' => false,
                'message' => 'Los comentarios promocionales no están disponibles.',
            ], 422);
        }

        $user = $request->user()->fresh();

        if (strtolower((string) ($user->pro_last_payment_method ?? '')) !== 'promocional') {
            return response()->json([
                'success' => false,
                'message' => 'Esta opción solo aplica si activaste Pro con el método promocional.',
            ], 422);
        }

        if (! PlanSubscriptionService::effectiveProActive($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Necesitas tener Pro activo para enviar comentarios desde esta promo.',
            ], 422);
        }

        $valid = $request->validate([
            'body' => ['required', 'string', 'min:5', 'max:4000'],
        ]);

        PlanPromotionalFeedback::query()->create([
            'user_id' => $user->id,
            'body' => trim($valid['body']),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Gracias, recibimos tu comentario.',
        ], 201);
    }
}
