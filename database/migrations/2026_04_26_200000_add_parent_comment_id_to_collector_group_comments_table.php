<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('collector_group_comments') || Schema::hasColumn('collector_group_comments', 'parent_comment_id')) {
            return;
        }

        Schema::table('collector_group_comments', function (Blueprint $table) {
            $table->foreignId('parent_comment_id')->nullable();
            $table->foreign('parent_comment_id')->references('id')->on('collector_group_comments');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('collector_group_comments') || ! Schema::hasColumn('collector_group_comments', 'parent_comment_id')) {
            return;
        }

        Schema::table('collector_group_comments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_comment_id');
        });
    }
};
