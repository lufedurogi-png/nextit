<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlanRevenueMonthlySnapshot;
use App\Services\PlanMonthlyRevenueSnapshotService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class AdminPlanRevenueController extends Controller
{
    public function currentMonth(): JsonResponse
    {
        PlanMonthlyRevenueSnapshotService::syncAllMissingThroughLastCompletedMonth();

        $now = Carbon::now();
        $payload = PlanMonthlyRevenueSnapshotService::aggregateMonth($now->year, $now->month);

        return response()->json([
            'success' => true,
            'data' => $payload + [
                'labels' => [
                    'title' => 'Mes en curso ('.sprintf('%04d-%02d', $now->year, $now->month).')',
                    'note' => 'Solo se muestran movimientos del mes calendario actual. Al terminar el mes, el sistema registra el informe final y aquí verás el mes siguiente desde cero.',
                ],
            ],
        ]);
    }

    public function reportsIndex(): JsonResponse
    {
        PlanMonthlyRevenueSnapshotService::syncAllMissingThroughLastCompletedMonth();

        $rows = PlanRevenueMonthlySnapshot::query()
            ->orderByDesc('year')
            ->orderByDesc('month')
            ->limit(240)
            ->get(['year', 'month', 'payload', 'created_at']);

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }
}
