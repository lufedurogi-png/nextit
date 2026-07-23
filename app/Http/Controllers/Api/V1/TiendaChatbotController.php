<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\IaApiService;
use App\Services\TiendaChatbotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class TiendaChatbotController extends Controller
{
    /**
     * Disponibilidad del chatbot para el front: solo true si E-comerce-ia-api responde.
     * Siempre HTTP 200 para no romper la página; el front decide si mostrar el botón.
     */
    public function health(IaApiService $ia): JsonResponse
    {
        try {
            if (! $ia->enabled()) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'available' => false,
                        'reason' => 'disabled',
                    ],
                ], Response::HTTP_OK);
            }

            $cacheKey = 'tienda_chatbot_ia_available_v1';
            $cached = Cache::get($cacheKey);
            if (is_bool($cached)) {
                $available = $cached;
            } else {
                $result = $ia->health(2);
                $available = (bool) ($result['success'] ?? false);
                // Fallos se recuerdan poco para reintentar pronto al levantar la API
                Cache::put($cacheKey, $available, $available ? 45 : 12);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'available' => $available,
                    'reason' => $available ? 'ok' : 'unreachable',
                ],
            ], Response::HTTP_OK);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => true,
                'data' => [
                    'available' => false,
                    'reason' => 'error',
                ],
            ], Response::HTTP_OK);
        }
    }

    public function chat(Request $request, TiendaChatbotService $chatbot): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:2000',
            'session_id' => 'nullable|string|max:120',
            'context' => 'nullable|string|max:4000',
        ]);

        try {
            $data = $chatbot->handle(
                $validated['message'],
                $validated['session_id'] ?? null,
                $request->user()?->id,
                $validated['context'] ?? null
            );
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'No pude procesar tu mensaje ahora. Intenta de nuevo en un momento.',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ], Response::HTTP_OK);
    }
}
