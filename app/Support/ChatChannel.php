<?php

namespace App\Support;

class ChatChannel
{
    public const ADMIN = 'admin';

    public const VENTAS = 'ventas';

    /** @return list<string> */
    public static function all(): array
    {
        return [self::ADMIN, self::VENTAS];
    }

    public static function normalize(?string $channel): string
    {
        $channel = strtolower(trim((string) $channel));

        return in_array($channel, self::all(), true) ? $channel : self::ADMIN;
    }
}
