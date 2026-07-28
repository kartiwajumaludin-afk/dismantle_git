<?php

namespace App\Services\Tracker;

use Illuminate\Support\Facades\DB;

class TrackerManualService
{
    // ── Get by ticket — load dari tracker untuk modal edit ──────────
    public function getByTicket(string $ticketNumber): ?object
    {
        return DB::table('tracker')
                 ->where('ticket_number', $ticketNumber)
                 ->first();
    }

    // ── Upsert ─────────────────────────────────────────────────
    public function upsert(string $ticketNumber, array $data): void
    {
        // tracker_manual_update: NON-DESTRUCTIVE (audit trail).
        // Kolom kosong/null dari form -> SKIP, tidak overwrite data existing.
        $exists = DB::table('tracker_manual_update')
                    ->where('ticket_number', $ticketNumber)
                    ->exists();

        $auditPayload = array_filter(
            array_map(fn ($v) => ($v === '' ? null : $v), $data),
            fn ($v) => $v !== null
        );
        $auditPayload['ticket_number'] = $ticketNumber;
        $auditPayload['updated_at']    = now();

        if ($exists) {
            DB::table('tracker_manual_update')
              ->where('ticket_number', $ticketNumber)
              ->update($auditPayload);
        } else {
            $auditPayload['created_at'] = now();
            DB::table('tracker_manual_update')->insert($auditPayload);
        }

        // tracker: DESTRUCTIVE sesuai input user dari modal.
        $this->syncToTracker($ticketNumber, $data);
    }

    // ── Sync to tracker ────────────────────────────────────
    private function syncToTracker(string $ticketNumber, array $data): void
    {
        $allowedCols = [
            'tp_company', 'latitude', 'longitude', 'caf_status',
            'caf_submit', 'caf_approved',
            'start_permit_tp_date', 'end_permit_tp_date', 'status_permit_tp',
            'ticket_batch', 'site_status', 'site_issue', 'category_issue',
            'detail_issue', 'remark_dismantle', 'mom', 'partner_company',
            'plan_dismantle_date', 'pic_team', 'act_dismantle_week',
            'plan_kom', 'actual_cost',
        ];

        $updateData = [];
        foreach ($allowedCols as $col) {
            if (!array_key_exists($col, $data)) {
                continue;
            }
            $updateData[$col] = ($data[$col] === '') ? null : $data[$col];
        }

        if (array_key_exists('plan_dismantle_date', $data)) {
            if (!empty($data['plan_dismantle_date'])) {
                try {
                    $date = new \DateTime($data['plan_dismantle_date']);
                    $updateData['plan_dismantle_week'] = $date->format('o-\WW');
                } catch (\Exception $e) {
                }
            } else {
                $updateData['plan_dismantle_week'] = null;
            }
        }

        if (!empty($updateData)) {
            $updateData['updated_at'] = now();
            DB::table('tracker')
              ->where('ticket_number', $ticketNumber)
              ->update($updateData);
        }
    }

    // ── Delete ───────────────────────────────────────────────
    public function delete(string $ticketNumber): void
    {
        DB::table('tracker_manual_update')
          ->where('ticket_number', $ticketNumber)
          ->delete();
    }
}
