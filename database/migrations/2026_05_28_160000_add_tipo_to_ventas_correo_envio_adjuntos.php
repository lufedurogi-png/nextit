<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventas_correo_envio_adjuntos', function (Blueprint $table) {
            $table->string('tipo', 20)->default('adjunto')->after('ventas_correo_envio_id');
        });
    }

    public function down(): void
    {
        Schema::table('ventas_correo_envio_adjuntos', function (Blueprint $table) {
            $table->dropColumn('tipo');
        });
    }
};
