<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        // Default jadwal GPS: 06:00 - 18:00 (privasi field team di luar jam kerja).
        DB::table('settings')->updateOrInsert(
            ['key' => 'gps_schedule_start'],
            ['value' => '06:00', 'updated_at' => now(), 'created_at' => now()]
        );
        DB::table('settings')->updateOrInsert(
            ['key' => 'gps_schedule_end'],
            ['value' => '18:00', 'updated_at' => now(), 'created_at' => now()]
        );
        DB::table('settings')->updateOrInsert(
            ['key' => 'gps_paused'],
            ['value' => '0', 'updated_at' => now(), 'created_at' => now()]
        );
    }
}
