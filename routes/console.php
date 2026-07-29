<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Jalan tiap 5 menit -- toggle gps_paused sesuai jadwal kerja (06:00-18:00
// default). Perlu 1 baris cron di hosting: * * * * * php artisan schedule:run
Schedule::command('gps:check-auto-resume')->everyFiveMinutes();
