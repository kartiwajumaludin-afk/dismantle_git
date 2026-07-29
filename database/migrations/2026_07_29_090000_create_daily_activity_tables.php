<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_activity', function (Blueprint $table) {
            $table->id();
            // Unique -- dipakai sebagai kunci upsert() di Populate (1 ticket
            // cuma 1 baris aktif di minggu berjalan).
            $table->string('ticket_number', 50)->nullable()->unique();
            $table->string('site_id', 50)->nullable();
            $table->string('site_name', 150)->nullable();
            $table->string('regional', 100)->nullable()->index();
            $table->string('network_operation_and_productivity', 150)->nullable();
            $table->string('teritory_operation', 150)->nullable();
            $table->string('ticket_status_name', 100)->nullable();
            $table->string('sub_type', 100)->nullable();
            $table->string('update_ticket_status_name', 100)->nullable();
            $table->date('plan_dismantle_date')->nullable()->index();
            // Internal, tidak ditampilkan di UI Daily Activity -- dipakai Mode Tracking.
            $table->decimal('latitude', 10, 6)->nullable();
            $table->decimal('longitude', 10, 6)->nullable();
            $table->string('pic_team', 100)->nullable()->index();
            $table->string('assigned_by', 100)->nullable();
            $table->enum('assignment_status', ['pending', 'accepted', 'rejected'])->default('pending');
            $table->enum('task_status', [
                'planned', 'assigned', 'in_progress', 'working',
                'reported', 'verified', 'completed', 'replanned',
            ])->default('planned')->index();
            $table->string('category_issue', 100)->nullable();
            $table->string('detail_issue', 255)->nullable();
            $table->text('remark_dismantle')->nullable();
            $table->date('activity_date')->nullable();
            $table->dateTime('work_start_time')->nullable();
            $table->dateTime('work_end_time')->nullable();
            $table->integer('work_duration')->nullable(); // menit
            $table->text('work_notes')->nullable();
            $table->text('work_photos')->nullable(); // JSON array path foto
            $table->string('verified_by', 100)->nullable();
            $table->dateTime('verified_at')->nullable();
            $table->text('verified_notes')->nullable();
            $table->timestamps();
        });

        // Snapshot -- TIDAK ADA updated_at (data historis, tidak pernah diubah).
        Schema::create('timesheet', function (Blueprint $table) {
            $table->id();
            $table->date('plan_dismantle_date')->nullable()->index();
            $table->string('ticket_number', 50)->nullable()->index();
            $table->string('site_id', 50)->nullable();
            $table->string('site_name', 150)->nullable();
            $table->string('regional', 100)->nullable();
            $table->string('nop', 150)->nullable();
            $table->string('ticket_status_name', 100)->nullable();
            $table->text('remark_dismantle')->nullable();
            $table->string('pic_team', 100)->nullable()->index();
            $table->string('category_issue', 100)->nullable();
            $table->string('detail_issue', 255)->nullable();
            $table->dateTime('work_start_time')->nullable();
            $table->dateTime('work_end_time')->nullable();
            $table->integer('work_duration')->nullable();
            $table->text('work_notes')->nullable();
            $table->string('verified_by', 100)->nullable();
            $table->dateTime('verified_at')->nullable();
            $table->text('verified_notes')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('activity_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_activity_id')->constrained('daily_activity')->cascadeOnDelete();
            $table->string('ticket_number', 50)->nullable()->index();
            $table->string('barcode_number', 100)->nullable()->index();
            $table->string('photo_path', 500)->nullable();
            $table->string('photo_type', 50)->nullable()->default('evidence');
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_photos');
        Schema::dropIfExists('timesheet');
        Schema::dropIfExists('daily_activity');
    }
};
