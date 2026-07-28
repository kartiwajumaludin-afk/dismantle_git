<?php
// app/Services/Import/ImportService.php
// Import streaming CSV ke tabel staging (ticket_clean, asset_clean,
// workinfo_clean, tracker_manual_raw). Batch insert lewat PDO langsung
// (bukan Eloquent) supaya bisa handle ratusan ribu baris tanpa timeout.

namespace App\Services\Import;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ImportService
{
    private array $config = [
        'ticket' => [
            'table'       => 'ticket_clean',
            'dedup_keys'  => ['ticket_number'],
            'insert_mode' => 'upsert',
            'dates'       => [
                'ticket_created_date', 'ticket_resolved_date', 'ticket_cleared_date',
                'working_permit_start_date', 'working_permit_end_date',
                'working_permit_updated_date',
            ],
        ],
        'asset' => [
            'table'       => 'asset_clean',
            'dedup_keys'  => ['ticket_number', 'barcode_number'],
            'insert_mode' => 'upsert',
            'dates'       => ['ticket_created_date', 'ticket_resolved_date', 'ticket_cleared_date'],
        ],
        'workinfo' => [
            'table'       => 'workinfo_clean',
            'dedup_keys'  => ['ticket_number', 'work_info_status_name', 'work_info_updated_date'],
            'insert_mode' => 'skipsert',
            'dates'       => ['work_info_updated_date'],
        ],
        'manual' => [
            'table'       => 'tracker_manual_raw',
            'dedup_keys'  => ['ticket_number'],
            'insert_mode' => 'upsert',
            'dates'       => ['start_permit_tp_date', 'end_permit_tp_date', 'plan_dismantle_date'],
            'skip_cols'   => ['id', 'created_at', 'updated_at'],
        ],
    ];

    public function verifyHeader(UploadedFile $file, string $type): array
    {
        $handle = fopen($file->getRealPath(), 'r');
        if (!$handle) {
            return ['success' => false, 'message' => 'File tidak bisa dibaca.'];
        }

        $rawHeaders = fgetcsv($handle);
        fclose($handle);
        if (!$rawHeaders) {
            return ['success' => false, 'message' => 'File kosong.'];
        }

        $skipCols   = $this->config[$type]['skip_cols'] ?? [];
        $csvHeaders = array_map(fn ($h) => $this->normalizeColumnName($h), $rawHeaders);
        $csvHeaders = array_values(array_filter($csvHeaders, fn ($h) => $h !== '' && !in_array($h, $skipCols)));

        return ['success' => true, 'total_headers' => count($csvHeaders), 'headers' => $csvHeaders, 'type' => $type];
    }

