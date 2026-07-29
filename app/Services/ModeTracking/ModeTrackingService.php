<?php

namespace App\Services\ModeTracking;

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ModeTrackingService
{
    // ── Radar Monitoring -- role-agnostic. Siapapun (field team, koordinator,
    // siapa aja) otomatis muncul selama punya UserPosition source_app='dismantle'
    // yang direkam belakangan ini. Nggak perlu filter role sama sekali.
    public function getTeamPositions(int $recentMinutes = 30): array
    {
        $cutoff = Carbon::now()->subMinutes($recentMinutes);

        // Ambil posisi TERAKHIR per user (bukan semua histori).
        $latestIds = DB::table('user_positions')
            ->select(DB::raw('MAX(id) as id'))
            ->where('source_app', 'dismantle')
            ->where('recorded_at', '>=', $cutoff)
            ->groupBy('user_id')
            ->pluck('id');

        return DB::table('user_positions as up')
            ->join('users as u', 'u.id', '=', 'up.user_id')
            ->whereIn('up.id', $latestIds)
            ->select(
                'u.id as user_id', 'u.full_name', 'u.username',
                'up.latitude', 'up.longitude', 'up.recorded_at',
                'up.task_ref_type', 'up.task_ref_id'
            )
            ->orderBy('up.recorded_at', 'desc')
            ->get()
            ->toArray();
    }

    // ── Site node yang di-plan-kan -- dari daily_activity (bukan
    // site_map_cache yang berat), cuma yang belum completed/verified.
    public function getPlannedSites(array $userRegionCodes = []): array
    {
        $query = DB::table('daily_activity')
            ->whereNotNull('latitude')->whereNotNull('longitude')
            ->whereNotIn('task_status', ['completed', 'verified']);

        if (!empty($userRegionCodes)) {
            $names = $this->codesToNames($userRegionCodes);
            if (!empty($names)) $query->whereIn('regional', $names);
        }

        return $query->select('ticket_number', 'site_id', 'site_name', 'latitude', 'longitude', 'pic_team', 'task_status')
            ->get()->toArray();
    }

    // ── GPS Ping dari APK -- REQUIREMENT REBUILD: validasi jadwal di server
    // juga (defense-in-depth), bukan cuma andalkan APK kayak sistem lama.
    public function recordPing(int $userId, float $lat, float $lng, ?string $taskRefType = null, ?int $taskRefId = null): array
    {
        if (!$this->isWithinSchedule()) {
            return ['success' => false, 'message' => 'Di luar jadwal kerja GPS, ping ditolak server.'];
        }
        if ($this->getSetting('gps_paused', '0') === '1') {
            return ['success' => false, 'message' => 'GPS sedang di-pause (jadwal tidak aktif).'];
        }

        DB::table('user_positions')->insert([
            'user_id'      => $userId,
            'source_app'   => 'dismantle',
            'task_ref_type'=> $taskRefType,
            'task_ref_id'  => $taskRefId,
            'latitude'     => $lat,
            'longitude'    => $lng,
            'recorded_at'  => now(),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        return ['success' => true, 'message' => 'Ping tersimpan.'];
    }

    public function trackingSettings(): array
    {
        return [
            'gps_paused'          => $this->getSetting('gps_paused', '0') === '1',
            'gps_schedule_start'  => $this->getSetting('gps_schedule_start', '06:00'),
            'gps_schedule_end'    => $this->getSetting('gps_schedule_end', '18:00'),
        ];
    }

    public function updateSchedule(string $start, string $end): void
    {
        DB::table('settings')->updateOrInsert(['key' => 'gps_schedule_start'], ['value' => $start, 'updated_at' => now()]);
        DB::table('settings')->updateOrInsert(['key' => 'gps_schedule_end'],   ['value' => $end,   'updated_at' => now()]);
    }

    private function isWithinSchedule(): bool
    {
        $start = $this->getSetting('gps_schedule_start', '06:00');
        $end   = $this->getSetting('gps_schedule_end', '18:00');
        $now   = Carbon::now();
        return $now->between(
            Carbon::createFromTimeString($start, $now->timezone),
            Carbon::createFromTimeString($end, $now->timezone)
        );
    }

    private function getSetting(string $key, string $default): string
    {
        return DB::table('settings')->where('key', $key)->value('value') ?? $default;
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
