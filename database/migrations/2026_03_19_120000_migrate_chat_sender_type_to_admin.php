<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('cliente_ventas_mensajes')
            ->where('sender_type', 'seller')
            ->update(['sender_type' => 'admin']);
    }

    public function down(): void
    {
        DB::table('cliente_ventas_mensajes')
            ->where('sender_type', 'admin')
            ->update(['sender_type' => 'seller']);
    }
};
