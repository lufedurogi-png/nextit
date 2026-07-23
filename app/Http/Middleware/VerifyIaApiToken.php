<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyIaApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('services.ia_api.token', '');
        if ($expected === '') {
            return response()->json([
                'success' => false,
                'message' => 'IA_API_TOKEN no está configurado en la API de IA.',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $provided = (string) $request->bearerToken();
        if ($provided === '' || ! hash_equals($expected, $provided)) {
            return response()->json([
                'success' => false,
                'message' => 'Token de API de IA inválido.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        return $next($request);
    }
}
