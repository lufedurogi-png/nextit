<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CarritoItem;
use App\Models\DatoFacturacion;
use App\Models\DireccionEnvio;
use App\Models\Pedido;
use App\Models\ProductoCva;
use App\Models\ProductoManual;
use App\Services\CarritoEnvioCotizacionService;
use App\Services\MargenVentaService;
use App\Services\PedidoEnvioPersistService;
use App\Services\ProductoStockService;
use App\Support\CatalogStockCache;
use App\Support\DocumentoNumeracion;
use App\Support\MetodoPagoToggle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CarritoController extends Controller
{
    public function __construct(
        private readonly ProductoStockService $productoStock,
        private readonly MargenVentaService $margenVenta,
        private readonly CarritoEnvioCotizacionService $carritoEnvioCotizacion,
        private readonly PedidoEnvioPersistService $pedidoEnvioPersist,
    ) {}

    private const CART_INDEX_CACHE_TTL = 15;

    /** Mismo TTL/clave que ProductoController (caché compartido). */
    private const PRODUCTO_CACHE_TTL = 120;

    private const PRODUCTO_SELECT = [
        'id', 'clave', 'codigo_fabricante', 'descripcion', 'grupo', 'marca',
        'precio', 'moneda', 'imagen', 'imagenes', 'disponible', 'disponible_cd', 'garantia',
    ];

    private static function cartCacheKey(int $userId): string
    {
        return 'carrito_index_'.$userId;
    }

    private static function productoCacheKey(string $clave): string
    {
        return CatalogStockCache::key('producto_por_clave_'.md5($clave).'_'.$clave);
    }

    /** Misma estructura que ProductoController para reusar caché. */
    private function formatProductoForList(ProductoCva|ProductoManual $p): array
    {
        return [
            'id' => $p->id,
            'clave' => $p->clave,
            'codigo_fabricante' => $p->codigo_fabricante,
            'descripcion' => $p->descripcion,
            'grupo' => $p->grupo,
            'marca' => $p->marca,
            'precio' => $this->margenVenta->aplicarMargen((float) $p->precio),
            'moneda' => $p->moneda,
            'imagen' => $p->imagen,
            'imagenes' => $p->imagenes ?? [],
            'disponible' => $p->disponible,
            'disponible_cd' => $p->disponible_cd,
            'garantia' => $p->garantia,
        ];
    }

    /** Items del carrito con imagen y stock (una petición, usa caché). */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $key = self::cartCacheKey($user->id);
        $response = Cache::remember($key, self::CART_INDEX_CACHE_TTL, function () use ($user) {
            $items = $user->carritoItems()->orderBy('updated_at', 'desc')->get();
            $claves = $items->pluck('clave')->unique()->values()->all();

            $byClave = [];
            $missing = [];
            foreach ($claves as $c) {
                $cacheKey = self::productoCacheKey($c);
                $cached = Cache::get($cacheKey);
                if ($cached !== null && is_array($cached)) {
                    $byClave[$c] = $cached;
                } else {
                    $missing[] = $c;
                }
            }
            if (! empty($missing)) {
                $cvaClaves = array_filter($missing, fn ($c) => ! str_starts_with($c, 'MANUAL-'));
                $manualClaves = array_filter($missing, fn ($c) => str_starts_with($c, 'MANUAL-'));
                if (! empty($cvaClaves)) {
                    $fresh = ProductoCva::query()->select(self::PRODUCTO_SELECT)->whereIn('clave', $cvaClaves)->get();
                    foreach ($fresh as $p) {
                        $formatted = $this->formatProductoForList($p);
                        $byClave[$p->clave] = $formatted;
                        Cache::put(self::productoCacheKey($p->clave), $formatted, self::PRODUCTO_CACHE_TTL);
                    }
                }
                if (! empty($manualClaves)) {
                    $manual = ProductoManual::query()->select(self::PRODUCTO_SELECT)->whereIn('clave', $manualClaves)->where('anulado', false)->get();
                    foreach ($manual as $p) {
                        $formatted = $this->formatProductoForList($p);
                        $byClave[$p->clave] = $formatted;
                        Cache::put(self::productoCacheKey($p->clave), $formatted, self::PRODUCTO_CACHE_TTL);
                    }
                }
            }

            $vendidos = $this->productoStock->cantidadesVendidasPorClaves($claves);

            $data = [];
            foreach ($items as $i) {
                $raw = $byClave[$i->clave] ?? null;
                $producto = $raw
                    ? $this->productoStock->aplicarStockMostrado($raw, (int) ($vendidos[$i->clave] ?? 0))
                    : null;
                $imagen = $producto['imagen'] ?? null;
                if ($producto !== null && empty($imagen) && ! empty($producto['imagenes'][0] ?? null)) {
                    $imagen = $producto['imagenes'][0];
                }
                $disponible = (int) ($producto['disponible'] ?? 0);
                $disponibleCd = (int) ($producto['disponible_cd'] ?? 0);
                $data[] = [
                    'clave' => $i->clave,
                    'nombre_producto' => $producto['descripcion'] ?? $i->nombre_producto,
                    'cantidad' => $i->cantidad,
                    'precio_unitario' => (float) $i->precio_unitario,
                    'subtotal' => (float) ($i->cantidad * $i->precio_unitario),
                    'imagen' => $imagen,
                    'imagenes' => $producto['imagenes'] ?? [],
                    'disponible' => $disponible,
                    'disponible_cd' => $disponibleCd,
                ];
            }
            $total = $items->sum(fn (CarritoItem $i) => $i->cantidad * $i->precio_unitario);

            return [
                'success' => true,
                'data' => [
                    'items' => $data,
                    'total' => round($total, 2),
                ],
            ];
        });

        return response()->json($response);
    }

    /** Agregar o actualizar item (clave, cantidad). */
    public function store(Request $request): JsonResponse
    {
        $valid = $request->validate([
            'clave' => 'required|string|max:100',
            'cantidad' => 'required|integer|min:1|max:9999',
        ]);

        $producto = null;
        if (str_starts_with($valid['clave'], 'MANUAL-')) {
            $producto = ProductoManual::where('clave', $valid['clave'])->where('anulado', false)->first();
        } else {
            $producto = ProductoCva::where('clave', $valid['clave'])->first();
        }
        if (! $producto) {
            return response()->json([
                'success' => false,
                'message' => 'Producto no encontrado.',
            ], 404);
        }

        $user = Auth::user();
        $item = $user->carritoItems()->where('clave', $valid['clave'])->first();

        $nombre = $producto->descripcion ?? $valid['clave'];
        $precio = $this->margenVenta->aplicarMargen((float) $producto->precio);

        $d0 = (int) ($producto->disponible ?? 0);
        $cd0 = (int) ($producto->disponible_cd ?? 0);
        $maxQty = $this->productoStock->stockEfectivoTotal($valid['clave'], $d0, $cd0);
        if ((int) $valid['cantidad'] > $maxQty) {
            return response()->json([
                'success' => false,
                'message' => 'Stock insuficiente (máx. '.$maxQty.').',
            ], 422);
        }

        if ($item) {
            $item->update([
                'cantidad' => (int) $valid['cantidad'],
                'nombre_producto' => $nombre,
                'precio_unitario' => $precio,
            ]);
        } else {
            $user->carritoItems()->create([
                'clave' => $valid['clave'],
                'nombre_producto' => $nombre,
                'cantidad' => (int) $valid['cantidad'],
                'precio_unitario' => $precio,
            ]);
        }

        Cache::forget(self::cartCacheKey($user->id));

        return $this->index($request);
    }

    /** Carrito solo con items (sin datos de producto). */
    private function cartResponseSimple($user): array
    {
        $items = $user->carritoItems()->orderBy('updated_at', 'desc')->get();
        $data = $items->map(fn (CarritoItem $i) => [
            'clave' => $i->clave,
            'nombre_producto' => $i->nombre_producto,
            'cantidad' => $i->cantidad,
            'precio_unitario' => (float) $i->precio_unitario,
            'subtotal' => (float) ($i->cantidad * $i->precio_unitario),
        ])->all();
        $total = $items->sum(fn (CarritoItem $i) => $i->cantidad * $i->precio_unitario);

        return [
            'success' => true,
            'data' => [
                'items' => $data,
                'total' => round($total, 2),
            ],
        ];
    }

    /** Quitar item; respuesta solo con items (front mantiene imagen/stock en memoria). */
    public function destroy(string $clave): JsonResponse
    {
        $user = Auth::user();
        $user->carritoItems()->where('clave', $clave)->delete();
        Cache::forget(self::cartCacheKey($user->id));

        return response()->json($this->cartResponseSimple($user));
    }

    /**
     * Reemplaza por completo el carrito del usuario (p. ej. antes de pagar una cotización vía PayPal).
     * Valida existencia de producto y stock igual que store().
     */
    public function sync(Request $request): JsonResponse
    {
        $valid = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.clave' => 'required|string|max:100',
            'items.*.cantidad' => 'required|integer|min:1|max:9999',
        ]);

        $user = Auth::user();

        $byClave = [];
        foreach ($valid['items'] as $line) {
            $k = (string) $line['clave'];
            $q = (int) $line['cantidad'];
            if (! isset($byClave[$k])) {
                $byClave[$k] = 0;
            }
            $byClave[$k] += $q;
        }

        $rows = [];
        foreach ($byClave as $clave => $cantidad) {
            $producto = null;
            if (str_starts_with($clave, 'MANUAL-')) {
                $producto = ProductoManual::where('clave', $clave)->where('anulado', false)->first();
            } else {
                $producto = ProductoCva::where('clave', $clave)->first();
            }
            if (! $producto) {
                return response()->json([
                    'success' => false,
                    'message' => 'Producto no encontrado: '.$clave,
                ], 422);
            }

            $nombre = $producto->descripcion ?? $clave;
            $precio = $this->margenVenta->aplicarMargen((float) $producto->precio);

            $d0 = (int) ($producto->disponible ?? 0);
            $cd0 = (int) ($producto->disponible_cd ?? 0);
            $maxQty = $this->productoStock->stockEfectivoTotal($clave, $d0, $cd0);
            if ($cantidad > $maxQty) {
                return response()->json([
                    'success' => false,
                    'message' => 'Stock insuficiente para '.$nombre.' (máx. '.$maxQty.').',
                ], 422);
            }

            $rows[] = [
                'clave' => $clave,
                'nombre_producto' => $nombre,
                'cantidad' => $cantidad,
                'precio_unitario' => $precio,
            ];
        }

        DB::transaction(function () use ($user, $rows) {
            $user->carritoItems()->delete();
            foreach ($rows as $r) {
                $user->carritoItems()->create($r);
            }
        });

        Cache::forget(self::cartCacheKey($user->id));

        return $this->index($request);
    }

    /**
     * Cotiza envío del carrito actual hacia la dirección indicada (sin crear pedido).
     */
    public function cotizarEnvio(Request $request): JsonResponse
    {
        $valid = $request->validate([
            'direccion_envio_id' => 'required|integer',
        ]);

        $user = Auth::user();

        $dir = DireccionEnvio::query()
            ->where('user_id', $user->id)
            ->where('id', $valid['direccion_envio_id'])
            ->first();
        if (! $dir) {
            return response()->json(['success' => false, 'message' => 'Dirección de envío no válida.'], 422);
        }

        try {
            $data = $this->carritoEnvioCotizacion->cotizarParaUsuario($user, $dir);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo cotizar el envío en este momento. Intenta de nuevo o contacta a soporte.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 502);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'subtotal_productos' => $data['subtotal_productos'],
                'costo_envio' => $data['costo_envio'],
                'total' => $data['total'],
                'moneda' => $data['moneda'],
                'fecha_entrega_centro' => $data['fecha_entrega_centro'],
                'fecha_entrega_desde' => $data['fecha_entrega_desde'],
                'fecha_entrega_hasta' => $data['fecha_entrega_hasta'],
                'detalle_cotizacion' => $data['detalle_cotizacion'],
                'usa_api_flete_cva' => (bool) ($data['usa_api_flete_cva'] ?? false),
                'aviso_envio' => $data['aviso_envio'] ?? null,
            ],
        ]);
    }

    /** Checkout: crea pedido y vacía carrito (tarjeta simulada u otros métodos sin pasarela). */
    public function checkout(Request $request): JsonResponse
    {
        $valid = $request->validate([
            'metodo_pago' => 'required|string|max:50',
            'direccion_envio_id' => 'required|integer',
            'datos_facturacion_id' => 'nullable|integer',
        ]);

        $metodo = strtolower(trim((string) $valid['metodo_pago']));
        if ($metodo === 'tarjeta' && ! MetodoPagoToggle::isEnabled('tarjeta')) {
            return response()->json([
                'success' => false,
                'message' => 'Este método de pago está temporalmente desactivado.',
            ], 422);
        }

        $user = Auth::user();

        $dir = DireccionEnvio::query()
            ->where('user_id', $user->id)
            ->where('id', $valid['direccion_envio_id'])
            ->first();
        if (! $dir) {
            return response()->json(['success' => false, 'message' => 'Dirección de envío no válida.'], 422);
        }

        $datosFacturacionId = $valid['datos_facturacion_id'] ?? null;
        if ($datosFacturacionId !== null) {
            $fac = DatoFacturacion::query()
                ->where('user_id', $user->id)
                ->where('id', $datosFacturacionId)
                ->first();
            if (! $fac) {
                return response()->json(['success' => false, 'message' => 'Datos de facturación no válidos.'], 422);
            }
        }

        if (strtolower($valid['metodo_pago']) === 'paypal') {
            return response()->json([
                'success' => false,
                'message' => 'Para PayPal usa el flujo de pago dedicado (no este endpoint).',
            ], 422);
        }

        if (strtolower($valid['metodo_pago']) === 'mercadopago') {
            return response()->json([
                'success' => false,
                'message' => 'Para Mercado Pago usa el flujo de pago dedicado (no este endpoint).',
            ], 422);
        }

        $items = $user->carritoItems()->get();

        if ($items->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'El carrito está vacío.',
            ], 422);
        }

        foreach ($items as $it) {
            $producto = str_starts_with($it->clave, 'MANUAL-')
                ? ProductoManual::query()->where('clave', $it->clave)->where('anulado', false)->first()
                : ProductoCva::query()->where('clave', $it->clave)->first();
            if (! $producto) {
                return response()->json(['success' => false, 'message' => 'Producto no encontrado: '.$it->clave], 422);
            }
            $d = (int) ($producto->disponible ?? 0);
            $cd = (int) ($producto->disponible_cd ?? 0);
            $max = $this->productoStock->stockEfectivoTotal($it->clave, $d, $cd);
            if ((int) $it->cantidad > $max) {
                return response()->json([
                    'success' => false,
                    'message' => 'Stock insuficiente para '.$it->nombre_producto.' (máx. '.$max.').',
                ], 422);
            }
        }

        try {
            $envioBloque = $this->carritoEnvioCotizacion->cotizarParaUsuario($user, $dir);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e instanceof \InvalidArgumentException ? $e->getMessage() : 'No se pudo calcular el envío para este pedido.',
                'error' => config('app.debug') && ! ($e instanceof \InvalidArgumentException) ? $e->getMessage() : null,
            ], $e instanceof \InvalidArgumentException ? 422 : 502);
        }

        try {
            $pedido = DB::transaction(function () use ($user, $items, $valid, $envioBloque) {
                $folio = DocumentoNumeracion::siguienteFolioPedido();

                $montoTotal = (float) ($envioBloque['total'] ?? 0);

                $p = $user->pedidos()->create([
                    'folio' => $folio,
                    'fecha' => now()->toDateString(),
                    'monto' => round($montoTotal, 2),
                    'metodo_pago' => $valid['metodo_pago'],
                    'estado_pago' => 'pagado',
                    'estatus_pedido' => 'completado',
                    'direccion_envio_id' => (int) $valid['direccion_envio_id'],
                    'datos_facturacion_id' => $valid['datos_facturacion_id'] !== null ? (int) $valid['datos_facturacion_id'] : null,
                ]);

                $lineasInventario = [];
                foreach ($items as $it) {
                    $q = (int) $it->cantidad;
                    $precio = (float) $it->precio_unitario;
                    $subtotal = $q * $precio;
                    $p->items()->create([
                        'clave' => $it->clave,
                        'nombre_producto' => $it->nombre_producto,
                        'cantidad' => $q,
                        'precio_unitario' => $precio,
                        'subtotal' => $subtotal,
                    ]);
                    $lineasInventario[] = ['clave' => $it->clave, 'cantidad' => $q];
                }

                $this->pedidoEnvioPersist->persistirDesdeSnapshot($p->fresh(['items']), $envioBloque);
                $this->productoStock->registrarVentasConfirmadas($p->id, $lineasInventario);
                $user->carritoItems()->delete();
                Cache::forget(self::cartCacheKey($user->id));

                return $p->fresh(['items']);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear el pedido.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Pedido creado.',
            'data' => [
                'id' => $pedido->id,
                'folio' => $pedido->folio,
            ],
        ], 201);
    }
}
