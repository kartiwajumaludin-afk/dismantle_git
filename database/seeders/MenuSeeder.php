<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
class MenuSeeder extends Seeder
{
    public function run(): void
    {
        $menus = [
            [
                'menu_key' => 'write_off', 'label' => 'Dismantle Asset Write-Off',
                'icon' => 'fa-industry', 'route_name' => null, 'sort_order' => 1,
                'submenus' => [
                    ['submenu_key' => 'tracker',        'label' => 'Tracker View',   'icon' => 'fa-satellite-dish', 'color' => '#00b4d8', 'route_name' => 'tracker.index',    'sort_order' => 1],
                    ['submenu_key' => 'asset',          'label' => 'Asset View',     'icon' => 'fa-box',            'color' => '#06d6a0', 'route_name' => 'tracker.asset',    'sort_order' => 2],
                    ['submenu_key' => 'workinfo',       'label' => 'Workinfo View',  'icon' => 'fa-clipboard-list', 'color' => '#ffd43b', 'route_name' => 'tracker.workinfo', 'sort_order' => 3],
                    ['submenu_key' => 'daily_activity', 'label' => 'Daily Activity', 'icon' => 'fa-running',        'color' => '#9d4edd', 'route_name' => 'daily.index',      'sort_order' => 4],
                    ['submenu_key' => 'import_csv',     'label' => 'Import CSV',     'icon' => 'fa-file-import',    'color' => '#ff6b6b', 'route_name' => 'import.index',     'sort_order' => 5],
                    ['submenu_key' => 'site_map',       'label' => 'Site Map',       'icon' => 'fa-map',            'color' => '#f72585', 'route_name' => 'sitemap.index',    'sort_order' => 6],
                    ['submenu_key' => 'mode_tracking',  'label' => 'Mode Tracking',  'icon' => 'fa-satellite-dish', 'color' => '#1877ff', 'route_name' => 'sitemap.tracking', 'sort_order' => 7],
                ],
            ],
            [
                'menu_key' => 'dashboard', 'label' => 'Dashboard',
                'icon' => 'fa-tachometer-alt', 'route_name' => null, 'sort_order' => 2,
                'submenus' => [
                    ['submenu_key' => 'dash_analysis', 'label' => 'Dashboard Analysis', 'icon' => 'fa-chart-pie',  'color' => '#00b4d8', 'route_name' => 'dashboard.analysis', 'sort_order' => 1],
                    ['submenu_key' => 'dash_tree',     'label' => 'Interactive Tree',   'icon' => 'fa-sitemap',    'color' => '#06d6a0', 'route_name' => 'dashboard.tree',     'sort_order' => 2],
                    ['submenu_key' => 'dash_chart',    'label' => 'Diagram dan Grafik', 'icon' => 'fa-chart-bar',  'color' => '#9d4edd', 'route_name' => 'dashboard.chart',    'sort_order' => 3],
                    ['submenu_key' => 'dash_baseline', 'label' => 'Baseline Forecast',  'icon' => 'fa-chart-line', 'color' => '#ffd43b', 'route_name' => 'dashboard.baseline', 'sort_order' => 4],
                ],
            ],
            [
                'menu_key' => 'boq', 'label' => 'BoQ Calculation',
                'icon' => 'fa-calculator', 'route_name' => null, 'sort_order' => 3,
                'submenus' => [
                    ['submenu_key' => 'boq_calc',    'label' => 'BoQ Calculation', 'icon' => 'fa-calculator',   'color' => '#00b4d8', 'route_name' => 'boq.calculation', 'sort_order' => 1],
                    ['submenu_key' => 'boq_summary', 'label' => 'BoQ Summary',     'icon' => 'fa-file-invoice', 'color' => '#06d6a0', 'route_name' => 'boq.summary',     'sort_order' => 2],
                ],
            ],
            [
                'menu_key' => 'inbound', 'label' => 'Inbound Tracking',
                'icon' => 'fa-shipping-fast', 'route_name' => null, 'sort_order' => 4,
                'submenus' => [
                    ['submenu_key' => 'inbound_tracker', 'label' => 'Inbound Tracker', 'icon' => 'fa-shipping-fast',   'color' => '#00b4d8', 'route_name' => 'inbound.tracker', 'sort_order' => 1],
                    ['submenu_key' => 'inbound_request', 'label' => 'Inbound Request', 'icon' => 'fa-clipboard-check', 'color' => '#06d6a0', 'route_name' => 'inbound.request', 'sort_order' => 2],
                    ['submenu_key' => 'inbound_disposal','label' => 'Disposal Asset',  'icon' => 'fa-boxes',           'color' => '#ff6b6b', 'route_name' => 'inbound.disposal.index', 'sort_order' => 3],
                ],
            ],
            [
                'menu_key' => 'user_management', 'label' => 'User Management',
                'icon' => 'fa-users-cog', 'route_name' => 'users.index', 'sort_order' => 5,
                'submenus' => [],
            ],
            [
                'menu_key' => 'kickoff', 'label' => 'Kick Off',
                'icon' => 'fa-rocket', 'route_name' => null, 'sort_order' => 6,
                'submenus' => [
                    ['submenu_key' => 'kom_site',    'label' => 'KOM Site',      'icon' => 'fa-map-marker-alt',  'color' => '#00b4d8', 'route_name' => 'kickoff.site',    'sort_order' => 1],
                    ['submenu_key' => 'kom_orchat',  'label' => 'KOM Org Chart', 'icon' => 'fa-sitemap',         'color' => '#06d6a0', 'route_name' => 'kickoff.orchat',  'sort_order' => 2],
                    ['submenu_key' => 'kom_project', 'label' => 'KOM Project',   'icon' => 'fa-project-diagram', 'color' => '#ffd43b', 'route_name' => 'kickoff.project', 'sort_order' => 3],
                    ['submenu_key' => 'kom_slide',   'label' => 'KOM Slide',     'icon' => 'fa-tv',              'color' => '#f72585', 'route_name' => 'kickoff.slide',   'sort_order' => 4],
                ],
            ],
            [
                'menu_key' => 'user_guide', 'label' => 'User Guide',
                'icon' => 'fa-book-open', 'route_name' => 'guide.index', 'sort_order' => 7,
                'submenus' => [],
            ],
            [
                'menu_key' => 'daily_reminder', 'label' => 'Daily Reminder',
                'icon' => 'fa-bell', 'route_name' => 'daily-reminder.index', 'sort_order' => 8,
                'submenus' => [],
            ],
        ];
        foreach ($menus as $menuData) {
            $submenus = $menuData['submenus'];
            unset($menuData['submenus']);
            DB::table('menus')->updateOrInsert(
                ['menu_key' => $menuData['menu_key']],
                array_merge($menuData, ['is_active' => true, 'created_at' => now(), 'updated_at' => now()])
            );
            $menu = DB::table('menus')->where('menu_key', $menuData['menu_key'])->first();
            foreach ($submenus as $sub) {
                DB::table('submenus')->updateOrInsert(
                    ['submenu_key' => $sub['submenu_key']],
                    array_merge($sub, [
                        'menu_id'    => $menu->id,
                        'left_panel' => false,
                        'is_active'  => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ])
                );
            }
        }

        $allMenuIds = DB::table('menus')->pluck('id');
        $allSubmenuIds = DB::table('submenus')->pluck('id');
        $superAdminIds = DB::table('users')
            ->join('model_has_roles', 'model_has_roles.model_id', '=', 'users.id')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('roles.name', 'super_admin')
            ->pluck('users.id');

        foreach ($superAdminIds as $userId) {
            foreach ($allMenuIds as $menuId) {
                DB::table('user_menus')->updateOrInsert(['user_id' => $userId, 'menu_id' => $menuId], []);
            }
            foreach ($allSubmenuIds as $submenuId) {
                DB::table('user_submenus')->updateOrInsert(['user_id' => $userId, 'submenu_id' => $submenuId], []);
            }
        }

        $this->command->info('MenuSeeder: ' . $superAdminIds->count() . ' super_admin di-sync akses penuh ke semua menu.');
    }
}
