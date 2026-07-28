<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RegionSeeder extends Seeder
{
    public function run(): void
    {
        $regions = [
            ['code' => 'REG01', 'name' => 'Region 1 - Sumatera Bagian Utara'],
            ['code' => 'REG02', 'name' => 'Region 2 - Sumatera Bagian Tengah'],
            ['code' => 'REG03', 'name' => 'Region 3 - Sumatera Bagian Selatan'],
            ['code' => 'REG04', 'name' => 'Region 4 - Jakarta & Banten'],
            ['code' => 'REG05', 'name' => 'Region 5 - Jawa Barat'],
            ['code' => 'REG06', 'name' => 'Region 6 - Jawa Tengah & DIY'],
            ['code' => 'REG07', 'name' => 'Region 7 - Jawa Timur'],
            ['code' => 'REG08', 'name' => 'Region 8 - Bali & Nusa Tenggara'],
            ['code' => 'REG09', 'name' => 'Region 9 - Kalimantan'],
            ['code' => 'REG10', 'name' => 'Region 10 - Sulawesi'],
            ['code' => 'REG11', 'name' => 'Region 11 - Maluku & Papua'],
            ['code' => 'REG12', 'name' => 'Region 12 - Kepulauan'],
        ];

        foreach ($regions as $region) {
            DB::table('regions')->updateOrInsert(
                ['code' => $region['code']],
                array_merge($region, [
                    'is_active'  => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
