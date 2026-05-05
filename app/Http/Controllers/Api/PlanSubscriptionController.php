<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlanSetting;
use App\Services\PlanSubscriptionService;
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlanSubscriptionController extends Controller
{
    public function catalog(): JsonResponse
    {
        $p = PlanSubscriptionService::planTotalAndCurrency();
        $s = PlanSetting::current();
        $features = [];
        if (is_array($s->pro_features)) {
            foreach ($s->pro_features as $line) {
                $t = trim((string) $line);
                if ($t !== '') {
                    $features[] = $t;
                }
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'pro' => [
                    'amount' => $p['total'],
                    'currency' => $p['currency'],
                    'period_days' => $p['billing_period_days'],
                    'features' => array_values($features),
                ],
            ],
        ]);
    }

    public function subscription(Request $request): JsonResponse
    {
        $user = $request->user();
        $end = $user->pro_subscription_ends_at;
        $active = $end instanceof CarbonInterface && $end->isFuture();

        return response()->json([
            'success' => true,
            'data' => [
                'pro_active' => $active,
                'pro_scan_unlocked' => $active,
                'pro_started_at' => $user->pro_subscription_started_at?->toIso8601String(),
                'pro_ends_at' => $user->pro_subscription_ends_at?->toIso8601String(),
                'pro_cancelled' => (bool) $user->pro_subscription_cancelled,
                'seconds_remaining' => PlanSubscriptionService::secondsRemaining($user),
            ],
        ]);
    }

    public function cancel(Request $request): JsonResponse
    {
        $user = $request->user();
        $end = $user->pro_subscription_ends_at;
        if (! ($end instanceof CarbonInterface) || ! $end->isFuture()) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes un plan Pro activo.',
            ], 422);
        }

        $user->forceFill(['pro_subscription_cancelled' => true])->save();

        return response()->json([
            'success' => true,
            'message' => 'Plan marcado como cancelado. Puedes reanudarlo mientras siga vigente el periodo pagado.',
        ]);
    }

    public function resume(Request $request): JsonResponse
    {
        $user = $request->user();
        $end = $user->pro_subscription_ends_at;
        if (! ($end instanceof CarbonInterface) || ! $end->isFuture()) {
            return response()->json([
                'success' => false,
                'message' => 'No hay periodo vigente para reanudar.',
            ], 422);
        }

        if (! $user->pro_subscription_cancelled) {
            return response()->json([
                'success' => true,
                'message' => 'El plan ya estaba activo.',
            ]);
        }

        $user->forceFill(['pro_subscription_cancelled' => false])->save();

        return response()->json([
            'success' => true,
            'message' => 'Plan reanudado.',
        ]);
    }
}
