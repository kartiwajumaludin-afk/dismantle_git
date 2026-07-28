<?php

use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;

// Modul: User Management
// Sementara belum di-guard 'auth' — login belum dibuat. Tinggal ganti
// jadi Route::middleware('auth')->group(...) begitu modul Auth/Login jadi.
Route::get('/users', [UserManagementController::class, 'index'])->name('users.index');
Route::post('/users', [UserManagementController::class, 'store'])->name('users.store');
