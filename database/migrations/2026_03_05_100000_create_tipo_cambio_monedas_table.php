<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tipo_cambio_monedas', function (Blueprint $table) {
            $table->id();
            $table->string('moneda_origen', 3)->default('USD');
            $table->string('moneda_destino', 3)->default('MXN');

            $table->decimal('valor_api', 15, 4)->unsigned();
            $table->decimal('porcentaje_margen', 5, 2)->default(2.00);
            $table->decimal('valor_final', 15, 4)->unsigned();

            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tipo_cambio_monedas');
    }
};
