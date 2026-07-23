<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OllamaService
{
    public function baseUrl(): string
    {
        return rtrim((string) config('services.ollama.base_url', 'http://127.0.0.1:11434'), '/');
    }

    public function model(): string
    {
        return (string) config('services.ollama.model', 'llama3.2');
    }

    public function isReachable(): bool
    {
        try {
            $res = Http::timeout(3)->acceptJson()->get($this->baseUrl().'/api/tags');

            return $res->successful();
        } catch (ConnectionException) {
            return false;
        }
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $messages
     * @return array{model: string, message: array{role: string, content: string}, raw: array<string, mixed>}
     */
    public function chat(array $messages, ?string $model = null): array
    {
        $model ??= $this->model();

        try {
            $res = Http::timeout((int) config('services.ollama.timeout', 120))
                ->acceptJson()
                ->post($this->baseUrl().'/api/chat', [
                    'model' => $model,
                    'messages' => $messages,
                    'stream' => false,
                ]);
        } catch (ConnectionException $e) {
            throw new RuntimeException('No se pudo conectar con Ollama en '.$this->baseUrl(), 0, $e);
        }

        if (! $res->successful()) {
            throw new RuntimeException(
                'Ollama respondió con error HTTP '.$res->status().': '.$res->body()
            );
        }

        $json = $res->json();
        if (! is_array($json)) {
            throw new RuntimeException('Respuesta inválida de Ollama.');
        }

        $content = data_get($json, 'message.content');
        if (! is_string($content) || trim($content) === '') {
            throw new RuntimeException('Ollama no devolvió contenido de mensaje.');
        }

        return [
            'model' => (string) data_get($json, 'model', $model),
            'message' => [
                'role' => (string) data_get($json, 'message.role', 'assistant'),
                'content' => $content,
            ],
            'raw' => $json,
        ];
    }
}
