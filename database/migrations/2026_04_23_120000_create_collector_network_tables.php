<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar_path')->nullable()->after('email');
        });

        Schema::create('collections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->noActionOnDelete();
            $table->string('name');
            $table->string('accent_color', 16)->default('#6366f1');
            $table->string('cover_path')->nullable();
            $table->string('category')->nullable();
            $table->string('brand')->nullable();
            $table->timestamps();
        });

        Schema::create('collection_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('collection_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('ref_number')->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->string('rarity_code', 8)->default('C');
            $table->string('image_path')->nullable();
            $table->string('source', 16)->default('manual');
            $table->timestamps();
        });

        Schema::create('collector_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->noActionOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->text('rules')->nullable();
            $table->string('accent_color', 16)->default('#8b5cf6');
            $table->string('cover_path')->nullable();
            $table->timestamps();
        });

        Schema::create('collector_group_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained('collector_groups')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->noActionOnDelete();
            $table->string('role', 16)->default('member');
            $table->timestamps();
            $table->unique(['group_id', 'user_id']);
        });

        Schema::create('collector_group_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained('collector_groups')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->noActionOnDelete();
            $table->text('body');
            $table->json('images')->nullable();
            $table->timestamps();
        });

        Schema::create('collector_group_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('collector_group_posts')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->noActionOnDelete();
            $table->text('body');
            $table->timestamps();
        });

        Schema::create('listings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('users')->noActionOnDelete();
            $table->foreignId('collection_item_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('price', 12, 2);
            $table->string('extra_description', 700)->nullable();
            $table->json('extra_images')->nullable();
            $table->string('status', 24)->default('active');
            $table->timestamps();
        });

        Schema::create('chats', function (Blueprint $table) {
            $table->id();
            $table->string('type', 16)->default('direct');
            $table->foreignId('listing_id')->nullable()->constrained('listings')->nullOnDelete();
            $table->foreignId('buyer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('chat_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->noActionOnDelete();
            $table->timestamps();
            $table->unique(['chat_id', 'user_id']);
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->noActionOnDelete();
            $table->text('body')->nullable();
            $table->json('attachments')->nullable();
            $table->timestamps();
        });

        Schema::create('user_feed_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->noActionOnDelete();
            $table->text('body');
            $table->json('images')->nullable();
            $table->timestamps();
        });

        Schema::create('user_feed_post_reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('user_feed_posts')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->noActionOnDelete();
            $table->string('reaction', 16);
            $table->timestamps();
            $table->unique(['post_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_feed_post_reactions');
        Schema::dropIfExists('user_feed_posts');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('chat_participants');
        Schema::dropIfExists('chats');
        Schema::dropIfExists('listings');
        Schema::dropIfExists('collector_group_comments');
        Schema::dropIfExists('collector_group_posts');
        Schema::dropIfExists('collector_group_members');
        Schema::dropIfExists('collector_groups');
        Schema::dropIfExists('collection_items');
        Schema::dropIfExists('collections');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('avatar_path');
        });
    }
};
