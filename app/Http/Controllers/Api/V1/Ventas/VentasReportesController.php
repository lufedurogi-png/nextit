<?php

namespace App\Http\Controllers\Api\V1\Ventas;

use App\Http\Controllers\Controller;
use App\Models\Cotizacion;
use App\Models\Pedido;
use App\Models\VentasCotizacion;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VentasReportesController extends Controller
{
    public function resumen(Request $request): JsonResponse
    {
        [$from, $to, $prevFrom, $prevTo] = $this->resolveRanges($request);
        $sellerId = Auth::id();

        $ventasCurrent = VentasCotizacion::query()
            ->where('user_id', $sellerId)
            ->with('clienteRegistrado:id,name,email')
            ->whereBetween('created_at', [$from, $to])
            ->get(['id', 'cliente_user_id', 'invitado_email', 'invitado_nombre', 'total', 'items', 'created_at']);

        $ventasPrev = VentasCotizacion::query()
            ->where('user_id', $sellerId)
            ->whereBetween('created_at', [$prevFrom, $prevTo])
            ->get(['id', 'total', 'created_at']);

        $clienteIds = $ventasCurrent
            ->pluck('cliente_user_id')
            ->filter(fn ($id) => $id != null)
            ->unique()
            ->values()
            ->all();

        $pedidosCurrent = Pedido::query()
            ->when($clienteIds !== [], fn ($q) => $q->whereIn('user_id', $clienteIds), fn ($q) => $q->whereRaw('1=0'))
            ->whereBetween('created_at', [$from, $to])
            ->get(['id', 'user_id', 'folio', 'monto', 'estado_pago', 'estatus_pedido', 'created_at']);

        $pedidosPrev = Pedido::query()
            ->when($clienteIds !== [], fn ($q) => $q->whereIn('user_id', $clienteIds), fn ($q) => $q->whereRaw('1=0'))
            ->whereBetween('created_at', [$prevFrom, $prevTo])
            ->get(['id', 'monto', 'created_at']);

        $tiendaCotCurrent = Cotizacion::query()
            ->when($clienteIds !== [], fn ($q) => $q->whereIn('user_id', $clienteIds), fn ($q) => $q->whereRaw('1=0'))
            ->whereBetween('created_at', [$from, $to])
            ->get(['id', 'user_id', 'total', 'created_at']);

        $kpisCurrent = [
            'cotizaciones_ventas' => $ventasCurrent->count(),
            'cotizaciones_tienda' => $tiendaCotCurrent->count(),
            'monto_cotizado' => round((float) $ventasCurrent->sum('total'), 2),
            'pedidos' => $pedidosCurrent->count(),
            'monto_pedidos' => round((float) $pedidosCurrent->sum('monto'), 2),
            'ticket_promedio' => $pedidosCurrent->count() > 0
                ? round((float) $pedidosCurrent->sum('monto') / $pedidosCurrent->count(), 2)
                : 0.0,
        ];
        $kpisCurrent['tasa_cierre_pct'] = $kpisCurrent['cotizaciones_ventas'] > 0
            ? round(($kpisCurrent['pedidos'] / $kpisCurrent['cotizaciones_ventas']) * 100, 2)
            : 0.0;

        $kpisPrev = [
            'cotizaciones_ventas' => $ventasPrev->count(),
            'monto_cotizado' => round((float) $ventasPrev->sum('total'), 2),
            'pedidos' => $pedidosPrev->count(),
            'monto_pedidos' => round((float) $pedidosPrev->sum('monto'), 2),
            'ticket_promedio' => $pedidosPrev->count() > 0
                ? round((float) $pedidosPrev->sum('monto') / $pedidosPrev->count(), 2)
                : 0.0,
        ];
        $kpisPrev['tasa_cierre_pct'] = $kpisPrev['cotizaciones_ventas'] > 0
            ? round(($kpisPrev['pedidos'] / $kpisPrev['cotizaciones_ventas']) * 100, 2)
            : 0.0;

        $topClientes = $ventasCurrent
            ->groupBy(function (VentasCotizacion $c) {
                if ($c->cliente_user_id) {
                    return 'u:'.$c->cliente_user_id;
                }
                $email = mb_strtolower(trim((string) ($c->invitado_email ?? '')));

                return $email !== '' ? 'i:'.$email : 'i:sin-email';
            })
            ->map(function ($rows, $key) {
                /** @var VentasCotizacion $first */
                $first = $rows->first();
                $isUser = str_starts_with((string) $key, 'u:');

                return [
                    'key' => $key,
                    'name' => $isUser
                        ? ($first->clienteRegistrado?->name ?? ('Cliente #'.$first->cliente_user_id))
                        : ($first->invitado_nombre ?: ($first->invitado_email ?: 'Prospecto')),
                    'email' => $isUser
                        ? ($first->clienteRegistrado?->email ?? null)
                        : ($first->invitado_email ?: null),
                    'cotizaciones' => $rows->count(),
                    'monto' => round((float) $rows->sum('total'), 2),
                ];
            })
            ->sortByDesc('monto')
            ->values()
            ->take(8)
            ->all();

        $productMap = [];
        foreach ($ventasCurrent as $cot) {
            $items = is_array($cot->items) ? $cot->items : [];
            foreach ($items as $it) {
                $clave = trim((string) ($it['clave'] ?? ''));
                if ($clave === '') {
                    continue;
                }
                if (! isset($productMap[$clave])) {
                    $productMap[$clave] = [
                        'clave' => $clave,
                        'nombre' => (string) ($it['nombre_producto'] ?? $clave),
                        'cantidad' => 0,
                        'monto' => 0.0,
                    ];
                }
                $qty = (int) ($it['cantidad'] ?? 0);
                $subtotal = isset($it['subtotal']) ? (float) $it['subtotal'] : $qty * (float) ($it['precio_unitario'] ?? 0);
                $productMap[$clave]['cantidad'] += max(0, $qty);
                $productMap[$clave]['monto'] += max(0, $subtotal);
            }
        }
        $topProductos = collect(array_values($productMap))
            ->map(fn ($r) => ['clave' => $r['clave'], 'nombre' => $r['nombre'], 'cantidad' => $r['cantidad'], 'monto' => round((float) $r['monto'], 2)])
            ->sortByDesc('monto')
            ->values()
            ->take(10)
            ->all();

        $detalle = $ventasCurrent
            ->sortByDesc('created_at')
            ->values()
            ->take(30)
            ->map(function (VentasCotizacion $c) use ($pedidosCurrent) {
                $pedidoAsociado = null;
                if ($c->cliente_user_id) {
                    $pedidoAsociado = $pedidosCurrent
                        ->where('user_id', $c->cliente_user_id)
                        ->sortBy('created_at')
                        ->first();
                }

                return [
                    'tipo' => 'ventas',
                    'folio' => $c->folio ?: sprintf('CV-%s-%06d', $c->created_at?->format('Y') ?? date('Y'), $c->id),
                    'cliente' => $c->cliente_user_id
                        ? ($c->clienteRegistrado?->name ?? ('Cliente #'.$c->cliente_user_id))
                        : ($c->invitado_nombre ?: ($c->invitado_email ?: 'Prospecto')),
                    'email' => $c->cliente_user_id ? ($c->clienteRegistrado?->email ?? null) : $c->invitado_email,
                    'total' => (float) $c->total,
                    'fecha' => $c->created_at?->toIso8601String(),
                    'pedido_folio' => $pedidoAsociado?->folio,
                    'pedido_monto' => $pedidoAsociado ? (float) $pedidoAsociado->monto : null,
                ];
            })
            ->all();

        return response()->json([
            'success' => true,
            'data' => [
                'range' => [
                    'from' => $from->toDateString(),
                    'to' => $to->toDateString(),
                    'prev_from' => $prevFrom->toDateString(),
                    'prev_to' => $prevTo->toDateString(),
                ],
                'kpis' => [
                    'current' => $kpisCurrent,
                    'previous' => $kpisPrev,
                ],
                'top_clientes' => $topClientes,
                'top_productos' => $topProductos,
                'detalle' => $detalle,
            ],
        ]);
    }

    /**
     * @return array{0: Carbon, 1: Carbon, 2: Carbon, 3: Carbon}
     */
    private function resolveRanges(Request $request): array
    {
        $period = (string) $request->query('period', 'mes');
        $fromInput = $request->query('from');
        $toInput = $request->query('to');

        if ($fromInput && $toInput) {
            $from = Carbon::parse((string) $fromInput)->startOfDay();
            $to = Carbon::parse((string) $toInput)->endOfDay();
        } else {
            $now = Carbon::now();
            if ($period === 'anio') {
                $from = $now->copy()->startOfYear()->startOfDay();
                $to = $now->copy()->endOfYear()->endOfDay();
            } elseif ($period === 'trimestre') {
                $from = $now->copy()->startOfQuarter()->startOfDay();
                $to = $now->copy()->endOfQuarter()->endOfDay();
            } else {
                $from = $now->copy()->startOfMonth()->startOfDay();
                $to = $now->copy()->endOfMonth()->endOfDay();
            }
        }

        $days = $from->diffInDays($to) + 1;
        $prevTo = $from->copy()->subDay()->endOfDay();
        $prevFrom = $prevTo->copy()->subDays(max(1, $days) - 1)->startOfDay();

        return [$from, $to, $prevFrom, $prevTo];
    }
}

