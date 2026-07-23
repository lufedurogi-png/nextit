<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\IaApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IaProxyController extends Controller
{
    public function health(IaApiService $ia): JsonResponse
    {
        $result = $ia->health();

        return response()->json([
            'success' => $result['success'],
            'data' => $result['data'] ?? null,
            'message' => $result['message'] ?? null,
            'enabled' => $ia->enabled(),
            'ia_api_url' => $ia->baseUrl(),
        ], $result['status']);
    }

    public function chat(Request $request, IaApiService $ia): JsonResponse
    {
        $validated = $request->validate([
            'prompt' => 'required_without:messages|string|max:8000',
            'messages' => 'required_without:prompt|array|min:1',
            'messages.*.role' => 'required_with:messages|string|in:system,user,assistant',
            'messages.*.content' => 'required_with:messages|string|max:8000',
            'model' => 'nullable|string|max:100',
            'system' => 'nullable|string|max:4000',
        ]);

        $result = $ia->chat($validated);

        return response()->json([
            'success' => $result['success'],
            'data' => $result['data'] ?? null,
            'message' => $result['message'] ?? null,
        ], $result['status']);
    }
}
