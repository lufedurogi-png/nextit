<?php

namespace App\Support;

use App\Models\ClienteVentasMensaje;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Schema;

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

    public static function columnExists(): bool
    {
        return Schema::hasTable('cliente_ventas_mensajes')
            && Schema::hasColumn('cliente_ventas_mensajes', 'channel');
    }

    /**
     * Filtra por canal cuando la columna existe (post-migración 2026_05_30).
     * Sin columna: no filtra (comportamiento legacy, un solo buzón).
     *
     * @param  Builder<\App\Models\ClienteVentasMensaje>  $query
     * @return Builder<\App\Models\ClienteVentasMensaje>
     */
    public static function applyChannelFilter(Builder $query, string $channel): Builder
    {
        if (! self::columnExists()) {
            return $query;
        }

        return $query->where('channel', self::normalize($channel));
    }

    /** @return list<int> */
    public static function distinctUserIdsForChannel(string $channel): array
    {
        $query = self::applyChannelFilter(ClienteVentasMensaje::query(), $channel);

        return $query->distinct()->pluck('user_id')->map(fn ($id) => (int) $id)->all();
    }
}
