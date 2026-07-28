import { useState, useRef, useCallback, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

// ── HELPERS ────────────────────────────────────────────────────
function fmtSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
}

function parseCSVLine(line) {
    const res = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
            else inQ = !inQ;
        } else if (ch === ',' && !inQ) { res.push(cur.trim()); cur = ''; }
        else cur += ch;
    }
    res.push(cur.trim());
    return res;
}

// Kompresi gzip pakai CompressionStream bawaan browser (Chrome/Edge) — kalau
// browser lawas tidak dukung, upload apa adanya (server tetap terima).
async function compressFile(file) {
    if (typeof CompressionStream === 'undefined') return { blob: file, compressed: false };
    const ab = await file.arrayBuffer();
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(new Uint8Array(ab));
    writer.close();
    const reader = cs.readable.getReader();
    const chunks = [];
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
    }
    return { blob: new Blob(chunks, { type: 'application/gzip' }), compressed: true };
}

const CARDS = [
    { type: 'ticket',   label: 'TICKET',   icon: 'fa-ticket-alt', hint: 'ticket.csv',        color: '#00b4d8' },
    { type: 'asset',    label: 'ASSET',    icon: 'fa-microchip',  hint: 'asset.csv',         color: '#06d6a0' },
    { type: 'workinfo', label: 'WORKINFO', icon: 'fa-clipboard',  hint: 'workinfo.csv',      color: '#9d4edd' },
    { type: 'manual',   label: 'MANUAL',   icon: 'fa-edit',       hint: 'manual_update.csv', color: '#ffd43b' },
];

const STATS_CONFIG = [
    { key: 'ticket',   label: 'Ticket Clean',   color: '#00b4d8' },
    { key: 'asset',    label: 'Asset Clean',    color: '#06d6a0' },
    { key: 'workinfo', label: 'Workinfo Clean', color: '#9d4edd' },
    { key: 'manual',   label: 'Manual Raw',     color: '#ffd43b' },
    { key: 'tracker',  label: 'Tracker',        color: '#f72585' },
];

function initCardState() {
    return {
        file: null, fileName: 'PILIH FILE CSV', fileSize: null,
        verified: false, headers: [],
        status: 'Menunggu file...', statusType: '',
        uploadPct: 0, showUploadBar: false,
        progressPct: 0, showProgressBar: false,
        liveText: '', showReset: false,
        verifyDisabled: true, importDisabled: true,
    };
}

