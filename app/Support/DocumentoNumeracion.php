<?php

namespace App\Support;

use App\Models\Pedido;
use Illuminate\Support\Facades\DB;

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
}
