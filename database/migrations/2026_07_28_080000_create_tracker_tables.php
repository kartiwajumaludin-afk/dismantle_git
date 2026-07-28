<?php
// Tabel tracker (hasil Master Engine) + tracker_manual_update (staging final
// sebelum di-apply ke tracker, hasil proses dari tracker_manual_raw).

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tracker', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number', 50)->unique();
            $table->string('site_id', 50)->nullable();
            $table->string('site_name', 150)->nullable();
            $table->string('ticket_status_name', 100)->nullable()->index();
            $table->string('regional', 100)->nullable()->index();
            $table->string('network_operation_and_productivity', 150)->nullable();
            $table->string('teritory_operation', 150)->nullable();
            $table->string('workable_status', 50)->nullable();
            $table->string('general_status', 100)->nullable();
            $table->string('asset_status', 50)->nullable();
            $table->unsignedSmallInteger('asset_active')->nullable()->default(0);
            $table->unsignedSmallInteger('asset_not_found')->nullable()->default(0);
            $table->unsignedSmallInteger('asset_undefined')->nullable()->default(0);
            $table->text('ticket_summary')->nullable();
            $table->string('ticket_batch', 50)->nullable()->index();
            $table->string('ticket_sub_type_name', 100)->nullable();
            $table->datetime('ticket_created_date')->nullable();
            $table->integer('jumlah_asset')->nullable()->default(0);
            $table->string('cat_asset', 50)->nullable();
            $table->string('asset_position', 50)->nullable();
            $table->string('percentage_asset_actual', 150)->nullable();
            $table->text('plan_asset_dismantle')->nullable();
            $table->text('actual_asset_dismantle')->nullable();
            $table->string('assignee_group', 150)->nullable();
            $table->string('tp_company', 100)->nullable();
            $table->decimal('latitude', 10, 6)->nullable();
            $table->decimal('longitude', 10, 6)->nullable();
            $table->string('caf_submit', 255)->nullable();
            $table->string('caf_approved', 255)->nullable();
            $table->string('caf_status', 50)->nullable();
            $table->datetime('working_permit_start_date')->nullable();
            $table->datetime('working_permit_end_date')->nullable();
            $table->string('working_permit_status_name', 100)->nullable();
            $table->string('sik_number', 50)->nullable();
            $table->date('start_permit_tp_date')->nullable();
            $table->date('end_permit_tp_date')->nullable();
            $table->string('status_permit_tp', 50)->nullable();
            $table->string('site_status', 100)->nullable();
            $table->string('priority_site', 10)->nullable();
            $table->string('intersection', 10)->nullable();
            $table->string('site_issue', 100)->nullable();
            $table->string('category_issue', 100)->nullable();
            $table->string('detail_issue', 255)->nullable();
            $table->text('remark_dismantle')->nullable();
            $table->text('mom')->nullable();
            $table->string('cat_pending_approval', 50)->nullable();
            $table->integer('aging_pending_approval')->nullable();
            $table->datetime('submit_before')->nullable();
            $table->datetime('approve_before')->nullable();
            $table->string('approved_nop', 20)->nullable();
            $table->string('avg_approved_nop', 20)->nullable();
            $table->string('dismantle', 50)->nullable();
            $table->string('submit_after', 50)->nullable();
            $table->string('approve_after', 50)->nullable();
            $table->datetime('pcaa_approve')->nullable();
            $table->datetime('closed')->nullable();
            $table->string('partner_company', 100)->nullable();
            $table->date('plan_dismantle_date')->nullable();
            $table->string('plan_dismantle_week', 10)->nullable();
            $table->string('pic_team', 100)->nullable();
            $table->string('act_dismantle_week', 50)->nullable();
            $table->string('plan_kom', 100)->nullable();
            $table->string('actual_cost', 100)->nullable();
            $table->datetime('created_at')->nullable()->useCurrent();
            $table->datetime('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

            $table->index(['regional', 'ticket_status_name'], 'tracker_regional_ticket_status_name_index');
            $table->index(['ticket_batch', 'ticket_status_name'], 'tracker_ticket_batch_ticket_status_name_index');
        });

        Schema::create('tracker_manual_update', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number', 50)->unique()->index();
            $table->string('tp_company', 100)->nullable();
            $table->decimal('latitude', 10, 6)->nullable();
            $table->decimal('longitude', 10, 6)->nullable();
            $table->string('caf_submit', 255)->nullable();
            $table->string('caf_approved', 255)->nullable();
            $table->string('caf_status', 50)->nullable();
            $table->date('start_permit_tp_date')->nullable();
            $table->date('end_permit_tp_date')->nullable();
            $table->string('status_permit_tp', 50)->nullable();
            $table->string('ticket_batch', 50)->nullable()->index();
            $table->string('site_status', 100)->nullable();
            $table->string('site_issue', 100)->nullable();
            $table->string('category_issue', 100)->nullable();
            $table->string('detail_issue', 255)->nullable();
            $table->text('remark_dismantle')->nullable();
            $table->text('mom')->nullable();
            $table->string('partner_company', 100)->nullable();
            $table->date('plan_dismantle_date')->nullable();
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
        Schema::dropIfExists('tracker_manual_update');
        Schema::dropIfExists('tracker');
    }
};
