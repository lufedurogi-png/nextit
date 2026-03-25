<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class PayPalService
{
    private ?string $cachedToken = null;

    private function baseUrl(): string
    {
        $mode = strtolower((string) config('services.paypal.mode', 'sandbox'));

        return $mode === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }

    private function clientId(): string
    {
        return (string) config('services.paypal.client_id', '');
    }

    private function secret(): string
    {
        return (string) config('services.paypal.secret', '');
    }

    public function isConfigured(): bool
    {
        return $this->clientId() !== '' && $this->secret() !== '';
    }

    private function accessToken(): string
    {
        if ($this->cachedToken !== null) {
            return $this->cachedToken;
        }

        $res = Http::asForm()
            ->withBasicAuth($this->clientId(), $this->secret())
            ->post($this->baseUrl().'/v1/oauth2/token', [
                'grant_type' => 'client_credentials',
            ]);

        if (! $res->successful()) {
            Log::warning('PayPal token error', ['body' => $res->body()]);
            throw new RuntimeException('No se pudo autenticar con PayPal.');
        }

        $this->cachedToken = (string) $res->json('access_token', '');

        if ($this->cachedToken === '') {
            throw new RuntimeException('Respuesta de token PayPal inválida.');
        }

        return $this->cachedToken;
    }

    /**
     * @param  array{purchase_units: list<array<string,mixed>>, application_context?: array<string,mixed>}  $payload
     * @return array{id: string, links?: list<array{rel?: string, href?: string}>}
     */
    public function createOrder(array $payload): array
    {
        $res = Http::withToken($this->accessToken())
            ->withHeaders(['Content-Type' => 'application/json', 'Prefer' => 'return=representation'])
            ->post($this->baseUrl().'/v2/checkout/orders', $payload);

        if (! $res->successful()) {
            Log::warning('PayPal create order error', ['body' => $res->body()]);
            throw new RuntimeException('PayPal rechazó crear la orden.');
        }

        /** @var array<string, mixed> $json */
        $json = $res->json();

        return $json;
    }

    /** @return array<string, mixed> */
    public function captureOrder(string $paypalOrderId): array
    {
        $res = Http::withToken($this->accessToken())
            ->withHeaders(['Content-Type' => 'application/json', 'Prefer' => 'return=representation'])
            ->post($this->baseUrl().'/v2/checkout/orders/'.rawurlencode($paypalOrderId).'/capture', (object) []);

        if (! $res->successful()) {
            Log::warning('PayPal capture error', ['body' => $res->body()]);
            throw new RuntimeException('No se pudo capturar el pago en PayPal.');
        }

        /** @var array<string, mixed> $json */
        $json = $res->json();

        return $json;
    }

    /** @return array<string, mixed> */
    public function getOrder(string $paypalOrderId): array
    {
        $res = Http::withToken($this->accessToken())
            ->get($this->baseUrl().'/v2/checkout/orders/'.rawurlencode($paypalOrderId));

        if (! $res->successful()) {
            throw new RuntimeException('No se pudo consultar la orden en PayPal.');
        }

        /** @var array<string, mixed> $json */
        $json = $res->json();

        return $json;
    }

    public static function extractApproveUrl(array $createResponse): ?string
    {
        $links = $createResponse['links'] ?? [];
        if (! is_array($links)) {
            return null;
        }
        foreach ($links as $link) {
            if (! is_array($link)) {
                continue;
            }
            if (($link['rel'] ?? '') === 'approve' && ! empty($link['href'])) {
                return (string) $link['href'];
            }
        }

        return null;
    }

    /**
     * Suma capturada en la respuesta de capture (primer purchase_unit).
     */
    public static function capturedAmount(array $captureResponse): ?array
    {
        $units = $captureResponse['purchase_units'] ?? [];
        if (! is_array($units) || $units === []) {
            return null;
        }
        $u = $units[0];
        if (! is_array($u)) {
            return null;
        }
        $payments = $u['payments'] ?? [];
        if (! is_array($payments)) {
            return null;
        }
        $captures = $payments['captures'] ?? [];
        if (! is_array($captures) || $captures === []) {
            return null;
        }
        $c = $captures[0];
        if (! is_array($c)) {
            return null;
        }
        $amt = $c['amount'] ?? null;
        if (! is_array($amt)) {
            return null;
        }

        return [
            'currency_code' => (string) ($amt['currency_code'] ?? ''),
            'value' => (string) ($amt['value'] ?? ''),
        ];
    }

    public static function captureId(array $captureResponse): ?string
    {
        $units = $captureResponse['purchase_units'] ?? [];
        if (! is_array($units) || $units === []) {
            return null;
        }
        $u = $units[0];
        if (! is_array($u)) {
            return null;
        }
        $payments = $u['payments'] ?? [];
        if (! is_array($payments)) {
            return null;
        }
        $captures = $payments['captures'] ?? [];
        if (! is_array($captures) || $captures === []) {
            return null;
        }
        $c = $captures[0];

        return is_array($c) ? ($c['id'] ?? null) : null;
    }
}
