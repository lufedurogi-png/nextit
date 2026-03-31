<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Desarrollador;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class DesarrolladorController extends Controller
{
    /**
     * Lista pública de desarrolladores (orden de registro).
     */
    public function index(): JsonResponse
    {
        $items = Desarrollador::query()
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(fn (Desarrollador $d) => [
                'id' => $d->id,
                'nombre' => $d->nombre,
                'rol' => $d->rol,
                'descripcion' => $d->descripcion,
                'foto_url' => $d->foto_url,
                'fecha_inicio' => optional($d->fecha_inicio)->format('Y-m-d'),
                'fecha_fin' => optional($d->fecha_fin)->format('Y-m-d'),
            ]);

        return response()->json($items, Response::HTTP_OK);
    }
}

