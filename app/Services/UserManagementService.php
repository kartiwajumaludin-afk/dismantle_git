<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class UserManagementService
{
    public function getUsers(Request $request)
    {
        $query = User::with(['roles', 'regions', 'menus', 'submenus'])
            ->select('users.*');

        // Tab Web / Field Team (MobApp) — tambahan di rebuild ini, tidak ada
        // di sistem lama karena di sana belum dipecah tab.
        if ($request->filled('access')) {
            $column = $request->access === 'mobapp' ? 'can_access_mobapp' : 'can_access_web';
            $query->where($column, true);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('users.username', 'like', "%{$search}%")
                  ->orWhere('users.full_name', 'like', "%{$search}%")
                  ->orWhere('users.email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $query->whereHas('roles', fn ($q) => $q->where('name', $request->role));
        }

        return $query->orderBy('users.created_at', 'desc')
                     ->paginate(20)
                     ->withQueryString();
    }

    public function createUser(array $data): User
    {
        /** @var \App\Models\User|null $currentUser */
        $currentUser = Auth::user();

        $user = User::create([
            'full_name'            => $data['full_name'],
            'username'             => $data['username'],
            'name'                 => $data['full_name'],
            'email'                => $data['email'],
            'phone'                => $data['phone'] ?? null,
            'password'             => Hash::make($data['password'] ?? 'dismantle@2026'),
            'is_active'            => true,
            // Pakai ?: (bukan ??) supaya string kosong dari input date yang
            // dikosongkan ikut dianggap null, bukan disimpan sebagai ''.
            'active_from'          => $data['active_from'] ?: null,
            'active_until'         => $data['active_until'] ?: null,
            'must_change_password' => $data['must_change_password'] ?? true,
            'created_by'           => $currentUser?->id,
            'can_access_web'       => $data['can_access_web'] ?? true,
            'can_access_mobapp'    => $data['can_access_mobapp'] ?? false,
        ]);

        $user->syncRoles([$data['role']]);
        $this->syncRegions($user, $data['regions'] ?? []);
        $this->syncMenus($user, $data['menus'] ?? [], $data['submenus'] ?? []);

        return $user;
    }

    public function updateUser(User $user, array $data): User
    {
        $user->update([
            'full_name'         => $data['full_name'],
            'username'          => $data['username'],
            'name'              => $data['full_name'],
            'email'             => $data['email'],
            'phone'             => $data['phone'] ?? null,
            'active_from'       => $data['active_from'] ?: null,
            'active_until'      => $data['active_until'] ?: null,
            'can_access_web'    => $data['can_access_web'] ?? $user->can_access_web,
            'can_access_mobapp' => $data['can_access_mobapp'] ?? $user->can_access_mobapp,
        ]);

        $user->syncRoles([$data['role']]);
        $this->syncRegions($user, $data['regions'] ?? []);
        $this->syncMenus($user, $data['menus'] ?? [], $data['submenus'] ?? []);

        return $user;
    }

    public function resetPassword(User $user): void
    {
        $user->update([
            'password'             => Hash::make('dismantle@2026'),
            'must_change_password' => true,
        ]);
    }

    private function syncRegions(User $user, array $regionIds): void
    {
        $user->regions()->sync($regionIds);
    }

    private function syncMenus(User $user, array $menuIds, array $submenuIds): void
    {
        $user->menus()->sync($menuIds);
        $user->submenus()->sync($submenuIds);
    }
}
