<?php

namespace App\Services\Tracker;

use Illuminate\Support\Facades\DB;

class TrackerFilterService
{
    public function getOptions(array $userRegionCodes = []): array
    {
        $query = DB::table('tracker');

        if (!empty($userRegionCodes)) {
            $names = $this->codesToNames($userRegionCodes);
            if (!empty($names)) {
                $query->whereIn('regional', $names);
            }
        }

        return [
            'statuses' => (clone $query)->distinct()->orderBy('ticket_status_name')
                          ->pluck('ticket_status_name')->filter()->values()->toArray(),
            'batches'  => (clone $query)->distinct()->orderBy('ticket_batch')
                          ->pluck('ticket_batch')->filter()->values()->toArray(),
            'subTypes' => (clone $query)->distinct()->orderBy('ticket_sub_type_name')
                          ->pluck('ticket_sub_type_name')->filter()->values()->toArray(),
            'nops'     => (clone $query)->distinct()->orderBy('network_operation_and_productivity')
                          ->pluck('network_operation_and_productivity')->filter()->values()->toArray(),
        ];
    }

    private function codesToNames(array $codes): array
    {
        return array_values(array_filter(array_map(function ($code) {
            $num = ltrim(str_replace('REG', '', strtoupper($code)), '0');
            return $num ? 'REGIONAL ' . $num : null;
        }, $codes)));
    }
}
