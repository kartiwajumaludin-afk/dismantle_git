<?php
// path: routes/web.php
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\DailyActivity\DailyActivityController;
use App\Http\Controllers\Import\ImportController;
use App\Http\Controllers\Tracker\TrackerController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ══════════════════════════════════════════════════════════════════════
// GUEST ONLY
// ══════════════════════════════════════════════════════════════════════
Route::middleware('guest')->group(function () {
    Route::get('/login',  [AuthController::class, 'showLogin'])->name('login');
    // throttle:5,1 -> maksimal 5 percobaan login per menit per IP,
    // supaya nggak bisa dicoba-coba password berkali-kali (brute force).
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1')->name('login.post');
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
// buat redirect kalau user yang sudah login coba buka /login lagi. JANGAN
// hardcode ke users.index — itu dikunci super_admin/admin doang, bikin role
// lain kena 403 tiap login. Pakai User::firstAccessibleRouteName().
Route::get('/dashboard', function () {
    return redirect()->route(auth()->user()->firstAccessibleRouteName());
})->middleware('auth')->name('dashboard');

// ══════════════════════════════════════════════════════════════════════
// USER MANAGEMENT — cuma super_admin & admin. Role lain (regional_manager,
// vendor, view, logistic) ditolak 403 walau ketik URL /users langsung,
// bukan cuma disembunyikan dari sidebar.
// ══════════════════════════════════════════════════════════════════════
Route::middleware(['auth', 'active.user', 'role:super_admin|admin'])->group(function () {
    Route::get('/users',                         [UserManagementController::class, 'index'])->name('users.index');
    Route::post('/users',                        [UserManagementController::class, 'store'])->name('users.store');
    Route::get('/users/{user}',                  [UserManagementController::class, 'show'])->name('users.show');
    Route::put('/users/{user}',                  [UserManagementController::class, 'update'])->name('users.update');
    Route::post('/users/{user}/reset-password',  [UserManagementController::class, 'resetPassword'])->name('users.reset-password');
    Route::post('/users/{user}/toggle-active',   [UserManagementController::class, 'toggleActive'])->name('users.toggle-active');
    Route::delete('/users/{user}',               [UserManagementController::class, 'destroy'])->name('users.destroy');
});

// ══════════════════════════════════════════════════════════════════════
// IMPORT CSV — upload ke staging + Master Business Engine (join ke tracker).
// ══════════════════════════════════════════════════════════════════════
Route::middleware(['auth', 'active.user'])->group(function () {
    Route::get('/import',          [ImportController::class, 'index'])->name('import.index');
    Route::post('/import/verify',  [ImportController::class, 'verify'])->name('import.verify');
    Route::post('/import/stream',  [ImportController::class, 'uploadAndStream'])->name('import.stream');
    Route::post('/import/process', [ImportController::class, 'process'])->name('import.process');
});

// ══════════════════════════════════════════════════════════════════════
// TRACKER / ASSET VIEW / WORKINFO VIEW
// ══════════════════════════════════════════════════════════════════════
Route::middleware(['auth', 'active.user'])->group(function () {
    Route::get('/tracker',                  [TrackerController::class, 'index'])->name('tracker.index');
    Route::get('/tracker/asset',            [TrackerController::class, 'asset'])->name('tracker.asset');
    Route::get('/tracker/workinfo',         [TrackerController::class, 'workinfo'])->name('tracker.workinfo');
    Route::get('/tracker/export',           [TrackerController::class, 'export'])->name('tracker.export');
    Route::get('/tracker/manual',           [TrackerController::class, 'manualGet'])->name('tracker.manual.get');
    Route::post('/tracker/manual',          [TrackerController::class, 'manualStore'])->name('tracker.manual.store');
    Route::delete('/tracker/manual/{ticketNumber}', [TrackerController::class, 'manualDestroy'])->name('tracker.manual.destroy');
});

// ══════════════════════════════════════════════════════════════════════
// DAILY ACTIVITY
// ══════════════════════════════════════════════════════════════════════
Route::middleware(['auth', 'active.user'])->group(function () {
    Route::get('/daily-activity',                [DailyActivityController::class, 'index'])->name('daily.index');
    Route::post('/daily-activity/populate',       [DailyActivityController::class, 'populate'])->name('daily.populate');
    Route::post('/daily-activity/truncate',       [DailyActivityController::class, 'truncate'])->name('daily.truncate');
    Route::post('/daily-activity/sync-status',    [DailyActivityController::class, 'syncStatus'])->name('daily.sync-status');
    Route::post('/daily-activity/assign',         [DailyActivityController::class, 'assign'])->name('daily.assign');
    Route::put('/daily-activity/{id}',            [DailyActivityController::class, 'update'])->name('daily.update');
    Route::post('/daily-activity/{id}/verify',    [DailyActivityController::class, 'verify'])->name('daily.verify');
    Route::get('/daily-activity/export-da',       [DailyActivityController::class, 'exportDA'])->name('daily.export-da');
    Route::get('/daily-activity/export-ts',       [DailyActivityController::class, 'exportTS'])->name('daily.export-ts');
    Route::get('/daily-activity/photos',                    [DailyActivityController::class, 'photoFolders'])->name('daily.photos.folders');
    Route::get('/daily-activity/photos/{ticketNumber}',      [DailyActivityController::class, 'photosByTicket'])->name('daily.photos.byTicket');
    Route::delete('/daily-activity/photos/{photoId}',        [DailyActivityController::class, 'deletePhoto'])->name('daily.photos.delete');
    Route::delete('/daily-activity/photos/folder/{ticketNumber}', [DailyActivityController::class, 'deletePhotoFolder'])->name('daily.photos.deleteFolder');
    Route::get('/daily-activity/photos/{ticketNumber}/zip',  [DailyActivityController::class, 'exportPhotoZip'])->name('daily.photos.zip');
});

// ══════════════════════════════════════════════════════════════════════
// PLACEHOLDER — semua submodul yang belum digarap, biar pondasi navigasi
// (sidebar Modul + tab Sub Modul) lengkap sejak awal, sesuai UI Approve.
// Nanti satu-satu diganti jadi Controller sungguhan pas gilirannya, urutan
// sesuai PROJECT_SPEC.md — TIDAK bertentangan sama alur "1 modul per chat",
// placeholder ini murni pondasi/navigasi, bukan modul yang sudah "jadi".
//
// Pakai function() ... use(...) biasa (bukan arrow fn bersarang) supaya
// $title/$icon/$activeSubmenu KEPASTI ketangkep di closure dalamnya.
// ══════════════════════════════════════════════════════════════════════
Route::middleware(['auth', 'active.user'])->group(function () {
    $placeholder = function (string $title, string $icon, string $activeSubmenu) {
        return function () use ($title, $icon, $activeSubmenu) {
            return Inertia::render('Placeholder', [
                'title'         => $title,
                'icon'          => $icon,
                'activeSubmenu' => $activeSubmenu,
            ]);
        };
    };

    // -- Dismantle Asset Write-Off (sisanya) --
    Route::get('/site-map',          $placeholder('Site Map', 'fa-map', 'site_map'))->name('sitemap.index');
    Route::get('/site-map/tracking', $placeholder('Mode Tracking', 'fa-satellite-dish', 'mode_tracking'))->name('sitemap.tracking');

    // -- Dashboard --
    Route::get('/dashboard/analysis', $placeholder('Dashboard Analysis', 'fa-chart-pie', 'dash_analysis'))->name('dashboard.analysis');
    Route::get('/dashboard/tree',     $placeholder('Interactive Tree', 'fa-sitemap', 'dash_tree'))->name('dashboard.tree');
    Route::get('/dashboard/chart',    $placeholder('Diagram dan Grafik', 'fa-chart-bar', 'dash_chart'))->name('dashboard.chart');
    Route::get('/dashboard/baseline', $placeholder('Baseline Forecast', 'fa-chart-line', 'dash_baseline'))->name('dashboard.baseline');

    // -- BoQ --
    Route::get('/boq/calculation', $placeholder('BoQ Calculation', 'fa-calculator', 'boq_calc'))->name('boq.calculation');
    Route::get('/boq/summary',     $placeholder('BoQ Summary', 'fa-file-invoice', 'boq_summary'))->name('boq.summary');

    // -- Inbound --
    Route::get('/inbound/tracker',  $placeholder('Inbound Tracker', 'fa-shipping-fast', 'inbound_tracker'))->name('inbound.tracker');
    Route::get('/inbound/request',  $placeholder('Inbound Request', 'fa-clipboard-check', 'inbound_request'))->name('inbound.request');
    Route::get('/inbound/disposal', $placeholder('Disposal Asset', 'fa-boxes', 'inbound_disposal'))->name('inbound.disposal.index');

    // -- Kick Off (KOM) --
    Route::get('/kickoff/site',    $placeholder('KOM Site', 'fa-map-marker-alt', 'kom_site'))->name('kickoff.site');
    Route::get('/kickoff/orchat',  $placeholder('KOM Org Chart', 'fa-sitemap', 'kom_orchat'))->name('kickoff.orchat');
    Route::get('/kickoff/project', $placeholder('KOM Project', 'fa-project-diagram', 'kom_project'))->name('kickoff.project');
    Route::get('/kickoff/slide',   $placeholder('KOM Slide', 'fa-tv', 'kom_slide'))->name('kickoff.slide');

    // -- Menu langsung (tanpa submenu) --
    Route::get('/daily-reminder', $placeholder('Daily Reminder', 'fa-bell', 'daily_reminder'))->name('daily-reminder.index');
    Route::get('/user-guide',     $placeholder('User Guide', 'fa-book-open', 'user_guide'))->name('guide.index');
});

// Redirect root: kalau belum login -> ke login; kalau sudah login -> ke
// submodul pertama yang beneran dia boleh akses (bukan hardcode users.index).
Route::get('/', function () {
    if (!auth()->check()) {
        return redirect()->route('login');
    }
    return redirect()->route(auth()->user()->firstAccessibleRouteName());
});
