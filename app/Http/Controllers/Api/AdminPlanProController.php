<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlanSetting;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AdminPlanProController extends Controller
{
    private static function normalizeFeatures(mixed $raw): array
    {
        if (! is_array($raw)) {
            return [];
        }

        $out = [];
        foreach ($raw as $line) {
            $t = trim((string) $line);
            if ($t !== '') {
                $out[] = $t;
            }
        }

        return array_values($out);
    }

    public function show(): JsonResponse
    {
        $s = PlanSetting::current();

        return response()->json([
            'success' => true,
            'data' => [
                'pro_price' => round((float) $s->pro_price, 2),
                'pro_currency' => strtoupper((string) $s->pro_currency),
                'billing_period_days' => max(1, (int) $s->billing_period_days),
                'features' => self::normalizeFeatures($s->pro_features ?? []),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $valid = $request->validate([
            'password' => 'required|string',
            'pro_price' => 'required|numeric|min:0.01|max:999999',
            'pro_currency' => 'required|string|size:3',
            'billing_period_days' => 'required|integer|min:1|max:3650',
            'features' => 'present|array|max:50',
            'features.*' => 'nullable|string|max:500',
        ]);

        $admin = Auth::user();
        if (! $admin || ! Hash::check($valid['password'], $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Contraseña de administrador incorrecta.',
            ], 422);
        }

        $row = PlanSetting::query()->orderBy('id')->first();
        if ($row === null) {
            return response()->json([
                'success' => false,
                'message' => 'No existe configuración de plan en base de datos.',
            ], 500);
        }

        $features = self::normalizeFeatures($valid['features']);

        $row->update([
            'pro_price' => round((float) $valid['pro_price'], 2),
            'pro_currency' => strtoupper($valid['pro_currency']),
            'billing_period_days' => (int) $valid['billing_period_days'],
            'pro_features' => $features,
        ]);

        $row->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Plan Pro actualizado.',
            'data' => [
                'pro_price' => round((float) $row->pro_price, 2),
                'pro_currency' => strtoupper((string) $row->pro_currency),
                'billing_period_days' => max(1, (int) $row->billing_period_days),
                'features' => self::normalizeFeatures($row->pro_features ?? []),
            ],
        ]);
    }

    public function usersWithActivePlan(): JsonResponse
    {
        Carbon::setLocale('es');
        $now = now();

        $rows = User::query()
            ->whereNotNull('pro_subscription_ends_at')
            ->where('pro_subscription_ends_at', '>', $now)
            ->orderBy('pro_subscription_ends_at')
            ->get([
                'id',
                'name',
                'email',
                'pro_subscription_started_at',
                'pro_subscription_ends_at',
                'pro_subscription_cancelled',
                'pro_last_payment_method',
            ])
            ->map(function (User $u) use ($now) {
                $endsAt = $u->pro_subscription_ends_at;
                $secondsRemaining = ($endsAt instanceof CarbonInterface)
                    ? max(0, $endsAt->getTimestamp() - $now->getTimestamp())
                    : 0;

                $daysRemaining = (int) floor($secondsRemaining / 86400);
                $hoursRemaining = (int) floor(($secondsRemaining % 86400) / 3600);
                $minutesRemaining = (int) floor(($secondsRemaining % 3600) / 60);

                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'payment_method' => $u->pro_last_payment_method,
                    'started_at' => $u->pro_subscription_started_at?->toIso8601String(),
                    'ends_at' => $u->pro_subscription_ends_at?->toIso8601String(),
                    'cancelled' => (bool) $u->pro_subscription_cancelled,
                    'seconds_remaining' => $secondsRemaining,
                    'days_remaining' => $daysRemaining,
                    'time_remaining' => sprintf('%d días %d horas %d min', $daysRemaining, $hoursRemaining, $minutesRemaining),
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }
}
