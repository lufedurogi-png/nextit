<?php

namespace App\Http\Controllers\Api\V1\Ventas;

use App\Http\Controllers\Controller;
use App\Models\Cotizacion;
use App\Models\User;
use App\Models\VentasCotizacion;
use App\Support\VentasFichaProductoEnricher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VentasClientesController extends Controller
{
    private const PER_PAGE = 10;

    /** Clientes ligados a cotizaciones creadas en ventas-cotizaciones (vendedor actual). */
    public function indexCrm(Request $request): JsonResponse
    {
        $q = mb_strtolower(trim((string) $request->query('q', '')));
        $sellerId = Auth::id();

        $cots = VentasCotizacion::query()
            ->where('user_id', $sellerId)
            ->with('clienteRegistrado:id,name,email')
            ->orderByDesc('updated_at')
            ->get();

        $registrados = [];
        $invitados = [];

        foreach ($cots as $c) {
            if ($c->cliente_user_id) {
                $id = (int) $c->cliente_user_id;
                if (! isset($registrados[$id])) {
                    $u = $c->clienteRegistrado;
                    $registrados[$id] = [
                        'kind' => 'registrado',
                        'cliente_user_id' => $id,
                        'name' => $u?->name ?? '—',
                        'email' => $u?->email ?? '—',
                        'telefono' => $c->invitado_telefono,
                        'cotizaciones_count' => 0,
                        'ultima_cotizacion_at' => null,
                        'total_cotizado' => 0.0,
                    ];
                }
                $registrados[$id]['cotizaciones_count']++;
                $registrados[$id]['total_cotizado'] += (float) $c->total;
                $ts = $c->updated_at?->toIso8601String() ?? $c->created_at?->toIso8601String();
                if ($ts && ($registrados[$id]['ultima_cotizacion_at'] === null || $ts > $registrados[$id]['ultima_cotizacion_at'])) {
                    $registrados[$id]['ultima_cotizacion_at'] = $ts;
                }
            } else {
                $email = mb_strtolower(trim((string) ($c->invitado_email ?? '')));
                $key = $email !== '' ? 'email:'.$email : 'sin-email:'.$c->id;
                if (! isset($invitados[$key])) {
                    $invitados[$key] = [
                        'kind' => 'invitado',
                        'cliente_user_id' => null,
                        'invitado_email' => $c->invitado_email,
                        'name' => $c->invitado_nombre ?: ($c->invitado_email ?: 'Prospecto'),
                        'email' => $c->invitado_email ?: '—',
                        'telefono' => $c->invitado_telefono,
                        'cotizaciones_count' => 0,
                        'ultima_cotizacion_at' => null,
                        'total_cotizado' => 0.0,
                    ];
                }
                $invitados[$key]['cotizaciones_count']++;
                $invitados[$key]['total_cotizado'] += (float) $c->total;
                $ts = $c->updated_at?->toIso8601String() ?? $c->created_at?->toIso8601String();
                if ($ts && ($invitados[$key]['ultima_cotizacion_at'] === null || $ts > $invitados[$key]['ultima_cotizacion_at'])) {
                    $invitados[$key]['ultima_cotizacion_at'] = $ts;
                }
            }
        }

        $rows = collect(array_merge(array_values($registrados), array_values($invitados)))
            ->map(fn (array $r) => [
                ...$r,
                'total_cotizado' => round($r['total_cotizado'], 2),
                'puede_chat' => $r['kind'] === 'registrado' && $r['cliente_user_id'] > 0,
            ])
            ->sortByDesc('ultima_cotizacion_at')
            ->values();

        if ($q !== '') {
            $rows = $rows->filter(function (array $r) use ($q) {
                return str_contains(mb_strtolower((string) $r['name']), $q)
                    || str_contains(mb_strtolower((string) $r['email']), $q);
            })->values();
        }

        return response()->json([
            'success' => true,
            ...$this->paginateCollection($rows, $request),
        ]);
    }

    /** Clientes con cotizaciones hechas desde su perfil en la tienda. */
    public function indexTienda(Request $request): JsonResponse
    {
        $q = mb_strtolower(trim((string) $request->query('q', '')));

        $aggregates = Cotizacion::query()
            ->selectRaw('user_id, COUNT(*) as cotizaciones_count, MAX(updated_at) as ultima, SUM(total) as total_cotizado')
            ->groupBy('user_id')
            ->orderByDesc('ultima')
            ->get();

        $userIds = $aggregates->pluck('user_id')->filter()->unique()->values();
        $users = User::query()->whereIn('id', $userIds)->get(['id', 'name', 'email'])->keyBy('id');

        $rows = $aggregates->map(function ($row) use ($users) {
            $u = $users->get($row->user_id);

            return [
                'kind' => 'tienda',
                'cliente_user_id' => (int) $row->user_id,
                'name' => $u?->name ?? '—',
                'email' => $u?->email ?? '—',
                'telefono' => null,
                'cotizaciones_count' => (int) $row->cotizaciones_count,
                'ultima_cotizacion_at' => $row->ultima ? (string) $row->ultima : null,
                'total_cotizado' => round((float) $row->total_cotizado, 2),
                'puede_chat' => true,
            ];
        })->values();

        if ($q !== '') {
            $rows = $rows->filter(function (array $r) use ($q) {
                return str_contains(mb_strtolower((string) $r['name']), $q)
                    || str_contains(mb_strtolower((string) $r['email']), $q);
            })->values();
        }

        return response()->json([
            'success' => true,
            ...$this->paginateCollection($rows, $request),
        ]);
    }

    /** Historial CRM (cotizaciones ventas del vendedor para un cliente o prospecto). */
    public function indexCrmCotizaciones(Request $request): JsonResponse
    {
        $sellerId = Auth::id();
        $clienteUserId = $request->query('cliente_user_id');
        $invitadoEmail = trim((string) $request->query('invitado_email', ''));

        $query = VentasCotizacion::query()
            ->where('user_id', $sellerId)
            ->orderByDesc('created_at');

        if ($clienteUserId) {
            $query->where('cliente_user_id', (int) $clienteUserId);
        } elseif ($invitadoEmail !== '') {
            $query->whereNull('cliente_user_id')
                ->where('invitado_email', $invitadoEmail);
        } else {
            return response()->json(['success' => false, 'message' => 'Indica cliente_user_id o invitado_email'], 422);
        }

        $rows = $query->get()->map(function (VentasCotizacion $c) {
            $folio = $c->folio ?: sprintf('CV-%s-%06d', $c->created_at?->format('Y') ?? date('Y'), $c->id);

            return [
                'tipo' => 'ventas',
                'id' => $c->id,
                'folio' => $folio,
                'total' => (float) $c->total,
                'created_at' => $c->created_at?->toIso8601String(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            ...$this->paginateCollection($rows, $request, 10),
        ]);
    }

    public function showCrmCotizacion(int $id): JsonResponse
    {
        $cot = VentasCotizacion::query()
            ->where('user_id', Auth::id())
            ->find($id);

        if (! $cot) {
            return response()->json(['success' => false, 'message' => 'Cotización no encontrada'], 404);
        }

        $folio = $cot->folio ?: sprintf('CV-%s-%06d', $cot->created_at?->format('Y') ?? date('Y'), $cot->id);
        $items = is_array($cot->items) ? $cot->items : [];

        return response()->json([
            'success' => true,
            'data' => [
                'tipo' => 'ventas',
                'id' => $cot->id,
                'folio' => $folio,
                'total' => (float) $cot->total,
                'comentario' => $cot->comentario,
                'descuento_general_pct' => (float) $cot->descuento_general_pct,
                'created_at' => $cot->created_at?->toIso8601String(),
                'items' => VentasFichaProductoEnricher::enrichItems($items),
            ],
        ]);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, mixed>  $rows
     * @return array{data: mixed, meta: array<string, int>}
     */
    private function paginateCollection($rows, Request $request, ?int $perPage = null): array
    {
        $perPage = $perPage ?? self::PER_PAGE;
        $page = max(1, (int) $request->query('page', 1));
        $total = $rows->count();
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min($page, $lastPage);

        return [
            'data' => $rows->slice(($page - 1) * $perPage, $perPage)->values()->all(),
            'meta' => [
                'current_page' => $page,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
            ],
        ];
    }
}
