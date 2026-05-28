<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ventas_correo_envios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('asunto', 255);
            $table->text('cuerpo');
            $table->unsignedSmallInteger('enviados_count')->default(0);
            $table->unsignedSmallInteger('fallidos_count')->default(0);
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });

        Schema::create('ventas_correo_envio_destinatarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ventas_correo_envio_id')->constrained('ventas_correo_envios')->cascadeOnDelete();
            // Sin FK a destinatarios: SQL Server evita rutas de cascada múltiples (user → envío y user → destinatario).
            $table->unsignedBigInteger('ventas_correo_destinatario_id')->nullable();
            $table->index('ventas_correo_destinatario_id');
            $table->string('email', 255);
            $table->string('nombre', 200)->nullable();
            $table->string('estado', 20)->default('enviado');
            $table->string('error_mensaje', 500)->nullable();
            $table->timestamps();
        });

        Schema::create('ventas_correo_envio_adjuntos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ventas_correo_envio_id')->constrained('ventas_correo_envios')->cascadeOnDelete();
            $table->string('nombre_original', 500);
            $table->string('ruta', 1000);
            $table->string('mime_type', 120)->nullable();
            $table->unsignedInteger('tamano_bytes')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ventas_correo_envio_adjuntos');
        Schema::dropIfExists('ventas_correo_envio_destinatarios');
        Schema::dropIfExists('ventas_correo_envios');
    }
};
