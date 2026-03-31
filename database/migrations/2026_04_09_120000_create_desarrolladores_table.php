<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('desarrolladores', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 140);
            $table->string('rol', 140);
            $table->text('descripcion');
            $table->string('foto_url', 2048);
            $table->string('foto_path', 2048);
            $table->date('fecha_inicio')->nullable();
            $table->date('fecha_fin')->nullable();
            $table->unsignedInteger('orden')->default(0);
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->index(['activo', 'orden', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('desarrolladores');
    }
};

