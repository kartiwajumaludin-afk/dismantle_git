import { useState, useEffect, useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import 'leaflet/dist/leaflet.css';

const BASEMAPS = {
    satellite: { label: 'Satelit', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri' },
    topo:      { label: 'Topografi', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenTopoMap contributors' },
    osm:       { label: 'OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors' },
};
const TEAM_COLOR = '#2563eb';   // Posisi Tim -- biru
const TARGET_COLOR = '#f97316'; // Target Plan -- oranye

export default function ModeTrackingIndex() {
    const { settings, auth } = usePage().props;
    const isAdmin = ['super_admin', 'admin'].includes(auth?.user?.role);
    const [positions, setPositions] = useState([]);
    const [plannedSites, setPlannedSites] = useState(null); // null = belum di-load
    const [settingOpen, setSettingOpen] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [basemap, setBasemap] = useState('satellite');

    const mapRef = useRef(null);
    const leafletMapRef = useRef(null);
    const tileLayerRef = useRef(null);
    const teamLayerRef = useRef(null);
    const siteLayerRef = useRef(null);
    const LRef = useRef(null);

    const makeBadgeIcon = (L, color, icon = 'fa-car') => L.divIcon({
        className: '',
        html: `<div style="width:30px;height:30px;border-radius:50%;background:#141821;border:2px solid ${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.5);">
                 <i class="fas ${icon}" style="color:${color};font-size:13px;"></i>
               </div>`,
        iconSize: [30, 30], iconAnchor: [15, 15],
    });

    const refreshPositions = async () => {
        const res = await fetch(route('tracking.positions'));
        const json = await res.json();
        setPositions(json.data ?? []);
        setLastRefresh(new Date());
    };

    const loadPlanTarget = async () => {
        const res = await fetch(route('tracking.planned-sites'));
        const json = await res.json();
        setPlannedSites(json.data ?? []);
    };

    // Polling posisi tim tiap 15 detik -- radar "live". Target Plan HARUS
    // diklik manual (tombol "Load Plan Target"), nggak auto-fetch.
    useEffect(() => {
        refreshPositions();
        const t = setInterval(refreshPositions, 15000);
        return () => clearInterval(t);
    }, []);

    const ensureMap = async () => {
        const L = LRef.current ?? (LRef.current = (await import('leaflet')).default);
        if (!leafletMapRef.current) {
            leafletMapRef.current = L.map(mapRef.current).setView([-2.5, 118], 5);
            tileLayerRef.current = L.tileLayer(BASEMAPS[basemap].url, { attribution: BASEMAPS[basemap].attribution }).addTo(leafletMapRef.current);
            teamLayerRef.current = L.layerGroup().addTo(leafletMapRef.current);
            siteLayerRef.current = L.layerGroup().addTo(leafletMapRef.current);
        }
        return L;
    };

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

    useEffect(() => {
        if (!mapRef.current) return;
        (async () => {
            const L = await ensureMap();
            teamLayerRef.current.clearLayers();
            positions.forEach((p) => {
                L.marker([p.latitude, p.longitude], { icon: makeBadgeIcon(L, TEAM_COLOR, 'fa-car') })
                    .bindTooltip(p.full_name, { permanent: true, direction: 'bottom', className: 'tracking-label' })
                    .bindPopup(`<b>${p.full_name}</b> (${p.username})<br/>Update: ${new Date(p.recorded_at).toLocaleString('id-ID')}`)
                    .addTo(teamLayerRef.current);
            });
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [positions]);

    useEffect(() => {
        if (!mapRef.current || plannedSites === null) return;
        (async () => {
            const L = await ensureMap();
            siteLayerRef.current.clearLayers();
            plannedSites.forEach((s) => {
                if (!s.latitude || !s.longitude) return;
                L.marker([s.latitude, s.longitude], { icon: makeBadgeIcon(L, TARGET_COLOR, 'fa-map-pin') })
                    .bindTooltip(s.site_id ?? s.ticket_number, { permanent: true, direction: 'bottom', className: 'tracking-label' })
                    .bindPopup(`<b>${s.site_id ?? '-'}</b> — ${s.site_name ?? '-'}<br/>PIC: ${s.pic_team ?? '-'}<br/>Status: ${s.task_status}`)
                    .addTo(siteLayerRef.current);
            });
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plannedSites]);

    return (
        <AppLayout activeSubmenu="mode_tracking">
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <div style={S.toolbar}>
                    <span style={S.titleTag}><i className="fas fa-satellite-dish" /> Mode Tracking</span>
                    <span style={S.pill}><i className="fas fa-car" /> {positions.length} tim aktif</span>
                    <button onClick={loadPlanTarget} style={S.btn('#00b4d8')}><i className="fas fa-map-pin" /> Load Plan Target</button>
                    {lastRefresh && (
                        <span style={{ fontSize: '.75rem', color: '#6e7681' }}>
                            <i className="fas fa-sync" /> Posisi tim update: {lastRefresh.toLocaleTimeString('id-ID')}
                        </span>
                    )}
                    <span style={{
                        ...S.badge,
                        background: settings?.gps_paused ? 'rgba(255,107,107,.15)' : 'rgba(6,214,160,.15)',
                        color: settings?.gps_paused ? '#ff6b6b' : '#06d6a0',
                    }}>
                        <i className={`fas ${settings?.gps_paused ? 'fa-pause' : 'fa-play'}`} />
                        {settings?.gps_paused ? ' GPS Paused' : ' GPS Aktif'} ({settings?.gps_schedule_start}–{settings?.gps_schedule_end})
                    </span>
                    <div style={{ marginLeft: 'auto' }}>
                        {isAdmin && (
                            <button onClick={() => setSettingOpen(true)} style={S.btn('#9d4edd')}><i className="fas fa-cog" /> Setting Interval</button>
                        )}
                    </div>
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                    <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

                    <div style={S.basemapBox}>
                        {Object.entries(BASEMAPS).map(([key, b]) => (
                            <label key={key} style={S.basemapItem}>
                                <input type="radio" name="basemap" checked={basemap === key} onChange={() => setBasemap(key)} /> {b.label}
                            </label>
                        ))}
                    </div>

                    <div style={S.legendBox}>
                        <span style={S.legendItem}><span style={{ ...S.legendDot, background: TEAM_COLOR }} /> Posisi Tim</span>
                        <span style={S.legendItem}><span style={{ ...S.legendDot, background: TARGET_COLOR }} /> Target Plan</span>
                    </div>
                </div>
            </div>
            {settingOpen && <ScheduleModal settings={settings} onClose={() => setSettingOpen(false)} />}
        </AppLayout>
    );
}

function ScheduleModal({ settings, onClose }) {
    const [start, setStart] = useState(settings?.gps_schedule_start ?? '06:00');
    const [end, setEnd] = useState(settings?.gps_schedule_end ?? '18:00');
    const [saving, setSaving] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        setSaving(true);
        router.post(route('tracking.settings.update'), {
            gps_schedule_start: start, gps_schedule_end: end,
        }, { onFinish: () => { setSaving(false); onClose(); } });
    };

    return (
        <div style={M.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={M.box} className="animate-slide-in">
                <div style={M.header}>
                    <h3 style={{ color: '#e6edf3', fontSize: '1rem', fontWeight: 700 }}>Setting Interval GPS</h3>
                    <button onClick={onClose} style={M.close}><i className="fas fa-times" /></button>
                </div>
                <form onSubmit={submit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <p style={{ color: '#8b949e', fontSize: '.8rem', margin: 0 }}>
                        Jadwal ini berlaku global buat semua field team — di luar jam ini, GPS otomatis di-pause (privasi di luar jam kerja).
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: '.72rem', color: '#8b949e', fontWeight: 700, textTransform: 'uppercase' }}>Mulai</label>
                            <input type="time" value={start} onChange={e => setStart(e.target.value)} style={{ ...M.input, colorScheme: 'dark' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '.72rem', color: '#8b949e', fontWeight: 700, textTransform: 'uppercase' }}>Selesai</label>
                            <input type="time" value={end} onChange={e => setEnd(e.target.value)} style={{ ...M.input, colorScheme: 'dark' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button type="button" onClick={onClose} style={M.btnCancel}>Batal</button>
                        <button type="submit" disabled={saving} style={M.btnSave}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const S = {
    toolbar: { padding: '10px 20px', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', borderBottom: '1px solid #2a3140', flexShrink: 0, flexWrap: 'wrap', gap: 12 },
    titleTag: { color: '#00b4d8', fontWeight: 700, fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: 6 },
    pill: { fontSize: '.75rem', color: '#8b949e', display: 'flex', alignItems: 'center', gap: 6 },
    btn: (color) => ({ padding: '6px 14px', background: 'transparent', border: `1px solid ${color}`, borderRadius: 7, color, fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }),
    badge: { padding: '4px 12px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700 },
    basemapBox: {
        position: 'absolute', top: 12, right: 12, zIndex: 500, background: '#1c2029', border: '1px solid #2a3140',
        borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: '.78rem', color: '#e6edf3',
    },
    basemapItem: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
    legendBox: {
        position: 'absolute', bottom: 24, right: 12, zIndex: 500, background: 'rgba(20,24,33,.9)', border: '1px solid #2a3140',
        borderRadius: 8, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '.75rem', color: '#e6edf3',
    },
    legendItem: { display: 'flex', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: '50%', display: 'inline-block' },
};
const M = {
    overlay: { position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    box: { background: '#212631', borderRadius: 12, width: '100%', maxWidth: 420, border: '1px solid #2a3140' },
    header: { padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a3140' },
    close: { background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.1rem' },
    input: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', background: '#1c2029', border: '1px solid #2a3140', borderRadius: 7, color: '#e6edf3', fontSize: '.82rem', marginTop: 4 },
    btnCancel: { padding: '8px 16px', background: 'rgba(255,255,255,.06)', border: '1px solid #2a3140', borderRadius: 7, color: '#8b949e', cursor: 'pointer', fontSize: '.82rem' },
    btnSave: { padding: '8px 20px', background: 'linear-gradient(135deg,#00b4d8,#0096c7)', border: 'none', borderRadius: 7, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.82rem' },
};
