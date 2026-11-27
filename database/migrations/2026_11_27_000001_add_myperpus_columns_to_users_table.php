<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 50)->unique()->after('id');
            $table->string('role', 20)->default('user')->after('password');
            $table->boolean('is_active')->default(true)->after('role');
            $table->string('full_name', 100)->nullable()->after('is_active');
            $table->text('bio')->nullable()->after('full_name');
            $table->timestamp('last_login_at')->nullable()->after('bio');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['username', 'role', 'is_active', 'full_name', 'bio', 'last_login_at']);
        });
    }
};
