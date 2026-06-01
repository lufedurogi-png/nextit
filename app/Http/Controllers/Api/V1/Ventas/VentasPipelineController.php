<?php

namespace App\Http\Controllers\Api\V1\Ventas;

use App\Http\Controllers\Controller;
use App\Models\VentasCotizacion;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class VentasPipelineController extends Controller
{
    /** @var list<string> */
    public const ETAPAS = ['nuevo', 'contactado', 'seguimiento', 'negociacion', 'ganado', 'perdido'];

    /** @var list<string> */
    public const PRIORIDADES = ['baja', 'media', 'alta'];

    public function resumen(Request $request): JsonResponse
    {
        $preview = min(10, max(3, (int) $request->query('preview', 5)));
        $base = $this->baseQuery($request);

        $etapas = [];
        foreach (self::ETAPAS as $etapa) {
            $q = (clone $base)->where('pipeline_etapa', $etapa);
            $etapas[] = [
                'etapa' => $etapa,
                'label' => $this->etapaLabel($etapa),
                'count' => (clone $q)->count(),
                'monto' => round((float) (clone $q)->sum('total'), 2),
                'items' => (clone $q)
                    ->with(['clienteRegistrado:id,name,email'])
                    ->orderByDesc('updated_at')
                    ->limit($preview)
                    ->get()
                    ->map(fn (VentasCotizacion $c) => $this->mapOportunidad($c)),
            ];
        }

        $activas = (clone $base)->whereNotIn('pipeline_etapa', ['ganado', 'perdido']);
        $vencidas = (clone $activas)
            ->whereNotNull('pipeline_fecha_proximo_contacto')
            ->where('pipeline_fecha_proximo_contacto', '<', Carbon::now())
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'etapas' => $etapas,
                'totales' => [
                    'oportunidades' => (clone $base)->count(),
                    'monto_pipeline' => round((float) (clone $base)->whereNotIn('pipeline_etapa', ['perdido'])->sum('total'), 2),
                    'vencidas' => $vencidas,
                ],
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = min(50, max(5, (int) $request->query('per_page', 10)));
        $paginator = $this->baseQuery($request)
            ->with(['clienteRegistrado:id,name,email'])
            ->orderByDesc('updated_at')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $paginator->getCollection()->map(fn (VentasCotizacion $c) => $this->mapOportunidad($c)),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $cot = VentasCotizacion::query()
            ->where('user_id', Auth::id())
            ->with(['clienteRegistrado:id,name,email'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $this->mapOportunidad($cot),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $cot = VentasCotizacion::query()
            ->where('user_id', Auth::id())
            ->findOrFail($id);

        $validated = $request->validate([
            'pipeline_etapa' => ['sometimes', 'required', Rule::in(self::ETAPAS)],
            'pipeline_prioridad' => ['sometimes', 'required', Rule::in(self::PRIORIDADES)],
            'pipeline_fecha_proximo_contacto' => ['nullable', 'date'],
            'pipeline_motivo_perdida' => ['nullable', 'string', 'max:255'],
        ]);

        $nuevaEtapa = $validated['pipeline_etapa'] ?? $cot->pipeline_etapa;
        if ($nuevaEtapa === 'perdido') {
            $motivo = trim((string) ($validated['pipeline_motivo_perdida'] ?? $cot->pipeline_motivo_perdida ?? ''));
            if ($motivo === '') {
                return response()->json([
                    'success' => false,
                    'message' => 'Indica el motivo de pérdida para cerrar la oportunidad.',
                ], 422);
            }
            $validated['pipeline_motivo_perdida'] = $motivo;
        }

        $cot->fill($validated);
        $cot->save();

        return response()->json([
            'success' => true,
            'data' => $this->mapOportunidad($cot->fresh(['clienteRegistrado:id,name,email'])),
        ]);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Builder<VentasCotizacion>
     */
    private function baseQuery(Request $request)
    {
        $q = VentasCotizacion::query()->where('user_id', Auth::id());

        $etapa = trim((string) $request->query('etapa', ''));
        if ($etapa !== '' && in_array($etapa, self::ETAPAS, true)) {
            $q->where('pipeline_etapa', $etapa);
        }

        $prioridad = trim((string) $request->query('prioridad', ''));
        if ($prioridad !== '' && in_array($prioridad, self::PRIORIDADES, true)) {
            $q->where('pipeline_prioridad', $prioridad);
        }

        if ($request->boolean('vencidas')) {
            $q->whereNotIn('pipeline_etapa', ['ganado', 'perdido'])
                ->whereNotNull('pipeline_fecha_proximo_contacto')
                ->where('pipeline_fecha_proximo_contacto', '<', Carbon::now());
        }

        $search = trim((string) $request->query('q', ''));
        if ($search !== '') {
            $like = '%'.addcslashes($search, '%_\\').'%';
            $q->where(function ($w) use ($like) {
                $w->where('folio', 'like', $like)
                    ->orWhere('invitado_nombre', 'like', $like)
                    ->orWhere('invitado_email', 'like', $like)
                    ->orWhere('comentario', 'like', $like)
                    ->orWhereHas('clienteRegistrado', function ($c) use ($like) {
                        $c->where('name', 'like', $like)->orWhere('email', 'like', $like);
                    });
            });
        }

        return $q;
    }

    /**
     * @return array<string, mixed>
     */
    private function mapOportunidad(VentasCotizacion $c): array
    {
        $cliente = $c->clienteRegistrado;
        $folio = $c->folio ?: sprintf('CV-%s-%06d', $c->created_at?->format('Y') ?? date('Y'), $c->id);
        $fechaContacto = $c->pipeline_fecha_proximo_contacto;
        $vencida = $fechaContacto
            && ! in_array($c->pipeline_etapa, ['ganado', 'perdido'], true)
            && Carbon::parse($fechaContacto)->isPast();

        return [
            'id' => $c->id,
            'folio' => $folio,
            'titulo' => $this->tituloOportunidad($c, $folio),
            'cliente' => $cliente?->name ?? ($c->invitado_nombre ?: 'Prospecto'),
            'email' => $cliente?->email ?? $c->invitado_email,
            'cliente_user_id' => $c->cliente_user_id,
            'monto' => (float) $c->total,
            'pipeline_etapa' => $c->pipeline_etapa ?? 'nuevo',
            'pipeline_etapa_label' => $this->etapaLabel($c->pipeline_etapa ?? 'nuevo'),
            'pipeline_prioridad' => $c->pipeline_prioridad ?? 'media',
            'pipeline_fecha_proximo_contacto' => $fechaContacto?->toIso8601String(),
            'pipeline_motivo_perdida' => $c->pipeline_motivo_perdida,
            'vencida' => $vencida,
            'comentario' => $c->comentario,
            'created_at' => $c->created_at?->toIso8601String(),
            'updated_at' => $c->updated_at?->toIso8601String(),
        ];
    }

    private function tituloOportunidad(VentasCotizacion $c, string $folio): string
    {
        $items = is_array($c->items) ? $c->items : [];
        $first = $items[0] ?? null;
        if (is_array($first) && ! empty($first['nombre_producto'])) {
            $nombre = trim((string) $first['nombre_producto']);
            if (count($items) > 1) {
                return $nombre.' +'.(count($items) - 1);
            }

            return $nombre;
        }

        $comentario = trim((string) ($c->comentario ?? ''));
        if ($comentario !== '') {
            return mb_strlen($comentario) > 60 ? mb_substr($comentario, 0, 57).'…' : $comentario;
        }

        return 'Cotización '.$folio;
    }

    private function etapaLabel(string $etapa): string
    {
        return match ($etapa) {
            'contactado' => 'Contactado',
            'seguimiento' => 'Seguimiento',
            'negociacion' => 'Negociación',
            'ganado' => 'Ganado',
            'perdido' => 'Perdido',
            default => 'Nuevo',
        };
    }
}
