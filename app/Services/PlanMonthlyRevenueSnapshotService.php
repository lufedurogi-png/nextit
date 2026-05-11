<?php

namespace App\Services;

use App\Models\PlanProPaymentLog;
use App\Models\PlanRevenueMonthlySnapshot;
use Carbon\Carbon;

class PlanMonthlyRevenueSnapshotService
{
    private const METHODS = ['paypal', 'mercadopago', 'tarjeta', 'promocional'];

    /**
     * @return array<string, mixed>
     */
    public static function aggregateMonth(int $year, int $month): array
    {
        [$start, $end] = self::windowForMonth($year, $month);

        $methods = [];
        foreach (self::METHODS as $code) {
            $base = PlanProPaymentLog::query()
                ->where('payment_method', $code)
                ->where('created_at', '>=', $start)
                ->where('created_at', '<', $end);

            $distinctUsers = (int) ((clone $base)->selectRaw('count(distinct user_id) as agg')->value('agg') ?? 0);
            $transactions = (clone $base)->count();
            $grossSum = (clone $base)->sum('gross_amount');
            $feeSum = (clone $base)->sum('processor_fee_estimate');
            $netUsd = (clone $base)->sum('net_approx_usd');
            $netMxn = (clone $base)->sum('net_approx_mxn');

            $methods[$code] = [
                'code' => $code,
                'distinct_users' => $distinctUsers,
                'transactions' => (int) $transactions,
                'gross_in_original_currency' => round((float) $grossSum, 2),
                'processor_fees_estimate' => round((float) $feeSum, 2),
                'net_approx_usd' => round((float) $netUsd, 2),
                'net_approx_mxn' => round((float) $netMxn, 2),
                'fee_rule_note' => in_array($code, ['paypal', 'mercadopago'], true)
                    ? PlanProFeeEstimator::feeRuleDescription($code)
                    : 'Sin comisión de pasarela estimada.',
            ];
        }

        $totals = [
            'net_approx_usd' => round(array_sum(array_column($methods, 'net_approx_usd')), 2),
            'net_approx_mxn' => round(array_sum(array_column($methods, 'net_approx_mxn')), 2),
            'processor_fees_estimate' => round(array_sum(array_column($methods, 'processor_fees_estimate')), 2),
        ];

        return [
            'year' => $year,
            'month' => $month,
            'period_start' => $start->toIso8601String(),
            'period_end_exclusive' => $end->toIso8601String(),
            'methods' => array_values($methods),
            'totals' => $totals,
            'fx_note' => 'Tipo de cambio referencia: 1 USD = '.(float) config('plan_revenue.mxn_per_usd', 20.5).' MXN (config/plan_revenue.php).',
            'archived_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Crea el informe del mes si no existe (idempotente). Útil al cierre mensual automático.
     */
    public static function ensureSnapshotExists(int $year, int $month): bool
    {
        $exists = PlanRevenueMonthlySnapshot::query()
            ->where('year', $year)
            ->where('month', $month)
            ->exists();

        if ($exists) {
            return false;
        }

        $payload = self::aggregateMonth($year, $month);
        PlanRevenueMonthlySnapshot::query()->create([
            'year' => $year,
            'month' => $month,
            'payload' => $payload,
        ]);

        return true;
    }

    /**
     * Rellena informes faltantes desde el primer movimiento registrado hasta el último mes calendario ya cerrado.
     */
    public static function syncAllMissingThroughLastCompletedMonth(): int
    {
        $raw = PlanProPaymentLog::query()->min('created_at');
        if ($raw === null) {
            return 0;
        }

        $first = Carbon::parse($raw)->startOfMonth();
        $lastCompleted = now()->copy()->subMonth()->startOfMonth();

        if ($first->gt($lastCompleted)) {
            return 0;
        }

        $created = 0;
        $cursor = $first->copy();
        while ($cursor->lte($lastCompleted)) {
            if (self::ensureSnapshotExists((int) $cursor->year, (int) $cursor->month)) {
                $created++;
            }
            $cursor->addMonth();
        }

        return $created;
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private static function windowForMonth(int $year, int $month): array
    {
        $start = Carbon::create($year, $month, 1, 0, 0, 0);
        $end = (clone $start)->addMonth();

        return [$start, $end];
    }
}
