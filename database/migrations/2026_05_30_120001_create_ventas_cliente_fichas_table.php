<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ventas_cliente_fichas')) {
            return;
        }

        Schema::create('ventas_cliente_fichas', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('seller_id');
            $table->unsignedBigInteger('cliente_user_id');
            $table->text('notas')->nullable();
            $table->timestamps();

            $table->unique(['seller_id', 'cliente_user_id'], 'vcf_seller_cliente_unique');
            $table->index('seller_id', 'vcf_seller_idx');
            $table->index('cliente_user_id', 'vcf_cliente_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ventas_cliente_fichas');
    }
};
