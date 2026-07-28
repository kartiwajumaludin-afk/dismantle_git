<?php

namespace App\Http\Controllers\Tracker;

use App\Http\Controllers\Controller;
use App\Services\Tracker\TrackerService;
use App\Services\Tracker\TrackerManualService;
use App\Services\Tracker\TrackerFilterService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TrackerController extends Controller
{
    public function __construct(
        private TrackerService       $service,
        private TrackerManualService $manualService,
        private TrackerFilterService $filterService,
    ) {
    }

    // ── Tracker Index ────────────────────────────────────────
    public function index(Request $request)
    {
        $regionCodes   = $this->getUserRegionCodes();
        $filterOptions = $this->filterService->getOptions($regionCodes);
        $result        = $this->service->getTrackerData($request, $regionCodes);

        if (!$this->canSeeCost()) {
            $result['data'] = $this->stripCostFields($result['data']);
        }

        return Inertia::render('Tracker/Index', compact('result', 'filterOptions'));
    }

    // ── Asset View ──────────────────────────────────────────
    public function asset(Request $request)
    {
        $regionCodes = $this->getUserRegionCodes();
        $result      = $this->service->getAssetData($request, $regionCodes);

        return Inertia::render('Tracker/Asset', compact('result'));
    }

    // ── Workinfo View ─────────────────────────────────────────
    public function workinfo(Request $request)
    {
        $regionCodes = $this->getUserRegionCodes();
        $result      = $this->service->getWorkinfoData($request, $regionCodes);

        return Inertia::render('Tracker/Workinfo', compact('result'));
    }

    // ── Export CSV ────────────────────────────────────────────
    public function export(Request $request)
    {
        $regionCodes = $this->getUserRegionCodes();
        $this->service->exportCsv($request, $regionCodes);
    }

    // ── Manual Get — untuk modal edit ────────────────────────
    public function manualGet(Request $request)
    {
        $data = $this->manualService->getByTicket($request->ticket_number);
        return response()->json(['success' => true, 'data' => $data]);
    }

    // ── Manual Store / Update ───────────────────────────
    public function manualStore(Request $request)
    {
        $validated = $request->validate([
            'ticket_number'        => ['required', 'string'],
            'tp_company'           => ['nullable', 'string', 'max:100'],
            'latitude'             => ['nullable', 'numeric'],
            'longitude'            => ['nullable', 'numeric'],
            'caf_status'           => ['nullable', 'string', 'max:50'],
            'caf_submit'           => ['nullable', 'string', 'max:255'],
            'caf_approved'         => ['nullable', 'string', 'max:255'],
            'start_permit_tp_date' => ['nullable', 'date'],
            'end_permit_tp_date'   => ['nullable', 'date'],
            'status_permit_tp'     => ['nullable', 'string', 'max:50'],
            'ticket_batch'         => ['nullable', 'string', 'max:50'],
            'site_status'          => ['nullable', 'string', 'max:100'],
            'site_issue'           => ['nullable', 'string', 'max:100'],
            'category_issue'       => ['nullable', 'string', 'max:100'],
            'detail_issue'         => ['nullable', 'string', 'max:255'],
            'remark_dismantle'     => ['nullable', 'string'],
            'mom'                  => ['nullable', 'string'],
            'partner_company'      => ['nullable', 'string', 'max:100'],
            'plan_dismantle_date'  => ['nullable', 'date'],
            'pic_team'             => ['nullable', 'string', 'max:100'],
            'act_dismantle_week'   => ['nullable', 'string', 'max:50'],
            'plan_kom'             => ['nullable', 'string', 'max:100'],
            'actual_cost'          => ['nullable', 'string', 'max:100'],
        ]);

        try {
            $ticketNumber = $validated['ticket_number'];
            unset($validated['ticket_number']);
            $this->manualService->upsert($ticketNumber, $validated);
            return response()->json(['success' => true, 'message' => "Data {$ticketNumber} berhasil disimpan."]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Manual Destroy ──────────────────────────────────────
    public function manualDestroy(string $ticketNumber)
    {
        try {
            $this->manualService->delete($ticketNumber);
            return response()->json(['success' => true, 'message' => "Manual update {$ticketNumber} dihapus."]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Helper: ambil region codes dari akun user ────────────────
    private function getUserRegionCodes(): array
    {
        $userId = Auth::id();
        if (!$userId) {
            return [];
        }
        return DB::table('user_regions')
            ->join('regions', 'regions.id', '=', 'user_regions.region_id')
            ->where('user_regions.user_id', $userId)
            ->pluck('regions.code')
            ->toArray();
    }

    // ── Helper: cek apakah user boleh lihat plan_kom & actual_cost ─────
    private function canSeeCost(): bool
    {
        $user = Auth::user();
        if (!$user) {
            return false;
        }
        return $user->hasAnyRole(['super_admin', 'admin', 'regional_manager']);
    }

    // ── Helper: strip plan_kom & actual_cost dari collection ─────────
    private function stripCostFields($data): mixed
    {
        return $data->map(function ($row) {
            $arr = (array) $row;
            unset($arr['plan_kom'], $arr['actual_cost']);
            return (object) $arr;
        });
    }
}
