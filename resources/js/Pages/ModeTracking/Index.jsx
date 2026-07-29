import { useState, useEffect, useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import 'leaflet/dist/leaflet.css';

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content ?? '';

export default function ModeTrackingIndex() {
    const { settings, auth } = usePage().props;
    const isAdmin = ['super_admin', 'admin'].includes(auth?.user?.role);
    const [positions, setPositions] = useState([]);
    const [plannedSites, setPlannedSites] = useState([]);
    const [settingOpen, setSettingOpen] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(null);

    const mapRef = useRef(null);
    const leafletMapRef = useRef(null);
    const teamLayerRef = useRef(null);
    const siteLayerRef = useRef(null);
    const LRef = useRef(null);

    const refresh = async () => {
        const [posRes, siteRes] = await Promise.all([
            fetch(route('tracking.positions')).then(r => r.json()),
            fetch(route('tracking.planned-sites')).then(r => r.json()),
        ]);
        setPositions(posRes.data ?? []);
        setPlannedSites(siteRes.data ?? []);
        setLastRefresh(new Date());
    };

    // Polling tiap 15 detik -- radar "live".
    useEffect(() => {
        refresh();
        const t = setInterval(refresh, 15000);
        return () => clearInterval(t);
    }, []);

    // Init peta + gambar ulang marker tiap kali data berubah.
    useEffect(() => {
        if (!mapRef.current) return;
        (async () => {
            const L = LRef.current ?? (LRef.current = (await import('leaflet')).default);
            if (!leafletMapRef.current) {
                leafletMapRef.current = L.map(mapRef.current).setView([-2.5, 118], 5);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors',
                }).addTo(leafletMapRef.current);
                teamLayerRef.current = L.layerGroup().addTo(leafletMapRef.current);
                siteLayerRef.current = L.layerGroup().addTo(leafletMapRef.current);
            }

            teamLayerRef.current.clearLayers();
            siteLayerRef.current.clearLayers();

            siteLayerRef.current.eachLayer(() => {});
            plannedSites.forEach((s) => {
                if (!s.latitude || !s.longitude) return;
                L.circleMarker([s.latitude, s.longitude], {
                    radius: 5, color: '#8b949e', fillColor: '#8b949e', fillOpacity: 0.5, weight: 1,
                }).bindPopup(`<b>${s.site_id ?? '-'}</b> — ${s.site_name ?? '-'}<br/>PIC: ${s.pic_team ?? '-'}<br/>Status: ${s.task_status}`)
                  .addTo(siteLayerRef.current);
            });

            positions.forEach((p) => {
                const marker = L.circleMarker([p.latitude, p.longitude], {
                    radius: 9, color: '#06d6a0', fillColor: '#06d6a0', fillOpacity: 0.9, weight: 2,
                }).bindPopup(`<b>${p.full_name}</b> (${p.username})<br/>Update: ${new Date(p.recorded_at).toLocaleString('id-ID')}`);
                marker.addTo(teamLayerRef.current);
            });
        })();
    }, [positions, plannedSites]);

    return (
        <AppLayout activeSubmenu="mode_tracking">
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <div style={S.toolbar}>
                    <h2 style={S.title}><i className="fas fa-satellite-dish" style={{ color: '#00b4d8', marginRight: 10 }} /> Mode Tracking</h2>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '.78rem', color: '#8b949e' }}>
                            <i className="fas fa-users" style={{ color: '#06d6a0', marginRight: 4 }} /> {positions.length} online
                            {lastRefresh && <> · refresh {lastRefresh.toLocaleTimeString('id-ID')}</>}
                        </span>
                        <span style={{
                            ...S.badge,
                            background: settings?.gps_paused ? 'rgba(255,107,107,.15)' : 'rgba(6,214,160,.15)',
                            color: settings?.gps_paused ? '#ff6b6b' : '#06d6a0',
                        }}>
                            <i className={`fas ${settings?.gps_paused ? 'fa-pause' : 'fa-play'}`} />
                            {settings?.gps_paused ? ' GPS Paused' : ' GPS Aktif'} ({settings?.gps_schedule_start}–{settings?.gps_schedule_end})
                        </span>
                        {isAdmin && (
                            <button onClick={() => setSettingOpen(true)} style={S.btn}><i className="fas fa-cog" /> Setting Interval GPS</button>
                        )}
                        <button onClick={refresh} style={S.btn}><i className="fas fa-sync" /> Refresh</button>
                    </div>
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                    <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
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
    toolbar: { padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a3140', flexShrink: 0, flexWrap: 'wrap', gap: 10 },
    title: { fontSize: '1.1rem', fontWeight: 700, color: '#e6edf3', display: 'flex', alignItems: 'center' },
    btn: { padding: '7px 14px', background: 'transparent', border: '1px solid #2a3140', borderRadius: 7, color: '#e6edf3', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
    badge: { padding: '4px 12px', borderRadius: 20, fontSize: '.75rem', fontWeight: 700 },
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
