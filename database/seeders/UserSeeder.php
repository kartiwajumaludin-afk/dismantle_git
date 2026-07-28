<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['username' => 'superadmin'],
            [
                'full_name'            => 'Super Administrator',
                'name'                 => 'Super Admin',
                'email'                => 'superadmin@dismantle.test',
                'password'             => Hash::make('dismantle@2026'),
                'is_active'            => true,
                // Sengaja null, bukan diisi tanggal — kolom ini nullable
                // dan isActiveNow() cuma cek periode kalau ada isinya.
                // Superadmin jangan pernah bisa ke-lock gara-gara periode habis.
                'active_from'          => null,
                'active_until'         => null,
                'must_change_password' => false,
                'can_access_web'       => true,
                'can_access_mobapp'    => true,
            ]
        );

        $user->assignRole('super_admin');

        $regions = DB::table('regions')->pluck('id');
        foreach ($regions as $regionId) {
            DB::table('user_regions')->updateOrInsert(['user_id' => $user->id, 'region_id' => $regionId]);
        }

        $menus = DB::table('menus')->pluck('id');
        foreach ($menus as $menuId) {
            DB::table('user_menus')->updateOrInsert(['user_id' => $user->id, 'menu_id' => $menuId]);
        }

        $submenus = DB::table('submenus')->pluck('id');
        foreach ($submenus as $submenuId) {
            DB::table('user_submenus')->updateOrInsert(['user_id' => $user->id, 'submenu_id' => $submenuId]);
        }
    }
}
