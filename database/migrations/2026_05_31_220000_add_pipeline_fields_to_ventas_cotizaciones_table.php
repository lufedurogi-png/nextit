<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventas_cotizaciones', function (Blueprint $table) {
            $table->string('pipeline_etapa', 32)->default('nuevo')->index();
            $table->string('pipeline_prioridad', 16)->default('media')->index();
            $table->timestamp('pipeline_fecha_proximo_contacto')->nullable()->index();
            $table->string('pipeline_motivo_perdida', 255)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('ventas_cotizaciones', function (Blueprint $table) {
            $table->dropColumn([
                'pipeline_etapa',
                'pipeline_prioridad',
                'pipeline_fecha_proximo_contacto',
                'pipeline_motivo_perdida',
            ]);
        });
    }
};
