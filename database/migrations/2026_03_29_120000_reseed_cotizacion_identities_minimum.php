<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Próximos ids en cotizaciones y cotizacion_invitados ≥ config documentos.numero_inicial (p. ej. 1000).
 * Solo SQL Server (DBCC CHECKIDENT).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'sqlsrv') {
            return;
        }

        $min = max(1, (int) config('documentos.numero_inicial', 1000) - 1);

        foreach (['cotizaciones', 'cotizacion_invitados'] as $table) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            $maxId = (int) (DB::table($table)->max('id') ?? 0);
            $reseed = max($maxId, $min);
            DB::unprepared("DBCC CHECKIDENT ('{$table}', RESEED, {$reseed})");
        }
    }

    public function down(): void
    {
        // Irreversible: no restauramos identidades anteriores
    }
};
