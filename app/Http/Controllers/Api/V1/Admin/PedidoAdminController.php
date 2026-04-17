<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Pedido;
use App\Models\PedidoItem;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PedidoAdminController extends Controller
{
    /**
     * Listar todos los pedidos (admin). Filtros: fecha_desde, fecha_hasta, pago, estatus, folio, cliente (búsqueda por nombre o email del usuario).
     */
    public function index(Request $request): JsonResponse
    {
        $q = Pedido::with(['items.itemEnvio', 'envio', 'user'])->orderByDesc('fecha');

        if ($request->filled('fecha_desde')) {
            $q->where('fecha', '>=', $request->fecha_desde);
        }
        if ($request->filled('fecha_hasta')) {
            $q->where('fecha', '<=', $request->fecha_hasta);
        }
        if ($request->filled('pago') && $request->pago !== 'todos') {
            $q->where('estado_pago', $request->pago);
        }
        if ($request->filled('estatus') && $request->estatus !== 'todos') {
            $q->where('estatus_pedido', $request->estatus);
        }
        if ($request->filled('folio')) {
            $q->where('folio', 'like', '%'.$request->folio.'%');
        }
        if ($request->filled('cliente')) {
            $term = trim($request->cliente);
            $q->whereHas('user', function ($userQuery) use ($term) {
                $userQuery->where('name', 'like', '%'.$term.'%')
                    ->orWhere('email', 'like', '%'.$term.'%');
            });
        }
        if ($request->filled('metodo_pago') && $request->metodo_pago !== 'todos') {
            $mp = trim((string) $request->metodo_pago);
            if ($mp !== '') {
                $q->where('metodo_pago', 'like', '%'.$mp.'%');
            }
        }

        $perPage = (int) $request->get('per_page', 10);
        $perPage = in_array($perPage, [5, 10, 25, 50, 100], true) ? $perPage : 10;
        $paginated = $q->paginate($perPage);

        $items = collect($paginated->items())->map(function (Pedido $p) {
            $user = $p->user;

            return [
                'id' => $p->id,
                'fecha' => $p->fecha->format('d-m-Y'),
                'folio' => $p->folio,
                'monto' => (float) $p->monto,
                'metodo_pago' => $p->metodo_pago,
                'estado_pago' => $p->estado_pago,
                'estatus_pedido' => $p->estatus_pedido,
                'user_id' => $user?->id,
                'user_name' => $user?->name,
                'user_email' => $user?->email,
                'envio' => $p->envio ? [
                    'costo_envio' => (float) $p->envio->costo_envio,
                    'subtotal_productos' => (float) $p->envio->subtotal_productos,
                    'fecha_entrega_centro' => $p->envio->fecha_entrega_centro?->format('Y-m-d'),
                    'fecha_entrega_desde' => $p->envio->fecha_entrega_desde?->format('Y-m-d'),
                    'fecha_entrega_hasta' => $p->envio->fecha_entrega_hasta?->format('Y-m-d'),
                ] : null,
                'items' => $p->items->map(fn (PedidoItem $i) => [
                    'id' => $i->id,
                    'nombre_producto' => $i->nombre_producto,
                    'cantidad' => $i->cantidad,
                    'precio_unitario' => (float) $i->precio_unitario,
                    'subtotal' => (float) $i->subtotal,
                    'envio_linea' => $i->itemEnvio ? [
                        'costo_envio_prorrateado' => (float) $i->itemEnvio->costo_envio_prorrateado,
                        'almacen_origen_label' => $i->itemEnvio->almacen_origen_label,
                        'almacen_cp_origen' => $i->itemEnvio->almacen_cp_origen,
                    ] : null,
                ])->all(),
            ];
        })->all();

        return response()->json([
            'success' => true,
            'data' => [
                'pedidos' => $items,
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
            ],
        ]);
    }

    /**
     * Ver detalle de un pedido (cualquier usuario). Solo admin.
     */
    public function show(int $id): JsonResponse
    {
        $pedido = Pedido::with(['items.itemEnvio', 'envio', 'direccionEnvio', 'datosFacturacion', 'user'])->find($id);
        if (! $pedido) {
            return response()->json(['success' => false, 'message' => 'Pedido no encontrado'], 404);
        }

        $d = $pedido;
        $data = [
            'id' => $d->id,
            'folio' => $d->folio,
            'fecha' => $d->fecha->format('d-m-Y'),
            'monto' => (float) $d->monto,
            'metodo_pago' => $d->metodo_pago,
            'estado_pago' => $d->estado_pago,
            'estatus_pedido' => $d->estatus_pedido,
            'user_id' => $d->user?->id,
            'user_name' => $d->user?->name,
            'user_email' => $d->user?->email,
            'items' => $d->items->map(fn (PedidoItem $i) => [
                'id' => $i->id,
                'nombre_producto' => $i->nombre_producto,
                'cantidad' => $i->cantidad,
                'precio_unitario' => (float) $i->precio_unitario,
                'subtotal' => (float) $i->subtotal,
                'envio_linea' => $i->itemEnvio ? [
                    'costo_envio_prorrateado' => (float) $i->itemEnvio->costo_envio_prorrateado,
                    'almacen_origen_label' => $i->itemEnvio->almacen_origen_label,
                    'almacen_cp_origen' => $i->itemEnvio->almacen_cp_origen,
                    'meta_linea' => $i->itemEnvio->meta_linea,
                ] : null,
            ])->all(),
            'envio' => $d->envio ? [
                'subtotal_productos' => (float) $d->envio->subtotal_productos,
                'costo_envio' => (float) $d->envio->costo_envio,
                'moneda' => $d->envio->moneda,
                'fecha_entrega_centro' => $d->envio->fecha_entrega_centro?->format('Y-m-d'),
                'fecha_entrega_desde' => $d->envio->fecha_entrega_desde?->format('Y-m-d'),
                'fecha_entrega_hasta' => $d->envio->fecha_entrega_hasta?->format('Y-m-d'),
                'detalle_cotizacion' => $d->envio->detalle_cotizacion,
            ] : null,
            'direccion_envio' => null,
            'datos_facturacion' => null,
        ];

        if ($d->direccionEnvio) {
            $de = $d->direccionEnvio;
            $data['direccion_envio'] = [
                'nombre' => $de->nombre,
                'calle' => $de->calle,
                'numero_exterior' => $de->numero_exterior,
                'numero_interior' => $de->numero_interior,
                'colonia' => $de->colonia,
                'ciudad' => $de->ciudad,
                'estado' => $de->estado,
                'codigo_postal' => $de->codigo_postal,
                'referencias' => $de->referencias,
                'telefono' => $de->telefono,
            ];
        }
        if ($d->datosFacturacion) {
            $df = $d->datosFacturacion;
            $data['datos_facturacion'] = [
                'razon_social' => $df->razon_social,
                'rfc' => $df->rfc,
                'calle' => $df->calle,
                'numero_exterior' => $df->numero_exterior,
                'numero_interior' => $df->numero_interior,
                'colonia' => $df->colonia,
                'ciudad' => $df->ciudad,
                'estado' => $df->estado,
                'codigo_postal' => $df->codigo_postal,
            ];
        }

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Descargar PDF de un pedido (cualquier usuario). Solo admin.
     */
    public function downloadPdf(int $id): Response|JsonResponse
    {
        $pedido = Pedido::with(['items.itemEnvio', 'envio', 'direccionEnvio', 'datosFacturacion', 'user'])->find($id);
        if (! $pedido) {
            return response()->json(['success' => false, 'message' => 'Pedido no encontrado'], 404);
        }

        $pdf = Pdf::loadView('pdf.pedido', ['pedido' => $pedido]);
        $pdf->setPaper('a4', 'portrait');

        return $pdf->download('pedido-'.$pedido->folio.'.pdf');
    }

    /**
     * Actualizar estatus del pedido (admin).
     */
    public function updateEstatusPedido(Request $request, int $id): JsonResponse
    {
        $valid = $request->validate([
            'estatus_pedido' => 'required|string|in:pendiente,en_proceso,enviado,completado,cancelado',
        ]);

        $pedido = Pedido::find($id);
        if (! $pedido) {
            return response()->json(['success' => false, 'message' => 'Pedido no encontrado'], 404);
        }

        $pedido->estatus_pedido = $valid['estatus_pedido'];
        $pedido->save();

        return response()->json([
            'success' => true,
            'message' => 'Estatus actualizado',
            'data' => [
                'id' => $pedido->id,
                'estatus_pedido' => $pedido->estatus_pedido,
            ],
        ]);
    }
}
