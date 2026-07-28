<?php
// Migration staging Import CSV — ticket_clean, asset_clean, workinfo_clean,
// tracker_manual_raw. Tabel `tracker` (hasil join) dan `tracker_manual_update`
// sengaja BELUM dibuat di sini — itu bagian Master Engine, dibangun bareng
// modul Tracker (lihat catatan di PROJECT_SPEC / diskusi chat).

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_clean', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number', 50)->nullable()->unique();
            $table->string('ticket_sub_type_name', 100)->nullable();
            $table->string('ticket_status_name', 100)->nullable()->index();
            $table->string('regional', 100)->nullable()->index();
            $table->string('network_operation_and_productivity', 150)->nullable();
            $table->string('teritory_operation', 150)->nullable();
            $table->string('site_id', 50)->nullable();
            $table->string('site_name', 150)->nullable();
            $table->string('assignee_group', 100)->nullable();
            $table->string('assignee', 100)->nullable();
            $table->text('ticket_summary')->nullable();
            $table->datetime('ticket_created_date')->nullable();
            $table->datetime('ticket_resolved_date')->nullable();
            $table->datetime('ticket_cleared_date')->nullable();
            $table->string('working_permit_number', 50)->nullable();
            $table->string('working_permit_status_name', 100)->nullable();
            $table->text('working_permit_status_text')->nullable();
            $table->string('working_permit_activity_name', 150)->nullable();
            $table->text('working_permit_activity_description')->nullable();
            $table->string('working_permit_activity_category', 100)->nullable();
            $table->string('site_owner', 100)->nullable();
            $table->datetime('working_permit_start_date')->nullable();
            $table->datetime('working_permit_end_date')->nullable();
            $table->datetime('working_permit_updated_date')->nullable();
            $table->string('sik_number', 50)->nullable();
            $table->string('sik_status_name', 100)->nullable();
            $table->datetime('v_now')->nullable()->useCurrent();
            $table->datetime('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();
        });

        Schema::create('asset_clean', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number', 50)->nullable()->index();
            $table->string('site_id', 50)->nullable();
            $table->string('site_name', 150)->nullable();
            $table->string('ticket_sub_type_name', 100)->nullable();
            $table->string('ticket_status_name', 100)->nullable();
            $table->string('assignee_group', 100)->nullable();
            $table->string('assignee', 100)->nullable();
            $table->text('ticket_summary')->nullable();
            $table->datetime('ticket_created_date')->nullable();
            $table->datetime('ticket_resolved_date')->nullable();
            $table->datetime('ticket_cleared_date')->nullable();
            $table->string('barcode_number', 100)->nullable();
            $table->string('serial_number')->nullable();
            $table->string('part_code', 100)->nullable();
            $table->text('part_name')->nullable();
            $table->string('brand_name', 100)->nullable();
            $table->text('asset_physical_group_name')->nullable();
            $table->string('asset_po_number', 100)->nullable();
            $table->string('asset_status_name', 100)->nullable();
            $table->string('asset_flag_name', 100)->nullable();
            $table->string('asset_mflag', 50)->nullable();
            $table->datetime('v_now')->nullable()->useCurrent();
            $table->datetime('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();
            $table->unique(['ticket_number', 'barcode_number'], 'uq_asset_ticket_barcode');
        });

        Schema::create('workinfo_clean', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number', 50)->nullable()->index();
            $table->string('site_id', 50)->nullable();
            $table->string('site_name', 150)->nullable();
            $table->string('ticket_sub_type_name', 100)->nullable();
            $table->string('regional', 100)->nullable()->index();
            $table->string('network_operation_and_productivity', 150)->nullable();
            $table->string('teritory_operation', 150)->nullable();
            $table->string('work_info_user_updater', 100)->nullable();
            $table->string('work_info_role_updater', 100)->nullable();
            $table->string('work_info_status_name', 100)->nullable()->index();
            $table->text('work_info_note')->nullable();
            $table->datetime('work_info_updated_date')->nullable()->index();
            $table->datetime('v_now')->nullable()->useCurrent();
            $table->unique(
                ['ticket_number', 'work_info_updated_date', 'work_info_status_name'],
                'uq_workinfo_event'
            );
        });

        Schema::create('tracker_manual_raw', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number', 50)->unique();
            $table->string('tp_company', 100)->nullable();
            $table->decimal('latitude', 10, 6)->nullable();
            $table->decimal('longitude', 10, 6)->nullable();
            $table->string('caf_submit', 255)->nullable();
            $table->string('caf_approved', 255)->nullable();
            $table->string('caf_status', 50)->nullable();
            $table->string('start_permit_tp_date', 50)->nullable();
            $table->string('end_permit_tp_date', 50)->nullable();
            $table->string('status_permit_tp', 50)->nullable();
            $table->string('ticket_batch', 50)->nullable();
            $table->string('site_status', 100)->nullable();
            $table->string('site_issue', 100)->nullable();
            $table->string('category_issue', 100)->nullable();
            $table->string('detail_issue', 255)->nullable();
            $table->text('remark_dismantle')->nullable();
            $table->text('mom')->nullable();
            $table->string('partner_company', 100)->nullable();
            $table->string('plan_dismantle_date', 50)->nullable();
            $table->string('pic_team', 100)->nullable();
            $table->string('act_dismantle_week', 20)->nullable();
            $table->string('plan_kom', 50)->nullable();
            $table->string('actual_cost', 100)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tracker_manual_raw');
        Schema::dropIfExists('workinfo_clean');
        Schema::dropIfExists('asset_clean');
        Schema::dropIfExists('ticket_clean');
    }
};
