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
use Spatie\Permission\Traits\HasRoles;

#[Fillable([
    'username', 'full_name', 'name', 'email', 'phone', 'password',
    'is_active', 'active_from', 'active_until', 'last_login', 'last_seen_at',
    'must_change_password', 'created_by', 'fcm_token',
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
}
