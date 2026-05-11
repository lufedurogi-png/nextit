<?php

namespace App\Console\Commands;

use App\Services\PlanMonthlyRevenueSnapshotService;
use Illuminate\Console\Command;

class ArchivePlanMonthlyRevenueCommand extends Command
{
    protected $signature = 'plan:archive-monthly-revenue';

    protected $description = 'Genera informes mensuales de ganancias (plan Pro) para todos los meses cerrados que aún no tengan registro.';

    public function handle(): int
    {
        $n = PlanMonthlyRevenueSnapshotService::syncAllMissingThroughLastCompletedMonth();
        $this->info("Informes nuevos creados: {$n}");

        return self::SUCCESS;
    }
}
