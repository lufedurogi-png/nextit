<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\CotizacionInvitado;
use App\Models\CotizacionInvitadoItem;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AdminCotizacionInvitadoController extends Controller
{
    private static function formatItem(CotizacionInvitadoItem $i): array
    {
        return [
            'clave' => $i->clave,
            'cantidad' => $i->cantidad,
            'nombre_producto' => $i->nombre_producto,
            'precio_unitario' => (float) $i->precio_unitario,
            'subtotal' => (float) ($i->cantidad * $i->precio_unitario),
            'imagen' => $i->imagen,
        ];
    }

    private static function formatCotizacion(CotizacionInvitado $c, bool $withItems = false): array
    {
        $createdAt = $c->created_at ? $c->created_at->format('c') : null;

        $row = [
            'id' => $c->id,
            'folio' => $c->id,
            'email' => $c->email,
            'fecha' => $createdAt,
            'total' => (float) $c->total,
        ];

        if ($withItems) {
            $row['items'] = $c->items->map(fn (CotizacionInvitadoItem $i) => self::formatItem($i))->all();
        }

        return $row;
    }

    public function emailsDistinct(): JsonResponse
    {
        $emails = CotizacionInvitado::query()
            ->select('email')
            ->distinct()
            ->orderBy('email')
            ->pluck('email')
            ->values()
            ->all();

        return response()->json([
            'success' => true,
            'data' => [
                'emails' => $emails,
            ],
        ]);
    }

    private static function applyInvitadoFilters(Builder $query, Request $request): void
    {
        $email = $request->query('email');
        if (is_string($email)) {
            $email = trim($email);
            if ($email !== '' && strcasecmp($email, 'todos') !== 0) {
                $query->where('email', $email);
            }
        }

        $fd = $request->query('fecha_desde');
        if (is_string($fd) && trim($fd) !== '') {
            try {
                $query->where('created_at', '>=', Carbon::parse($fd)->startOfDay());
            } catch (\Throwable) {
                // ignorar fecha inválida
            }
        }

        $fh = $request->query('fecha_hasta');
        if (is_string($fh) && trim($fh) !== '') {
            try {
                $query->where('created_at', '<=', Carbon::parse($fh)->endOfDay());
            } catch (\Throwable) {
                // ignorar fecha inválida
            }
        }

        $folio = $request->query('folio');
        if (! is_string($folio)) {
            return;
        }
        $folio = trim($folio);
        if ($folio === '') {
            return;
        }

        if (ctype_digit($folio)) {
            $query->where('id', (int) $folio);

            return;
        }

        $digits = preg_replace('/\D+/', '', $folio);
        if ($digits === '') {
            return;
        }

        $driver = $query->getConnection()->getDriverName();
        $castExpr = match ($driver) {
            'sqlsrv' => 'CAST(id AS VARCHAR(30))',
            'pgsql' => 'CAST(id AS TEXT)',
            default => 'CAST(id AS CHAR)',
        };
        $query->whereRaw("$castExpr LIKE ?", ['%'.$digits.'%']);
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = min(100, max(1, (int) $request->query('per_page', 15)));
        $page = max(1, (int) $request->query('page', 1));

        $query = CotizacionInvitado::query()->orderByDesc('created_at');
        self::applyInvitadoFilters($query, $request);

        $paginator = $query->paginate($perPage, ['*'], 'page', $page);

        $data = $paginator->getCollection()->map(fn (CotizacionInvitado $c) => self::formatCotizacion($c, false))->all();

        return response()->json([
            'success' => true,
            'data' => [
                'cotizaciones' => $data,
                'total' => $paginator->total(),
                'per_page' => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $cotizacion = CotizacionInvitado::with('items')->find($id);
        if (! $cotizacion) {
            return response()->json(['success' => false, 'message' => 'Cotización no encontrada.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => self::formatCotizacion($cotizacion, true),
        ]);
    }

    public function downloadPdf(int $id): Response|JsonResponse
    {
        $cotizacion = CotizacionInvitado::with('items')->find($id);
        if (! $cotizacion) {
            return response()->json(['success' => false, 'message' => 'Cotización no encontrada.'], 404);
        }

        $pdf = Pdf::loadView('pdf.cotizacion_invitado', ['cotizacion' => $cotizacion]);
        $pdf->setPaper('a4', 'portrait');

        return $pdf->download('cotizacion-invitado-'.$cotizacion->id.'.pdf');
    }
}
