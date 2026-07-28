<?php

namespace App\Http\Controllers\Import;

use App\Http\Controllers\Controller;
use App\Services\Import\ImportService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ImportController extends Controller
{
    public function __construct(private ImportService $service)
    {
    }

    public function index()
    {
        return Inertia::render('Import/Index', [
            'stats' => $this->service->getTableStats(),
        ]);
    }

    public function stats()
    {
        return response()->json($this->service->getTableStats());
    }

    public function verify(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt'],
            'type' => ['required', 'in:ticket,asset,workinfo,manual'],
        ]);

        return response()->json(
            $this->service->verifyHeader($request->file('file'), $request->type)
        );
    }

    /**
     * Upload + stream. Alur: browser compress CSV (gzip) -> upload 1x POST ->
     * server decompress -> stream SSE progress ke browser (tanpa queue,
     * tanpa polling).
     */
    public function uploadAndStream(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file'],
            'type' => ['required', 'in:ticket,asset,workinfo,manual'],
        ]);

        $type = $request->type;
        $file = $request->file('file');

        if (!$file || !$file->isValid()) {
            return response()->json(['success' => false, 'message' => 'File tidak valid'], 400);
        }

        $tempDir = storage_path('app/import_temp');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $uploadId = $type . '_' . time() . '_' . bin2hex(random_bytes(4));
        $tempFile = $tempDir . '/' . $uploadId . '.csv';
        $uploadedPath = $file->getRealPath();

        // Deteksi gzip dari magic bytes
        $isGzip = false;
        $fh = fopen($uploadedPath, 'rb');
        if ($fh) {
            $magic = fread($fh, 2);
            fclose($fh);
            $isGzip = (strlen($magic) >= 2 && ord($magic[0]) === 0x1f && ord($magic[1]) === 0x8b);
        }

        if ($isGzip) {
            $gz = gzopen($uploadedPath, 'rb');
            if (!$gz) {
                return response()->json(['success' => false, 'message' => 'Gagal membuka file terkompresi'], 500);
            }
            $out = fopen($tempFile, 'wb');
            if (!$out) {
                gzclose($gz);
                return response()->json(['success' => false, 'message' => 'Gagal membuat file temp'], 500);
            }
            while (!gzeof($gz)) {
                $chunk = gzread($gz, 65536);
                if ($chunk === false) {
                    break;
                }
                fwrite($out, $chunk);
            }
            gzclose($gz);
            fclose($out);
        } else {
            if (!move_uploaded_file($uploadedPath, $tempFile)) {
                return response()->json(['success' => false, 'message' => 'Gagal menyimpan file'], 500);
            }
        }

        $filePath = $tempFile;
        $service  = $this->service;

        // PENTING: lepas lock session file sebelum SSE, supaya request lain
        // dari user yang sama tidak nge-block selama import jalan.
        session()->save();

        return response()->stream(function () use ($service, $filePath, $type) {
            if (ob_get_level()) {
                ob_end_clean();
            }
            ini_set('output_buffering', 'off');
            ini_set('zlib.output_compression', false);
            set_time_limit(0);

            $send = function (array $data) {
                echo 'data: ' . json_encode($data) . "\n\n";
                if (ob_get_level()) {
                    ob_flush();
                }
                flush();
            };

            try {
                foreach ($service->processStream($filePath, $type) as $line) {
                    $data = json_decode($line, true);
                    if (!$data) {
                        continue;
                    }
                    $send($data);
                    $status = $data['status'] ?? '';
                    if ($status === 'done' || $status === 'error') {
                        break;
                    }
                }
            } catch (\Exception $e) {
                $send(['status' => 'error', 'success' => false, 'message' => $e->getMessage()]);
            } finally {
                if (file_exists($filePath)) {
                    @unlink($filePath);
                }
            }
        }, 200, [
            'Content-Type'      => 'text/event-stream',
            'Cache-Control'     => 'no-cache, no-store',
            'X-Accel-Buffering' => 'no',
            'Connection'        => 'keep-alive',
        ]);
    }
}
