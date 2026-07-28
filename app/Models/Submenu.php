<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Submenu extends Model
{
    protected $fillable = [
        'menu_id', 'submenu_key', 'label', 'icon', 'color',
        'route_name', 'left_panel', 'sort_order', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active'  => 'boolean',
            'left_panel' => 'boolean',
        ];
    }

    public function menu()
    {
        return $this->belongsTo(Menu::class);
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'user_submenus');
    }
}
