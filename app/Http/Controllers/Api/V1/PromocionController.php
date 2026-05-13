<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Promocion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PromocionController extends Controller
{
    /**
     * Promoción pública: productos en el orden definido por el administrador.
     */
    public function show(Request $request, string $slug): JsonResponse
    {
        $promo = Promocion::query()->where('slug', $slug)->where('activa', true)->first();
        if (! $promo) {
            return response()->json(['success' => false, 'message' => 'Promoción no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $claves = $promo->items()->orderBy('orden')->orderBy('id')->pluck('clave')->all();

        if ($claves === []) {
            return response()->json([
                'success' => true,
                'data' => [
                    'titulo' => $promo->titulo,
                    'descripcion' => $promo->descripcion,
                    'slug' => $promo->slug,
                    'productos' => [],
                ],
            ], Response::HTTP_OK);
        }

        $subRequest = Request::create('/api/v1/productos/por-claves', 'GET', ['claves' => $claves]);
        $response = app(ProductoController::class)->porClaves($subRequest);
        $payload = json_decode($response->getContent(), true);
        $productos = is_array($payload) ? ($payload['data'] ?? []) : [];

        return response()->json([
            'success' => true,
            'data' => [
                'titulo' => $promo->titulo,
                'descripcion' => $promo->descripcion,
                'slug' => $promo->slug,
                'productos' => $productos,
            ],
        ], Response::HTTP_OK);
    }
}
