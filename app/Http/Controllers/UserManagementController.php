<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserManagementController extends Controller
{
    public function index(): Response
    {
        $users = User::query()
            ->orderBy('full_name')
            ->get()
            ->map(function (User $user) {
                return [
                    'id'                => $user->id,
                    'full_name'         => $user->full_name,
                    'username'          => $user->username,
                    'email'             => $user->email,
                    'phone'             => $user->phone,
                    'role'              => $user->getRoleNames()->first(),
                    'is_active'         => $user->is_active,
                    'active_from'       => optional($user->active_from)->format('Y-m-d'),
                    'active_until'      => optional($user->active_until)->format('Y-m-d'),
                    'last_login'        => optional($user->last_login)->diffForHumans(),
                    'can_access_web'    => $user->can_access_web,
                    'can_access_mobapp' => $user->can_access_mobapp,
                ];
            });

        return Inertia::render('UserManagement/Index', [
            'users' => $users,
            'roles' => Role::orderBy('name')->pluck('name'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'full_name'         => ['required', 'string', 'max:150'],
            'username'          => ['required', 'string', 'max:50', Rule::unique('users', 'username')],
            'email'             => ['required', 'email', Rule::unique('users', 'email')],
            'phone'             => ['nullable', 'string', 'max:30'],
            'role'              => ['required', 'string', Rule::exists('roles', 'name')],
            'can_access_web'    => ['boolean'],
            'can_access_mobapp' => ['boolean'],
            'active_from'       => ['nullable', 'date'],
            'active_until'      => ['nullable', 'date', 'after_or_equal:active_from'],
        ]);

        $tempPassword = str()->random(8);

        $user = User::create([
            'full_name'            => $validated['full_name'],
            'name'                 => $validated['full_name'],
            'username'             => $validated['username'],
            'email'                => $validated['email'],
            'phone'                => $validated['phone'] ?? null,
            'password'             => $tempPassword,
            'is_active'            => true,
            'active_from'          => $validated['active_from'] ?? null,
            'active_until'         => $validated['active_until'] ?? null,
            'must_change_password' => true,
            'can_access_web'       => $request->boolean('can_access_web'),
            'can_access_mobapp'    => $request->boolean('can_access_mobapp'),
        ]);

        $user->assignRole($validated['role']);

        return redirect()->route('users.index')
            ->with('success', "User '{$user->username}' berhasil dibuat. Password sementara: {$tempPassword}");
    }
}
