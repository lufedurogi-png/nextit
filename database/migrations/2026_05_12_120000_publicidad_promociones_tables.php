<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('publicidad_carrusel_config')) {
            Schema::create('publicidad_carrusel_config', function (Blueprint $table) {
                $table->unsignedTinyInteger('id')->primary();
                $table->unsignedTinyInteger('activo')->default(1)->comment('1=visible en tienda, 0=oculto');
                $table->timestamps();
            });
            DB::table('publicidad_carrusel_config')->insert([
                'id' => 1,
                'activo' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if (Schema::hasTable('publicidad') && ! Schema::hasColumn('publicidad', 'enlace')) {
            Schema::table('publicidad', function (Blueprint $table) {
                $table->string('enlace', 2048)->nullable()->after('titulo');
            });
        }

        if (! Schema::hasTable('promociones')) {
            Schema::create('promociones', function (Blueprint $table) {
                $table->id();
                $table->string('slug', 160)->unique();
                $table->string('titulo', 255);
                $table->text('descripcion')->nullable();
                $table->boolean('activa')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('promocion_items')) {
            Schema::create('promocion_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('promocion_id')->constrained('promociones')->cascadeOnDelete();
                $table->string('clave', 255);
                $table->unsignedInteger('orden')->default(0);
                $table->timestamps();
                $table->unique(['promocion_id', 'clave']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('promocion_items');
        Schema::dropIfExists('promociones');
        if (Schema::hasTable('publicidad') && Schema::hasColumn('publicidad', 'enlace')) {
            Schema::table('publicidad', function (Blueprint $table) {
                $table->dropColumn('enlace');
            });
        }
        Schema::dropIfExists('publicidad_carrusel_config');
    }
};
