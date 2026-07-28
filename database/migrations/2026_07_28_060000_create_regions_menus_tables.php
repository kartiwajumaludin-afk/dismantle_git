<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('regions', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('menus', function (Blueprint $table) {
            $table->id();
            $table->string('menu_key')->unique();
            $table->string('label');
            $table->string('icon')->nullable();
            $table->string('route_name')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('submenus', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_id')->constrained()->cascadeOnDelete();
            $table->string('submenu_key')->unique();
            $table->string('label');
            $table->string('icon')->nullable();
            $table->string('color')->nullable();
            $table->string('route_name')->nullable();
            $table->boolean('left_panel')->default(false);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('user_regions', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('region_id')->constrained()->cascadeOnDelete();
            $table->primary(['user_id', 'region_id']);
        });

        Schema::create('user_menus', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('menu_id')->constrained()->cascadeOnDelete();
            $table->primary(['user_id', 'menu_id']);
        });

        Schema::create('user_submenus', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('submenu_id')->constrained()->cascadeOnDelete();
            $table->primary(['user_id', 'submenu_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_submenus');
        Schema::dropIfExists('user_menus');
        Schema::dropIfExists('user_regions');
        Schema::dropIfExists('submenus');
        Schema::dropIfExists('menus');
        Schema::dropIfExists('regions');
    }
};
