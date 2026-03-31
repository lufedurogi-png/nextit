<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cotizacion_invitados', function (Blueprint $table) {
            $table->id();
            $table->string('email', 255);
            $table->decimal('total', 14, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('cotizacion_invitado_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cotizacion_invitado_id')->constrained('cotizacion_invitados')->cascadeOnDelete();
            $table->string('clave', 100);
            $table->string('nombre_producto', 500);
            $table->unsignedInteger('cantidad')->default(1);
            $table->decimal('precio_unitario', 12, 2);
            $table->string('imagen', 1000)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cotizacion_invitado_items');
        Schema::dropIfExists('cotizacion_invitados');
    }
};
