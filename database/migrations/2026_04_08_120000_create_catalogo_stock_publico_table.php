<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalogo_stock_publico', function (Blueprint $table) {
            $table->id();
            $table->string('clave', 100)->unique();
            $table->unsignedInteger('cantidad_base')->default(0)->comment('Stock ofrecido (espejo de disponible+disponible_cd en última sincronización o edición)');
            $table->timestamps();
        });

        // El rellenado masivo lo hace: próxima sync CVA / edición manual / `php artisan catalogo:sync-stock-publico`
    }

    public function down(): void
    {
        Schema::dropIfExists('catalogo_stock_publico');
    }
};
