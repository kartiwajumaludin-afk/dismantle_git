<?php

namespace App\Http\Controllers\ModeTracking;

use App\Http\Controllers\Controller;
use App\Services\ModeTracking\ModeTrackingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ModeTrackingController extends Controller
{
    public function __construct(private ModeTrackingService $service)
    {
    }

    // Tanpa leftPanel (by design) -- cuma monitoring posisi + node site.
    public function index()
    {
        return Inertia::render('ModeTracking/Index', [
            'settings' => $this->service->trackingSettings(),
        ]);
    }

    // Dipanggil polling tiap beberapa detik dari halaman web (radar).
    public function teamPositions()
    {
        return response()->json(['success' => true, 'data' => $this->service->getTeamPositions()]);
    }

    public function plannedSites()
    {
        return response()->json(['success' => true, 'data' => $this->service->getPlannedSites($this->getUserRegionCodes())]);
    }

    // ── API dipanggil dari APK Daily Activity ──
    public function gpsPing(Request $request)
    {
        $validated = $request->validate([
            'latitude'       => 'required|numeric|between:-90,90',
            'longitude'      => 'required|numeric|between:-180,180',
            'task_ref_type'  => 'nullable|string|max:100',
            'task_ref_id'    => 'nullable|integer',
        ]);

        $result = $this->service->recordPing(
            Auth::id(),
            $validated['latitude'],
            $validated['longitude'],
            $validated['task_ref_type'] ?? null,
            $validated['task_ref_id'] ?? null
        );

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    public function trackingSettings()
    {
        return response()->json(['success' => true, 'data' => $this->service->trackingSettings()]);
    }

    // Modal "Setting Interval GPS" -- admin ubah jadwal global.
    public function updateSchedule(Request $request)
    {
        $validated = $request->validate([
            'gps_schedule_start' => 'required|date_format:H:i',
            'gps_schedule_end'   => 'required|date_format:H:i',
        ]);

        $this->service->updateSchedule($validated['gps_schedule_start'], $validated['gps_schedule_end']);
        return back()->with('success', 'Jadwal GPS berhasil diperbarui.');
    }

    private function getUserRegionCodes(): array
    {
        $userId = Auth::id();
        if (!$userId) return [];
        return DB::table('user_regions')
            ->join('regions', 'regions.id', '=', 'user_regions.region_id')
            ->where('user_regions.user_id', $userId)
            ->pluck('regions.code')
            ->toArray();
    }
}
