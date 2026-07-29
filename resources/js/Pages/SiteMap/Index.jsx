import { useState, useRef, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import 'leaflet/dist/leaflet.css';

const ALL_REGS = ['REG01', 'REG02', 'REG03', 'REG04', 'REG05', 'REG06', 'REG07', 'REG08', 'REG09', 'REG10', 'REG11', 'REG12'];

// Skema warna Mode P1-P7 (+P8) -- sesuai README, dari priority_site hasil
// Master Business Engine (BUKAN dihitung ulang di frontend).
const PRIORITY_COLORS = {
    P1: '#0000FF', P2: '#FFFF00', P3: '#00FF00', P4: '#FF00FF',
    P5: '#00FFFF', P6: '#8000FF', P7: '#FF0000', P8: '#FF6600',
};
// Mode NOP: siklus 8 warna tetap.
const NOP_PALETTE = ['#00b4d8', '#06d6a0', '#ffd43b', '#f72585', '#9d4edd', '#f97316', '#4ade80', '#38bdf8'];

export default function SiteMapIndex() {
    const { count, filterOptions, auth } = usePage().props;
    const [mode, setMode] = useState('nop'); // 'nop' | 'priority'
    const [sites, setSites] = useState(null); // null = belum di-load
    const [loadingMap, setLoadingMap] = useState(false);
    const [busy, setBusy] = useState(false);
    const mapRef = useRef(null);
    const leafletMapRef = useRef(null);
    const markersLayerRef = useRef(null);
    const LRef = useRef(null);

    const doPopulate = () => {
        if (!confirm('Rebuild Site Map dari data Tracker terbaru? Data lama akan ditimpa.')) return;
        setBusy(true);
        router.post(route('sitemap.populate'), {}, { onFinish: () => setBusy(false) });
    };

    const loadMap = async () => {
        setLoadingMap(true);
        const params = Object.fromEntries(new URLSearchParams(window.location.search));
        const qs = new URLSearchParams(params).toString();
        const res = await fetch(route('sitemap.data') + (qs ? `?${qs}` : ''));
        const json = await res.json();
        setSites(json.data ?? []);
        setLoadingMap(false);
    };

    // Init peta cuma sekali, setelah sites pertama kali ke-load.
    useEffect(() => {
        if (sites === null || !mapRef.current) return;

        (async () => {
            const L = LRef.current ?? (LRef.current = (await import('leaflet')).default);

            if (!leafletMapRef.current) {
                leafletMapRef.current = L.map(mapRef.current).setView([-2.5, 118], 5);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors',
                }).addTo(leafletMapRef.current);
                markersLayerRef.current = L.layerGroup().addTo(leafletMapRef.current);
            }

            markersLayerRef.current.clearLayers();
            const nopColorMap = {};
            let nopIdx = 0;

            const bounds = [];
            sites.forEach((s) => {
                if (!s.latitude || !s.longitude) return;
                let color;
                if (mode === 'priority') {
                    color = PRIORITY_COLORS[s.priority] ?? '#8b949e';
                } else {
                    if (!(s.nop in nopColorMap)) {
                        nopColorMap[s.nop] = NOP_PALETTE[nopIdx % NOP_PALETTE.length];
                        nopIdx++;
                    }
                    color = nopColorMap[s.nop];
                }
                const marker = L.circleMarker([s.latitude, s.longitude], {
                    radius: 6, color, fillColor: color, fillOpacity: 0.85, weight: 1,
                }).bindPopup(`
                    <b>${s.site_id ?? '-'}</b> — ${s.site_name ?? '-'}<br/>
                    Ticket: ${s.ticket_number}<br/>
                    NOP: ${s.nop ?? '-'}<br/>
                    Status: ${s.ticket_status_name ?? '-'}<br/>
                    Priority: ${s.priority ?? '-'}
                `);
                markersLayerRef.current.addLayer(marker);
                bounds.push([s.latitude, s.longitude]);
            });

            if (bounds.length) leafletMapRef.current.fitBounds(bounds, { maxZoom: 12 });
        })();
    }, [sites, mode]);

    return (
        <AppLayout activeSubmenu="site_map" leftPanel={<LeftPanel filterOptions={filterOptions} auth={auth} />}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <div style={S.toolbar}>
                    <h2 style={S.title}><i className="fas fa-map" style={{ color: '#f72585', marginRight: 10 }} /> Site Map</h2>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={S.modeSwitch}>
                            <button onClick={() => setMode('nop')} style={{ ...S.modeBtn, ...(mode === 'nop' ? S.modeBtnActive : {}) }}>Mode NOP</button>
                            <button onClick={() => setMode('priority')} style={{ ...S.modeBtn, ...(mode === 'priority' ? S.modeBtnActive : {}) }}>Mode P1–P8</button>
                        </div>
                        <span style={{ color: '#e6edf3', fontSize: '.8rem' }}>Site tercatat: <strong>{count?.toLocaleString('id-ID')}</strong></span>
                        <button disabled={busy} onClick={doPopulate} style={S.btn('#00b4d8')}><i className="fas fa-sync" /> Populate</button>
                        <button disabled={loadingMap} onClick={loadMap} style={S.btn('#06d6a0')}>
                            <i className={`fas ${loadingMap ? 'fa-spinner fa-spin' : 'fa-map-marked-alt'}`} /> {loadingMap ? 'Memuat...' : 'Load Map'}
                        </button>
                    </div>
                </div>

                {mode === 'priority' && (
                    <div style={S.legend}>
                        {Object.entries(PRIORITY_COLORS).map(([p, c]) => (
                            <span key={p} style={S.legendItem}><span style={{ ...S.legendDot, background: c }} /> {p}</span>
                        ))}
                    </div>
                )}

                <div style={{ flex: 1, position: 'relative' }}>
                    {sites === null && (
                        <div style={S.emptyState}>
                            <i className="fas fa-map-marked-alt" style={{ fontSize: '2rem', color: '#3a4255', marginBottom: 10 }} />
                            <div>Peta sengaja kosong dulu — klik <strong>Load Map</strong> buat nampilin titik site (bisa puluhan ribu, sengaja nggak auto-load biar browser nggak hang).</div>
                        </div>
                    )}
                    <div ref={mapRef} style={{ width: '100%', height: '100%', display: sites === null ? 'none' : 'block' }} />
                </div>
            </div>
        </AppLayout>
    );
}

