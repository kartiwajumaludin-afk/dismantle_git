<?php

namespace App\Services\DailyActivity;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class DailyActivityService
{
    private array $activeStatuses = ['completed', 'verified'];

    // ── Populate: upsert dari tracker ke daily_activity, minggu berjalan ──
    public function populate(): int
    {
        $start = Carbon::now()->startOfWeek();
        $end   = Carbon::now()->endOfWeek();

        $rows = DB::table('tracker')
            ->whereBetween('plan_dismantle_date', [$start->toDateString(), $end->toDateString()])
            ->whereNotNull('plan_dismantle_date')
            ->get([
                'ticket_number', 'site_id', 'site_name', 'regional',
                'network_operation_and_productivity', 'teritory_operation',
                'ticket_status_name', 'ticket_sub_type_name', 'plan_dismantle_date',
                'latitude', 'longitude',
            ]);

        if ($rows->isEmpty()) {
            return 0;
        }

        $now = now();
        $insert = $rows->map(fn ($r) => [
            'ticket_number'                      => $r->ticket_number,
            'site_id'                             => $r->site_id,
            'site_name'                           => $r->site_name,
            'regional'                            => $r->regional,
            'network_operation_and_productivity'  => $r->network_operation_and_productivity,
            'teritory_operation'                  => $r->teritory_operation,
            'ticket_status_name'                  => $r->ticket_status_name,
            'sub_type'                             => $r->ticket_sub_type_name,
            'update_ticket_status_name'           => $r->ticket_status_name,
            'plan_dismantle_date'                 => $r->plan_dismantle_date,
            'latitude'                             => $r->latitude,
            'longitude'                            => $r->longitude,
            'task_status'                         => 'planned',
            'assignment_status'                   => 'pending',
            'created_at'                          => $now,
            'updated_at'                           => $now,
        ])->toArray();

        // remark_dismantle, pic_team, task_status, assignment_status SENGAJA
        // tidak masuk kolom update -> data assignment/catatan lapangan yang
        // sudah ada tidak ketimpa kalau Populate dijalankan ulang.
        DB::table('daily_activity')->upsert(
            $insert,
            ['ticket_number'],
            [
                'site_id', 'site_name', 'regional',
                'network_operation_and_productivity', 'teritory_operation',
                'ticket_status_name', 'sub_type', 'update_ticket_status_name',
                'plan_dismantle_date', 'latitude', 'longitude', 'updated_at',
            ]
        );

        return count($insert);
    }

    // ── Truncate: hapus semua, tiap pergantian minggu ──
    public function truncate(): void
    {
        DB::table('daily_activity')->truncate();
    }

    // ── Sync Status: refresh status referensi dari Tracker terbaru ──
    public function syncStatus(): int
    {
        return DB::update("
            UPDATE daily_activity da
            JOIN tracker t ON t.ticket_number = da.ticket_number
            SET da.update_ticket_status_name = t.ticket_status_name,
                da.updated_at = NOW()
            WHERE da.task_status NOT IN ('completed', 'verified')
        ");
    }

    /**
     * Filter dasar yang dipakai bareng getData() & getStats() -- SEMUA filter
     * kecuali task_status (biar Summary Card tetap nunjukkin semua kategori
     * meski user lagi nge-filter Task Status tertentu di tabel).
     */
    private function baseQuery(Request $request, array $userRegionCodes, bool $includeTaskStatus): \Illuminate\Database\Query\Builder
    {
        $query = DB::table('daily_activity');

        if (!empty($userRegionCodes)) {
            $names = $this->codesToNames($userRegionCodes);
            if (!empty($names)) $query->whereIn('regional', $names);
        }

        $mode = $request->get('filter_mode', 'today');
        if ($mode === 'today') {
            $query->whereDate('plan_dismantle_date', now()->toDateString());
        } elseif ($mode === 'week') {
            $query->whereBetween('plan_dismantle_date', [
                now()->startOfWeek()->toDateString(), now()->endOfWeek()->toDateString(),
            ]);
        } elseif ($mode === 'custom' && $request->filled('filter_date')) {
            $query->whereDate('plan_dismantle_date', $request->filter_date);
        }

        if ($request->filled('regions') && $request->regions !== 'all') {
            $names = $this->codesToNames(explode(',', $request->regions));
            if (!empty($names)) $query->whereIn('regional', $names);
        }
        if ($request->filled('pic_team') && $request->pic_team !== 'all') {
            $query->whereIn('pic_team', explode(',', $request->pic_team));
        }
        if ($includeTaskStatus && $request->filled('task_status') && $request->task_status !== 'all') {
            $query->whereIn('task_status', explode(',', $request->task_status));
        }
        if ($request->filled('nop') && $request->nop !== 'all') {
            $query->whereIn('network_operation_and_productivity', explode(',', $request->nop));
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('ticket_number', 'like', "%{$s}%")
                  ->orWhere('site_id', 'like', "%{$s}%")
                  ->orWhere('site_name', 'like', "%{$s}%")
                  ->orWhere('pic_team', 'like', "%{$s}%");
            });
        }

