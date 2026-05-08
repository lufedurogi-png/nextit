<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ScanUsageEvent;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminScanUsageController extends Controller
{
    private const FREE_SCANS_PER_MONTH = 1000;
    private const USD_PER_PAID_SCAN = 0.0015;

    public function overview(Request $request): JsonResponse
    {
        [$monthStart, $monthEnd] = $this->resolveMonthRange($request);
        $report = $this->buildMonthlyReport($monthStart, $monthEnd);

        return response()->json([
            'success' => true,
            'data' => [
                'period' => [
                    'year' => (int) $monthStart->year,
                    'month' => (int) $monthStart->month,
                    'month_label' => ucfirst($monthStart->translatedFormat('F Y')),
                    'start' => $monthStart->toDateString(),
                    'end' => $monthEnd->toDateString(),
                ],
                'free_limit' => self::FREE_SCANS_PER_MONTH,
                'paid_usd_per_scan' => self::USD_PER_PAID_SCAN,
                'usd_to_mxn' => $this->usdToMxnRate(),
                'totals' => [
                    'total_scans' => $report['total_scans'],
                    'free_scans' => $report['free_scans'],
                    'paid_scans' => $report['paid_scans'],
                    'cost_usd' => $this->formatMoney($report['cost_usd']),
                    'cost_mxn' => $this->formatMoney($report['cost_mxn']),
                ],
                'daily' => $report['daily'],
            ],
        ]);
    }

    public function yearlyHistory(Request $request): JsonResponse
    {
        $year = max(2024, min(2100, (int) ($request->query('year') ?: now()->year)));
        Carbon::setLocale('es');

        $rows = [];
        for ($month = 1; $month <= 12; $month++) {
            $monthStart = Carbon::create($year, $month, 1)->startOfMonth();
            $monthEnd = $monthStart->copy()->endOfMonth();
            $report = $this->buildMonthlyReport($monthStart, $monthEnd);

            $rows[] = [
                'year' => $year,
                'month' => $month,
                'month_label' => ucfirst($monthStart->translatedFormat('F Y')),
                'free_scans' => $report['free_scans'],
                'paid_scans' => $report['paid_scans'],
                'total_scans' => $report['total_scans'],
                'cost_usd' => $this->formatMoney($report['cost_usd']),
                'cost_mxn' => $this->formatMoney($report['cost_mxn']),
            ];
        }

        $years = ScanUsageEvent::query()
            ->selectRaw('DISTINCT YEAR(created_at) as y')
            ->orderByDesc('y')
            ->pluck('y')
            ->map(fn ($y) => (int) $y)
            ->values()
            ->all();

        if (! in_array($year, $years, true)) {
            $years[] = $year;
            rsort($years);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'year' => $year,
                'years' => array_values(array_unique($years)),
                'rows' => $rows,
            ],
        ]);
    }

    public function usersMonthly(Request $request): JsonResponse
    {
        [$monthStart, $monthEnd] = $this->resolveMonthRange($request);
        $search = trim((string) $request->query('search', ''));

        $users = User::query()
            ->select(['id', 'name', 'email', 'scanner_enabled'])
            ->withCount([
                'scanUsageEvents as scans_this_month' => function ($q) use ($monthStart, $monthEnd) {
                    $q->whereBetween('created_at', [$monthStart, $monthEnd]);
                },
            ])
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($w) use ($search) {
                    $w->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%');
                });
            })
            ->orderByDesc('scans_this_month')
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'scanner_enabled' => (bool) $u->scanner_enabled,
                'scans_this_month' => (int) $u->scans_this_month,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'period' => [
                    'year' => (int) $monthStart->year,
                    'month' => (int) $monthStart->month,
                    'month_label' => ucfirst($monthStart->translatedFormat('F Y')),
                ],
                'users' => $users,
            ],
        ]);
    }

    public function setUserScannerState(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'scanner_enabled' => ['required', 'boolean'],
        ]);

        $user->scanner_enabled = (bool) $validated['scanner_enabled'];
        $user->save();

        return response()->json([
            'success' => true,
            'message' => $user->scanner_enabled
                ? 'Escáner reanudado para el usuario.'
                : 'Escáner pausado para el usuario.',
            'data' => [
                'id' => $user->id,
                'scanner_enabled' => (bool) $user->scanner_enabled,
            ],
        ]);
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function resolveMonthRange(Request $request): array
    {
        $year = max(2024, min(2100, (int) ($request->query('year') ?: now()->year)));
        $month = max(1, min(12, (int) ($request->query('month') ?: now()->month)));

        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end = $start->copy()->endOfMonth();

        return [$start, $end];
    }

    /**
     * @return array{
     *     total_scans:int,
     *     free_scans:int,
     *     paid_scans:int,
     *     cost_usd:float,
     *     cost_mxn:float,
     *     daily:list<array{day:int, free_scans:int, paid_scans:int, total_scans:int}>
     * }
     */
    private function buildMonthlyReport(Carbon $monthStart, Carbon $monthEnd): array
    {
        $events = ScanUsageEvent::query()
            ->whereBetween('created_at', [$monthStart, $monthEnd])
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['id', 'created_at']);

        $dailyMap = [];
        $freeScans = 0;
        $paidScans = 0;
        $limit = self::FREE_SCANS_PER_MONTH;

        foreach ($events as $index => $event) {
            $day = (int) Carbon::parse($event->created_at)->day;
            if (! isset($dailyMap[$day])) {
                $dailyMap[$day] = ['day' => $day, 'free_scans' => 0, 'paid_scans' => 0, 'total_scans' => 0];
            }

            $isFree = $index < $limit;
            if ($isFree) {
                $freeScans++;
                $dailyMap[$day]['free_scans']++;
            } else {
                $paidScans++;
                $dailyMap[$day]['paid_scans']++;
            }
            $dailyMap[$day]['total_scans']++;
        }

        $daysInMonth = (int) $monthStart->daysInMonth;
        $daily = [];
        for ($day = 1; $day <= $daysInMonth; $day++) {
            $daily[] = $dailyMap[$day] ?? ['day' => $day, 'free_scans' => 0, 'paid_scans' => 0, 'total_scans' => 0];
        }

        $costUsd = $paidScans * self::USD_PER_PAID_SCAN;
        $costMxn = $costUsd * $this->usdToMxnRate();

        return [
            'total_scans' => $events->count(),
            'free_scans' => $freeScans,
            'paid_scans' => $paidScans,
            'cost_usd' => $costUsd,
            'cost_mxn' => $costMxn,
            'daily' => $daily,
        ];
    }

    private function usdToMxnRate(): float
    {
        $value = (float) env('VISION_USD_TO_MXN', 17.0);

        return $value > 0 ? $value : 17.0;
    }

    private function formatMoney(float $value): float
    {
        return round($value, 2);
    }
}
