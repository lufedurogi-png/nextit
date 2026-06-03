<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('cliente_ventas_mensajes') || ! Schema::hasTable('cliente_vendedor_mensajes')) {
            return;
        }

        if (! Schema::hasColumn('cliente_ventas_mensajes', 'channel')) {
            return;
        }

        $rows = DB::table('cliente_ventas_mensajes')
            ->where('channel', 'ventas')
            ->orderBy('id')
            ->get();

        foreach ($rows as $row) {
            DB::table('cliente_vendedor_mensajes')->insert([
                'user_id' => $row->user_id,
                'sender_type' => $row->sender_type === 'admin' ? 'seller' : $row->sender_type,
                'seller_id' => $row->seller_id,
                'body' => $row->body,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
        }

        DB::table('cliente_ventas_mensajes')->where('channel', 'ventas')->delete();
    }

    public function down(): void
    {
        // No se revierte la copia de datos de forma automática.
    }
};
