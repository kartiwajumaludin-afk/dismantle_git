import { useState, useRef, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import 'leaflet/dist/leaflet.css';

const ALL_REGS = ['REG01', 'REG02', 'REG03', 'REG04', 'REG05', 'REG06', 'REG07', 'REG08', 'REG09', 'REG10', 'REG11', 'REG12'];
const ALL_PRIORITIES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];

const PRIORITY_COLORS = {
    P1: '#0000FF', P2: '#FFFF00', P3: '#00FF00', P4: '#FF00FF',
    P5: '#00FFFF', P6: '#8000FF', P7: '#FF0000', P8: '#FF6600',
};
const NOP_PALETTE = ['#00b4d8', '#06d6a0', '#ffd43b', '#f72585', '#9d4edd', '#f97316', '#4ade80', '#38bdf8'];

const BASEMAPS = {
    satellite: { label: 'Satelit', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri' },
    topo:      { label: 'Topografi', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenTopoMap contributors' },
    osm:       { label: 'OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors' },
};

export default function SiteMapIndex() {
    const { count, filterOptions, auth } = usePage().props;
    const [mode, setMode] = useState('nop');
    const [sites, setSites] = useState(null);
    const [loadingMap, setLoadingMap] = useState(false);
    const [busy, setBusy] = useState(false);
    const [showLabel, setShowLabel] = useState(true);
    const [showAssetPos, setShowAssetPos] = useState(true);
    const [dropPinMode, setDropPinMode] = useState(false);
    const [priorityFilter, setPriorityFilter] = useState(ALL_PRIORITIES);
    const [priorityOpen, setPriorityOpen] = useState(false);
    const [basemap, setBasemap] = useState('satellite');
    const [filterSummary, setFilterSummary] = useState({ region: '—', nop: '—' });

    const mapRef = useRef(null);
    const leafletMapRef = useRef(null);
    const tileLayerRef = useRef(null);
    const markersLayerRef = useRef(null);
    const dropPinLayerRef = useRef(null);
    const myLocLayerRef = useRef(null);
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
        setFilterSummary({
            region: params.regions ? params.regions.split(',').map(r => r.replace('REG', 'Region ')).join(', ') : 'All Region',
            nop: params.nop ? params.nop.split(',').join(', ') : 'All NOP',
        });
        setLoadingMap(false);
    };

    const ensureMap = async () => {
        const L = LRef.current ?? (LRef.current = (await import('leaflet')).default);
        if (!leafletMapRef.current) {
            leafletMapRef.current = L.map(mapRef.current).setView([-2.5, 118], 5);
            tileLayerRef.current = L.tileLayer(BASEMAPS[basemap].url, { attribution: BASEMAPS[basemap].attribution }).addTo(leafletMapRef.current);
            markersLayerRef.current = L.layerGroup().addTo(leafletMapRef.current);
            dropPinLayerRef.current = L.layerGroup().addTo(leafletMapRef.current);
            myLocLayerRef.current = L.layerGroup().addTo(leafletMapRef.current);
        }
        return L;
    };

    // Ganti basemap tanpa reset marker.
    useEffect(() => {
        (async () => {
            if (!mapRef.current) return;
            await ensureMap();
            if (tileLayerRef.current) leafletMapRef.current.removeLayer(tileLayerRef.current);
            const L = LRef.current;
            tileLayerRef.current = L.tileLayer(BASEMAPS[basemap].url, { attribution: BASEMAPS[basemap].attribution }).addTo(leafletMapRef.current);
            tileLayerRef.current.bringToBack();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [basemap]);

    // Drop Pin mode: klik di peta buat naro pin sementara + tampilin koordinat.
    useEffect(() => {
        if (!leafletMapRef.current) return;
        const map = leafletMapRef.current;
        const handler = (e) => {
            const L = LRef.current;
            dropPinLayerRef.current.clearLayers();
            L.marker(e.latlng, { title: 'Drop Pin' })
                .bindPopup(`Lat: ${e.latlng.lat.toFixed(6)}<br/>Lng: ${e.latlng.lng.toFixed(6)}`)
                .addTo(dropPinLayerRef.current).openPopup();
        };
        if (dropPinMode) map.on('click', handler);
        return () => map.off('click', handler);
    }, [dropPinMode]);

    const goToMyLocation = () => {
        if (!navigator.geolocation) return alert('Browser tidak mendukung geolocation.');
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const L = await ensureMap();
            const { latitude, longitude } = pos.coords;
            myLocLayerRef.current.clearLayers();
            L.circleMarker([latitude, longitude], { radius: 8, color: '#00b4d8', fillColor: '#00b4d8', fillOpacity: 0.9, weight: 2 })
                .bindPopup('Lokasi Anda').addTo(myLocLayerRef.current);
            leafletMapRef.current.setView([latitude, longitude], 13);
        }, () => alert('Gagal ambil lokasi. Pastikan izin GPS diizinkan.'));
    };

    // Gambar ulang marker tiap kali data/mode/filter/toggle berubah.
    useEffect(() => {
        if (sites === null || !mapRef.current) return;
        (async () => {
            await ensureMap();
            const L = LRef.current;
            markersLayerRef.current.clearLayers();
            const nopColorMap = {};
            let nopIdx = 0;
            const bounds = [];

            sites.filter(s => priorityFilter.includes(s.priority) || !s.priority).forEach((s) => {
                if (!s.latitude || !s.longitude) return;
                let color;
                if (mode === 'priority') {
                    color = PRIORITY_COLORS[s.priority] ?? '#8b949e';
                } else {
                    if (!(s.nop in nopColorMap)) { nopColorMap[s.nop] = NOP_PALETTE[nopIdx % NOP_PALETTE.length]; nopIdx++; }
                    color = nopColorMap[s.nop];
                }
                const marker = L.circleMarker([s.latitude, s.longitude], {
                    radius: 6, color, fillColor: color, fillOpacity: 0.85, weight: 1,
                }).bindPopup(`
                    <b>${s.site_id ?? '-'}</b> — ${s.site_name ?? '-'}<br/>
                    Ticket: ${s.ticket_number}<br/>NOP: ${s.nop ?? '-'}<br/>
                    Status: ${s.ticket_status_name ?? '-'}<br/>Priority: ${s.priority ?? '-'}
                    ${showAssetPos ? `<br/>Asset: ${s.asset_position ?? '-'}` : ''}
                `);
                if (showLabel) {
                    marker.bindTooltip(s.site_id ?? s.ticket_number, { permanent: true, direction: 'bottom', className: 'site-map-label' });
                }
                markersLayerRef.current.addLayer(marker);
                bounds.push([s.latitude, s.longitude]);
            });

            if (bounds.length) leafletMapRef.current.fitBounds(bounds, { maxZoom: 12 });
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sites, mode, showLabel, showAssetPos, priorityFilter]);

    return (
        <AppLayout activeSubmenu="site_map" leftPanel={<LeftPanel filterOptions={filterOptions} auth={auth} />}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <div style={S.toolbar}>
                    <button disabled={loadingMap} onClick={loadMap} style={S.btn('#00b4d8', loadingMap)}>
                        <i className={`fas ${loadingMap ? 'fa-spinner fa-spin' : 'fa-location-arrow'}`} /> Load Map
                    </button>
                    <button disabled={busy} onClick={doPopulate} style={S.btn('#f97316')}><i className="fas fa-sync" /> Populate</button>
                    <button onClick={() => setMode('nop')} style={S.btn(mode === 'nop' ? '#00b4d8' : '#2a3140', false, mode === 'nop')}><i className="fas fa-globe" /> Mode NOP</button>
                    <button onClick={() => setMode('priority')} style={S.btn(mode === 'priority' ? '#00b4d8' : '#2a3140', false, mode === 'priority')}><i className="fas fa-chart-bar" /> Mode P1–P7</button>
                    <label style={S.checkLabel}><input type="checkbox" checked={showLabel} onChange={e => setShowLabel(e.target.checked)} /> Label</label>
                    <label style={S.checkLabel}><input type="checkbox" checked={showAssetPos} onChange={e => setShowAssetPos(e.target.checked)} /> Asset Pos</label>
                    <button onClick={() => setDropPinMode(!dropPinMode)} style={S.btn(dropPinMode ? '#ffd43b' : '#2a3140', false, dropPinMode)}><i className="fas fa-map-pin" /> Drop Pin</button>
                    <button onClick={goToMyLocation} style={S.btn('#2a3140')}><i className="fas fa-crosshairs" /> My Location</button>
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setPriorityOpen(!priorityOpen)} style={S.btn('#2a3140')}>
                            <i className="fas fa-filter" /> {priorityFilter.length === 8 ? 'All Priority' : `${priorityFilter.length} Priority`} <i className="fas fa-chevron-down" style={{ fontSize: '.6rem' }} />
                        </button>
                        {priorityOpen && (
                            <div style={S.dropdown}>
                                {ALL_PRIORITIES.map(p => (
                                    <label key={p} style={S.dropdownItem}>
                                        <input type="checkbox" checked={priorityFilter.includes(p)}
                                            onChange={() => setPriorityFilter(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} />
                                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: PRIORITY_COLORS[p], display: 'inline-block' }} /> {p}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={S.infoBar}>
                    <span><i className="fas fa-map-marker-alt" /> Sites: <strong>{sites?.length ?? '—'}</strong></span>
                    <span>Region: {filterSummary.region}</span>
                    <span>NOP: {filterSummary.nop}</span>
                </div>

                <div style={{ flex: 1, position: 'relative' }}>
                    {sites === null && (
                        <div style={S.emptyState}>
                            <i className="fas fa-map-marked-alt" style={{ fontSize: '2rem', color: '#3a4255', marginBottom: 10 }} />
                            <div>Data belum dimuat.<br />Klik <strong>Load Map</strong> untuk menampilkan site.</div>
                            <button onClick={loadMap} style={{ ...S.btn('#00b4d8'), marginTop: 14 }}>Load Map</button>
                        </div>
                    )}
                    <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

                    {/* Basemap switcher */}
                    <div style={S.basemapBox}>
                        {Object.entries(BASEMAPS).map(([key, b]) => (
                            <label key={key} style={S.basemapItem}>
                                <input type="radio" name="basemap" checked={basemap === key} onChange={() => setBasemap(key)} /> {b.label}
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

/* ─── LEFT PANEL: QUICK FILTERS (standar 350px) ─────────────────────
   REGION: WAJIB persis sama di semua modul (grid 3 kolom, "All Region"
   + "Region 01".."Region 12" zero-padded, apply langsung pas diklik,
   TANPA tombol submit terpisah) -- JANGAN diubah/disesuaikan per modul.
   Filter lain (Ticket Status/Batch/Sub Type/NOP/Search) BOLEH disesuaikan
   sesuai kebutuhan modul. ─────────────────────────────────────────── */
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
                    <div style={F.grid3}>
                        <button onClick={() => toggleRegion('all')} style={{ ...F.chip, gridColumn: '1/-1', ...(regions.includes('all') ? F.chipActive : {}) }}>All Region</button>
                        {REG_LIST.map(r => (
                            <button key={r} onClick={() => toggleRegion(r)} style={{ ...F.chip, ...(regions.includes(r) ? F.chipActive : {}) }}>{r.replace('REG', 'Region ')}</button>
                        ))}
                    </div>
                </div>
                <MultiSelect label="TICKET STATUS" options={filterOptions?.statuses ?? []} selected={ticketStatus} onChange={v => { setTicketStatus(v); apply({ ticket_status: v }); }} />
                <MultiSelect label="TICKET BATCH" options={filterOptions?.batches ?? []} selected={ticketBatch} onChange={v => { setTicketBatch(v); apply({ ticket_batch: v }); }} />
                <MultiSelect label="NOP" options={filterOptions?.nops ?? []} selected={nop} onChange={v => { setNop(v); apply({ nop: v }); }} />
                <div>
                    <div style={F.label}>SEARCH SITE</div>
                    <div style={{ position: 'relative' }}>
                        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && apply()} placeholder="Site ID, name, ticket..." style={{ ...F.input, paddingRight: 28 }} />
                        {search && <button onClick={() => { setSearch(''); apply({ search: '' }); }} style={F.clearBtn}><i className="fas fa-times" /></button>}
                    </div>
                </div>
                <button onClick={() => apply()} style={F.btnApply}><i className="fas fa-search" /> Terapkan Filter</button>
            </div>
        </div>
    );
}

function MultiSelect({ label, options, selected, onChange, placeholder }) {
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
    toolbar: { padding: '10px 20px', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid #2a3140', flexShrink: 0, flexWrap: 'wrap' },
    btn: (color, loading, active) => ({
        padding: '6px 12px', background: active ? color : 'transparent', border: `1px solid ${color}`,
        borderRadius: 7, color: active ? '#0a0e14' : color, fontSize: '.76rem', fontWeight: 700,
        cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
    }),
    checkLabel: { display: 'flex', alignItems: 'center', gap: 5, fontSize: '.76rem', color: '#e6edf3', whiteSpace: 'nowrap' },
    dropdown: {
        position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 9999, background: '#1c2029',
        border: '1px solid #2a3140', borderRadius: 8, padding: 6, minWidth: 120, boxShadow: '0 8px 24px rgba(0,0,0,.5)',
    },
    dropdownItem: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', fontSize: '.78rem', color: '#e6edf3', cursor: 'pointer' },
    infoBar: { display: 'flex', gap: 16, padding: '6px 20px', fontSize: '.72rem', color: '#6e7681', borderBottom: '1px solid #2a3140', flexShrink: 0 },
    emptyState: {
        position: 'absolute', inset: 0, zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: '#8b949e', textAlign: 'center', padding: 40, background: 'rgba(10,14,20,.85)',
    },
    basemapBox: {
        position: 'absolute', top: 12, right: 12, zIndex: 500, background: '#1c2029', border: '1px solid #2a3140',
        borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: '.78rem', color: '#e6edf3',
    },
    basemapItem: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
};
const F = {
    header: { padding: '12px 16px', borderBottom: '1px solid #2a3140', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 },
    btnReset: { background: 'none', border: '1px solid #2a3140', borderRadius: 6, color: '#e6edf3', fontSize: '.75rem', padding: '4px 10px', cursor: 'pointer' },
    label: { fontSize: '.68rem', fontWeight: 700, color: '#6e7681', letterSpacing: '.6px', marginBottom: 6, textTransform: 'uppercase' },
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 },
    chip: { padding: '7px 4px', borderRadius: 6, fontSize: '.75rem', fontWeight: 600, cursor: 'pointer', textAlign: 'center', background: 'rgba(255,255,255,.04)', color: '#8b949e', border: '1px solid #2a3140' },
    chipActive: { background: '#00b4d8', color: '#fff', border: '1px solid #00b4d8' },
    input: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', background: '#1c2029', border: '1px solid #2a3140', borderRadius: 7, color: '#e6edf3', fontSize: '.82rem', outline: 'none' },
    clearBtn: { position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '.75rem' },
    btnApply: { padding: '10px 0', background: 'linear-gradient(135deg,#00b4d8,#0096c7)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: '.85rem', cursor: 'pointer' },
};
