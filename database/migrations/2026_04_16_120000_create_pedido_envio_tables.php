<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedido_envios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pedido_id')->unique()->constrained('pedidos')->cascadeOnDelete();
            $table->decimal('subtotal_productos', 12, 2)->default(0);
            $table->decimal('costo_envio', 12, 2)->default(0);
            $table->string('moneda', 8)->default('MXN');
            $table->date('fecha_entrega_centro')->nullable();
            $table->date('fecha_entrega_desde')->nullable();
            $table->date('fecha_entrega_hasta')->nullable();
            $table->json('detalle_cotizacion')->nullable();
            $table->timestamps();
        });

        // SQL Server: no puede haber dos rutas CASCADE al mismo hijo (pedidos → pedido_items → … y pedidos → pedido_envios → …).
        // Además SQL Server no admite ON DELETE RESTRICT; usar NO ACTION (noActionOnDelete).
        // Al borrar ítems se borran las filas de envío por línea; al borrar el pedido, primero ítems y luego cabecera envío.
        Schema::create('pedido_item_envios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pedido_item_id')->unique()->constrained('pedido_items')->cascadeOnDelete();
            $table->foreignId('pedido_envio_id')->constrained('pedido_envios')->noActionOnDelete();
            $table->string('almacen_origen_label', 255)->nullable();
            $table->string('almacen_cp_origen', 32)->nullable();
            $table->decimal('costo_envio_prorrateado', 12, 2)->default(0);
            $table->json('meta_linea')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedido_item_envios');
        Schema::dropIfExists('pedido_envios');
    }
};
