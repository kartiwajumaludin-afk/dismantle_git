<?php
// app/Services/Import/TrackerEngineService.php
// Pengganti semua Stored Procedure native — diporting persis dari
// dismantle.zip (5 tahap: upsert base, business logic, dismantle logic,
// approved NOP, manual raw->update->apply).

namespace App\Services\Import;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TrackerEngineService
{
    public function process(): array
    {
        $startTime = microtime(true);

        try {
            $t1 = microtime(true);
            $this->upsertTrackerBase();
            Log::info('MBE Step1 upsertTrackerBase: ' . round(microtime(true) - $t1, 2) . 's');

            $t1b = microtime(true);
            $this->updateExpiredWorkingPermit();
            Log::info('MBE Step1b updateExpiredWP: ' . round(microtime(true) - $t1b, 2) . 's');

            $t2 = microtime(true);
            $this->applyBusinessLogic();
            Log::info('MBE Step2 applyBusinessLogic: ' . round(microtime(true) - $t2, 2) . 's');

            $t3 = microtime(true);
            $this->applyDismantleLogic();
            Log::info('MBE Step3 applyDismantleLogic: ' . round(microtime(true) - $t3, 2) . 's');

            $t3b = microtime(true);
            $this->updateApprovedNop();
            Log::info('MBE Step3b updateApprovedNop: ' . round(microtime(true) - $t3b, 2) . 's');

            $t4 = microtime(true);
            $this->processManualRawToUpdate();
            Log::info('MBE Step4 processManualRawToUpdate: ' . round(microtime(true) - $t4, 2) . 's');

            $t5 = microtime(true);
            $this->applyManualUpdate();
            Log::info('MBE Step5 applyManualUpdate: ' . round(microtime(true) - $t5, 2) . 's');

            DB::table('tracker_manual_update')->truncate();

            $elapsed = round(microtime(true) - $startTime, 2);
            $total   = DB::table('tracker')->count();
            Log::info('MBE TOTAL: ' . $elapsed . 's - ' . $total . ' tracker rows');

            return [
                'success'       => true,
                'message'       => "Master Engine selesai dalam {$elapsed} detik.",
                'total_tracker' => $total,
                'elapsed'       => $elapsed,
            ];
        } catch (\Exception $e) {
            Log::error('TrackerEngineService error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
            ];
        }
    }