/* ─── LEFT PANEL: QUICK FILTERS (standar 350px) ─── */
function LeftPanel({ filterOptions, auth }) {
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    const [regions, setRegions] = useState(params.regions ? params.regions.split(',') : ['all']);
    const [search, setSearch] = useState(params.search ?? '');
    const [ticketStatus, setTicketStatus] = useState(params.ticket_status ? params.ticket_status.split(',') : []);
    const [nop, setNop] = useState(params.nop ? params.nop.split(',') : []);
    const [ticketBatch, setTicketBatch] = useState(params.ticket_batch ? params.ticket_batch.split(',') : []);

    const userRegCodes = auth?.user?.regions?.map(r => r.code) ?? [];
    const isSuperAdmin = auth?.user?.role === 'super_admin';
    const REG_LIST = isSuperAdmin || userRegCodes.length === 0 ? ALL_REGS : ALL_REGS.filter(r => userRegCodes.includes(r));

    const buildQuery = (overrides = {}) => {
        const base = { regions, ticket_status: ticketStatus, nop, ticket_batch: ticketBatch, search, ...overrides };
        const q = {};
        if (base.regions && !base.regions.includes('all') && base.regions.length) q.regions = base.regions.join(',');
        if (base.ticket_status?.length) q.ticket_status = base.ticket_status.join(',');
        if (base.nop?.length) q.nop = base.nop.join(',');
        if (base.ticket_batch?.length) q.ticket_batch = base.ticket_batch.join(',');
        if (base.search?.trim()) q.search = base.search.trim();
        return q;
    };
    const apply = (overrides = {}) => router.get(route('sitemap.index'), buildQuery(overrides), { preserveState: true });
    const resetAll = () => {
        setRegions(['all']); setTicketStatus([]); setNop([]); setTicketBatch([]); setSearch('');
        router.get(route('sitemap.index'), {});
    };
    const toggleRegion = (r) => {
        let next;
        if (r === 'all') next = ['all'];
        else {
            const without = regions.filter(x => x !== 'all' && x !== r);
            const added = regions.includes(r) ? without : [...without, r];
            next = added.length === 0 ? ['all'] : added;
        }
        setRegions(next);
        apply({ regions: next });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={F.header}>
                <span style={{ color: '#e6edf3', fontWeight: 700, fontSize: '.9rem' }}><i className="fas fa-filter" style={{ color: '#00b4d8', marginRight: 8 }} />Quick Filters</span>
                <button onClick={resetAll} style={F.btnReset}><i className="fas fa-redo" /> Reset</button>
            </div>
            <div className="left-panel-scroll" style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                    <div style={F.label}>REGION</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                        <button onClick={() => toggleRegion('all')} style={{ ...F.chip, gridColumn: '1/-1', ...(regions.includes('all') ? F.chipActive : {}) }}>All Region</button>
                        {REG_LIST.map(r => <button key={r} onClick={() => toggleRegion(r)} style={{ ...F.chip, ...(regions.includes(r) ? F.chipActive : {}) }}>{r.replace('REG', 'Region ')}</button>)}
                    </div>
                </div>
                <MultiSelect label="TICKET STATUS" options={filterOptions?.statuses ?? []} selected={ticketStatus} onChange={v => { setTicketStatus(v); apply({ ticket_status: v }); }} />
                <MultiSelect label="NOP" options={filterOptions?.nops ?? []} selected={nop} onChange={v => { setNop(v); apply({ nop: v }); }} />
                <MultiSelect label="TICKET BATCH" options={filterOptions?.batches ?? []} selected={ticketBatch} onChange={v => { setTicketBatch(v); apply({ ticket_batch: v }); }} />
                <div>
                    <div style={F.label}>SEARCH TICKET / SITE</div>
                    <div style={{ position: 'relative' }}>
                        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && apply()} placeholder="Cari..." style={{ ...F.input, paddingRight: 28 }} />
                        {search && <button onClick={() => { setSearch(''); apply({ search: '' }); }} style={F.clearBtn}><i className="fas fa-times" /></button>}
                    </div>
                </div>
                <button onClick={() => apply()} style={F.btnApply}><i className="fas fa-search" /> Terapkan Filter</button>
                <div style={{ fontSize: '.72rem', color: '#6e7681' }}>Setelah ganti filter, klik <strong>Load Map</strong> lagi di kanan atas buat refresh titik peta.</div>
            </div>
        </div>
    );
}

