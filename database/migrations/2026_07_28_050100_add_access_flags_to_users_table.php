<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Independen dari role — satu user bisa dicentang salah satu atau
            // dua-duanya (contoh: admin yang juga approval lewat MobApp,
            // vendor yang juga akses Web).
            $table->boolean('can_access_web')->default(true)->after('must_change_password');
            $table->boolean('can_access_mobapp')->default(false)->after('can_access_web');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['can_access_web', 'can_access_mobapp']);
        });
    }
};
