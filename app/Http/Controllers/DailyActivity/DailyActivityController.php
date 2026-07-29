<?php

namespace App\Http\Controllers\DailyActivity;

use App\Http\Controllers\Controller;
use App\Services\DailyActivity\DailyActivityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DailyActivityController extends Controller
{
    public function __construct(private DailyActivityService $service)
    {
    }

    public function index(Request $request)
    {
        $regionCodes = $this->getUserRegionCodes();

        return Inertia::render('DailyActivity/Index', [
            'result'        => $this->service->getData($request, $regionCodes),
            'stats'         => $this->service->getStats($request, $regionCodes),
            'filterOptions' => $this->service->getFilterOptions($regionCodes),
            'filters'       => $request->only(['filter_mode', 'filter_date', 'regions', 'pic_team', 'task_status', 'nop', 'search']),
            // PIC Team di Assign harus pilih dari user beneran (Field Team /
            // akses MobApp), bukan ngetik manual -- biar konsisten sama data
            // yang ada di User Management.
            'picUsers'      => DB::table('users')
                ->where('can_access_mobapp', true)
                ->where('is_active', true)
                ->orderBy('full_name')
                ->get(['id', 'full_name', 'username']),
        ]);
    }

    public function populate()
    {
        $count = $this->service->populate();
        return back()->with('success', "Populate selesai: {$count} ticket ditambahkan/diperbarui untuk minggu berjalan.");
    }

    public function truncate()
    {
        $this->service->truncate();
        return back()->with('success', 'Semua data Daily Activity berhasil dihapus (truncate).');
    }

    public function syncStatus()
    {
        $count = $this->service->syncStatus();
        return back()->with('success', "Sync Status selesai: {$count} task diperbarui.");
    }

    public function assign(Request $request)
    {
        $validated = $request->validate([
            'ids'      => 'required|array|min:1',
            'ids.*'    => 'integer',
            'pic_team' => 'required|string|max:100',
        ]);

        /** @var \App\Models\User $user */
        $user  = Auth::user();
        $count = $this->service->assign($validated['ids'], $validated['pic_team'], $user->full_name);

        return back()->with('success', "{$count} task berhasil di-assign ke {$validated['pic_team']}.");
    }

    public function update(Request $request, int $id)
    {
        $validated = $request->validate([
            'plan_dismantle_date' => 'nullable|date',
            'pic_team'            => 'nullable|string|max:100',
            'category_issue'      => 'nullable|string|max:100',
            'detail_issue'        => 'nullable|string|max:255',
            'remark_dismantle'    => 'nullable|string',
        ]);

        $this->service->update($id, $validated);
        return back()->with('success', 'Data berhasil diperbarui.');
    }

    public function verify(Request $request, int $id)
    {
        $validated = $request->validate([
            'action'         => 'required|in:recorded,skip,replan',
            'verified_notes' => 'nullable|string',
            'replan_date'    => 'required_if:action,replan|nullable|date',
            'also_recorded'  => 'nullable|boolean',
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $this->service->verify($id, $validated['action'], $validated, $user->full_name);

        return back()->with('success', 'Verifikasi tersimpan.');
    }

    public function exportDA(Request $request)
    {
        return $this->service->exportDA($request, $this->getUserRegionCodes());
    }

    public function exportTS(Request $request)
    {
        return $this->service->exportTS($request);
    }

    public function photoFolders()
    {
        return response()->json(['success' => true, 'data' => $this->service->getPhotoFolders()]);
    }

    public function photosByTicket(string $ticketNumber)
    {
        return response()->json(['success' => true, 'data' => $this->service->getPhotosByTicket($ticketNumber)]);
    }

    public function deletePhoto(int $photoId)
    {
        $this->service->deletePhoto($photoId);
        return response()->json(['success' => true, 'message' => 'Foto dihapus.']);
    }

    public function deletePhotoFolder(string $ticketNumber)
    {
        $this->service->deleteFolder($ticketNumber);
        return response()->json(['success' => true, 'message' => "Folder {$ticketNumber} dihapus."]);
    }

    public function exportPhotoZip(string $ticketNumber)
    {
        $zipPath = $this->service->exportPhotoZip($ticketNumber);
        if (!$zipPath) {
            return back()->with('error', 'Tidak ada foto untuk ticket ini.');
        }
        return response()->download($zipPath, "foto_{$ticketNumber}.zip")->deleteFileAfterSend(true);
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
