<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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

    /**
     * Bikin password sementara yang random (bukan nilai tetap).
     * Cuma ditampilkan SEKALI ke admin lewat flash message pas dibuat/direset —
     * nggak pernah disimpan/dicatat di tempat lain selain di-hash di kolom password.
     * Kalau admin/user lupa, tinggal panggil resetPassword() lagi, bukan cari
     * password lama.
     */
    private function generateTempPassword(): string
    {
        return Str::password(10, letters: true, numbers: true, symbols: false, spaces: false);
    }

    /**
     * @return array{user: User, temp_password: string}
     */
    public function createUser(array $data): array
    {
        /** @var \App\Models\User|null $currentUser */
        $currentUser = Auth::user();

        $tempPassword = $this->generateTempPassword();

        $user = User::create([
            'full_name'            => $data['full_name'],
            'username'             => $data['username'],
            'name'                 => $data['full_name'],
            'email'                => $data['email'],
            'phone'                => $data['phone'] ?? null,
            'password'             => Hash::make($tempPassword),
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

        return ['user' => $user, 'temp_password' => $tempPassword];
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

    /**
     * Reset ke password random baru — ini SATU-SATUNYA cara "lupa password",
     * bukan lihat/cari password lama (yang memang nggak pernah disimpan plain).
     */
    public function resetPassword(User $user): string
    {
        $tempPassword = $this->generateTempPassword();

        $user->update([
            'password'             => Hash::make($tempPassword),
            'must_change_password' => true,
        ]);

        return $tempPassword;
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
