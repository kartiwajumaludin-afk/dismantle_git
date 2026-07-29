<?php

namespace App\Services\Tracker;

use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class TrackerService
{
    // Dipakai exportCsv() -- sinkron sama CATS/MAIN_COLS di Tracker/Index.jsx.
    private const MAIN_COLS = [
        'ticket_number', 'site_id', 'site_name', 'ticket_status_name', 'regional',
        'network_operation_and_productivity', 'teritory_operation', 'workable_status',
        'general_status', 'asset_status', 'ticket_batch', 'ticket_sub_type_name',
        'ticket_created_date', 'priority_site', 'intersection',
    ];
    private const CAT_COLS = [
        'asset_info'     => ['jumlah_asset', 'cat_asset', 'asset_position', 'percentage_asset_actual', 'plan_asset_dismantle', 'actual_asset_dismantle'],
        'site_info'      => ['assignee_group', 'tp_company', 'latitude', 'longitude', 'caf_submit', 'caf_approved', 'caf_status'],
        'permit_info'    => ['working_permit_start_date', 'working_permit_end_date', 'working_permit_status_name', 'sik_number', 'start_permit_tp_date', 'end_permit_tp_date', 'status_permit_tp'],
        'dismantle_info' => ['site_status', 'site_issue', 'category_issue', 'detail_issue', 'remark_dismantle', 'mom', 'cat_pending_approval', 'aging_pending_approval', 'submit_before', 'approve_before', 'dismantle', 'submit_after', 'approve_after', 'pcaa_approve', 'closed', 'approved_nop', 'avg_approved_nop', 'partner_company', 'plan_dismantle_date', 'plan_dismantle_week', 'pic_team', 'act_dismantle_week', 'plan_kom', 'actual_cost', 'asset_active', 'asset_not_found', 'asset_undefined'],
    ];

    // ── Tracker Data ─────────────────────────────────────────────────
    public function getTrackerData(Request $request, array $userRegionCodes = []): array
    {
        $query = DB::table('tracker as t');

        if (!empty($userRegionCodes)) {
            $regionNames = $this->codesToNames($userRegionCodes);
            if (!empty($regionNames)) {
                $query->whereIn('t.regional', $regionNames);
            }
        }

        if ($request->filled('regions') && $request->regions !== 'all') {
            $codes       = explode(',', $request->regions);
            $regionNames = $this->codesToNames($codes);
            if (!empty($regionNames)) {
                $query->whereIn('t.regional', $regionNames);
            }
        }

        if ($request->filled('ticket_status') && $request->ticket_status !== 'all') {
            $query->whereIn('t.ticket_status_name', explode(',', $request->ticket_status));
        }

        if ($request->filled('ticket_batch') && $request->ticket_batch !== 'all') {
            $query->whereIn('t.ticket_batch', explode(',', $request->ticket_batch));
        }

        if ($request->filled('ticket_sub_type') && $request->ticket_sub_type !== 'all') {
            $query->whereIn('t.ticket_sub_type_name', explode(',', $request->ticket_sub_type));
        }

        if ($request->filled('nop') && $request->nop !== 'all') {
            $query->whereIn('t.network_operation_and_productivity', explode(',', $request->nop));
        }

        if ($request->filled('start_date')) {
            $query->whereDate('t.ticket_created_date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('t.ticket_created_date', '<=', $request->end_date);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('t.ticket_number', 'like', "%{$s}%")
                  ->orWhere('t.site_id', 'like', "%{$s}%")
                  ->orWhere('t.site_name', 'like', "%{$s}%")
                  ->orWhere('t.ticket_batch', 'like', "%{$s}%");
            });
        }

        $sortable = [
            'ticket_number','site_id','site_name','ticket_status_name',
            'regional','workable_status','general_status','asset_status',
            'ticket_batch','ticket_created_date',
            'network_operation_and_productivity','teritory_operation',
        ];
        $sort = $request->get('sort', 'ticket_created_date');
        $dir  = $request->get('dir', 'desc');
        if (in_array($sort, $sortable)) {
            $query->orderBy("t.{$sort}", $dir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('t.ticket_created_date', 'desc');
        }

        $total   = $query->count();
        $perPage = (int) $request->get('per_page', 50);
        $page    = max(1, (int) $request->get('page', 1));
        $offset  = ($page - 1) * $perPage;

        $data = (clone $query)
            ->select('t.*')
            ->offset($offset)
            ->limit($perPage)
            ->get();

        return [
            'data'         => $data,
            'total'        => $total,
            'per_page'     => $perPage,
            'current_page' => $page,
            'last_page'    => max(1, (int) ceil($total / $perPage)),
            'from'         => $total > 0 ? $offset + 1 : 0,
            'to'           => min($offset + $perPage, $total),
        ];
    }

    // ── Asset Data ─────────────────────────────────────────────────
    public function getAssetData(Request $request, array $userRegionCodes = []): array
    {
        $query = DB::table('asset_clean');

        if (!empty($userRegionCodes)) {
            $regionNames = $this->codesToNames($userRegionCodes);
            if (!empty($regionNames)) {
                $ticketNumbers = DB::table('ticket_clean')
                    ->whereIn('regional', $regionNames)
                    ->pluck('ticket_number');
                $query->whereIn('ticket_number', $ticketNumbers);
            }
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('ticket_number', 'like', "%{$s}%")
                  ->orWhere('barcode_number', 'like', "%{$s}%")
                  ->orWhere('site_id', 'like', "%{$s}%")
                  ->orWhere('site_name', 'like', "%{$s}%")
                  ->orWhere('part_name', 'like', "%{$s}%")
                  ->orWhere('part_code', 'like', "%{$s}%")
                  ->orWhere('brand_name', 'like', "%{$s}%")
                  ->orWhere('asset_physical_group_name', 'like', "%{$s}%");
            });
        }

        $total   = $query->count();
        $perPage = (int) $request->get('per_page', 50);
        $page    = max(1, (int) $request->get('page', 1));
        $offset  = ($page - 1) * $perPage;

        $data = (clone $query)
            ->orderBy('ticket_number')
            ->orderBy('barcode_number')
            ->offset($offset)
            ->limit($perPage)
            ->get();

        return [
            'data'         => $data,
            'total'        => $total,
            'per_page'     => $perPage,
            'current_page' => $page,
            'last_page'    => max(1, (int) ceil($total / $perPage)),
            'from'         => $total > 0 ? $offset + 1 : 0,
            'to'           => min($offset + $perPage, $total),
        ];
    }

    // ── Workinfo Data ────────────────────────────────────────────
    public function getWorkinfoData(Request $request, array $userRegionCodes = []): array
    {
        $query = DB::table('workinfo_clean');

        if (!empty($userRegionCodes)) {
            $regionNames = $this->codesToNames($userRegionCodes);
            if (!empty($regionNames)) {
                $query->whereIn('regional', $regionNames);
            }
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('ticket_number', 'like', "%{$s}%")
                  ->orWhere('site_id', 'like', "%{$s}%")
                  ->orWhere('site_name', 'like', "%{$s}%")
                  ->orWhere('work_info_status_name', 'like', "%{$s}%")
                  ->orWhere('work_info_note', 'like', "%{$s}%")
                  ->orWhere('work_info_user_updater', 'like', "%{$s}%")
                  ->orWhere('work_info_role_updater', 'like', "%{$s}%");
            });
        }

        $total   = $query->count();
        $perPage = (int) $request->get('per_page', 50);
        $page    = max(1, (int) $request->get('page', 1));
        $offset  = ($page - 1) * $perPage;

        $data = (clone $query)
            ->orderBy('work_info_updated_date', 'desc')
            ->offset($offset)
            ->limit($perPage)
            ->get();

        return [
            'data'         => $data,
            'total'        => $total,
            'per_page'     => $perPage,
            'current_page' => $page,
            'last_page'    => max(1, (int) ceil($total / $perPage)),
            'from'         => $total > 0 ? $offset + 1 : 0,
            'to'           => min($offset + $perPage, $total),
        ];
    }

    // ── Export CSV -- ikut filter aktif + kategori kolom yang dipilih ──
    // (BUG LAMA: method ini belum pernah dibuat padahal sudah dipanggil
    // controller -- klik Export CSV bakal fatal error sebelum ini.)
    public function exportCsv(Request $request, array $userRegionCodes = [], bool $canSeeCost = false)
    {
        $request->merge(['per_page' => 999999999, 'page' => 1]);
        $rows = $this->getTrackerData($request, $userRegionCodes)['data'];

        $cats = array_filter(explode(',', (string) $request->get('cats', '')));
        $cols = self::MAIN_COLS;
        foreach ($cats as $cat) {
            if (isset(self::CAT_COLS[$cat])) $cols = array_merge($cols, self::CAT_COLS[$cat]);
        }
        if (!$canSeeCost) {
            $cols = array_values(array_diff($cols, ['plan_kom', 'actual_cost']));
        }

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="tracker_export.csv"',
        ];

        return response()->stream(function () use ($rows, $cols) {
            $out = fopen('php://output', 'w');
            fputcsv($out, $cols);
            foreach ($rows as $row) {
                $line = [];
                foreach ($cols as $c) {
                    $line[] = $row->$c ?? '';
                }
                fputcsv($out, $line);
            }
            fclose($out);
        }, 200, $headers);
    }

    // ── Convert region codes → names ────────────────────────────
    public function codesToNames(array $codes): array
    {
        $names = [];
        foreach ($codes as $code) {
            $num = ltrim(str_replace('REG', '', strtoupper((string)$code)), '0');
            if ($num) $names[] = 'REGIONAL ' . $num;
        }
        return $names;
    }
}
