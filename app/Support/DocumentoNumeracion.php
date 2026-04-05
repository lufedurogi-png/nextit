<?php

namespace App\Support;

use App\Models\Cotizacion;
use App\Models\CotizacionInvitado;
use App\Models\Pedido;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DocumentoNumeracion
{
    /**
     * Siguiente folio de pedido (6 dígitos, mínimo según config documentos.numero_inicial).
     */
    public static function siguienteFolioPedido(): string
    {
        $min = (int) config('documentos.numero_inicial', 1000);
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlsrv') {
            // TRY_CONVERT evita error si existe algún folio no numérico histórico.
            $ultimoFolio = Pedido::withTrashed()
                ->selectRaw('MAX(TRY_CONVERT(bigint, folio)) as max_folio')
                ->value('max_folio');
        } else {
            $ultimoFolio = Pedido::withTrashed()->pluck('folio')
                ->filter(fn ($f) => is_string($f) && ctype_digit($f))
                ->map(fn ($f) => (int) $f)
                ->max();
        }
        $ultimo = is_numeric($ultimoFolio) ? (int) $ultimoFolio : 0;
        $n = max($min, $ultimo + 1);

        return str_pad((string) $n, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Siguiente id/folio de cotización (usuarios registrados e invitados comparten secuencia).
     * Debe llamarse dentro de una transacción; usa lockForUpdate sobre el último registro de cada tabla.
     *
     * @return int max(DOCUMENTO_NUMERO_INICIAL, max(id cotizaciones con papelera), max(id invitados)) + 1
     */
    public static function reservarSiguienteIdCotizacion(): int
    {
        $min = max(1, (int) config('documentos.numero_inicial', 1000));

        $maxInv = 0;
        if (Schema::hasTable('cotizacion_invitados')) {
            $maxInv = (int) (CotizacionInvitado::query()->orderByDesc('id')->lockForUpdate()->value('id') ?? 0);
        }

        $maxCot = (int) (Cotizacion::withTrashed()->orderByDesc('id')->lockForUpdate()->value('id') ?? 0);
        $ultimo = max($maxInv, $maxCot);

        return max($min, $ultimo + 1);
    }

    /**
     * INSERT con id explícito (SQL Server requiere IDENTITY_INSERT).
     */
    public static function guardarModeloConIdExplicito(Model $modelo): void
    {
        $tabla = $modelo->getTable();
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlsrv') {
            $seguro = '['.str_replace(']', ']]', $tabla).']';
            DB::unprepared("SET IDENTITY_INSERT {$seguro} ON");
            try {
                $modelo->save();
            } finally {
                DB::unprepared("SET IDENTITY_INSERT {$seguro} OFF");
            }

            return;
        }

        $modelo->save();
    }

    public static function esViolacionClavePrimariaDuplicada(QueryException $e): bool
    {
        $sqlState = $e->errorInfo[0] ?? '';
        $code = (int) ($e->errorInfo[1] ?? 0);
        if (in_array($sqlState, ['23000', '23505'], true)) {
            return true;
        }
        if (in_array($code, [1062, 19, 2627, 2601], true)) {
            return true;
        }
        $msg = strtolower($e->getMessage());

        return str_contains($msg, 'duplicate')
            || str_contains($msg, 'unique constraint')
            || str_contains($msg, 'primary key')
            || str_contains($msg, 'violación de la restricción');
    }
}
