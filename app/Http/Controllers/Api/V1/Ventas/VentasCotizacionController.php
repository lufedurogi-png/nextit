<?php

namespace App\Http\Controllers\Api\V1\Ventas;

use App\Enum\User\UserType;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\VentasCotizacion;
use App\Services\MargenVentaService;
use App\Support\VentasCotizacionMargenGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class VentasCotizacionController extends Controller
{
    public function __construct(
        private readonly MargenVentaService $margenVenta,
    ) {}

    public function reglasPrecio(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'max_descuento_pct' => $this->maxDescuentoPermitidoPct(),
            ],
        ]);
    }

    public function searchClientes(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $like = '%'.addcslashes($q, '%_\\').'%';

        $users = User::query()
            ->where('tipo', UserType::CUSTOMER)
            ->where(function ($w) use ($like) {
                $w->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like);
            })
            ->orderBy('name')
            ->limit(25)
            ->get(['id', 'name', 'email'])
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ]);

        return response()->json(['success' => true, 'data' => $users]);
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = min(50, max(5, (int) $request->query('per_page', 10)));

        $paginator = VentasCotizacion::query()
            ->where('user_id', Auth::id())
            ->with(['clienteRegistrado:id,name,email'])
            ->orderByDesc('updated_at')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $paginator->getCollection()->map(fn (VentasCotizacion $c) => $this->mapCotizacion($c)),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedPayload($request);
        $total = $this->computeTotal($data['items'], (float) $data['descuento_general_pct']);
        $this->assertMargenCotizacion($data['items'], $total);

        $cot = DB::transaction(function () use ($data, $total) {
            $model = VentasCotizacion::create([
                'user_id' => Auth::id(),
                'cliente_user_id' => $data['cliente_user_id'],
                'invitado_nombre' => $data['invitado_nombre'],
                'invitado_email' => $data['invitado_email'],
                'invitado_telefono' => $data['invitado_telefono'],
                'comentario' => $data['comentario'],
                'descuento_general_pct' => $data['descuento_general_pct'],
                'items' => $data['items'],
                'total' => $total,
            ]);
            $model->refresh();
            $y = $model->created_at?->format('Y') ?? date('Y');
            $folio = sprintf('CV-%s-%06d', $y, $model->id);
            $model->forceFill(['folio' => $folio])->save();

            return $model;
        });

        return response()->json([
            'success' => true,
            'data' => $this->mapCotizacion($cot->fresh(['clienteRegistrado:id,name,email'])),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $cot = VentasCotizacion::query()
            ->where('user_id', Auth::id())
            ->whereKey($id)
            ->firstOrFail();

        $data = $this->validatedPayload($request);
        $total = $this->computeTotal($data['items'], (float) $data['descuento_general_pct']);
        $this->assertMargenCotizacion($data['items'], $total);

        $cot->update([
            'cliente_user_id' => $data['cliente_user_id'],
            'invitado_nombre' => $data['invitado_nombre'],
            'invitado_email' => $data['invitado_email'],
            'invitado_telefono' => $data['invitado_telefono'],
            'comentario' => $data['comentario'],
            'descuento_general_pct' => $data['descuento_general_pct'],
            'items' => $data['items'],
            'total' => $total,
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->mapCotizacion($cot->fresh(['clienteRegistrado:id,name,email'])),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $cot = VentasCotizacion::query()
            ->where('user_id', Auth::id())
            ->whereKey($id)
            ->firstOrFail();
        $cot->delete();

        return response()->json(['success' => true]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedPayload(Request $request): array
    {
        $validated = $request->validate([
            'cliente_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'invitado_nombre' => ['nullable', 'string', 'max:200'],
            'invitado_email' => ['nullable', 'string', 'max:255'],
            'invitado_telefono' => ['nullable', 'string', 'max:40'],
            'comentario' => ['nullable', 'string', 'max:5000'],
            'descuento_general_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.clave' => ['required', 'string', 'max:80'],
            'items.*.cantidad' => ['required', 'integer', 'min:1', 'max:99999'],
            'items.*.nombre_producto' => ['required', 'string', 'max:500'],
            'items.*.precio_unitario' => ['required', 'numeric', 'min:0'],
            'items.*.precio_referencia' => ['nullable', 'numeric', 'min:0'],
            'items.*.imagen' => ['nullable', 'string', 'max:2000'],
            'items.*.stock_tienda' => ['nullable', 'integer', 'min:0'],
            'items.*.descuento_linea_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        if (! empty($validated['cliente_user_id'])) {
            $u = User::query()->whereKey($validated['cliente_user_id'])->first();
            if (! $u || $u->tipo !== UserType::CUSTOMER) {
                abort(422, 'El cliente seleccionado no es una cuenta de tienda válida.');
            }
        }

        $items = [];
        foreach ($validated['items'] as $row) {
            $precioUnit = round((float) $row['precio_unitario'], 4);
            $precioRef = isset($row['precio_referencia'])
                ? round((float) $row['precio_referencia'], 4)
                : $precioUnit;
            if ($precioRef <= 0) {
                $precioRef = $precioUnit;
            }

            $items[] = [
                'clave' => $row['clave'],
                'cantidad' => (int) $row['cantidad'],
                'nombre_producto' => $row['nombre_producto'],
                'precio_unitario' => $precioUnit,
                'precio_referencia' => $precioRef,
                'imagen' => $row['imagen'] ?? null,
                'stock_tienda' => isset($row['stock_tienda']) ? (int) $row['stock_tienda'] : null,
                'descuento_linea_pct' => round(min(100, max(0, (float) ($row['descuento_linea_pct'] ?? 0))), 2),
            ];
        }

        return [
            'cliente_user_id' => $validated['cliente_user_id'] ?? null,
            'invitado_nombre' => isset($validated['invitado_nombre']) ? trim((string) $validated['invitado_nombre']) ?: null : null,
            'invitado_email' => isset($validated['invitado_email']) ? trim((string) $validated['invitado_email']) ?: null : null,
            'invitado_telefono' => isset($validated['invitado_telefono']) ? trim((string) $validated['invitado_telefono']) ?: null : null,
            'comentario' => isset($validated['comentario']) ? trim((string) $validated['comentario']) ?: null : null,
            'descuento_general_pct' => round(min(100, max(0, (float) ($validated['descuento_general_pct'] ?? 0))), 2),
            'items' => $items,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function computeTotal(array $items, float $descuentoGeneralPct): float
    {
        $sum = 0.0;
        foreach ($items as $it) {
            $qty = max(1, (int) ($it['cantidad'] ?? 1));
            $price = (float) ($it['precio_unitario'] ?? 0);
            $linePct = min(100, max(0, (float) ($it['descuento_linea_pct'] ?? 0)));
            $sum += $qty * $price * (1 - $linePct / 100);
        }
        $gp = min(100, max(0, $descuentoGeneralPct));

        return round($sum * (1 - $gp / 100), 2);
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function assertMargenCotizacion(array $items, float $total): void
    {
        VentasCotizacionMargenGuard::assertCotizacionRespetaMargen(
            $items,
            $total,
            $this->maxDescuentoPermitidoPct()
        );
    }

    private function maxDescuentoPermitidoPct(): float
    {
        $pct = $this->margenVenta->getPorcentaje();

        return $pct > 0 ? $pct : 10.0;
    }

    /**
     * @return array<string, mixed>
     */
    private function mapCotizacion(VentasCotizacion $c): array
    {
        $cliente = $c->clienteRegistrado;
        $folio = $c->folio ?: sprintf('CV-%s-%06d', $c->created_at?->format('Y') ?? date('Y'), $c->id);

        return [
            'id' => $c->id,
            'folio' => $folio,
            'items' => $c->items ?? [],
            'total' => (float) $c->total,
            'descuento_general_pct' => (float) $c->descuento_general_pct,
            'cliente_user_id' => $c->cliente_user_id,
            'cliente_registrado' => $cliente ? [
                'id' => $cliente->id,
                'name' => $cliente->name,
                'email' => $cliente->email,
            ] : null,
            'invitado_nombre' => $c->invitado_nombre,
            'invitado_email' => $c->invitado_email,
            'invitado_telefono' => $c->invitado_telefono,
            'cliente_destino' => $this->etiquetaClienteDestino($c, $cliente),
            'comentario' => $c->comentario,
            'created_at' => $c->created_at?->toIso8601String(),
            'updated_at' => $c->updated_at?->toIso8601String(),
        ];
    }

    private function etiquetaClienteDestino(VentasCotizacion $c, ?User $cliente): string
    {
        if ($cliente) {
            return 'Cliente tienda: '.$cliente->name.' · '.$cliente->email;
        }

        $partes = array_filter([
            $c->invitado_nombre,
            $c->invitado_email,
            $c->invitado_telefono,
        ], fn ($v) => $v !== null && trim((string) $v) !== '');

        if ($partes === []) {
            return 'Sin cliente asignado';
        }

        return 'Prospecto: '.implode(' · ', $partes);
    }
}
