<?php

namespace App\Http\Controllers\Api\V1\Ventas;

use App\Http\Controllers\Controller;
use App\Models\Pedido;
use App\Models\User;
use App\Models\VentasCalendarioTarea;
use App\Models\VentasCorreoEnvio;
use App\Models\VentasCotizacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VentasBusquedaController extends Controller
{
    private const LIMIT = 8;

    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $sellerId = Auth::id();
        $like = '%'.addcslashes(mb_strtolower($q), '%_\\').'%';
        $results = [];

        $cotizaciones = VentasCotizacion::query()
            ->where('user_id', $sellerId)
            ->with('clienteRegistrado:id,name,email')
            ->where(function ($w) use ($like) {
                $w->whereRaw('LOWER(COALESCE(folio, \'\')) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(invitado_nombre, \'\')) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(invitado_email, \'\')) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(comentario, \'\')) LIKE ?', [$like])
                    ->orWhereHas('clienteRegistrado', function ($c) use ($like) {
                        $c->whereRaw('LOWER(name) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(email) LIKE ?', [$like]);
                    });
            })
            ->orderByDesc('updated_at')
            ->limit(self::LIMIT)
            ->get();

        foreach ($cotizaciones as $c) {
            $cliente = $c->clienteRegistrado;
            $folio = $c->folio ?: sprintf('CV-%s-%06d', $c->created_at?->format('Y') ?? date('Y'), $c->id);
            $clienteLabel = $cliente?->name ?? ($c->invitado_nombre ?: ($c->invitado_email ?: 'Prospecto'));
            $results[] = [
                'id' => 'cot-'.$c->id,
                'type' => 'cotizacion',
                'vista' => 'Cotizaciones',
                'title' => $folio,
                'subtitle' => $clienteLabel.' · $'.number_format((float) $c->total, 2),
                'href' => '/ventas-pipeline',
                'search_text' => implode(' ', array_filter([$folio, $clienteLabel, $cliente?->email, $c->invitado_email, $c->comentario])),
            ];
        }

        $clienteIds = VentasCotizacion::query()
            ->where('user_id', $sellerId)
            ->whereNotNull('cliente_user_id')
            ->distinct()
            ->pluck('cliente_user_id');

        if ($clienteIds->isNotEmpty()) {
            $clientes = User::query()
                ->whereIn('id', $clienteIds)
                ->where(function ($w) use ($like) {
                    $w->whereRaw('LOWER(name) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(email) LIKE ?', [$like]);
                })
                ->limit(self::LIMIT)
                ->get(['id', 'name', 'email']);

            foreach ($clientes as $u) {
                $results[] = [
                    'id' => 'cli-'.$u->id,
                    'type' => 'cliente',
                    'vista' => 'Bandeja',
                    'title' => $u->name,
                    'subtitle' => $u->email,
                    'href' => '/ventas-inbox?cliente='.$u->id,
                    'search_text' => $u->name.' '.$u->email,
                ];
            }
        }

        $tareas = VentasCalendarioTarea::query()
            ->where('user_id', $sellerId)
            ->whereRaw('LOWER(texto) LIKE ?', [$like])
            ->orderByDesc('fecha')
            ->limit(self::LIMIT)
            ->get();

        foreach ($tareas as $t) {
            $results[] = [
                'id' => 'tar-'.$t->id,
                'type' => 'tarea',
                'vista' => 'Calendario',
                'title' => mb_strlen($t->texto) > 60 ? mb_substr($t->texto, 0, 57).'…' : $t->texto,
                'subtitle' => $t->fecha->format('Y-m-d').($t->hora ? ' · '.$t->hora : ''),
                'href' => '/ventas-calendario',
                'search_text' => $t->texto.' '.$t->fecha->format('Y-m-d'),
            ];
        }

        $pedidos = Pedido::query()
            ->with('user:id,name,email')
            ->when($clienteIds->isNotEmpty(), fn ($q) => $q->whereIn('user_id', $clienteIds))
            ->where(function ($w) use ($like) {
                $w->whereRaw('LOWER(COALESCE(folio, \'\')) LIKE ?', [$like])
                    ->orWhereHas('user', function ($u) use ($like) {
                        $u->whereRaw('LOWER(name) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(email) LIKE ?', [$like]);
                    });
            })
            ->orderByDesc('created_at')
            ->limit(self::LIMIT)
            ->get();

        foreach ($pedidos as $p) {
            $results[] = [
                'id' => 'ped-'.$p->id,
                'type' => 'pedido',
                'vista' => 'Pedidos',
                'title' => $p->folio ?: 'Pedido #'.$p->id,
                'subtitle' => ($p->user?->name ?? 'Cliente').' · $'.number_format((float) $p->monto, 2),
                'href' => '/ventas-pedidos',
                'search_text' => implode(' ', array_filter([$p->folio, $p->user?->name, $p->user?->email])),
            ];
        }

        $correos = VentasCorreoEnvio::query()
            ->where('user_id', $sellerId)
            ->where(function ($w) use ($like) {
                $w->whereRaw('LOWER(COALESCE(asunto, \'\')) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(cuerpo, \'\')) LIKE ?', [$like]);
            })
            ->orderByDesc('created_at')
            ->limit(self::LIMIT)
            ->get();

        foreach ($correos as $e) {
            $results[] = [
                'id' => 'cor-'.$e->id,
                'type' => 'correo',
                'vista' => 'Historial correos',
                'title' => $e->asunto ?: 'Correo #'.$e->id,
                'subtitle' => $e->created_at?->format('d/m/Y H:i') ?? '',
                'href' => '/ventas-correos-historial',
                'search_text' => ($e->asunto ?? '').' '.($e->cuerpo ?? ''),
            ];
        }

        return response()->json(['success' => true, 'data' => $results]);
    }
}
