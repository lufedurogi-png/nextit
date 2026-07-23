<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\OllamaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class IaChatController extends Controller
{
    public function chat(Request $request, OllamaService $ollama): JsonResponse
    {
        $validated = $request->validate([
            'prompt' => 'required_without:messages|string|max:8000',
            'messages' => 'required_without:prompt|array|min:1',
            'messages.*.role' => 'required_with:messages|string|in:system,user,assistant',
            'messages.*.content' => 'required_with:messages|string|max:8000',
            'model' => 'nullable|string|max:100',
            'system' => 'nullable|string|max:4000',
        ]);

        $messages = $validated['messages'] ?? null;
        if (! is_array($messages)) {
            $messages = [];
            if (! empty($validated['system'])) {
                $messages[] = [
                    'role' => 'system',
                    'content' => $validated['system'],
                ];
            }
            $messages[] = [
                'role' => 'user',
                'content' => $validated['prompt'],
            ];
        }

        try {
            $result = $ollama->chat($messages, $validated['model'] ?? null);
        } catch (RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], Response::HTTP_BAD_GATEWAY);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Error interno al consultar la IA.',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'model' => $result['model'],
                'message' => $result['message'],
            ],
        ], Response::HTTP_OK);
    }
}
