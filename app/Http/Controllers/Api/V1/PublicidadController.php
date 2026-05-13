<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Publicidad;
use App\Models\PublicidadCarruselConfig;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class PublicidadController extends Controller
{
    /**
     * Carrusel público: incluye bandera global y enlaces opcionales por slide.
     */
    public function index(): JsonResponse
    {
        $config = PublicidadCarruselConfig::query()->first();
        $carruselActivo = $config ? ((int) $config->activo === 1) : true;

        if (! $carruselActivo) {
            return response()->json([
                'carrusel_activo' => false,
                'slides' => [],
            ], Response::HTTP_OK);
        }

        $slides = Publicidad::query()
            ->where('activo', true)
            ->orderBy('orden')
            ->orderBy('id')
            ->get(['id', 'url', 'titulo', 'orden', 'enlace'])
            ->map(fn ($p) => [
                'id' => $p->id,
                'url' => $p->url,
                'titulo' => $p->titulo,
                'orden' => $p->orden,
                'enlace' => $p->enlace,
            ])
            ->values()
            ->all();

        return response()->json([
            'carrusel_activo' => true,
            'slides' => $slides,
        ], Response::HTTP_OK);
    }
}
