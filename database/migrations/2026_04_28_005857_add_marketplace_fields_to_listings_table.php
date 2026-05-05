<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Campos de tienda: galería y metadatos para búsqueda; las ventas "manuales"
     * siguen ligadas a un registro mínimo de colección creado en el API.
     */
    public function up(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            if (! Schema::hasColumn('listings', 'marketplace_title')) {
                $table->string('marketplace_title')->nullable();
            }
            if (! Schema::hasColumn('listings', 'marketplace_brand')) {
                $table->string('marketplace_brand', 200)->nullable();
            }
            if (! Schema::hasColumn('listings', 'marketplace_category')) {
                $table->string('marketplace_category', 150)->nullable();
            }
            if (! Schema::hasColumn('listings', 'marketplace_images')) {
                $table->json('marketplace_images')->nullable();
            }
            if (! Schema::hasColumn('listings', 'include_primary_item_image')) {
                $table->boolean('include_primary_item_image')->default(true);
            }
        });
    }

    public function down(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            if (Schema::hasColumn('listings', 'include_primary_item_image')) {
                $table->dropColumn('include_primary_item_image');
            }
            if (Schema::hasColumn('listings', 'marketplace_images')) {
                $table->dropColumn('marketplace_images');
            }
            if (Schema::hasColumn('listings', 'marketplace_category')) {
                $table->dropColumn('marketplace_category');
            }
            if (Schema::hasColumn('listings', 'marketplace_brand')) {
                $table->dropColumn('marketplace_brand');
            }
            if (Schema::hasColumn('listings', 'marketplace_title')) {
                $table->dropColumn('marketplace_title');
            }
        });
    }
};
