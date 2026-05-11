<?php

namespace App\Services;

use App\Models\PlanSetting;
use App\Models\User;
use Carbon\CarbonInterface;

class PlanSubscriptionService
{
    /**
     * Precio y moneda del plan Pro: misma fila que expone GET /plan/catalog (tabla plan_settings).
     */
    public static function planTotalAndCurrency(): array
    {
        $s = PlanSetting::current();

        return [
            'total' => round((float) $s->pro_price, 2),
            'currency' => strtoupper((string) $s->pro_currency),
            'billing_period_days' => max(1, (int) $s->billing_period_days),
        ];
    }

    public static function activate(User $user, string $method, ?string $paymentRef = null): void
    {
        $days = self::planTotalAndCurrency()['billing_period_days'];
        $now = now();

        $currentEnd = $user->pro_subscription_ends_at;
        $base = ($currentEnd instanceof CarbonInterface && $currentEnd->isFuture())
            ? $currentEnd->copy()
            : $now;

        $newEnd = $base->copy()->addDays($days);

        $user->forceFill([
            'pro_subscription_started_at' => $now,
            'pro_subscription_ends_at' => $newEnd,
            'pro_subscription_cancelled' => false,
            'pro_last_payment_method' => $method,
            'pro_last_payment_reference' => $paymentRef,
        ])->save();
    }

    public static function indefiniteActive(User $user): bool
    {
        return (bool) $user->pro_subscription_indefinite && ! (bool) $user->pro_subscription_indefinite_paused;
    }

    /**
     * Acceso efectivo Pro (periodo vigente o Pro indefinido sin pausa).
     */
    public static function effectiveProActive(User $user): bool
    {
        if (self::indefiniteActive($user)) {
            return true;
        }

        $end = $user->pro_subscription_ends_at;

        return $end instanceof CarbonInterface && $end->isFuture();
    }

    public static function hasProAccess(User $user): bool
    {
        return self::effectiveProActive($user);
    }

    public static function secondsRemaining(User $user): int
    {
        $end = $user->pro_subscription_ends_at;
        if (! ($end instanceof CarbonInterface)) {
            return 0;
        }

        return max(0, $end->getTimestamp() - now()->getTimestamp());
    }
}
