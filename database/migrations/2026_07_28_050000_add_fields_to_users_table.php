<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->unique()->after('id');
            $table->string('full_name')->after('username');
            $table->string('phone', 30)->nullable()->after('email');
            $table->string('fcm_token')->nullable()->after('remember_token');
            $table->boolean('is_active')->default(true)->after('fcm_token');
            $table->date('active_from')->nullable()->after('is_active');
            $table->date('active_until')->nullable()->after('active_from');
            $table->boolean('must_change_password')->default(true)->after('active_until');
            $table->timestamp('last_login')->nullable()->after('must_change_password');
            $table->timestamp('last_seen_at')->nullable()->after('last_login');
            $table->foreignId('created_by')->nullable()->after('last_seen_at')->constrained('users')->nullOnDelete();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropColumn([
                'username', 'full_name', 'phone', 'fcm_token',
                'is_active', 'active_from', 'active_until',
                'must_change_password', 'last_login', 'last_seen_at', 'created_by',
            ]);
            $table->dropSoftDeletes();
        });
    }
};
