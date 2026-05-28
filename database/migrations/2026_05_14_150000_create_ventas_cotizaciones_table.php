<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ventas_cotizaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Sin FK a users: en SQL Server dos FK a la misma tabla con distintas acciones ON DELETE provoca error de "cascade paths".
            $table->unsignedBigInteger('cliente_user_id')->nullable()->index();
            $table->string('invitado_nombre', 200)->nullable();
            $table->string('invitado_email', 255)->nullable();
            $table->string('invitado_telefono', 40)->nullable();
            $table->text('comentario')->nullable();
            $table->decimal('descuento_general_pct', 5, 2)->default(0);
            $table->json('items');
            $table->decimal('total', 14, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ventas_cotizaciones');
    }
};
