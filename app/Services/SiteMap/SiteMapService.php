<?php

namespace App\Services\SiteMap;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SiteMapService
{
    // ── Populate: truncate + rebuild dari tracker ──
    // priority_site di tracker SUDAH hasil calcPriority() (dari Master
    // Business Engine) -- tinggal disalin, JANGAN dihitung ulang di sini.
    public function populate(): int
    {
        DB::table('site_map_cache')->truncate();

        DB::statement("
            INSERT INTO site_map_cache (
                ticket_number, site_id, site_name, latitude, longitude,
                regional, nop, ticket_status_name, ticket_sub_type_name,
                ticket_batch, working_permit_status_name, priority,
                asset_position, created_at, updated_at
            )
            SELECT
                ticket_number, site_id, site_name, latitude, longitude,
                regional, network_operation_and_productivity, ticket_status_name,
                ticket_sub_type_name, ticket_batch, working_permit_status_name,
                priority_site, asset_position, NOW(), NOW()
            FROM tracker
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ");

        return DB::table('site_map_cache')->count();
    }

    public function getCount(Request $request, array $userRegionCodes = []): int
    {
        return $this->baseQuery($request, $userRegionCodes)->count();
    }

    // ── Data marker -- di-fetch TERPISAH dari index() ("Load Map"), bukan
    // auto-load, biar nggak nge-hang browser/server (bisa puluhan ribu titik).
    public function getSites(Request $request, array $userRegionCodes = []): array
    {
        return $this->baseQuery($request, $userRegionCodes)
            ->get([
                'ticket_number', 'site_id', 'site_name', 'latitude', 'longitude',
                'regional', 'nop', 'ticket_status_name', 'ticket_batch', 'priority',
            ])
            ->toArray();
    }

    public function getFilterOptions(array $userRegionCodes = []): array
    {
        $query = DB::table('site_map_cache');
        if (!empty($userRegionCodes)) {
            $names = $this->codesToNames($userRegionCodes);
            if (!empty($names)) $query->whereIn('regional', $names);
        }
        return [
            'statuses' => (clone $query)->distinct()->orderBy('ticket_status_name')->pluck('ticket_status_name')->filter()->values()->toArray(),
            'nops'     => (clone $query)->distinct()->orderBy('nop')->pluck('nop')->filter()->values()->toArray(),
            'batches'  => (clone $query)->distinct()->orderBy('ticket_batch')->pluck('ticket_batch')->filter()->values()->toArray(),
        ];
    }

    private function baseQuery(Request $request, array $userRegionCodes)
    {
        $query = DB::table('site_map_cache');

        if (!empty($userRegionCodes)) {
            $names = $this->codesToNames($userRegionCodes);
            if (!empty($names)) $query->whereIn('regional', $names);
        }
        if ($request->filled('regions') && $request->regions !== 'all') {
            $names = $this->codesToNames(explode(',', $request->regions));
            if (!empty($names)) $query->whereIn('regional', $names);
        }
        if ($request->filled('ticket_status') && $request->ticket_status !== 'all') {
            $query->whereIn('ticket_status_name', explode(',', $request->ticket_status));
        }
        if ($request->filled('nop') && $request->nop !== 'all') {
            $query->whereIn('nop', explode(',', $request->nop));
        }
        if ($request->filled('ticket_batch') && $request->ticket_batch !== 'all') {
            $query->whereIn('ticket_batch', explode(',', $request->ticket_batch));
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('ticket_number', 'like', "%{$s}%")
                  ->orWhere('site_id', 'like', "%{$s}%")
                  ->orWhere('site_name', 'like', "%{$s}%");
            });
        }

        return $query;
    }

    private function codesToNames(array $codes): array
    {
        $names = [];
        foreach ($codes as $code) {
            $num = ltrim(str_replace('REG', '', strtoupper((string) $code)), '0');
            if ($num) $names[] = 'REGIONAL ' . $num;
        }
        return $names;
    }
}
