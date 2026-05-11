<?php

namespace App\Services;

class PlanProFeeEstimator
{
    public static function estimateFee(string $method, float $gross, string $currency): float
    {
        $method = strtolower(trim($method));
        $currency = strtoupper(trim($currency));
        $gross = max(0, round($gross, 2));

        if ($gross <= 0 || in_array($method, ['promocional', 'tarjeta'], true)) {
            return 0.0;
        }

        if ($method === 'paypal') {
            $pct = max(0, (float) config('plan_revenue.paypal_percent', 3.59)) / 100;
            $fixedUsd = max(0, (float) config('plan_revenue.paypal_fixed_usd', 0.49));
            $mxnPerUsd = max(0.01, (float) config('plan_revenue.mxn_per_usd', 20.5));

            $variable = $gross * $pct;
            if ($currency === 'USD') {
                return $variable + $fixedUsd;
            }
            $fixedLocal = $fixedUsd * $mxnPerUsd;

            return $variable + $fixedLocal;
        }

        if ($method === 'mercadopago') {
            $pct = max(0, (float) config('plan_revenue.mercadopago_percent_mxn', 4.89)) / 100;

            return $gross * $pct;
        }

        return 0.0;
    }

    /**
     * Texto corto sobre la hipótesis de comisión (para la UI admin).
     */
    public static function feeRuleDescription(string $method): string
    {
        return match (strtolower($method)) {
            'paypal' => 'Estimación: '
                .(float) config('plan_revenue.paypal_percent', 3.59)
                .'% + '.(float) config('plan_revenue.paypal_fixed_usd', 0.49).' USD fijo convertido si el cobro es en MXN.',
            'mercadopago' => 'Estimación: '
                .(float) config('plan_revenue.mercadopago_percent_mxn', 4.89)
                .'% sobre el cobro.',
            default => 'Sin comisión estimada configurada.',
        };
    }
}
