<?php

namespace App\Support;

use App\Models\MetodoPagoConfiguracion;

class MetodoPagoToggle
{
    /** @var array<string, array{label:string, description:string}> */
    private const METHODS = [
        'paypal' => [
            'label' => 'PayPal',
            'description' => 'Pago redirigido a la pasarela de PayPal.',
        ],
        'mercadopago' => [
            'label' => 'Mercado Pago',
            'description' => 'Pago redirigido a Checkout Pro de Mercado Pago.',
        ],
        'tarjeta' => [
            'label' => 'Tarjeta de crédito o débito',
            'description' => 'Cobro directo en tu checkout con tarjeta guardada.',
        ],
    ];

    /**
     * @return array<string, bool>
     */
    public static function flags(): array
    {
        $rows = MetodoPagoConfiguracion::query()
            ->whereIn('codigo', array_keys(self::METHODS))
            ->get()
            ->keyBy('codigo');

        $out = [];
        foreach (array_keys(self::METHODS) as $code) {
            $out[$code] = (bool) ($rows[$code]->activo ?? true);
        }

        return $out;
    }

    public static function isEnabled(string $code): bool
    {
        $flags = self::flags();

        return $flags[$code] ?? true;
    }

    /**
     * @return array<int, array{code:string,label:string,description:string,active:bool}>
     */
    public static function listForAdmin(): array
    {
        $flags = self::flags();
        $out = [];
        foreach (self::METHODS as $code => $meta) {
            $out[] = [
                'code' => $code,
                'label' => $meta['label'],
                'description' => $meta['description'],
                'active' => $flags[$code] ?? true,
            ];
        }

        return $out;
    }

    public static function exists(string $code): bool
    {
        return array_key_exists($code, self::METHODS);
    }

    public static function set(string $code, bool $active, ?int $updatedByUserId = null): void
    {
        MetodoPagoConfiguracion::query()->updateOrCreate(
            ['codigo' => $code],
            [
                'activo' => $active,
                'updated_by_user_id' => $updatedByUserId,
            ]
        );
    }
}
