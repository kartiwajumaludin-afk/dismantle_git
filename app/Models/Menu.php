<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Menu extends Model
{
    protected $fillable = ['menu_key', 'label', 'icon', 'route_name', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function submenus()
    {
        return $this->hasMany(Submenu::class)->orderBy('sort_order');
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'user_menus');
    }
}
