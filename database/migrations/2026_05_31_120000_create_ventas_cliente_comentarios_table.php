<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ventas_cliente_comentarios')) {
            return;
        }

        Schema::create('ventas_cliente_comentarios', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('seller_id');
            $table->unsignedBigInteger('cliente_user_id');
            $table->text('body');
            $table->timestamps();

            $table->index(['seller_id', 'cliente_user_id', 'created_at'], 'vcc_seller_cliente_created_idx');
        });

        if (Schema::hasTable('ventas_cliente_fichas')) {
            $fichas = DB::table('ventas_cliente_fichas')
                ->whereNotNull('notas')
                ->where('notas', '!=', '')
                ->get(['seller_id', 'cliente_user_id', 'notas', 'updated_at', 'created_at']);

            foreach ($fichas as $f) {
                DB::table('ventas_cliente_comentarios')->insert([
                    'seller_id' => $f->seller_id,
                    'cliente_user_id' => $f->cliente_user_id,
                    'body' => $f->notas,
                    'created_at' => $f->updated_at ?? $f->created_at ?? now(),
                    'updated_at' => $f->updated_at ?? now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ventas_cliente_comentarios');
    }
};
