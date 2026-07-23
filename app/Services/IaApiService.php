<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Throwable;

class IaApiService
{
    public function baseUrl(): string
    {
        return rtrim((string) config('services.ia_api.base_url', 'http://127.0.0.1:8001/api/v1'), '/');
    }

    public function token(): string
    {
        return (string) config('services.ia_api.token', '');
    }

    public function enabled(): bool
    {
        return (bool) config('services.ia_api.enabled', true)
            && $this->baseUrl() !== ''
            && $this->token() !== '';
    }

    /**
     * @return array{success: bool, data?: array<string, mixed>, message?: string, status: int}
     */
    public function health(int $timeoutSeconds = 3): array
    {
        if (! $this->enabled()) {
            return [
                'success' => false,
                'message' => 'Integración IA deshabilitada o sin IA_API_URL/IA_API_TOKEN.',
                'status' => 503,
            ];
        }

        try {
            $res = Http::timeout(max(1, $timeoutSeconds))
                ->acceptJson()
                ->get($this->baseUrl().'/ia/health');
        } catch (ConnectionException $e) {
            return [
                'success' => false,
                'message' => 'No se pudo conectar con la API de IA ('.$this->baseUrl().').',
                'status' => 503,
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Error al consultar la API de IA.',
                'status' => 503,
            ];
        }

        return [
            'success' => $res->successful(),
            'data' => $res->json('data') ?? $res->json(),
            'message' => $res->json('message'),
            'status' => $res->status(),
        ];
    }

    /**
     * @param  array{prompt?: string, messages?: array<int, array{role: string, content: string}>, system?: string, model?: string}  $payload
     * @return array{success: bool, data?: array<string, mixed>, message?: string, status: int}
     */
    public function chat(array $payload): array
    {
        if (! $this->enabled()) {
            return [
                'success' => false,
                'message' => 'Integración IA deshabilitada o sin IA_API_URL/IA_API_TOKEN.',
                'status' => 503,
            ];
        }

        try {
            $res = Http::timeout((int) config('services.ia_api.timeout', 130))
                ->withToken($this->token())
                ->acceptJson()
                ->post($this->baseUrl().'/ia/chat', $payload);
        } catch (ConnectionException $e) {
            return [
                'success' => false,
                'message' => 'No se pudo conectar con la API de IA ('.$this->baseUrl().').',
                'status' => 503,
            ];
        }

        $json = $res->json();

        return [
            'success' => $res->successful() && (bool) data_get($json, 'success', $res->successful()),
            'data' => data_get($json, 'data'),
            'message' => data_get($json, 'message') ?: ($res->successful() ? null : 'Error desde la API de IA.'),
            'status' => $res->status(),
        ];
    }
}
