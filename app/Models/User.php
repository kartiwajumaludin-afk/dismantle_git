<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Route;
use Spatie\Permission\Traits\HasRoles;

#[Fillable([
    'username', 'full_name', 'name', 'email', 'phone', 'password',
    'is_active', 'active_from', 'active_until', 'last_login', 'last_seen_at',
    'must_change_password', 'created_by', 'fcm_token',
    'can_access_web', 'can_access_mobapp',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasRoles, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at'    => 'datetime',
            'password'             => 'hashed',
            'is_active'            => 'boolean',
            'active_from'          => 'date:Y-m-d',
            'active_until'         => 'date:Y-m-d',
            'last_login'           => 'datetime',
            'last_seen_at'         => 'datetime',
            'must_change_password' => 'boolean',
            'can_access_web'       => 'boolean',
            'can_access_mobapp'    => 'boolean',
        ];
    }

    // Cek apakah user masih dalam periode aktif (dipakai saat login)
    public function isActiveNow(): bool
    {
        if (!$this->is_active) return false;

        $today = now()->startOfDay();

        if ($this->active_from && $this->active_from->copy()->startOfDay()->gt($today)) {
            return false;
        }
        if ($this->active_until && $this->active_until->copy()->startOfDay()->lt($today)) {
            return false;
        }

        return true;
    }

    public function regions()
    {
        return $this->belongsToMany(Region::class, 'user_regions');
    }

    public function menus()
    {
        return $this->belongsToMany(Menu::class, 'user_menus');
    }

    public function submenus()
    {
        return $this->belongsToMany(Submenu::class, 'user_submenus');
    }

    /**
     * Nama route submodul PERTAMA yang beneran boleh & bisa diakses user ini,
     * ngikutin urutan Modul/Sub Modul (menus.sort_order / submenus.sort_order).
     * super_admin selalu lihat semua; role lain di-filter sesuai assignment
     * user_menus/user_submenus. Dipakai buat redirect setelah login — supaya
     * role selain super_admin/admin nggak ke-lempar ke User Management
     * (yang dikunci buat mereka) dan berujung 403.
     */
    public function firstAccessibleRouteName(): string
    {
        $menus = Menu::where('is_active', true)
            ->with(['submenus' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')])
            ->orderBy('sort_order')
            ->get();

        if (!$this->hasRole('super_admin')) {
            $assignedMenuIds    = $this->menus()->pluck('menus.id')->all();
            $assignedSubmenuIds = $this->submenus()->pluck('submenus.id')->all();

            $menus = $menus
                ->map(function ($menu) use ($assignedSubmenuIds) {
                    $menu->setRelation(
                        'submenus',
                        $menu->submenus->filter(fn ($s) => in_array($s->id, $assignedSubmenuIds))->values()
                    );
                    return $menu;
                })
                ->filter(fn ($menu) => $menu->submenus->isNotEmpty() || in_array($menu->id, $assignedMenuIds))
                ->values();
        }

        foreach ($menus as $menu) {
            if ($menu->submenus->isNotEmpty()) {
                foreach ($menu->submenus as $sub) {
                    if ($sub->route_name && Route::has($sub->route_name)) {
                        return $sub->route_name;
                    }
                }
            } elseif ($menu->route_name && Route::has($menu->route_name)) {
                return $menu->route_name;
            }
        }

        // Belum di-assign menu/submenu apapun — halaman ganti password
        // selalu boleh diakses siapa saja, jadi aman buat fallback terakhir.
        return 'password.change';
    }
}
