<?php

namespace App\Http\Controllers\SiteMap;

use App\Http\Controllers\Controller;
use App\Services\SiteMap\SiteMapService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SiteMapController extends Controller
{
    public function __construct(private SiteMapService $service)
    {
    }

    // Index CUMA kirim filter options + count -- data titik peta di-fetch
    // terpisah pas user klik "Load Map" (lihat method data()).
    public function index(Request $request)
    {
        $regionCodes = $this->getUserRegionCodes();

        return Inertia::render('SiteMap/Index', [
            'count'         => $this->service->getCount($request, $regionCodes),
            'filterOptions' => $this->service->getFilterOptions($regionCodes),
            'filters'       => $request->only(['regions', 'ticket_status', 'nop', 'ticket_batch', 'search']),
        ]);
    }

    public function populate()
    {
        $count = $this->service->populate();
        return back()->with('success', "Populate selesai: {$count} site dengan koordinat berhasil dimuat.");
    }

    // Dipanggil tombol "Load Map" -- fetch data mentah buat di-plot di peta.
    public function data(Request $request)
    {
        $regionCodes = $this->getUserRegionCodes();
        return response()->json([
            'success' => true,
            'data'    => $this->service->getSites($request, $regionCodes),
        ]);
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
