<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ventas_correo_grupos')) {
            Schema::create('ventas_correo_grupos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('nombre', 200);
                $table->timestamps();

                $table->unique(['user_id', 'nombre'], 'vcg_user_nombre_unique');
                $table->index('user_id');
            });
        }

        // Sin FK a grupos: SQL Server evita rutas de cascada múltiples (user → destinatario y user → grupo).
        if (Schema::hasTable('ventas_correo_destinatarios') && ! Schema::hasColumn('ventas_correo_destinatarios', 'ventas_correo_grupo_id')) {
            Schema::table('ventas_correo_destinatarios', function (Blueprint $table) {
                $table->unsignedBigInteger('ventas_correo_grupo_id')->nullable()->after('user_id');
                $table->index('ventas_correo_grupo_id', 'vcd_grupo_id_idx');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('ventas_correo_destinatarios', 'ventas_correo_grupo_id')) {
            Schema::table('ventas_correo_destinatarios', function (Blueprint $table) {
                $table->dropIndex('vcd_grupo_id_idx');
                $table->dropColumn('ventas_correo_grupo_id');
            });
        }

        Schema::dropIfExists('ventas_correo_grupos');
    }
};
