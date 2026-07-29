<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_map_cache', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number', 50)->unique()->nullable();
            $table->string('site_id', 255)->nullable();
            $table->string('site_name', 255)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('regional', 100)->nullable()->index();
            $table->string('nop', 150)->nullable()->index();
            $table->string('ticket_status_name', 100)->nullable()->index();
            $table->string('ticket_sub_type_name', 100)->nullable()->index();
            $table->string('ticket_batch', 50)->nullable()->index();
            $table->string('working_permit_status_name', 100)->nullable();
            $table->string('priority', 5)->nullable()->index(); // P1-P8
            $table->string('asset_position', 100)->nullable()->index();
            $table->timestamps();
        });

        Schema::create('user_positions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('source_app', ['dismantle', 'inbound', 'disposal'])->index();
            $table->string('task_ref_type')->nullable(); // daily_activity, disposal_assignment, inbound_batch
            $table->unsignedBigInteger('task_ref_id')->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->timestamp('recorded_at')->index();
            $table->timestamps();

            $table->index(['user_id', 'recorded_at']);
        });

        // Key-value generik -- dipakai jadwal GPS (gps_schedule_start/end,
        // gps_paused) dan interval reminder lain kalau perlu ke depannya.
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
        Schema::dropIfExists('user_positions');
        Schema::dropIfExists('site_map_cache');
    }
};
