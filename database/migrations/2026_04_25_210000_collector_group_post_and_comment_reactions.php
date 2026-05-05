<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('collector_group_posts') && ! Schema::hasTable('collector_group_post_reactions')) {
            Schema::create('collector_group_post_reactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('post_id')->constrained('collector_group_posts')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('reaction', 16);
                $table->timestamps();
                $table->unique(['post_id', 'user_id']);
            });
        }

        if (Schema::hasTable('collector_group_comments') && ! Schema::hasTable('collector_group_comment_reactions')) {
            Schema::create('collector_group_comment_reactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('comment_id')->constrained('collector_group_comments')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('reaction', 16);
                $table->timestamps();
                $table->unique(['comment_id', 'user_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('collector_group_comment_reactions');
        Schema::dropIfExists('collector_group_post_reactions');
    }
};
