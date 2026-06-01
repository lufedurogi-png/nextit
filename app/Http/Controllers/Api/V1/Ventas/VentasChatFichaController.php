<?php

namespace App\Http\Controllers\Api\V1\Ventas;

use App\Http\Controllers\Controller;
use App\Models\Cotizacion;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\User;
use App\Models\VentasClienteComentario;
use App\Models\VentasCotizacion;
use App\Support\VentasFichaProductoEnricher;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class VentasChatFichaController extends Controller
{
    private const PER_PAGE = 7;

    public function showCliente(int $userId): JsonResponse
    {
        $cliente = User::with('cliente')->find($userId, ['id', 'name', 'email']);
        if (! $cliente) {
            return response()->json(['success' => false, 'message' => 'Cliente no encontrado'], 404);
        }

        $telefono = $cliente->cliente?->telefono;
        if (! $telefono) {
            $telefono = $cliente->direccionesEnvio()->orderByDesc('id')->value('telefono');
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $cliente->id,
                'name' => $cliente->name,
                'email' => $cliente->email,
                'telefono' => $telefono,
            ],
        ]);
    }

    public function indexComentarios(Request $request, int $userId): JsonResponse
    {
        if (! $this->clienteExiste($userId)) {
            return response()->json(['success' => false, 'message' => 'Cliente no encontrado'], 404);
        }

        $q = trim((string) $request->query('q', ''));
        $query = VentasClienteComentario::query()
            ->where('seller_id', Auth::id())
            ->where('cliente_user_id', $userId)
            ->orderByDesc('created_at');

        if ($q !== '') {
            $like = '%'.addcslashes($q, '%_\\').'%';
            $query->where('body', 'like', $like);
        }

        $paginator = $query->paginate(self::PER_PAGE);

        return response()->json([
            'success' => true,
            'data' => $paginator->getCollection()->map(fn (VentasClienteComentario $c) => [
                'id' => $c->id,
                'body' => $c->body,
                'created_at' => $c->created_at?->toIso8601String(),
            ])->values()->all(),
            'meta' => $this->paginationMeta($paginator),
        ]);
    }

    public function storeComentario(Request $request, int $userId): JsonResponse
    {
        if (! $this->clienteExiste($userId)) {
            return response()->json(['success' => false, 'message' => 'Cliente no encontrado'], 404);
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $comentario = VentasClienteComentario::create([
            'seller_id' => Auth::id(),
            'cliente_user_id' => $userId,
            'body' => trim($validated['body']),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $comentario->id,
                'body' => $comentario->body,
                'created_at' => $comentario->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    public function indexPedidos(Request $request, int $userId): JsonResponse
    {
        if (! $this->clienteExiste($userId)) {
            return response()->json(['success' => false, 'message' => 'Cliente no encontrado'], 404);
        }

        $query = Pedido::query()
            ->where('user_id', $userId)
            ->orderByDesc('created_at');

        if ($request->filled('folio')) {
            $folio = trim((string) $request->query('folio'));
            $query->where('folio', 'like', '%'.addcslashes($folio, '%_\\').'%');
        }
        if ($request->filled('estatus') && $request->query('estatus') !== 'todos') {
            $query->where('estatus_pedido', $request->query('estatus'));
        }
        if ($request->filled('fecha_desde')) {
            $query->whereDate('fecha', '>=', $request->query('fecha_desde'));
        }
        if ($request->filled('fecha_hasta')) {
            $query->whereDate('fecha', '<=', $request->query('fecha_hasta'));
        }

        $paginator = $query->paginate(self::PER_PAGE);

        return response()->json([
            'success' => true,
            'data' => $paginator->getCollection()->map(fn (Pedido $p) => [
                'id' => $p->id,
                'folio' => $p->folio ?: ('#'.$p->id),
                'fecha' => $p->fecha?->format('Y-m-d') ?? $p->created_at?->format('Y-m-d'),
                'monto' => (float) $p->monto,
                'estado_pago' => $p->estado_pago,
                'estatus_pedido' => $p->estatus_pedido,
                'created_at' => $p->created_at?->toIso8601String(),
            ])->values()->all(),
            'meta' => $this->paginationMeta($paginator),
        ]);
    }

    public function showPedido(int $userId, int $pedidoId): JsonResponse
    {
        $pedido = Pedido::query()
            ->where('user_id', $userId)
            ->with(['items.itemEnvio', 'envio', 'direccionEnvio'])
            ->find($pedidoId);

        if (! $pedido) {
            return response()->json(['success' => false, 'message' => 'Pedido no encontrado'], 404);
        }

        $items = $pedido->items->map(fn (PedidoItem $i) => [
            'id' => $i->id,
            'clave' => $i->clave,
            'nombre_producto' => $i->nombre_producto,
            'cantidad' => (int) $i->cantidad,
            'precio_unitario' => (float) $i->precio_unitario,
            'subtotal' => (float) $i->subtotal,
        ])->all();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $pedido->id,
                'folio' => $pedido->folio ?: ('#'.$pedido->id),
                'fecha' => $pedido->fecha?->format('d-m-Y'),
                'monto' => (float) $pedido->monto,
                'metodo_pago' => $pedido->metodo_pago,
                'estado_pago' => $pedido->estado_pago,
                'estatus_pedido' => $pedido->estatus_pedido,
                'items' => VentasFichaProductoEnricher::enrichItems($items),
                'envio' => $pedido->envio ? [
                    'costo_envio' => (float) $pedido->envio->costo_envio,
                    'subtotal_productos' => (float) $pedido->envio->subtotal_productos,
                ] : null,
            ],
        ]);
    }

    public function downloadPedidoPdf(int $userId, int $pedidoId): Response|JsonResponse
    {
        $pedido = Pedido::query()
            ->where('user_id', $userId)
            ->with(['items.itemEnvio', 'envio', 'direccionEnvio', 'datosFacturacion', 'user'])
            ->find($pedidoId);

        if (! $pedido) {
            return response()->json(['success' => false, 'message' => 'Pedido no encontrado'], 404);
        }

        $pdf = Pdf::loadView('pdf.pedido', ['pedido' => $pedido]);
        $pdf->setPaper('a4', 'portrait');

        return $pdf->download('pedido-'.$pedido->folio.'.pdf');
    }

    public function indexCotizaciones(Request $request, int $userId): JsonResponse
    {
        if (! $this->clienteExiste($userId)) {
            return response()->json(['success' => false, 'message' => 'Cliente no encontrado'], 404);
        }

        $q = trim((string) $request->query('q', ''));
        $tipo = (string) $request->query('tipo', 'todos');
        $rows = collect();

        if ($tipo !== 'ventas') {
            $tiendaQuery = Cotizacion::query()->where('user_id', $userId);
            if ($q !== '') {
                $tiendaQuery->where('id', 'like', '%'.addcslashes(preg_replace('/\D/', '', $q) ?: $q, '%_\\').'%');
            }
            foreach ($tiendaQuery->orderByDesc('created_at')->get() as $c) {
                $rows->push([
                    'tipo' => 'tienda',
                    'id' => $c->id,
                    'folio' => 'CT-'.$c->id,
                    'total' => (float) $c->total,
                    'created_at' => $c->created_at?->toIso8601String() ?? '',
                ]);
            }
        }

        if ($tipo !== 'tienda') {
            $ventasQuery = VentasCotizacion::query()->where('cliente_user_id', $userId);
            if ($q !== '') {
                $like = '%'.addcslashes($q, '%_\\').'%';
                $ventasQuery->where(function ($w) use ($like, $q) {
                    $w->where('folio', 'like', $like)
                        ->orWhere('id', 'like', '%'.addcslashes(preg_replace('/\D/', '', $q) ?: $q, '%_\\').'%');
                });
            }
            foreach ($ventasQuery->orderByDesc('created_at')->get() as $c) {
                $folio = $c->folio ?: sprintf('CV-%s-%06d', $c->created_at?->format('Y') ?? date('Y'), $c->id);
                $rows->push([
                    'tipo' => 'ventas',
                    'id' => $c->id,
                    'folio' => $folio,
                    'total' => (float) $c->total,
                    'created_at' => $c->created_at?->toIso8601String() ?? '',
                ]);
            }
        }

        if ($q !== '' && $tipo === 'todos') {
            $ql = mb_strtolower($q);
            $rows = $rows->filter(fn ($r) => str_contains(mb_strtolower($r['folio']), $ql));
        }

        $sorted = $rows->sortByDesc('created_at')->values();
        $page = max(1, (int) $request->query('page', 1));
        $total = $sorted->count();
        $lastPage = max(1, (int) ceil($total / self::PER_PAGE));
        $page = min($page, $lastPage);
        $slice = $sorted->slice(($page - 1) * self::PER_PAGE, self::PER_PAGE)->values();

        return response()->json([
            'success' => true,
            'data' => $slice->all(),
            'meta' => [
                'current_page' => $page,
                'last_page' => $lastPage,
                'per_page' => self::PER_PAGE,
                'total' => $total,
            ],
        ]);
    }

    public function showCotizacion(int $userId, string $tipo, int $id): JsonResponse
    {
        if (! $this->clienteExiste($userId)) {
            return response()->json(['success' => false, 'message' => 'Cliente no encontrado'], 404);
        }

        if ($tipo === 'tienda') {
            $cot = Cotizacion::query()->where('user_id', $userId)->with('items')->find($id);
            if (! $cot) {
                return response()->json(['success' => false, 'message' => 'Cotización no encontrada'], 404);
            }
            $items = $cot->items->map(fn ($i) => [
                'clave' => $i->clave ?? null,
                'nombre_producto' => $i->nombre_producto,
                'cantidad' => (int) $i->cantidad,
                'precio_unitario' => (float) $i->precio_unitario,
                'subtotal' => round((int) $i->cantidad * (float) $i->precio_unitario, 2),
                'imagen' => $i->imagen,
            ])->all();

            return response()->json([
                'success' => true,
                'data' => [
                    'tipo' => 'tienda',
                    'id' => $cot->id,
                    'folio' => 'CT-'.$cot->id,
                    'total' => (float) $cot->total,
                    'created_at' => $cot->created_at?->toIso8601String(),
                    'items' => VentasFichaProductoEnricher::enrichItems($items),
                ],
            ]);
        }

        if ($tipo === 'ventas') {
            $cot = VentasCotizacion::query()->where('cliente_user_id', $userId)->find($id);
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

        return response()->json(['success' => false, 'message' => 'Tipo de cotización inválido'], 422);
    }

    public function downloadCotizacionTiendaPdf(int $userId, int $id): Response|JsonResponse
    {
        $cotizacion = Cotizacion::query()
            ->where('user_id', $userId)
            ->with('items')
            ->find($id);

        if (! $cotizacion) {
            return response()->json(['success' => false, 'message' => 'Cotización no encontrada'], 404);
        }

        $pdf = Pdf::loadView('pdf.cotizacion', ['cotizacion' => $cotizacion]);
        $pdf->setPaper('a4', 'portrait');

        return $pdf->download('cotizacion-'.$cotizacion->id.'.pdf');
    }

    private function clienteExiste(int $userId): bool
    {
        return User::whereKey($userId)->exists();
    }

    private function paginationMeta($paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ];
    }
}
