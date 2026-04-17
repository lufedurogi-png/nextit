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

    'cva' => [
        'base_url' => env('CVA_BASE_URL', 'https://apicvaservices.grupocva.com/api/v2'),
        /**
         * POST JSON cotización de flete (sin Bearer). Documentación CVA: https://www.grupocva.com/api/paqueteria_service/
         * Compatibilidad con proyecto Pruebas / NEXT.IT.txt: también se lee CVA_API_URL_FLETE si CVA_FLETE_URL está vacío.
         * Si queda vacío, el checkout usa envío $0.
         */
        'flete_url' => env('CVA_FLETE_URL') ?: env('CVA_API_URL_FLETE', ''),
        'user' => env('CVA_USER'),
        'password' => env('CVA_PASSWORD'),
        'token_ttl_hours' => 12,
        'sync_interval_minutes' => 5,
        'porcentaje_utilidad' => (float) (env('CVA_PORCENTAJE_UTILIDAD', 0)),
        'moneda_pesos' => env('CVA_MONEDA_PESOS', true),
    ],

    'exchangerate' => [
        'url' => env('EXCHANGERATE_API_URL', 'https://v6.exchangerate-api.com/v6'),
        'key' => env('EXCHANGERATE_API_KEY'),
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
        // Opcional: HTTPS público para webhooks en local (ej. ngrok). Si no se define, se deriva de APP_URL.
        'notification_url' => env('MERCADOPAGO_NOTIFICATION_URL'),
    ],

];
