<?php

namespace App\Services;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use stdClass;

class GoogleIdTokenService
{
    private const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

    /**
     * @return array{sub: string, email: string, name: string, picture: ?string, email_verified: bool}|null
     */
    public function verifyAndDecode(string $credential): ?array
    {
        $clientId = config('services.google.client_id');
        if (! is_string($clientId) || $clientId === '') {
            return null;
        }

        try {
            $jwks = Cache::remember('google_oauth2_jwks', 3600, function () {
                $res = Http::timeout(15)->get(self::JWKS_URL);
                if (! $res->successful()) {
                    throw new InvalidArgumentException('JWKS fetch failed');
                }
                $decoded = json_decode($res->body(), true);
                if (! is_array($decoded)) {
                    throw new InvalidArgumentException('Invalid JWKS');
                }

                return $decoded;
            });

            $keys = JWK::parseKeySet($jwks);
            /** @var stdClass $payload */
            $payload = JWT::decode($credential, $keys);
        } catch (\Throwable) {
            return null;
        }

        $iss = is_string($payload->iss ?? null) ? rtrim((string) $payload->iss, '/') : '';
        if ($iss !== 'https://accounts.google.com') {
            return null;
        }

        $aud = $payload->aud ?? null;
        if ($aud !== $clientId) {
            return null;
        }

        $sub = is_string($payload->sub ?? null) ? $payload->sub : '';
        if ($sub === '') {
            return null;
        }

        $email = is_string($payload->email ?? null) ? $payload->email : '';
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        $name = is_string($payload->name ?? null) ? trim($payload->name) : '';
        if ($name === '') {
            $name = strstr($email, '@', true) ?: 'Usuario';
        }

        $picture = is_string($payload->picture ?? null) ? trim($payload->picture) : null;
        if ($picture === '') {
            $picture = null;
        }

        $emailVerified = filter_var($payload->email_verified ?? false, FILTER_VALIDATE_BOOL);

        return [
            'sub' => $sub,
            'email' => $email,
            'name' => $name,
            'picture' => $picture,
            'email_verified' => $emailVerified,
        ];
    }
}
