<?php

namespace App\Services\Tracker;

use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class TrackerService
{
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
