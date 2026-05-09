<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'paypal' => [
        'mode' => env('PAYPAL_MODE', 'sandbox'),
        'client_id' => env('PAYPAL_CLIENT_ID'),
        'secret' => env('PAYPAL_SECRET'),
    ],

    'mercadopago' => [
        'access_token' => env('MERCADOPAGO_ACCESS_TOKEN'),
        'public_key' => env('MERCADOPAGO_PUBLIC_KEY'),
        'client_id' => env('MERCADOPAGO_CLIENT_ID'),
        'client_secret' => env('MERCADOPAGO_CLIENT_SECRET'),
        'notification_url' => env('MERCADOPAGO_NOTIFICATION_URL'),
    ],

    'google_vision' => [
        /*
         * Ruta al JSON de la cuenta de servicio. Puede ser absoluta o relativa a la raíz del proyecto Laravel
         * (donde está artisan), p. ej. storage/app/private/google-vision/clave.json
         */
        'credentials' => (static function (): ?string {
            $raw = env('GOOGLE_VISION_CREDENTIALS_PATH');
            if (! is_string($raw)) {
                return null;
            }
            $raw = trim($raw);
            if ($raw === '') {
                return null;
            }
            // Ruta absoluta (o relativa al cwd del proceso): solo si existe.
            if (is_file($raw)) {
                $abs = realpath($raw);

                return $abs !== false ? $abs : $raw;
            }
            // Relativa a la raíz de Laravel (donde está artisan).
            $fromBase = base_path($raw);
            if (is_file($fromBase)) {
                $abs = realpath($fromBase);

                return $abs !== false ? $abs : $fromBase;
            }

            // No devolver ruta relativa: en Hostinger el cwd suele ser `public/` y `is_file()` fallaría igual.
            return null;
        })(),
    ],

];
