<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CheckGpsAutoResume extends Command
{
    protected $signature = 'gps:check-auto-resume';
    protected $description = 'Toggle flag gps_paused sesuai jadwal kerja GPS (privasi field team di luar jam kerja)';

    public function handle(): int
    {
        $start = DB::table('settings')->where('key', 'gps_schedule_start')->value('value') ?? '06:00';
        $end   = DB::table('settings')->where('key', 'gps_schedule_end')->value('value') ?? '18:00';

        $now = Carbon::now();
        $startTime = Carbon::createFromTimeString($start, $now->timezone);
        $endTime   = Carbon::createFromTimeString($end, $now->timezone);

        $withinSchedule = $now->between($startTime, $endTime);
        $paused = $withinSchedule ? '0' : '1';

        DB::table('settings')->updateOrInsert(
            ['key' => 'gps_paused'],
            ['value' => $paused, 'updated_at' => now()]
        );

        $this->info("GPS paused = {$paused} (jadwal {$start}-{$end}, sekarang {$now->format('H:i')})");
        return self::SUCCESS;
    }
}
