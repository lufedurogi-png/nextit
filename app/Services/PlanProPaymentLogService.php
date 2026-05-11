<?php

namespace App\Services;

use App\Models\PlanProPaymentLog;
use App\Models\User;

class PlanProPaymentLogService
{
    public static function record(
        User $user,
        string $method,
        float $gross,
        string $currency,
        ?string $paymentReference = null
    ): void {
        $currency = strtoupper(trim($currency));
        $gross = round($gross, 2);
        $fee = round(PlanProFeeEstimator::estimateFee($method, $gross, $currency), 2);
        $net = round(max(0, $gross - $fee), 2);
        $mxnPerUsd = max(0.01, (float) config('plan_revenue.mxn_per_usd', 20.5));

        if ($currency === 'USD') {
            $netUsd = $net;
            $netMxn = round($net * $mxnPerUsd, 2);
        } else {
            $netMxn = $net;
            $netUsd = round($net / $mxnPerUsd, 2);
        }

        PlanProPaymentLog::query()->create([
            'user_id' => $user->id,
            'payment_method' => $method,
            'gross_amount' => $gross,
            'currency' => $currency,
            'processor_fee_estimate' => $fee,
            'net_after_fee_estimate' => $net,
            'net_approx_usd' => $netUsd,
            'net_approx_mxn' => $netMxn,
            'payment_reference' => $paymentReference,
        ]);
    }
}
