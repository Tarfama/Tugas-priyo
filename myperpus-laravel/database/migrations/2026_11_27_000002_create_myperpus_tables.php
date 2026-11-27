<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Bookmarks
        Schema::create('bookmarks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('book_id');
            $table->string('title');
            $table->text('cover')->nullable();
            $table->string('authors')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['user_id', 'book_id']);
            $table->index('user_id');
        });

        // 2. Reading History
        Schema::create('reading_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('book_id');
            $table->string('title');
            $table->text('cover')->nullable();
            $table->string('authors')->nullable();
            $table->timestamp('last_read_at')->useCurrent();
            $table->unsignedInteger('read_count')->default(1);

            $table->unique(['user_id', 'book_id']);
            $table->index('user_id');
        });

        // 3. Reading Status ('want', 'reading', 'finished')
        Schema::create('reading_status', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('book_id');
            $table->string('title');
            $table->text('cover')->nullable();
            $table->enum('status', ['want', 'reading', 'finished']);
            $table->timestamp('updated_at')->useCurrent();

            $table->unique(['user_id', 'book_id']);
            $table->index(['user_id', 'status']);
        });

        // 4. Collections (Rak Buku)
        Schema::create('collections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 60);
            $table->text('description')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('user_id');
        });

        // 5. Collection Items
        Schema::create('collection_items', function (Blueprint $table) {
            $table->foreignId('collection_id')->constrained('collections')->cascadeOnDelete();
            $table->unsignedBigInteger('book_id');
            $table->string('title');
            $table->text('cover')->nullable();
            $table->timestamp('added_at')->useCurrent();

            $table->primary(['collection_id', 'book_id']);
        });

        // 6. Reviews & Ratings
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('book_id');
            $table->string('book_title');
            $table->unsignedTinyInteger('rating');
            $table->text('content')->nullable();
            $table->enum('status', ['visible', 'hidden'])->default('visible');
            $table->timestamps();

            $table->unique(['user_id', 'book_id']);
            $table->index(['book_id', 'status']);
            $table->index('user_id');
        });

        // 7. Featured Books (Buku Pilihan Admin)
        Schema::create('featured_books', function (Blueprint $table) {
            $table->unsignedBigInteger('book_id')->primary();
            $table->string('title');
            $table->text('cover')->nullable();
            $table->string('authors')->nullable();
            $table->string('note', 255)->nullable();
            $table->integer('sort_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
        });

        // 8. Hidden Books (Buku Disembunyikan Admin)
        Schema::create('hidden_books', function (Blueprint $table) {
            $table->unsignedBigInteger('book_id')->primary();
            $table->string('title')->nullable();
            $table->string('reason', 255)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
        });

        // 9. Announcements
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->string('title', 150);
            $table->text('content');
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
        });

        // 10. Audit Logs
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 100);
            $table->string('target_type', 50);
            $table->string('target_id', 50)->nullable();
            $table->text('detail')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('hidden_books');
        Schema::dropIfExists('featured_books');
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('collection_items');
        Schema::dropIfExists('collections');
        Schema::dropIfExists('reading_status');
        Schema::dropIfExists('reading_history');
        Schema::dropIfExists('bookmarks');
    }
};