function MultiSelect({ label, options, selected, onChange }) {
    if (!options.length) return null;
    return (
        <div>
            <div style={F.label}>{label}</div>
            <select multiple value={selected} onChange={e => onChange(Array.from(e.target.selectedOptions, o => o.value))} style={{ ...F.input, height: 90 }}>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
}

const S = {
    toolbar: { padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a3140', flexShrink: 0, flexWrap: 'wrap', gap: 10 },
    title: { fontSize: '1.1rem', fontWeight: 700, color: '#e6edf3', display: 'flex', alignItems: 'center' },
    btn: (color) => ({ padding: '8px 14px', background: 'transparent', border: `1px solid ${color}`, borderRadius: 7, color, fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }),
    modeSwitch: { display: 'flex', background: '#1c2029', borderRadius: 8, padding: 3, border: '1px solid #2a3140' },
    modeBtn: { padding: '6px 14px', background: 'transparent', border: 'none', borderRadius: 6, color: '#8b949e', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer' },
    modeBtnActive: { background: '#00b4d8', color: '#0a0e14' },
    legend: { display: 'flex', gap: 12, padding: '8px 20px', borderBottom: '1px solid #2a3140', flexWrap: 'wrap' },
    legendItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: '.75rem', color: '#e6edf3' },
    legendDot: { width: 10, height: 10, borderRadius: '50%', display: 'inline-block' },
    emptyState: {
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: '#8b949e', textAlign: 'center', padding: 40, maxWidth: 480, margin: '0 auto',
    },
};
const F = {
    header: { padding: '12px 16px', borderBottom: '1px solid #2a3140', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 },
    btnReset: { background: 'none', border: '1px solid #2a3140', borderRadius: 6, color: '#e6edf3', fontSize: '.75rem', padding: '4px 10px', cursor: 'pointer' },
    label: { fontSize: '.68rem', fontWeight: 700, color: '#6e7681', letterSpacing: '.6px', marginBottom: 6, textTransform: 'uppercase' },
    chip: { padding: '7px 4px', borderRadius: 6, fontSize: '.75rem', fontWeight: 600, cursor: 'pointer', textAlign: 'center', background: 'rgba(255,255,255,.04)', color: '#8b949e', border: '1px solid #2a3140' },
    chipActive: { background: '#00b4d8', color: '#fff', border: '1px solid #00b4d8' },
    input: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', background: '#1c2029', border: '1px solid #2a3140', borderRadius: 7, color: '#e6edf3', fontSize: '.82rem', outline: 'none' },
    clearBtn: { position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '.75rem' },
    btnApply: { padding: '10px 0', background: 'linear-gradient(135deg,#00b4d8,#0096c7)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: '.85rem', cursor: 'pointer' },
};