export default function ImportIndex({ stats }) {
    const [cards, setCards] = useState(() => {
        const init = {};
        CARDS.forEach((c) => { init[c.type] = initCardState(); });
        return init;
    });
    const [engineStatus, setEngineStatus]   = useState('');
    const [engineLoading, setEngineLoading] = useState(false);

    const activeXHR = useRef({});
    const cardsRef  = useRef(cards);
    useEffect(() => { cardsRef.current = cards; }, [cards]);

    const updateCard = useCallback((type, patch) => {
        setCards((prev) => ({
            ...prev,
            [type]: { ...prev[type], ...(typeof patch === 'function' ? patch(prev[type]) : patch) },
        }));
    }, []);

    const onFileSelect = useCallback((type, file) => {
        if (!file) return;
        updateCard(type, {
            file, fileName: file.name, fileSize: fmtSize(file.size),
            verified: false, headers: [],
            status: 'File dipilih — klik Verify untuk validasi header.', statusType: '',
            showReset: false, showProgressBar: false, showUploadBar: false,
            uploadPct: 0, progressPct: 0,
            verifyDisabled: false, importDisabled: true,
        });
    }, [updateCard]);

    const onVerify = useCallback((type) => {
        const file = cardsRef.current[type].file;
        if (!file) return;
        updateCard(type, { status: 'Membaca header...', statusType: 'loading' });

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const line = (e.target.result.split('\n')[0]) || '';
                if (!line.trim()) {
                    updateCard(type, { status: 'File kosong.', statusType: 'error' });
                    return;
                }
                const skip = ['id', 'created_at', 'updated_at'];
                const headers = parseCSVLine(line)
                    .map((h) => h.trim().replace(/^\uFEFF/, '').toLowerCase().replace(/\s+/g, '_'))
                    .filter((h) => h !== '' && !skip.includes(h));

                const minCols = { ticket: 10, asset: 8, workinfo: 4, manual: 5 };
                if (headers.length < (minCols[type] || 3)) {
                    updateCard(type, { status: `Cuma ${headers.length} kolom, kurang.`, statusType: 'error' });
                    return;
                }
                updateCard(type, {
                    verified: true, headers,
                    status: `Header valid — ${headers.length} kolom. Siap import.`, statusType: 'success',
                    importDisabled: false,
                });
            } catch (err) {
                updateCard(type, { status: 'Gagal baca header: ' + err.message, statusType: 'error' });
            }
        };
        reader.onerror = () => updateCard(type, { status: 'Gagal membaca file.', statusType: 'error' });
        reader.readAsText(file.slice(0, 4096), 'UTF-8');
    }, [updateCard]);

    const handleSSEEvent = useCallback((type, data) => {
        if (!data) return;
        const status = data.status || '';

        if (status === 'start' || status === 'info') {
            updateCard(type, {
                liveText: data.message || '', status: data.message || 'Memproses...', statusType: 'loading',
                progressPct: data.progress || 2, showProgressBar: true,
            });
            return;
        }
        if (status === 'progress') {
            const rows = data.rows || 0;
            const elapsed = data.elapsed || 0;
            const rps = elapsed > 0 ? Math.round(rows / elapsed) : 0;
            updateCard(type, {
                progressPct: Math.max(5, data.progress || 0),
                liveText: `${rows.toLocaleString()} baris | ${elapsed}s | ${rps.toLocaleString()} r/s`,
                status: `${rows.toLocaleString()} baris diproses...`, statusType: 'loading',
            });
            return;
        }
        if (status === 'done') {
            const total = (data.total || 0).toLocaleString();
            const skipped = data.skipped || 0;
            updateCard(type, {
                progressPct: 100, showReset: true,
                status: `Selesai! ${total} baris${skipped > 0 ? ` | Skip: ${skipped.toLocaleString()}` : ''} | ${data.elapsed}s`,
                statusType: 'success',
            });
            setTimeout(() => updateCard(type, { showProgressBar: false }), 1500);
            setTimeout(() => {
                setCards((prev) => ({ ...prev, [type]: initCardState() }));
                router.reload({ only: ['stats'] });
            }, 3000);
            return;
        }
        if (status === 'error') {
            const verified = cardsRef.current[type]?.verified ?? false;
            updateCard(type, {
                showProgressBar: false, showUploadBar: false,
                status: data.message || 'Import gagal', statusType: 'error',
                showReset: true, verifyDisabled: false, importDisabled: !verified,
            });
        }
    }, [updateCard]);

    const onImport = useCallback(async (type) => {
        const cardState = cardsRef.current[type];
        if (!cardState.file || !cardState.verified) return;
        const file = cardState.file;

        updateCard(type, { verifyDisabled: true, importDisabled: true, showReset: false });

        let uploadBlob = file;
        let isCompressed = false;
        const THRESHOLD = 1 * 1024 * 1024;

        if (file.size > THRESHOLD) {
            updateCard(type, { status: 'Mengompresi file...', statusType: 'loading', showUploadBar: true, uploadPct: 5 });
            try {
                const result = await compressFile(file);
                uploadBlob = result.blob;
                isCompressed = result.compressed;
                const ratio = ((1 - uploadBlob.size / file.size) * 100).toFixed(0);
                updateCard(type, { status: `Compressed -${ratio}% — mengupload...`, statusType: 'loading' });
            } catch (err) {
                uploadBlob = file;
                isCompressed = false;
            }
        } else {
            updateCard(type, { status: 'Mengupload file...', statusType: 'loading', showUploadBar: true, uploadPct: 0 });
        }

        const fd = new FormData();
        fd.append('file', uploadBlob, isCompressed ? file.name + '.gz' : file.name);
        fd.append('type', type);

        await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            activeXHR.current[type] = xhr;

            xhr.upload.addEventListener('progress', (e) => {
                if (!e.lengthComputable) return;
                const pct = Math.round((e.loaded / e.total) * 100);
                const barPct = isCompressed ? 25 + Math.round(pct * 0.75) : pct;
                updateCard(type, { uploadPct: barPct, status: `Uploading... ${pct}%`, statusType: 'loading' });
            });

            let lastIndex = 0;
            xhr.addEventListener('readystatechange', () => {
                if (xhr.readyState >= 3 && xhr.responseText) {
                    updateCard(type, { showUploadBar: false, showProgressBar: true });
                    const text = xhr.responseText;
                    const newChunk = text.slice(lastIndex);
                    lastIndex = text.length;
                    newChunk.split('\n').forEach((line) => {
                        line = line.trim();
                        if (!line.startsWith('data:')) return;
                        try { handleSSEEvent(type, JSON.parse(line.slice(5).trim())); } catch (e) { /* skip */ }
                    });
                }
                if (xhr.readyState === 4) {
                    if (xhr.status >= 400) reject(new Error('Server error: ' + xhr.status));
                    else resolve();
                }
            });

            xhr.addEventListener('error', () => reject(new Error('Upload gagal — cek koneksi.')));
            xhr.addEventListener('timeout', () => reject(new Error('Upload timeout.')));

            xhr.open('POST', route('import.stream'));
            xhr.setRequestHeader('X-CSRF-TOKEN', document.querySelector('meta[name="csrf-token"]')?.content ?? '');
            xhr.timeout = 600000;
            xhr.send(fd);
        }).catch((err) => {
            const verified = cardsRef.current[type]?.verified ?? false;
            updateCard(type, {
                showUploadBar: false, showProgressBar: false,
                status: err.message, statusType: 'error',
                verifyDisabled: false, importDisabled: !verified,
            });
        });
    }, [updateCard, handleSSEEvent]);

    const onReset = useCallback((type) => {
        if (activeXHR.current[type]) {
            try { activeXHR.current[type].abort(); } catch (e) { /* ignore */ }
            delete activeXHR.current[type];
        }
        setCards((prev) => ({ ...prev, [type]: initCardState() }));
    }, []);

    // ── MASTER BUSINESS ENGINE ──────────────────────────────────
    // Dipanggil manual (bukan otomatis tiap import) — tunggu semua file
    // (ticket/asset/workinfo/manual) selesai diupload dulu, baru dijalankan
    // sekali biar hemat waktu proses.
    const runEngine = async () => {
        setEngineLoading(true);
        setEngineStatus('Memproses...');
        try {
            const res = await fetch(route('import.process'), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
                    Accept: 'application/json',
                },
            });
            const json = await res.json();
            if (json.success) {
                setEngineStatus(`Selesai: ${json.message} | Total tracker: ${(json.total_tracker || 0).toLocaleString()}`);
                setTimeout(() => {
                    setEngineStatus('');
                    setEngineLoading(false);
                    router.reload({ only: ['stats'] });
                }, 3000);
            } else {
                setEngineStatus('Error: ' + json.message);
                setEngineLoading(false);
            }
        } catch (e) {
            setEngineStatus('Terjadi kesalahan saat menjalankan Master Engine.');
            setEngineLoading(false);
        }
    };

    return (
        <AppLayout activeKey="import">
            <div style={S.wrap}>
                <div style={S.statsBar}>
                    {STATS_CONFIG.map((s) => (
                        <div key={s.key} style={S.statChip}>
                            <span style={{ ...S.statValue, color: s.color }}>{(stats?.[s.key] ?? 0).toLocaleString()}</span>
                            <span style={S.statLabel}>{s.label}</span>
                        </div>
                    ))}
                </div>

                <div style={S.header}>
                    <h2 style={S.title}>
                        <i className="fas fa-file-import" style={{ color: '#00b4d8', marginRight: '10px' }} />
                        Import CSV
                    </h2>
                    <p style={S.subtitle}>
                        Upload ke tabel staging, lalu jalankan Master Business Engine buat gabungin semuanya ke tabel <code>tracker</code>.
                    </p>
                </div>

                <div style={S.grid}>
                    {CARDS.map((cfg) => (
                        <ImportCard
                            key={cfg.type}
                            cfg={cfg}
                            state={cards[cfg.type]}
                            onFileSelect={onFileSelect}
                            onVerify={onVerify}
                            onImport={onImport}
                            onReset={onReset}
                        />
                    ))}
                </div>

                <div className="rgb-card-wrap">
                    <div style={S.engineCard}>
                        <i className="fas fa-bolt" style={{ color: '#ffd43b', fontSize: '1.4rem' }} />
                        <h3 style={S.engineTitle}>MASTER BUSINESS ENGINE</h3>
                        <p style={S.engineDesc}>
                            Proses data dari tabel *_clean ke TRACKER.<br />
                            Jalankan setelah semua import selesai.
                        </p>
                        <button style={S.engineBtn} onClick={runEngine} disabled={engineLoading}>
                            <i className={`fas ${engineLoading ? 'fa-spinner fa-spin' : 'fa-play'}`} />
                            {engineLoading ? 'Memproses...' : 'Start Import Process'}
                        </button>
                        {engineStatus && <div style={S.engineStatus}>{engineStatus}</div>}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function ImportCard({ cfg, state, onFileSelect, onVerify, onImport, onReset }) {
    const fileInputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const { type, label, icon, hint, color } = cfg;

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onFileSelect(type, file);
    };

    const statusColor = { loading: '#00b4d8', success: '#06d6a0', error: '#ff6b6b', '': '#8b949e' }[state.statusType];

    return (
        // Wrapper luar: conic-gradient RGB (kelihatan cuma di tepi 3px, permanen —
        // bukan cuma pas import) — inner div (S.card) nutup sisi dalamnya solid.
        <div className="rgb-card-wrap">
            <div style={{ ...S.card, borderColor: dragOver ? color : undefined }}>
                <div style={{ ...S.cardLabel, color }}>
                    <i className={`fas ${icon}`} /> {label}
                </div>

                <div
                    style={{ ...S.dropZone, borderColor: dragOver ? color : (state.file ? color : '#2a3140') }}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                >
                    <i className="fas fa-file-csv" style={{ fontSize: '1.8rem', color: state.file ? color : '#6e7681' }} />
                    <div style={{ fontSize: '.82rem', fontWeight: 600, color: '#e6edf3', marginTop: 6 }}>{state.fileName}</div>
                    <div style={{ fontSize: '.72rem', color: '#6e7681', marginTop: 2 }}>{hint} atau drag &amp; drop</div>
                    {state.fileSize && <div style={S.sizeBadge}>{state.fileSize}</div>}
                    <input
                        ref={fileInputRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
                        onChange={(e) => onFileSelect(type, e.target.files?.[0])}
                    />
                </div>

                {state.headers.length > 0 && (
                    <div style={S.headerPreview}>
                        {state.headers.slice(0, 12).map((h, i) => (
                            <span key={i} style={S.headerChip}>{h}</span>
                        ))}
                        {state.headers.length > 12 && <span style={{ color: '#6e7681', fontSize: '.7rem' }}>+{state.headers.length - 12}</span>}
                    </div>
                )}

                {state.showUploadBar && (
                    <div style={S.progressTrack}>
                        <div style={{ ...S.progressFill, width: `${state.uploadPct}%`, background: '#8b949e' }} />
                    </div>
                )}
                {state.showProgressBar && (
                    <div style={S.progressTrack}>
                        <div style={{ ...S.progressFill, width: `${state.progressPct}%`, background: color }} />
                    </div>
                )}
                {state.liveText && (
                    <div style={{ fontSize: '.72rem', color: '#6e7681', fontFamily: 'monospace' }}>{state.liveText}</div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        disabled={state.verifyDisabled}
                        onClick={() => onVerify(type)}
                        style={{ ...S.btn, ...( !state.verifyDisabled ? { background: 'rgba(255,255,255,.08)', color: '#e6edf3' } : {}) }}
                    >
                        <i className="fas fa-check-circle" /> Verify
                    </button>
                    <button
                        disabled={state.importDisabled}
                        onClick={() => onImport(type)}
                        style={{ ...S.btn, ...( !state.importDisabled ? { background: color, color: '#0a0e14', fontWeight: 800 } : {}) }}
                    >
                        <i className="fas fa-upload" /> Import
                    </button>
                </div>

                <div style={{ fontSize: '.78rem', color: statusColor }}>{state.status}</div>

                {state.showReset && (
                    <button onClick={() => onReset(type)} style={S.btnReset}>
                        <i className="fas fa-undo" /> Import File Baru
                    </button>
                )}
            </div>
        </div>
    );
}

const S = {
    wrap: { padding: '28px 32px', overflowY: 'auto', height: '100%' },
    header: { marginBottom: '22px' },
    title: { fontSize: '1.3rem', fontWeight: 800, color: '#e6edf3', display: 'flex', alignItems: 'center' },
    subtitle: { fontSize: '.82rem', color: '#8b949e', marginTop: '6px' },
    grid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '18px', marginBottom: '20px',
    },
    card: {
        background: '#212631', borderRadius: '11px',
        padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px',
        flex: 1, height: '100%',
    },
    cardLabel: { fontSize: '.85rem', fontWeight: 800, letterSpacing: '.5px', display: 'flex', alignItems: 'center', gap: '8px' },
    dropZone: {
        border: '2px dashed #2a3140', borderRadius: '10px', padding: '18px 10px',
        textAlign: 'center', cursor: 'pointer', transition: 'border-color .2s',
    },
    sizeBadge: {
        marginTop: '6px', display: 'inline-block', padding: '2px 8px', borderRadius: '20px',
        background: 'rgba(255,255,255,.06)', color: '#e6edf3', fontSize: '.7rem',
    },
    headerPreview: { display: 'flex', flexWrap: 'wrap', gap: '4px' },
    headerChip: {
        fontSize: '.68rem', padding: '2px 7px', borderRadius: '10px',
        background: 'rgba(255,255,255,.05)', color: '#8b949e',
    },
    progressTrack: { height: '6px', background: 'rgba(255,255,255,.06)', borderRadius: '4px', overflow: 'hidden' },
    progressFill: { height: '100%', transition: 'width .3s ease' },
    btn: {
        flex: 1, padding: '9px 0', borderRadius: '8px', border: '1px solid #2a3140',
        background: 'transparent', color: '#6e7681', fontSize: '.8rem', fontWeight: 700,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    },
    btnReset: {
        padding: '7px 0', borderRadius: '8px', border: '1px solid #2a3140', background: 'transparent',
        color: '#8b949e', fontSize: '.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '6px',
    },
    statsBar: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' },
    statChip: {
        background: '#212631', border: '1px solid #2a3140', borderRadius: '8px',
        padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px',
    },
    statValue: { fontSize: '1rem', fontWeight: 800 },
    statLabel: { fontSize: '.72rem', color: '#8b949e' },
    engineCard: {
        background: '#212631', borderRadius: '11px', padding: '28px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center',
    },
    engineTitle: { fontSize: '1rem', fontWeight: 800, color: '#e6edf3', letterSpacing: '.5px', margin: 0 },
    engineDesc: { fontSize: '.8rem', color: '#8b949e', margin: 0, lineHeight: 1.5 },
    engineBtn: {
        marginTop: '10px', padding: '12px 32px', borderRadius: '9px', border: 'none',
        background: 'linear-gradient(135deg,#9d4edd,#7b2fbe)', color: '#fff',
        fontSize: '.9rem', fontWeight: 800, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '8px',
    },
    engineStatus: { marginTop: '10px', fontSize: '.82rem', color: '#e6edf3' },
};
