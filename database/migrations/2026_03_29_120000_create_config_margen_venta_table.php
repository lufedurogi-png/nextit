<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('config_margen_venta', function (Blueprint $table) {
            $table->id();
            $table->decimal('porcentaje', 10, 2)->default(0)->comment('Margen global sobre precio proveedor (%). Puede ser negativo.');
            $table->timestamps();
        });

        DB::table('config_margen_venta')->insert([
            'porcentaje' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('config_margen_venta');
    }
};
