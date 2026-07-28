<?php

namespace App\Http\Controllers;

use App\Models\Menu;
use App\Models\Region;
use App\Models\User;
use App\Services\UserManagementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserManagementController extends Controller
{
    public function __construct(private UserManagementService $service) {}

    public function index(Request $request): Response
    {
        return Inertia::render('UserManagement/Index', [
            'users'   => $this->service->getUsers($request),
            'roles'   => Role::orderBy('name')->get(['id', 'name']),
            'regions' => Region::where('is_active', true)->orderBy('code')->get(),
            'menus'   => Menu::where('is_active', true)
                            ->with(['submenus' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')])
                            ->orderBy('sort_order')->get(),
            'filters' => $request->only(['search', 'role', 'access']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'full_name'         => 'required|string|max:255',
            'username'          => 'required|string|max:100|unique:users',
            'email'             => 'required|email|unique:users',
            'phone'             => 'nullable|string|max:30',
            'role'              => 'required|string|exists:roles,name',
            'active_from'       => 'nullable|date',
            'active_until'      => 'nullable|date|after:active_from',
            'regions'           => 'required|array|min:1',
            'menus'             => 'array',
            'submenus'          => 'array',
            'can_access_web'    => 'boolean',
            'can_access_mobapp' => 'boolean',
        ]);

        $this->service->createUser($request->all());

        return back()->with('success', 'User berhasil dibuat. Password default: dismantle@2026');
    }

    public function show(User $user)
    {
        $user->load(['roles', 'regions', 'menus', 'submenus']);

        return response()->json([
            'id'                => $user->id,
            'full_name'         => $user->full_name,
            'username'          => $user->username,
            'email'             => $user->email,
            'phone'             => $user->phone,
            'role'              => $user->getRoleNames()->first(),
            'is_active'         => $user->is_active,
            'active_from'       => $user->active_from,
            'active_until'      => $user->active_until,
            'last_login'        => $user->last_login,
            'regions'           => $user->regions->pluck('id'),
            'menus'             => $user->menus->pluck('id'),
            'submenus'          => $user->submenus->pluck('id'),
            'can_access_web'    => $user->can_access_web,
            'can_access_mobapp' => $user->can_access_mobapp,
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'full_name'         => 'required|string|max:255',
            'username'          => 'required|string|max:100|unique:users,username,' . $user->id,
            'email'             => 'required|email|unique:users,email,' . $user->id,
            'phone'             => 'nullable|string|max:30',
            'role'              => 'required|string|exists:roles,name',
            'active_from'       => 'nullable|date',
            'active_until'      => 'nullable|date|after:active_from',
            'regions'           => 'required|array|min:1',
            'menus'             => 'array',
            'submenus'          => 'array',
            'can_access_web'    => 'boolean',
            'can_access_mobapp' => 'boolean',
        ]);

        $this->service->updateUser($user, $request->all());

        return back()->with('success', 'User berhasil diperbarui.');
    }

    public function resetPassword(User $user): RedirectResponse
    {
        $this->service->resetPassword($user);

        return back()->with('success', 'Password direset ke: dismantle@2026');
    }

    public function toggleActive(User $user): RedirectResponse
    {
        $user->update(['is_active' => !$user->is_active]);

        return back()->with('success', 'Status user diperbarui.');
    }

    public function destroy(User $user): RedirectResponse
    {
        if ($user->id === Auth::id()) {
            return back()->with('error', 'Tidak bisa menghapus akun sendiri.');
        }
        if ($user->hasRole('super_admin')) {
            return back()->with('error', 'Super admin tidak dapat dihapus.');
        }

        $user->delete();

        return back()->with('success', "User {$user->username} berhasil dihapus.");
    }
}
