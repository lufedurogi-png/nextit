<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class MercadoPagoService
{
    private const BASE_URL = 'https://api.mercadopago.com';

    private const CONNECT_TIMEOUT_SECONDS = 15;

    private const REQUEST_TIMEOUT_SECONDS = 45;

    private const RETRY_TIMES = 2;

    private const RETRY_SLEEP_MS = 500;

    private function accessToken(): string
    {
        return trim((string) config('services.mercadopago.access_token', ''));
    }

    public function isConfigured(): bool
    {
        return $this->accessToken() !== '';
    }

    public function isTestCredentials(): bool
    {
        return str_starts_with($this->accessToken(), 'TEST-');
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function createPreference(array $payload): array
    {
        $res = Http::withToken($this->accessToken())
            ->connectTimeout(self::CONNECT_TIMEOUT_SECONDS)
            ->timeout(self::REQUEST_TIMEOUT_SECONDS)
            ->retry(self::RETRY_TIMES, self::RETRY_SLEEP_MS)
            ->acceptJson()
            ->post(self::BASE_URL.'/checkout/preferences', $payload);

        if (! $res->successful()) {
            Log::warning('Mercado Pago create preference error', ['body' => $res->body()]);
            throw new RuntimeException('Mercado Pago rechazó crear la preferencia de pago.');
        }

        /** @var array<string, mixed> $json */
        $json = $res->json();

        return $json;
    }

    /**
     * @return array<string, mixed>
     */
    public function getPayment(string $paymentId): array
    {
        $res = Http::withToken($this->accessToken())
            ->connectTimeout(self::CONNECT_TIMEOUT_SECONDS)
            ->timeout(self::REQUEST_TIMEOUT_SECONDS)
            ->retry(self::RETRY_TIMES, self::RETRY_SLEEP_MS)
            ->acceptJson()
            ->get(self::BASE_URL.'/v1/payments/'.rawurlencode($paymentId));

        if (! $res->successful()) {
            Log::warning('Mercado Pago get payment error', ['id' => $paymentId, 'body' => $res->body()]);
            throw new RuntimeException('No se pudo consultar el pago en Mercado Pago.');
        }

        /** @var array<string, mixed> $json */
        $json = $res->json();

        return $json;
    }

    public static function checkoutUrl(array $preferenceResponse, bool $testCredentials): ?string
    {
        if ($testCredentials) {
            $init = $preferenceResponse['init_point'] ?? null;
            $sandbox = $preferenceResponse['sandbox_init_point'] ?? null;
            foreach ([$init, $sandbox] as $u) {
                if (is_string($u) && $u !== '') {
                    return $u;
                }
            }

            return null;
        }

        $u = $preferenceResponse['init_point'] ?? null;

        return is_string($u) && $u !== '' ? $u : null;
    }
}
