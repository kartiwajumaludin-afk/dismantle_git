<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class UserManagementController extends Controller
{
    public function index()
    {
        return Inertia::render('UserManagement/Index');
    }
}
