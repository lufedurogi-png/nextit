<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotente: asegura columna channel en servidores donde el código nuevo
 * ya está desplegado pero faltó 2026_05_30_120000_add_channel_to_cliente_ventas_mensajes.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('cliente_ventas_mensajes')) {
            return;
        }

        if (! Schema::hasColumn('cliente_ventas_mensajes', 'channel')) {
            Schema::table('cliente_ventas_mensajes', function (Blueprint $table) {
                $table->string('channel', 20)->default('admin')->after('user_id');
                $table->index(['user_id', 'channel', 'created_at'], 'cvm_user_channel_created_idx');
            });
        }
    }

    public function down(): void
    {
        // No revertir en producción si ya hay datos por canal.
    }
};
