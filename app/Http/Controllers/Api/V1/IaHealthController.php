<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\OllamaService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class IaHealthController extends Controller
{
    public function show(OllamaService $ollama): JsonResponse
    {
        $reachable = $ollama->isReachable();

        return response()->json([
            'success' => true,
            'data' => [
                'service' => 'E-comerce-ia-api',
                'ollama_url' => $ollama->baseUrl(),
                'ollama_model' => $ollama->model(),
                'ollama_reachable' => $reachable,
            ],
        ], $reachable ? Response::HTTP_OK : Response::HTTP_SERVICE_UNAVAILABLE);
    }
}
