<?php

namespace App\Http\Middleware;

use App\Models\Menu;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        /** @var \App\Models\User|null $user */
        $user = Auth::user();
        $user?->loadMissing('regions');

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id'        => $user->id,
                    'username'  => $user->username,
                    'full_name' => $user->full_name,
                    'role'      => $user->getRoleNames()->first(),
                    // Dipakai buat scope region non-super_admin (misal di
                    // Quick Filters Tracker) — cuma kode region, bukan detail.
                    'regions'   => $user->regions->map(fn ($r) => ['code' => $r->code])->values(),
                ] : null,
            ],
            // Struktur Modul + Sub Modul buat sidebar & top-bar — di-filter
            // sesuai assignment user_menus/user_submenus. super_admin selalu
            // lihat semua; role lain cuma lihat menu/submenu yang di-centang
            // pas dibuatkan akunnya di User Management.
            'menus' => $user ? fn () => $this->visibleMenus($user) : [],
            'flash' => [
                'success'     => fn () => $request->session()->get('success'),
                'error'       => fn () => $request->session()->get('error'),
                // Password sementara (create/reset) — cuma lewat sini (session
                // flash, sekali pakai), TIDAK PERNAH disimpan ke tabel manapun.
                'credentials' => fn () => $request->session()->get('credentials'),
            ],
        ];
    }

    private function visibleMenus($user)
    {
        $menus = Menu::where('is_active', true)
            ->with(['submenus' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')])
            ->orderBy('sort_order')
            ->get(['id', 'menu_key', 'label', 'icon', 'route_name', 'sort_order']);

        if ($user->hasRole('super_admin')) {
            return $menus;
        }

        $assignedMenuIds    = $user->menus()->pluck('menus.id')->all();
        $assignedSubmenuIds = $user->submenus()->pluck('submenus.id')->all();

        return $menus
            ->map(function ($menu) use ($assignedSubmenuIds) {
                $menu->setRelation(
                    'submenus',
                    $menu->submenus->filter(fn ($s) => in_array($s->id, $assignedSubmenuIds))->values()
                );
                return $menu;
            })
            // Menu tetap tampil kalau ada minimal 1 submenu yang di-assign,
            // ATAU (buat menu tanpa submenu, misal User Guide/Daily Reminder)
            // menu itu sendiri yang di-assign langsung.
            ->filter(fn ($menu) => $menu->submenus->isNotEmpty() || in_array($menu->id, $assignedMenuIds))
            ->values();
    }
}
