<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventas_cotizaciones', function (Blueprint $table) {
            $table->string('folio', 40)->nullable()->after('id');
        });

        $rows = DB::table('ventas_cotizaciones')->orderBy('id')->get(['id', 'created_at']);
        foreach ($rows as $row) {
            $y = $row->created_at ? date('Y', strtotime((string) $row->created_at)) : date('Y');
            DB::table('ventas_cotizaciones')->where('id', $row->id)->update([
                'folio' => sprintf('CV-%s-%06d', $y, $row->id),
            ]);
        }

        Schema::table('ventas_cotizaciones', function (Blueprint $table) {
            $table->unique('folio');
        });
    }

    public function down(): void
    {
        Schema::table('ventas_cotizaciones', function (Blueprint $table) {
            $table->dropUnique(['folio']);
            $table->dropColumn('folio');
        });
    }
};