        return $query;
    }

    // ── Data + filter (4 tab tanggal + region/pic/status/nop/search) ──
    public function getData(Request $request, array $userRegionCodes = []): array
    {
        $query = $this->baseQuery($request, $userRegionCodes, true);

        $total   = $query->count();
        $perPage = (int) $request->get('per_page', 50);
        $page    = max(1, (int) $request->get('page', 1));
        $offset  = ($page - 1) * $perPage;

        $data = (clone $query)
            ->orderBy('plan_dismantle_date', 'asc')
            ->offset($offset)->limit($perPage)->get();

        return [
            'data' => $data, 'total' => $total, 'per_page' => $perPage,
            'current_page' => $page, 'last_page' => max(1, (int) ceil($total / $perPage)),
            'from' => $total > 0 ? $offset + 1 : 0, 'to' => min($offset + $perPage, $total),
        ];
    }

    /**
     * Summary Card -- Total/Planned/Assigned/In Progress/Reported/Completed.
     * Pakai filter yang sama kayak tabel TAPI TANPA filter Task Status,
     * biar semua kategori kelihatan meski user lagi nge-filter salah satunya.
     * Mapping 8 task_status -> 5 kategori tampilan:
     *   in_progress = in_progress + working + replanned (masih berjalan)
     *   completed   = completed + verified (sudah kelar)
     */
    public function getStats(Request $request, array $userRegionCodes = []): array
    {
        $rows = $this->baseQuery($request, $userRegionCodes, false)
            ->select('task_status', DB::raw('COUNT(*) as jumlah'))
            ->groupBy('task_status')
            ->pluck('jumlah', 'task_status');

        $planned    = (int) ($rows['planned'] ?? 0);
        $assigned   = (int) ($rows['assigned'] ?? 0);
        $inProgress = (int) ($rows['in_progress'] ?? 0) + (int) ($rows['working'] ?? 0) + (int) ($rows['replanned'] ?? 0);
        $reported   = (int) ($rows['reported'] ?? 0);
        $completed  = (int) ($rows['completed'] ?? 0) + (int) ($rows['verified'] ?? 0);

        return [
            'total'       => $rows->sum(),
            'planned'     => $planned,
            'assigned'    => $assigned,
            'in_progress' => $inProgress,
            'reported'    => $reported,
            'completed'   => $completed,
        ];
    }

    public function getFilterOptions(array $userRegionCodes = []): array
    {
        $query = DB::table('daily_activity');
        if (!empty($userRegionCodes)) {
            $names = $this->codesToNames($userRegionCodes);
            if (!empty($names)) $query->whereIn('regional', $names);
        }
        return [
            'picTeams' => (clone $query)->distinct()->orderBy('pic_team')->pluck('pic_team')->filter()->values()->toArray(),
            'nops'     => (clone $query)->distinct()->orderBy('network_operation_and_productivity')->pluck('network_operation_and_productivity')->filter()->values()->toArray(),
        ];
    }

    // ── Assign: PIC Team ke banyak task sekaligus ──
    public function assign(array $ids, string $picTeam, string $assignedBy): int
    {
        return DB::table('daily_activity')
            ->whereIn('id', $ids)
            ->whereNotIn('task_status', $this->activeStatuses)
            ->update([
                'pic_team'           => $picTeam,
                'assigned_by'        => $assignedBy,
                'assignment_status'  => 'pending',
                'task_status'        => 'assigned',
                'updated_at'         => now(),
            ]);
    }

    // ── Update manual (modal): 5 kolom saja ──
    public function update(int $id, array $data): void
    {
        DB::table('daily_activity')->where('id', $id)->update([
            'plan_dismantle_date' => $data['plan_dismantle_date'] ?? null,
            'pic_team'            => $data['pic_team'] ?? null,
            'category_issue'      => $data['category_issue'] ?? null,
            'detail_issue'        => $data['detail_issue'] ?? null,
            'remark_dismantle'    => $data['remark_dismantle'] ?? null,
            'updated_at'          => now(),
        ]);
    }

    // ── Verify Flow: Recorded / Skip / Replan ──
    public function verify(int $id, string $action, array $data, string $verifiedBy): void
    {
        $row = DB::table('daily_activity')->where('id', $id)->first();
        if (!$row) return;

        $now = now();

        if ($action === 'recorded') {
            DB::table('daily_activity')->where('id', $id)->update([
                'task_status'    => 'verified',
                'verified_by'    => $verifiedBy,
                'verified_at'    => $now,
                'verified_notes' => $data['verified_notes'] ?? null,
                'updated_at'     => $now,
            ]);
            $this->insertTimesheet($row, $data['verified_notes'] ?? null, $verifiedBy, $now);
            return;
        }

        if ($action === 'skip') {
            $remark = trim('[SKIP] ' . ($row->remark_dismantle ?? ''));
            DB::table('daily_activity')->where('id', $id)->update([
                'task_status'      => 'completed',
                'remark_dismantle' => $remark,
                'verified_by'      => $verifiedBy,
                'verified_at'      => $now,
                'verified_notes'   => $data['verified_notes'] ?? null,
                'updated_at'       => $now,
            ]);
            return;
        }

        if ($action === 'replan') {
            $alsoRecorded = !empty($data['also_recorded']);
            $prefix = $alsoRecorded ? '[RECORDED+REPLAN] ' : '[REPLAN] ';
            $remark = trim($prefix . ($row->remark_dismantle ?? ''));
            DB::table('daily_activity')->where('id', $id)->update([
                'task_status'         => 'replanned',
                'plan_dismantle_date' => $data['replan_date'],
                'remark_dismantle'    => $remark,
                'verified_by'         => $verifiedBy,
                'verified_at'         => $now,
                'verified_notes'      => $data['verified_notes'] ?? null,
                'updated_at'          => $now,
            ]);
            if ($alsoRecorded) {
                $this->insertTimesheet($row, $data['verified_notes'] ?? null, $verifiedBy, $now);
            }
        }
    }

    private function insertTimesheet(object $row, ?string $notes, string $verifiedBy, $now): void
    {
        DB::table('timesheet')->insert([
            'plan_dismantle_date' => $row->plan_dismantle_date,
            'ticket_number'       => $row->ticket_number,
            'site_id'             => $row->site_id,
            'site_name'           => $row->site_name,
            'regional'            => $row->regional,
            'nop'                 => $row->network_operation_and_productivity,
            'ticket_status_name'  => $row->ticket_status_name,
            'remark_dismantle'    => $row->remark_dismantle,
            'pic_team'            => $row->pic_team,
            'category_issue'      => $row->category_issue,
            'detail_issue'        => $row->detail_issue,
            'work_start_time'     => $row->work_start_time,
            'work_end_time'       => $row->work_end_time,
            'work_duration'       => $row->work_duration,
            'work_notes'          => $row->work_notes,
            'verified_by'         => $verifiedBy,
            'verified_at'         => $now,
            'verified_notes'      => $notes,
            'created_at'          => $now,
        ]);
    }

    // ── Export Daily Activity (18 kolom custom) ──
    public function exportDA(Request $request, array $userRegionCodes = [])
    {
        $result = $this->getDataForExport($request, $userRegionCodes);

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="daily_activity_export.csv"',
        ];

        $columns = [
            'Ticket Number', 'Site ID', 'Site Name', 'Regional', 'NOP', 'Teritory Operation',
            'Ticket Status', 'Sub Type', 'Plan Dismantle Date', 'PIC Team',
            'Assignment Status', 'Task Status', 'Category Issue', 'Detail Issue',
            'Remark Dismantle', 'Work Start Time', 'Work End Time', 'Work Duration (menit)',
        ];

        return response()->stream(function () use ($result, $columns) {
            $out = fopen('php://output', 'w');
            fputcsv($out, $columns);
            foreach ($result as $r) {
                fputcsv($out, [
                    $r->ticket_number, $r->site_id, $r->site_name, $r->regional,
                    $r->network_operation_and_productivity, $r->teritory_operation,
                    $r->ticket_status_name, $r->sub_type, $r->plan_dismantle_date, $r->pic_team,
                    $r->assignment_status, $r->task_status, $r->category_issue, $r->detail_issue,
                    $r->remark_dismantle, $r->work_start_time, $r->work_end_time, $r->work_duration,
                ]);
            }
            fclose($out);
        }, 200, $headers);
    }

    // ── Export Timesheet -- filename WAJIB memuat rentang tanggal aktual ──
    public function exportTS(Request $request)
    {
        $from = $request->get('from', now()->startOfMonth()->toDateString());
        $to   = $request->get('to', now()->toDateString());

        $rows = DB::table('timesheet')
            ->whereBetween('plan_dismantle_date', [$from, $to])
            ->orderBy('plan_dismantle_date')
            ->get();

        // WAJIB double-quote/sprintf -- pernah kejadian nama file jadi literal
        // "{from}_{to}" (single-quote) di source lama, bukan tanggal aslinya.
        $filename = sprintf('timesheet_%s_%s.csv', $from, $to);

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        return response()->stream(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, [
                'Plan Date', 'Ticket Number', 'Site ID', 'Site Name', 'Regional', 'NOP',
                'Ticket Status', 'Remark Dismantle', 'PIC Team', 'Category Issue', 'Detail Issue',
                'Work Start', 'Work End', 'Work Duration (menit)', 'Work Notes',
                'Verified By', 'Verified At', 'Verified Notes',
            ]);
            foreach ($rows as $r) {
                fputcsv($out, [
                    $r->plan_dismantle_date, $r->ticket_number, $r->site_id, $r->site_name,
                    $r->regional, $r->nop, $r->ticket_status_name, $r->remark_dismantle,
                    $r->pic_team, $r->category_issue, $r->detail_issue,
                    $r->work_start_time, $r->work_end_time, $r->work_duration, $r->work_notes,
                    $r->verified_by, $r->verified_at, $r->verified_notes,
                ]);
            }
            fclose($out);
        }, 200, $headers);
    }

    private function getDataForExport(Request $request, array $userRegionCodes = [])
    {
        $request->merge(['per_page' => 999999999, 'page' => 1]);
        return collect($this->getData($request, $userRegionCodes)['data']);
    }

    // ── Photo gallery: folder per ticket ──
    public function getPhotoFolders(): array
    {
        return DB::table('activity_photos')
            ->select('ticket_number', DB::raw('COUNT(*) as jumlah'))
            ->groupBy('ticket_number')
            ->orderBy('ticket_number')
            ->get()
            ->toArray();
    }

    public function getPhotosByTicket(string $ticketNumber): array
    {
        return DB::table('activity_photos')
            ->where('ticket_number', $ticketNumber)
            ->orderBy('created_at', 'desc')
            ->get()
            ->toArray();
    }

    public function deletePhoto(int $photoId): void
    {
        $photo = DB::table('activity_photos')->where('id', $photoId)->first();
        if ($photo && $photo->photo_path && \Illuminate\Support\Facades\Storage::disk('public')->exists($photo->photo_path)) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($photo->photo_path);
        }
        DB::table('activity_photos')->where('id', $photoId)->delete();
    }

    public function deleteFolder(string $ticketNumber): void
    {
        $photos = DB::table('activity_photos')->where('ticket_number', $ticketNumber)->get();
        foreach ($photos as $p) {
            if ($p->photo_path && \Illuminate\Support\Facades\Storage::disk('public')->exists($p->photo_path)) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($p->photo_path);
            }
        }
        DB::table('activity_photos')->where('ticket_number', $ticketNumber)->delete();
    }

    public function exportPhotoZip(string $ticketNumber): ?string
    {
        $photos = $this->getPhotosByTicket($ticketNumber);
        if (empty($photos)) return null;

        $zipPath = storage_path("app/tmp_{$ticketNumber}.zip");
        $zip = new \ZipArchive();
        if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            return null;
        }
        foreach ($photos as $p) {
            $full = storage_path('app/public/' . $p->photo_path);
            if (file_exists($full)) {
                $zip->addFile($full, basename($p->photo_path));
            }
        }
        $zip->close();
        return $zipPath;
    }

    private function codesToNames(array $codes): array
    {
        $names = [];
        foreach ($codes as $code) {
            $num = ltrim(str_replace('REG', '', strtoupper((string) $code)), '0');
            if ($num) $names[] = 'REGIONAL ' . $num;
        }
        return $names;
    }
}
