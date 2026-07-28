<?php

namespace App\Http\Middleware;

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

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id'        => $user->id,
                    'username'  => $user->username,
                    'full_name' => $user->full_name,
                    'role'      => $user->getRoleNames()->first(),
                ] : null,
            ],
            'flash' => [
                'success'     => fn () => $request->session()->get('success'),
                'error'       => fn () => $request->session()->get('error'),
                // Password sementara (create/reset) — cuma lewat sini (session
                // flash, sekali pakai), TIDAK PERNAH disimpan ke tabel manapun.
                'credentials' => fn () => $request->session()->get('credentials'),
            ],
        ];
    }
}
