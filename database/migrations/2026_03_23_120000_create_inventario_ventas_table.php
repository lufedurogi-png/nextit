<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventario_ventas', function (Blueprint $table) {
            $table->id();
            $table->string('clave', 100)->index();
            $table->unsignedInteger('cantidad');
            $table->foreignId('pedido_id')->constrained('pedidos')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['clave', 'pedido_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventario_ventas');
    }
};
