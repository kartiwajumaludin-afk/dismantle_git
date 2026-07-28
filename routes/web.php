<?php
// path: routes/web.php
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;

// ══════════════════════════════════════════════════════════════════════
// GUEST ONLY
// ══════════════════════════════════════════════════════════════════════
Route::middleware('guest')->group(function () {
    Route::get('/login',  [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->name('login.post');
});

// ══════════════════════════════════════════════════════════════════════
// AUTH — semua role (tidak perlu active.user, wajib bisa akses ganti password
// walau statusnya lagi diproses)
// ══════════════════════════════════════════════════════════════════════
Route::middleware('auth')->group(function () {
    Route::get('/change-password',  [AuthController::class, 'showChangePassword'])->name('password.change');
    Route::post('/change-password', [AuthController::class, 'changePassword'])->name('password.update');
    Route::post('/logout',          [AuthController::class, 'logout'])->name('logout');
});

// Alias 'dashboard' — dipakai internal oleh middleware guest bawaan Laravel
// buat redirect kalau user yang sudah login coba buka /login lagi.
Route::get('/dashboard', function () {
    return redirect()->route('users.index');
})->middleware('auth')->name('dashboard');

// ══════════════════════════════════════════════════════════════════════
// MODUL — semua butuh login + akun aktif
// ══════════════════════════════════════════════════════════════════════
Route::middleware(['auth', 'active.user'])->group(function () {

    // -- User Management --
    Route::get('/users',                         [UserManagementController::class, 'index'])->name('users.index');
    Route::post('/users',                        [UserManagementController::class, 'store'])->name('users.store');
    Route::get('/users/{user}',                  [UserManagementController::class, 'show'])->name('users.show');
    Route::put('/users/{user}',                  [UserManagementController::class, 'update'])->name('users.update');
    Route::post('/users/{user}/reset-password',  [UserManagementController::class, 'resetPassword'])->name('users.reset-password');
    Route::post('/users/{user}/toggle-active',   [UserManagementController::class, 'toggleActive'])->name('users.toggle-active');
    Route::delete('/users/{user}',               [UserManagementController::class, 'destroy'])->name('users.destroy');
});

// Redirect root ke login/users
Route::get('/', function () {
    return redirect()->route(auth()->check() ? 'users.index' : 'login');
});
