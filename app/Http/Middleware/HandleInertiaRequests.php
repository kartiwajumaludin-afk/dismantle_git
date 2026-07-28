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