    // =============================================
    // STEP 1b — Force update Expired WP (tidak bergantung ticket_clean)
    // =============================================
    private function updateExpiredWorkingPermit(): void
    {
        DB::statement("
            UPDATE tracker
            SET working_permit_status_name = 'Expired',
                updated_at = NOW()
            WHERE working_permit_end_date IS NOT NULL
              AND working_permit_end_date < NOW()
              AND working_permit_status_name != 'Expired'
        ");
    }

    // =============================================
    // STEP 1 — sp_upsert_tracker_base
    // =============================================
    private function upsertTrackerBase(): void
    {
        DB::statement("
            INSERT INTO tracker (
                ticket_number, site_id, site_name, regional,
                network_operation_and_productivity, teritory_operation,
                ticket_status_name, ticket_summary, ticket_sub_type_name,
                ticket_created_date, working_permit_start_date,
                working_permit_end_date, working_permit_status_name,
                assignee_group, created_at, updated_at
            )
            SELECT
                tc.ticket_number, tc.site_id, tc.site_name, tc.regional,
                tc.network_operation_and_productivity, tc.teritory_operation,
                tc.ticket_status_name, tc.ticket_summary, tc.ticket_sub_type_name,
                tc.ticket_created_date, tc.working_permit_start_date,
                tc.working_permit_end_date,
                CASE
                    WHEN tc.working_permit_end_date IS NOT NULL
                         AND tc.working_permit_end_date < NOW()
                    THEN 'Expired'
                    ELSE tc.working_permit_status_name
                END AS working_permit_status_name,
                tc.assignee_group, NOW(), NOW()
            FROM ticket_clean tc
            ON DUPLICATE KEY UPDATE
                site_id                            = VALUES(site_id),
                site_name                          = VALUES(site_name),
                regional                           = VALUES(regional),
                network_operation_and_productivity = VALUES(network_operation_and_productivity),
                teritory_operation                 = VALUES(teritory_operation),
                ticket_status_name                 = VALUES(ticket_status_name),
                ticket_summary                     = VALUES(ticket_summary),
                ticket_sub_type_name               = VALUES(ticket_sub_type_name),
                ticket_created_date                = VALUES(ticket_created_date),
                working_permit_start_date          = VALUES(working_permit_start_date),
                working_permit_end_date            = VALUES(working_permit_end_date),
                working_permit_status_name         = VALUES(working_permit_status_name),
                assignee_group                     = VALUES(assignee_group),
                updated_at                         = NOW()
        ");
    }

    // =============================================
    // STEP 2 — sp_tracker_business_logic_opt
    // =============================================
    private function applyBusinessLogic(): void
    {
        // A. GENERAL STATUS
        DB::statement("
            UPDATE tracker
            SET general_status =
                CASE
                    WHEN ticket_status_name = 'Cancelled'
                        THEN 'Cancelled'
                    WHEN ticket_status_name = 'Closed'
                        THEN 'Closed'
                    WHEN ticket_status_name = 'Waiting PCAA Approval'
                        THEN 'Pending PCAA Approved'
                    WHEN ticket_status_name = 'Waiting NOP Dismantle Approval'
                        THEN 'Pending NOP Dismantle Approval'
                    WHEN ticket_status_name = 'Waiting NOP Approval'
                        THEN 'Pending NOP Approval'
                    WHEN ticket_status_name = 'Waiting TO Review'
                        THEN 'Pending TO Approval'
                    ELSE 'Pending Dismantle'
                END
        ");

        // B. WORKABLE STATUS
        DB::statement("
            UPDATE tracker
            SET workable_status =
                CASE
                    WHEN ticket_status_name = 'Cancelled'
                        THEN 'Ticket Cancelled'
                    WHEN ticket_status_name = 'Waiting TO Review'
                        THEN 'Waiting TO Review'
                    WHEN ticket_status_name IN (
                        'Closed',
                        'Waiting PCAA Approval',
                        'Waiting NOP Dismantle Approval'
                    )
                        THEN 'Done Dismantle'
                    WHEN site_status = 'Non Workable'
                        THEN 'Non Workable'
                    WHEN site_status = 'Workable'
                        THEN 'Workable'
                    ELSE NULL
                END
        ");

        // C. PLAN ASSET DISMANTLE (DETAIL)
        DB::statement("
            UPDATE tracker tr
            JOIN (
                SELECT
                    ticket_number,
                    CONCAT(
                        'PLAN : ',
                        GROUP_CONCAT(
                            CONCAT(asset_physical_group_name, ' : ', jumlah)
                            ORDER BY asset_physical_group_name
                            SEPARATOR ', '
                        )
                    ) AS plan_summary
                FROM (
                    SELECT
                        ticket_number,
                        asset_physical_group_name,
                        COUNT(*) AS jumlah
                    FROM asset_clean
                    GROUP BY ticket_number, asset_physical_group_name
                ) x
                GROUP BY ticket_number
            ) a ON tr.ticket_number = a.ticket_number
            SET tr.plan_asset_dismantle = a.plan_summary
        ");

        // D. ACTUAL ASSET DISMANTLE (DETAIL – DISPOSED)
        DB::statement("
            UPDATE tracker tr
            JOIN (
                SELECT
                    ticket_number,
                    CONCAT(
                        'ACTUAL : ',
                        GROUP_CONCAT(
                            CONCAT(asset_physical_group_name, ' : ', jumlah)
                            ORDER BY asset_physical_group_name
                            SEPARATOR ', '
                        )
                    ) AS actual_summary
                FROM (
                    SELECT
                        ticket_number,
                        asset_physical_group_name,
                        COUNT(*) AS jumlah
                    FROM asset_clean
                    WHERE asset_mflag LIKE '%Disposed%'
                    GROUP BY ticket_number, asset_physical_group_name
                ) x
                GROUP BY ticket_number
            ) a ON tr.ticket_number = a.ticket_number
            SET tr.actual_asset_dismantle = a.actual_summary
        ");

        // D3. PRIORITY SITE — logic dari SiteMapService::calcPriority()
        DB::statement("
            UPDATE tracker
            SET priority_site =
                CASE
                    WHEN UPPER(TRIM(COALESCE(site_issue,''))) = 'ISSUE' THEN 'P8'
                    WHEN ticket_status_name = 'Cancelled' THEN 'P7'
                    WHEN ticket_status_name IN (
                        'Closed',
                        'Closed with Revision Needed',
                        'Waiting NOP Dismantle Approval',
                        'Waiting PCAA Approval',
                        'Waiting DCAA Approval',
                        'Waiting Vendor Approval'
                    ) THEN 'P6'
                    WHEN ticket_status_name = 'Waiting TO Review' THEN 'P5'
                    WHEN ticket_status_name = 'In Progress Dismantle Asset'
                         AND working_permit_status_name IN ('Working Permit Ready','Working Permit Key Approved','Working Permit Key Approval','On Site')
                        THEN 'P1'
                    WHEN ticket_status_name = 'Waiting NOP Approval'
                         AND working_permit_status_name IN ('Working Permit Ready','Working Permit Key Approved','Working Permit Key Approval','On Site')
                        THEN 'P2'
                    WHEN ticket_status_name IN ('Rejected','In Progress','Assigned','New')
                         AND working_permit_status_name IN ('Working Permit Ready','Working Permit Key Approved','Working Permit Key Approval','On Site')
                        THEN 'P3'
                    ELSE 'P4'
                END
        ");

        // D4. INTERSECTION — Yes jika site_id sama ada di Asset Disposal DAN
        //     Asset Validation Over Quota dalam ticket_batch yang sama
        DB::statement("
            UPDATE tracker
            SET intersection = NULL
        ");
        DB::statement("
            UPDATE tracker t
            JOIN (
                SELECT a.site_id, a.ticket_batch
                FROM tracker a
                JOIN tracker b
                  ON a.site_id      = b.site_id
                 AND a.ticket_batch = b.ticket_batch
                 AND a.ticket_sub_type_name = 'Asset Disposal'
                 AND b.ticket_sub_type_name = 'Asset Validation Over Quota'
                WHERE a.site_id IS NOT NULL
                  AND a.ticket_batch IS NOT NULL
                GROUP BY a.site_id, a.ticket_batch
            ) x ON t.site_id = x.site_id AND t.ticket_batch = x.ticket_batch
            SET t.intersection = 'Yes'
        ");

        // E. ASSET SUMMARY — percentage_asset_actual
        DB::statement("
            UPDATE tracker tr
            JOIN (
                SELECT
                    ticket_number,
                    acc_cnt,
                    add_cnt,
                    (acc_cnt - add_cnt) AS init_cnt,
                    act_cnt,
                    CASE
                        WHEN (acc_cnt - add_cnt) <= 0 THEN 0
                        ELSE FLOOR((act_cnt / (acc_cnt - add_cnt)) * 100)
                    END AS pct_init,
                    CASE
                        WHEN acc_cnt <= 0 THEN 0
                        ELSE FLOOR((act_cnt / acc_cnt) * 100)
                    END AS pct_acc
                FROM (
                    SELECT
                        ticket_number,
                        COUNT(*) AS acc_cnt,
                        SUM(asset_status_name = 'Propose to Write Off') AS add_cnt,
                        SUM(asset_mflag LIKE '%Disposed%') AS act_cnt
                    FROM asset_clean
                    GROUP BY ticket_number
                ) t
            ) x ON tr.ticket_number = x.ticket_number
            SET tr.percentage_asset_actual = CONCAT(
                'INIT : ', x.init_cnt,
                ' | ADD : ', x.add_cnt,
                ' | ACC : ', x.acc_cnt,
                ' | ACT : ', x.act_cnt,
                ' | %INIT : ', x.pct_init, '%',
                ' | %ACC : ', x.pct_acc, '%'
            )
        ");

        // F. JUMLAH ASSET
        DB::statement("
            UPDATE tracker tr
            JOIN (
                SELECT ticket_number, COUNT(*) AS jumlah_asset
                FROM asset_clean
                GROUP BY ticket_number
            ) a ON tr.ticket_number = a.ticket_number
            SET tr.jumlah_asset = a.jumlah_asset
        ");

        // F2. KATEGORI ASSET
        DB::statement("
            UPDATE tracker
            SET cat_asset =
                CASE
                    WHEN jumlah_asset <= 5  THEN '<5 Asset'
                    WHEN jumlah_asset <= 10 THEN '<10 Asset'
                    WHEN jumlah_asset <= 15 THEN '<15 Asset'
                    WHEN jumlah_asset <= 20 THEN '<20 Asset'
                    ELSE '>20 Asset'
                END
            WHERE jumlah_asset IS NOT NULL
        ");

        // H. AGING CALCULATION
        DB::statement("
            UPDATE tracker
            SET aging_pending_approval =
            CASE
                WHEN ticket_status_name = 'Waiting PCAA Approval'
                    AND approve_after = 'Asset N/A'
                    AND approve_before IS NOT NULL
                THEN DATEDIFF(CURDATE(), approve_before)

                WHEN ticket_status_name = 'Waiting PCAA Approval'
                    AND approve_after IS NOT NULL
                    AND approve_after != 'Asset N/A'
                    AND approve_after REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
                THEN DATEDIFF(
                        CURDATE(),
                        STR_TO_DATE(approve_after, '%Y-%m-%d %H:%i:%s')
                    )

                WHEN ticket_status_name IN ('Waiting NOP Dismantle Approval', 'Waiting CTDO Dismantle Approval')
                    AND submit_after IS NOT NULL
                    AND submit_after REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
                THEN DATEDIFF(
                        CURDATE(),
                        STR_TO_DATE(submit_after, '%Y-%m-%d %H:%i:%s')
                    )

                WHEN ticket_status_name IN ('Waiting NOP Approval', 'Waiting CTDO Approval')
                    AND submit_before IS NOT NULL
                THEN DATEDIFF(CURDATE(), submit_before)

                WHEN ticket_status_name = 'Waiting TO Review'
                    AND ticket_created_date IS NOT NULL
                THEN DATEDIFF(CURDATE(), ticket_created_date)

                ELSE NULL
            END
        ");

        // I. KATEGORI AGING
        DB::statement("
            UPDATE tracker
            SET cat_pending_approval =
                CASE
                    WHEN aging_pending_approval IS NULL  THEN NULL
                    WHEN aging_pending_approval <= 1     THEN '<=1 Day'
                    WHEN aging_pending_approval <= 2     THEN '<=2 Days'
                    WHEN aging_pending_approval <= 3     THEN '<=3 Days'
                    WHEN aging_pending_approval <= 4     THEN '<=4 Days'
                    WHEN aging_pending_approval <= 5     THEN '<=5 Days'
                    WHEN aging_pending_approval <= 6     THEN '<=6 Days'
                    WHEN aging_pending_approval <= 7     THEN '<=7 Days'
                    WHEN aging_pending_approval <= 14    THEN '>1 Week'
                    WHEN aging_pending_approval <= 21    THEN '>2 Weeks'
                    WHEN aging_pending_approval <= 30    THEN '>3 Weeks'
                    ELSE '>1 Month'
                END
        ");

        // J. ASSET POSITION
        DB::statement("
            UPDATE tracker t
            JOIN (
                SELECT
                    ticket_number,
                    GROUP_CONCAT(DISTINCT
                        CASE
                            WHEN TRIM(asset_physical_group_name) IN (
                                'Antenna GPS',
                                'Antenna RF',
                                'RRU Antenna',
                                'Tenant Antenna RF',
                                'Transport Antenna',
                                'Transport Outdoor'
                            ) THEN 'T'
                            ELSE 'G'
                        END ORDER BY 1 ASC SEPARATOR ''
                    ) AS pos_code
                FROM asset_clean
                GROUP BY ticket_number
            ) src ON t.ticket_number = src.ticket_number
            SET t.asset_position =
                CASE
                    WHEN src.pos_code = 'T' THEN 'Asset On Tower'
                    WHEN src.pos_code = 'G' THEN 'Asset On Ground'
                    ELSE 'Asset On Tower and On Ground'
                END,
                t.updated_at = NOW()
        ");

        // K. ASSET STATUS
        DB::statement("
            UPDATE tracker t
            LEFT JOIN (
                SELECT
                    ticket_number,
                    SUM(CASE WHEN TRIM(asset_mflag) LIKE '%Disposed%' THEN 1 ELSE 0 END) AS cnt_disposed,
                    SUM(CASE WHEN TRIM(asset_mflag) LIKE '%Not Found%' THEN 1 ELSE 0 END) AS cnt_notfound,
                    SUM(CASE WHEN TRIM(asset_mflag) LIKE '%Still Active%' THEN 1 ELSE 0 END) AS cnt_active,
                    COUNT(*) AS cnt_total
                FROM asset_clean
                GROUP BY ticket_number
            ) src ON t.ticket_number = src.ticket_number
            SET t.asset_status =
                CASE
                    WHEN src.cnt_total IS NULL
                    OR src.cnt_total = 0             THEN 'NY Defined'
                    WHEN src.cnt_disposed = src.cnt_total
                                                    THEN 'Full Dismantle'
                    WHEN src.cnt_disposed > 0
                    AND src.cnt_disposed < src.cnt_total
                                                    THEN 'Partial Dismantle'
                    WHEN src.cnt_notfound > 0
                    AND src.cnt_active > 0            THEN 'Asset Not Found and Still Active'
                    WHEN src.cnt_notfound = src.cnt_total
                                                    THEN 'Asset Not Found'
                    WHEN src.cnt_active = src.cnt_total
                                                    THEN 'Asset Still Active'
                    ELSE 'NY Defined'
                END,
                t.updated_at = NOW()
        ");

        // ── Update asset_active, asset_not_found, asset_undefined ──
        DB::statement("
            UPDATE tracker t
            LEFT JOIN (
                SELECT
                    ticket_number,
                    SUM(CASE WHEN TRIM(asset_mflag) LIKE '%Disposed%' THEN 1 ELSE 0 END) AS cnt_disposed,
                    SUM(CASE
                            WHEN TRIM(asset_mflag) LIKE '%Not Found%'
                            AND  TRIM(asset_mflag) NOT LIKE '%Disposed%'
                            THEN 1 ELSE 0
                        END) AS cnt_notfound,
                    SUM(CASE
                            WHEN TRIM(asset_mflag) LIKE '%Still Active%'
                            AND  TRIM(asset_mflag) NOT LIKE '%Disposed%'
                            THEN 1 ELSE 0
                        END) AS cnt_active,
                    SUM(CASE
                            WHEN TRIM(COALESCE(asset_mflag,'')) = '' THEN 1
                            WHEN TRIM(asset_mflag) NOT LIKE '%Disposed%'
                            AND  TRIM(asset_mflag) NOT LIKE '%Not Found%'
                            AND  TRIM(asset_mflag) NOT LIKE '%Still Active%'
                            THEN 1 ELSE 0
                        END) AS cnt_undefined,
                    COUNT(*) AS cnt_total
                FROM asset_clean
                GROUP BY ticket_number
            ) src ON t.ticket_number = src.ticket_number
            SET
                t.plan_kom        = COALESCE(src.cnt_disposed, 0),
                t.asset_active    = COALESCE(src.cnt_active,   0),
                t.asset_not_found = COALESCE(src.cnt_notfound, 0),
                t.asset_undefined = CASE
                    WHEN src.cnt_total IS NULL OR src.cnt_total = 0
                        THEN COALESCE(t.jumlah_asset, 0)
                    ELSE COALESCE(src.cnt_undefined, 0)
                END,
                t.updated_at = NOW()
        ");
    }

    // =============================================
    // STEP 3 — sp_tracker_dismantle_logic
    // =============================================
    private function applyDismantleLogic(): void
    {
        DB::statement("
            UPDATE tracker t
            LEFT JOIN (
                SELECT
                    ticket_number,
                    MAX(CASE WHEN TRIM(work_info_status_name) = 'Ticket Closed'
                             THEN work_info_updated_date END)           AS dt_closed,
                    MAX(CASE WHEN TRIM(work_info_status_name) = 'Approved by PCAA'
                             THEN work_info_updated_date END)           AS dt_pcaa,
                    MAX(CASE WHEN TRIM(work_info_status_name) = 'New Ticket'
                             THEN work_info_updated_date END)           AS dt_new_ticket,
                    MAX(CASE WHEN TRIM(work_info_status_name) IN ('Approved by NOP','Approved by CTDO')
                                  AND rnk_approve = 1
                             THEN work_info_updated_date END)           AS approve_1,
                    MAX(CASE WHEN TRIM(work_info_status_name) IN ('Approved by NOP','Approved by CTDO')
                                  AND rnk_approve = 2
                             THEN work_info_updated_date END)           AS approve_2,
                    MAX(CASE WHEN TRIM(work_info_status_name) = 'Ticket Submitted'
                                  AND rnk_sub = 1
                             THEN work_info_updated_date END)           AS sub_1,
                    MAX(CASE WHEN TRIM(work_info_status_name) = 'Ticket Submitted'
                                  AND rnk_sub = 2
                             THEN work_info_updated_date END)           AS sub_2,
                    MAX(CASE WHEN TRIM(work_info_status_name) IN ('Approved by NOP','Approved by CTDO')
                                  AND rnk_approve = 1
                             THEN work_info_note END)                   AS note_approve_1
                FROM (
                    SELECT
                        ticket_number,
                        work_info_status_name,
                        work_info_updated_date,
                        work_info_note,
                        CASE
                            WHEN TRIM(work_info_status_name) IN ('Approved by NOP','Approved by CTDO')
                            THEN ROW_NUMBER() OVER(
                                PARTITION BY ticket_number,
                                    CASE WHEN TRIM(work_info_status_name) IN ('Approved by NOP','Approved by CTDO')
                                         THEN 'approve' END
                                ORDER BY work_info_updated_date DESC
                            )
                            ELSE NULL
                        END AS rnk_approve,
                        CASE
                            WHEN TRIM(work_info_status_name) = 'Ticket Submitted'
                            THEN ROW_NUMBER() OVER(
                                PARTITION BY ticket_number,
                                    CASE WHEN TRIM(work_info_status_name) = 'Ticket Submitted'
                                         THEN 'submit' END
                                ORDER BY work_info_updated_date DESC
                            )
                            ELSE NULL
                        END AS rnk_sub
                    FROM workinfo_clean
                    WHERE TRIM(work_info_status_name) IN (
                        'Approved by NOP',
                        'Approved by CTDO',
                        'Ticket Submitted',
                        'Ticket Closed',
                        'Approved by PCAA',
                        'New Ticket'
                    )
                ) ranked_data
                GROUP BY ticket_number
            ) src ON t.ticket_number = src.ticket_number
            SET
                t.closed =
                    CASE
                        WHEN t.ticket_status_name = 'Closed' THEN src.dt_closed
                        ELSE NULL
                    END,

                t.pcaa_approve =
                    CASE
                        WHEN t.ticket_status_name = 'Closed' THEN src.dt_pcaa
                        ELSE NULL
                    END,

                t.approve_after =
                    CASE
                        WHEN t.ticket_status_name NOT IN (
                            'Waiting PCAA Approval',
                            'Closed'
                        ) THEN NULL
                        WHEN src.note_approve_1 LIKE '%skip%'  THEN 'Asset N/A'
                        WHEN src.approve_2 IS NOT NULL           THEN CAST(src.approve_1 AS CHAR)
                        ELSE NULL
                    END,

                t.submit_after =
                    CASE
                        WHEN t.ticket_status_name NOT IN (
                            'Waiting NOP Dismantle Approval',
                            'Waiting CTDO Dismantle Approval',
                            'Waiting PCAA Approval',
                            'Closed'
                        ) THEN NULL
                        WHEN src.note_approve_1 LIKE '%skip%'           THEN 'Asset N/A'
                        WHEN src.sub_2 IS NOT NULL                      THEN CAST(src.sub_1 AS CHAR)
                        WHEN t.ticket_summary = 'Asset Disposal from Technical Support'
                             AND src.sub_1 IS NOT NULL                  THEN CAST(src.sub_1 AS CHAR)
                        WHEN t.ticket_status_name = 'Waiting CTDO Dismantle Approval'
                             AND src.sub_1 IS NOT NULL                  THEN CAST(src.sub_1 AS CHAR)
                        ELSE NULL
                    END,

                t.dismantle =
                    CASE
                        WHEN t.ticket_status_name NOT IN (
                            'Waiting CTDO Dismantle Approval',
                            'Waiting NOP Dismantle Approval',
                            'Waiting PCAA Approval',
                            'Closed'
                        ) THEN NULL
                        WHEN src.note_approve_1 LIKE '%skip%'           THEN 'Asset N/A'
                        WHEN src.sub_2 IS NOT NULL                      THEN CAST(src.sub_1 AS CHAR)
                        WHEN t.ticket_summary = 'Asset Disposal from Technical Support'
                             AND src.sub_1 IS NOT NULL                  THEN CAST(src.sub_1 AS CHAR)
                        WHEN t.ticket_status_name = 'Waiting CTDO Dismantle Approval'
                             AND src.sub_1 IS NOT NULL                  THEN CAST(src.sub_1 AS CHAR)
                        ELSE NULL
                    END,

                t.approve_before =
                    CASE
                        WHEN t.ticket_status_name NOT IN (
                            'In Progress Dismantle Asset',
                            'Waiting CTDO Dismantle Approval',
                            'Waiting NOP Dismantle Approval',
                            'Waiting PCAA Approval',
                            'Closed'
                        ) THEN NULL
                        WHEN src.note_approve_1 LIKE '%skip%'                       THEN src.approve_1
                        WHEN t.ticket_status_name = 'In Progress Dismantle Asset'   THEN src.approve_1
                        WHEN src.approve_2 IS NOT NULL                              THEN src.approve_2
                        ELSE src.approve_1
                    END,

                t.submit_before =
                    CASE
                        WHEN t.ticket_status_name NOT IN (
                            'Waiting NOP Approval',
                            'Waiting CTDO Approval',
                            'In Progress Dismantle Asset',
                            'Waiting CTDO Dismantle Approval',
                            'Waiting NOP Dismantle Approval',
                            'Waiting PCAA Approval',
                            'Closed'
                        ) THEN NULL
                        WHEN t.ticket_summary = 'Asset Disposal from Technical Support'
                             AND src.dt_new_ticket IS NOT NULL                     THEN src.dt_new_ticket
                        WHEN src.note_approve_1 LIKE '%skip%'                      THEN src.sub_1
                        WHEN src.sub_2 IS NOT NULL                                 THEN src.sub_2
                        ELSE src.sub_1
                    END,

                t.act_dismantle_week =
                    CASE
                        WHEN t.ticket_status_name NOT IN (
                            'Waiting CTDO Dismantle Approval',
                            'Waiting NOP Dismantle Approval',
                            'Waiting PCAA Approval',
                            'Closed'
                        ) THEN NULL
                        WHEN src.note_approve_1 LIKE '%skip%'
                             AND src.approve_1 IS NOT NULL                         THEN DATE_FORMAT(src.approve_1, '%x-W%v')
                        WHEN src.sub_1 IS NOT NULL
                             AND src.sub_2 IS NOT NULL                             THEN DATE_FORMAT(src.sub_1, '%x-W%v')
                        WHEN t.ticket_summary = 'Asset Disposal from Technical Support'
                             AND src.sub_1 IS NOT NULL                             THEN DATE_FORMAT(src.sub_1, '%x-W%v')
                        WHEN t.ticket_status_name = 'Waiting CTDO Dismantle Approval'
                             AND src.sub_1 IS NOT NULL                             THEN DATE_FORMAT(src.sub_1, '%x-W%v')
                        ELSE NULL
                    END,

                t.updated_at = NOW()
        ");
    }

    // =============================================
    // STEP 3b — Update approved_nop & avg_approved_nop
    // =============================================
    private function updateApprovedNop(): void
    {
        DB::statement("
            UPDATE tracker t
            SET t.approved_nop = CASE
                WHEN t.approve_before IS NOT NULL
                 AND t.submit_before  IS NOT NULL
                 AND t.approve_before > t.submit_before
                THEN CONCAT(
                    FLOOR(TIMESTAMPDIFF(MINUTE, t.submit_before, t.approve_before)/60),'h ',
                    MOD(TIMESTAMPDIFF(MINUTE, t.submit_before, t.approve_before),60),'m'
                )
                ELSE NULL
            END,
            t.avg_approved_nop = CASE
                WHEN t.approve_before IS NULL OR t.submit_before IS NULL
                  OR t.approve_before <= t.submit_before               THEN NULL
                WHEN TIMESTAMPDIFF(MINUTE, t.submit_before, t.approve_before) <  60 THEN '< 1 Hour'
                WHEN TIMESTAMPDIFF(MINUTE, t.submit_before, t.approve_before) < 120 THEN '< 2 Hours'
                WHEN TIMESTAMPDIFF(MINUTE, t.submit_before, t.approve_before) < 180 THEN '< 3 Hours'
                WHEN TIMESTAMPDIFF(MINUTE, t.submit_before, t.approve_before) < 240 THEN '< 4 Hours'
                WHEN TIMESTAMPDIFF(MINUTE, t.submit_before, t.approve_before) < 300 THEN '< 5 Hours'
                WHEN TIMESTAMPDIFF(HOUR,   t.submit_before, t.approve_before) <  24 THEN '< 1 Day'
                WHEN TIMESTAMPDIFF(DAY,    t.submit_before, t.approve_before) <   7 THEN '< 1 Week'
                WHEN TIMESTAMPDIFF(DAY,    t.submit_before, t.approve_before) <  14 THEN '< 2 Weeks'
                WHEN TIMESTAMPDIFF(DAY,    t.submit_before, t.approve_before) <  21 THEN '< 3 Weeks'
                WHEN TIMESTAMPDIFF(DAY,    t.submit_before, t.approve_before) <  30 THEN '< 1 Month'
                ELSE '> 1 Month'
            END,
            t.updated_at = NOW()
        ");
    }

    // =============================================
    // STEP 4 — sp_tracker_manual_raw_to_update
    // =============================================
    private function processManualRawToUpdate(): void
    {
        $count = DB::table('tracker_manual_raw')->count();
        if ($count === 0) return;

        DB::statement("
            INSERT INTO tracker_manual_update (
                ticket_number, tp_company, latitude, longitude,
                caf_submit, caf_approved, caf_status,
                start_permit_tp_date, end_permit_tp_date, status_permit_tp,
                ticket_batch, site_status, site_issue, category_issue,
                detail_issue, remark_dismantle, mom, partner_company,
                plan_dismantle_date, pic_team, act_dismantle_week,
                plan_kom, actual_cost,
                created_at, updated_at
            )
            SELECT
                r.ticket_number, r.tp_company, r.latitude, r.longitude,
                r.caf_submit, r.caf_approved, r.caf_status,
                CASE
                    WHEN r.start_permit_tp_date REGEXP '^[0-9]{4}-'
                        THEN r.start_permit_tp_date
                    WHEN r.start_permit_tp_date REGEXP '^[0-9]{1,2}-[A-Za-z]{3}-[0-9]{2}'
                        THEN STR_TO_DATE(r.start_permit_tp_date, '%d-%b-%y')
                    ELSE NULL
                END,
                CASE
                    WHEN r.end_permit_tp_date REGEXP '^[0-9]{4}-'
                        THEN r.end_permit_tp_date
                    WHEN r.end_permit_tp_date REGEXP '^[0-9]{1,2}-[A-Za-z]{3}-[0-9]{2}'
                        THEN STR_TO_DATE(r.end_permit_tp_date, '%d-%b-%y')
                    ELSE NULL
                END,
                r.status_permit_tp, r.ticket_batch, r.site_status, r.site_issue,
                r.category_issue, r.detail_issue, r.remark_dismantle, r.mom,
                r.partner_company,
                CASE
                    WHEN r.plan_dismantle_date REGEXP '^[0-9]{4}-'
                        THEN r.plan_dismantle_date
                    WHEN r.plan_dismantle_date REGEXP '^[0-9]{1,2}-[A-Za-z]{3}-[0-9]{2,4}'
                        THEN STR_TO_DATE(r.plan_dismantle_date, '%d-%b-%y')
                    ELSE NULL
                END,
                r.pic_team, r.act_dismantle_week,
                r.plan_kom, r.actual_cost,
                NOW(), NOW()
            FROM tracker_manual_raw r
            ON DUPLICATE KEY UPDATE
                tp_company          = VALUES(tp_company),
                latitude            = VALUES(latitude),
                longitude           = VALUES(longitude),
                plan_dismantle_date = VALUES(plan_dismantle_date),
                updated_at          = NOW()
        ");

        DB::table('tracker_manual_raw')->truncate();
    }

    // =============================================
    // STEP 5 — sp_apply_tracker_manual_update
    // =============================================
    private function applyManualUpdate(): void
    {
        $count = DB::table('tracker_manual_update')->count();
        if ($count === 0) return;

        DB::statement("
            UPDATE tracker t
            JOIN tracker_manual_update m ON m.ticket_number = t.ticket_number
            SET
                t.tp_company           = COALESCE(m.tp_company, t.tp_company),
                t.latitude             = COALESCE(m.latitude, t.latitude),
                t.longitude            = COALESCE(m.longitude, t.longitude),
                t.caf_status           = COALESCE(m.caf_status, t.caf_status),
                t.start_permit_tp_date = COALESCE(m.start_permit_tp_date, t.start_permit_tp_date),
                t.end_permit_tp_date   = COALESCE(m.end_permit_tp_date, t.end_permit_tp_date),
                t.status_permit_tp     = COALESCE(m.status_permit_tp, t.status_permit_tp),
                t.ticket_batch         = COALESCE(m.ticket_batch, t.ticket_batch),
                t.site_status          = COALESCE(m.site_status, t.site_status),
                t.site_issue           = COALESCE(m.site_issue, t.site_issue),
                t.category_issue       = COALESCE(m.category_issue, t.category_issue),
                t.detail_issue         = COALESCE(m.detail_issue, t.detail_issue),
                t.remark_dismantle     = COALESCE(m.remark_dismantle, t.remark_dismantle),
                t.mom                  = COALESCE(m.mom, t.mom),
                t.partner_company      = COALESCE(m.partner_company, t.partner_company),
                t.plan_dismantle_date  = COALESCE(m.plan_dismantle_date, t.plan_dismantle_date),
                t.pic_team             = COALESCE(m.pic_team, t.pic_team),
                t.act_dismantle_week   = COALESCE(m.act_dismantle_week, t.act_dismantle_week),
                t.caf_submit           = COALESCE(m.caf_submit,           t.caf_submit),
                t.caf_approved         = COALESCE(m.caf_approved,         t.caf_approved),
                t.plan_kom             = COALESCE(m.plan_kom,             t.plan_kom),
                t.actual_cost          = COALESCE(m.actual_cost,          t.actual_cost),
                t.plan_dismantle_week  =
                    CASE
                        WHEN m.plan_dismantle_date IS NOT NULL
                            THEN DATE_FORMAT(m.plan_dismantle_date, '%x-W%v')
                        WHEN t.plan_dismantle_date IS NOT NULL
                            THEN DATE_FORMAT(t.plan_dismantle_date, '%x-W%v')
                        ELSE t.plan_dismantle_week
                    END,
                t.updated_at           = NOW()
        ");
    }
}
