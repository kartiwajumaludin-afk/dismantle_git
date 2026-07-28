<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function showLogin()
    {
        return Inertia::render('Auth/Login');
    }

    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt(['username' => $request->username, 'password' => $request->password], $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'username' => 'Username atau password salah.',
            ]);
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!$user->isActiveNow()) {
            Auth::logout();
            throw ValidationException::withMessages([
                'username' => 'Akun tidak aktif atau periode akses telah berakhir.',
            ]);
        }

        $user->update(['last_login' => now()]);
        $request->session()->regenerate();

        if ($user->must_change_password) {
            return redirect()->route('password.change');
        }

        // JANGAN hardcode ke users.index — itu dikunci super_admin/admin
        // doang, bikin role lain (vendor, dst) langsung 403 tiap login.
        return redirect()->intended(route($user->firstAccessibleRouteName()));
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    public function showChangePassword()
    {
        return Inertia::render('Auth/ChangePassword');
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        /** @var \App\Models\User $u */
        $u = Auth::user();
        $u->update([
            'password'             => $request->password,
            'must_change_password' => false,
        ]);

        return redirect()->route($u->firstAccessibleRouteName())->with('success', 'Password berhasil diubah.');
    }
}