    /**
     * File CSV sudah lengkap di server (sudah di-decompress kalau perlu).
     * Generator: yield progress per batch — di-stream ke browser lewat SSE.
     */
    public function processStream(string $filePath, string $type): \Generator
    {
        ini_set('memory_limit', '512M');
        set_time_limit(0);

        $cfg         = $this->config[$type];
        $tableName   = $cfg['table'];
        $insertMode  = $cfg['insert_mode'];
        $dateColumns = $cfg['dates'];
        $skipCols    = $cfg['skip_cols'] ?? [];
        $isSkipsert  = ($insertMode === 'skipsert');

        yield json_encode(['status' => 'start', 'message' => "Memproses {$type}...", 'progress' => 0]);

        $handle = fopen($filePath, 'r');
        if (!$handle) {
            yield json_encode(['status' => 'error', 'message' => 'File tidak bisa dibuka.']);
            return;
        }

        $rawHeaders = fgetcsv($handle);
        if (!$rawHeaders) {
            fclose($handle);
            yield json_encode(['status' => 'error', 'message' => 'File kosong.']);
            return;
        }

        $dbColumns   = array_map(fn ($h) => $this->normalizeColumnName($h), $rawHeaders);
        $filteredIdx = [];
        $filteredColumns = [];
        foreach ($dbColumns as $i => $col) {
            if ($col !== '' && !in_array($col, $skipCols)) {
                $filteredIdx[]     = $i;
                $filteredColumns[] = $col;
            }
        }

        $colCount  = count($filteredColumns);
        $batchSize = max(300, min(8000, (int) floor(40000 / max($colCount, 1))));
        $colStr    = implode(',', array_map(fn ($c) => "`{$c}`", $filteredColumns));

        yield json_encode(['status' => 'info', 'message' => "Kolom: {$colCount} | Batch: {$batchSize}", 'progress' => 1]);

        $updateClauses = '';
        if (!$isSkipsert) {
            $parts    = [];
            $isManual = ($type === 'manual');
            foreach ($filteredColumns as $c) {
                if ($c === 'id' || in_array($c, $cfg['dedup_keys'])) {
                    continue;
                }
                $parts[] = $isManual
                    ? "`{$c}`=COALESCE(VALUES(`{$c}`),`{$c}`)"
                    : "`{$c}`=VALUES(`{$c}`)";
            }
            $updateClauses = implode(',', $parts);
        }

        try {
            $pdo = DB::getPdo();
            $pdo->setAttribute(\PDO::ATTR_EMULATE_PREPARES, true);
            $pdo->exec('SET SESSION foreign_key_checks=0');
            if ($isSkipsert) {
                $pdo->exec('SET SESSION unique_checks=0');
            }
            try {
                $pdo->exec('SET SESSION bulk_insert_buffer_size=' . (512 * 1024 * 1024));
                $pdo->exec('SET SESSION innodb_lock_wait_timeout=360');
                $pdo->exec('SET SESSION net_write_timeout=360');
                $pdo->exec('SET SESSION net_read_timeout=360');
                $pdo->exec('SET SESSION wait_timeout=28800');
            } catch (\Exception $e) {
                // Sesi MySQL shared hosting kadang tidak izinkan SET SESSION
                // tertentu — abaikan, bukan fatal.
            }
        } catch (\Exception $e) {
            fclose($handle);
            yield json_encode(['status' => 'error', 'message' => 'DB error: ' . $e->getMessage()]);
            return;
        }

        $useTransaction = !$isSkipsert;
        if ($useTransaction) {
            try {
                DB::beginTransaction();
            } catch (\Exception $e) {
                fclose($handle);
                yield json_encode(['status' => 'error', 'message' => 'TX error: ' . $e->getMessage()]);
                return;
            }
        }

        $totalRows = 0;
        $skipped   = 0;
        $batch     = [];
        $stmtCache = [];
        $vNowAdded = false;
        $vNow      = now()->format('Y-m-d H:i:s');
        $startTime = microtime(true);
        $lastYield = microtime(true);
        $fileSize  = filesize($filePath);
        $estTotal  = 0;
        $dateColSet = array_flip(array_intersect($filteredColumns, $dateColumns));

        try {
            while (($row = fgetcsv($handle)) !== false) {
                if (count($row) === 1 && trim($row[0]) === '') {
                    continue;
                }

                $mapped = [];
                foreach ($filteredIdx as $pos => $i) {
                    $col   = $filteredColumns[$pos];
                    $value = isset($row[$i]) ? trim($row[$i]) : '';
                    if ($value === '' || strtolower($value) === 'null') {
                        $mapped[$col] = null;
                    } elseif (isset($dateColSet[$col])) {
                        $mapped[$col] = $this->normalizeDate($value);
                    } else {
                        $mapped[$col] = $value;
                    }
                }

                if (empty($mapped)) {
                    continue;
                }
                if (empty($mapped['ticket_number'])) {
                    $skipped++;
                    continue;
                }
                if ($type === 'asset' && empty($mapped['barcode_number'])) {
                    $skipped++;
                    continue;
                }
                if ($type === 'workinfo' && empty($mapped['work_info_updated_date'])) {
                    $skipped++;
                    continue;
                }

                if ($type !== 'manual' && !$vNowAdded) {
                    $filteredColumns[] = 'v_now';
                    $colStr = implode(',', array_map(fn ($c) => "`{$c}`", $filteredColumns));
                    $colCount++;
                    if (!$isSkipsert) {
                        $updateClauses .= ',`v_now`=VALUES(`v_now`)';
                    }
                    $batchSize = max(300, min(8000, (int) floor(40000 / max($colCount, 1))));
                    $stmtCache = [];
                    $vNowAdded = true;
                }
                if ($type !== 'manual') {
                    $mapped['v_now'] = $vNow;
                }

                $orderedRow = [];
                foreach ($filteredColumns as $col) {
                    $orderedRow[] = $mapped[$col] ?? null;
                }
                $batch[] = $orderedRow;
                $totalRows++;

                if ($totalRows === 500 && $fileSize > 0) {
                    $bpr = max(ftell($handle) / 500, 1);
                    $estTotal = (int) ($fileSize / $bpr);
                }

                if (count($batch) >= $batchSize) {
                    $this->executeBatch($pdo, $tableName, $colStr, $colCount, $updateClauses, $isSkipsert, $batch, $stmtCache);
                    $batch = [];

                    $now = microtime(true);
                    if ($now - $lastYield >= 1.5) {
                        $elapsed = round($now - $startTime, 1);
                        $pct = $estTotal > 0 ? min(95, (int) (($totalRows / $estTotal) * 100)) : min(90, (int) ($totalRows / 8000));
                        yield json_encode(['status' => 'progress', 'rows' => $totalRows, 'skipped' => $skipped, 'elapsed' => $elapsed, 'progress' => $pct]);
                        $lastYield = $now;
                    }
                }
            }

            if (!empty($batch)) {
                $this->executeBatch($pdo, $tableName, $colStr, $colCount, $updateClauses, $isSkipsert, $batch, $stmtCache);
            }

            if ($useTransaction) {
                DB::commit();
            }

            $pdo->exec('SET SESSION foreign_key_checks=1');
            if ($isSkipsert) {
                $pdo->exec('SET SESSION unique_checks=1');
            }
            $pdo->setAttribute(\PDO::ATTR_EMULATE_PREPARES, false);
            fclose($handle);

            yield json_encode([
                'status' => 'done', 'success' => true, 'message' => 'Import selesai!',
                'type' => $type, 'total' => $totalRows, 'skipped' => $skipped,
                'elapsed' => round(microtime(true) - $startTime, 2), 'progress' => 100,
            ]);
        } catch (\Exception $e) {
            if ($useTransaction) {
                try {
                    DB::rollBack();
                } catch (\Exception $rb) {
                }
            }
            try {
                $pdo->exec('SET SESSION foreign_key_checks=1');
                if ($isSkipsert) {
                    $pdo->exec('SET SESSION unique_checks=1');
                }
                $pdo->setAttribute(\PDO::ATTR_EMULATE_PREPARES, false);
            } catch (\Exception $ig) {
            }
            fclose($handle);
            Log::error("Import {$type}: " . $e->getMessage());
            yield json_encode(['status' => 'error', 'success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function executeBatch(
        \PDO $pdo,
        string $table,
        string $colStr,
        int $colCount,
        string $updateClauses,
        bool $isSkipsert,
        array $batch,
        array &$stmtCache
    ): void {
        if (empty($batch)) {
            return;
        }
        $n = count($batch);
        if (!isset($stmtCache[$n])) {
            $ph  = '(' . implode(',', array_fill(0, $colCount, '?')) . ')';
            $all = implode(',', array_fill(0, $n, $ph));
            $sql = $isSkipsert
                ? "INSERT IGNORE INTO `{$table}` ({$colStr}) VALUES {$all}"
                : "INSERT INTO `{$table}` ({$colStr}) VALUES {$all} ON DUPLICATE KEY UPDATE {$updateClauses}";
            $stmtCache[$n] = $pdo->prepare($sql);
        }
        $vals = [];
        foreach ($batch as $row) {
            foreach ($row as $v) {
                $vals[] = $v;
            }
        }
        $stmtCache[$n]->execute($vals);
        $stmtCache[$n]->closeCursor();
    }

    private function normalizeDate(?string $value): ?string
    {
        if (!$value || $value === 'NULL' || $value === '0000-00-00 00:00:00') {
            return null;
        }
        $v = trim($value);
        if ($v === '') {
            return null;
        }
        if (is_numeric($v) && strlen($v) >= 5 && strlen($v) <= 6) {
            return date('Y-m-d H:i:s', (int) (((float) $v - 25569) * 86400));
        }
        $f4 = substr($v, 0, 4);
        if (ctype_digit($f4) && (int) $f4 >= 1900 && (int) $f4 <= 2100) {
            $ts = strtotime($v);
            return $ts ? date('Y-m-d H:i:s', $ts) : null;
        }
        $hasDash  = str_contains($v, '-');
        $hasSlash = str_contains($v, '/');
        if (!$hasDash && !$hasSlash) {
            $ts = strtotime($v);
            return $ts ? date('Y-m-d H:i:s', $ts) : null;
        }
        if ($hasDash) {
            if (preg_match('/^(\d{1,2})-(\d{2})-(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i', $v, $m)) {
                return !empty($m[4])
                    ? $this->buildDatetime($m[3], $m[2], $m[1], $m[4], $m[5] ?? '00', $m[6] ?? '00', $m[7] ?? '')
                    : sprintf('%04d-%02d-%02d 00:00:00', (int) $m[3], (int) $m[2], (int) $m[1]);
            }
            if (preg_match('/^(\d{1,2})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i', $v, $m)) {
                $yyyy = (int) $m[3] + 2000;
                return !empty($m[4])
                    ? $this->buildDatetime($yyyy, $m[2], $m[1], $m[4], $m[5] ?? '00', $m[6] ?? '00', $m[7] ?? '')
                    : sprintf('%04d-%02d-%02d 00:00:00', $yyyy, (int) $m[2], (int) $m[1]);
            }
        }
        if ($hasSlash) {
            if (preg_match('/^(\d{1,2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i', $v, $m)) {
                return !empty($m[4])
                    ? $this->buildDatetime($m[3], $m[2], $m[1], $m[4], $m[5] ?? '00', $m[6] ?? '00', $m[7] ?? '')
                    : sprintf('%04d-%02d-%02d 00:00:00', (int) $m[3], (int) $m[2], (int) $m[1]);
            }
            if (preg_match('/^(\d{1,2})\/(\d{2})\/(\d{2})/', $v, $m)) {
                return sprintf('%04d-%02d-%02d 00:00:00', (int) $m[3] + 2000, (int) $m[2], (int) $m[1]);
            }
        }
        $ts = strtotime($v);
        return $ts ? date('Y-m-d H:i:s', $ts) : null;
    }

    private function buildDatetime($year, $month, $day, $hour, $minute, $second = '00', $ampm = ''): string
    {
        $h    = (int) $hour;
        $ampm = strtoupper(trim((string) $ampm));
        if ($ampm === 'PM' && $h < 12) {
            $h += 12;
        }
        if ($ampm === 'AM' && $h === 12) {
            $h = 0;
        }
        return sprintf('%04d-%02d-%02d %02d:%02d:%02d', (int) $year, (int) $month, (int) $day, $h, (int) $minute, (int) $second);
    }

    private function normalizeColumnName(string $header): string
    {
        return strtolower(str_replace(' ', '_', trim($header, " \t\n\r\0\x0B\xEF\xBB\xBF")));
    }

    public function getTableStats(): array
    {
        return [
            'ticket'   => DB::table('ticket_clean')->count(),
            'asset'    => DB::table('asset_clean')->count(),
            'workinfo' => DB::table('workinfo_clean')->count(),
            'manual'   => DB::table('tracker_manual_raw')->count(),
        ];
    }
}
