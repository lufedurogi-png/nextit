<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('collector_group_members')) {
            Schema::table('collector_group_members', function (Blueprint $table) {
                if (! Schema::hasColumn('collector_group_members', 'can_post')) {
                    $table->boolean('can_post')->default(true)->after('role');
                }
                if (! Schema::hasColumn('collector_group_members', 'can_comment')) {
                    $table->boolean('can_comment')->default(true)->after('can_post');
                }
            });
        }

        if (! Schema::hasTable('collector_group_bans')) {
            Schema::create('collector_group_bans', function (Blueprint $table) {
                $table->id();
                $table->foreignId('group_id')->constrained('collector_groups')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->timestamps();
                $table->unique(['group_id', 'user_id']);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('collector_group_bans')) {
            Schema::dropIfExists('collector_group_bans');
        }

        if (Schema::hasTable('collector_group_members')) {
            Schema::table('collector_group_members', function (Blueprint $table) {
                if (Schema::hasColumn('collector_group_members', 'can_comment')) {
                    $table->dropColumn('can_comment');
                }
                if (Schema::hasColumn('collector_group_members', 'can_post')) {
                    $table->dropColumn('can_post');
                }
            });
        }
    }
};
