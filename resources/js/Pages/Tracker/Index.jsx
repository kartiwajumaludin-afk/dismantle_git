import { useState, useEffect, useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content ?? '';

// Kategori kolom tambahan (Asset/Site/Permit/Dismantle Info) disimpen di
// localStorage -- biar TETAP kepilih walau user ganti-ganti filter lain
// (region/status/dll), cuma ke-reset kalau dia sendiri yang unselect atau
// klik "Main".
const CATS_STORAGE_KEY = 'tracker_active_cats';

/* ── Badge helpers ── */
const B = {
    base: { padding: '3px 9px', borderRadius: '20px', fontSize: '.72rem', fontWeight: 600, whiteSpace: 'nowrap' },
    dash: { color: '#3a4255' },
    closed:    { background: 'rgba(6,214,160,.15)',  color: '#06d6a0' },
    cancelled: { background: 'rgba(255,107,107,.15)', color: '#ff6b6b' },
    waiting:   { background: 'rgba(255,212,59,.15)',  color: '#ffd43b' },
    done:      { background: 'rgba(0,180,216,.15)',   color: '#00b4d8' },
    pending:   { background: 'rgba(157,78,221,.15)',  color: '#9d4edd' },
    def:       { background: 'rgba(139,148,158,.12)', color: '#8b949e' },
};
const statusBadge = (s, kind = 'ticket') => {
    if (!s) return <span style={B.dash}>—</span>;
    let c = B.def;
    if (s.includes('Closed') || s.includes('Done') || s.includes('Full')) c = B.closed;
    else if (s.includes('Cancelled') || s.includes('Not Found')) c = B.cancelled;
    else if (s.includes('Waiting') || s.includes('Partial')) c = B.waiting;
    else if (s.includes('Pending') || s.includes('Active')) c = B.pending;
    return <span style={{ ...B.base, ...c }}>{s}</span>;
};
const priorityBadge = (s) => {
    if (!s) return <span style={B.dash}>—</span>;
    const MAP = {
        P1: { bg: 'rgba(247,37,133,.18)', color: '#f72585' }, P2: { bg: 'rgba(255,107,107,.18)', color: '#ff6b6b' },
        P3: { bg: 'rgba(255,212,59,.18)', color: '#ffd43b' }, P4: { bg: 'rgba(139,148,158,.12)', color: '#8b949e' },
        P5: { bg: 'rgba(157,78,221,.18)', color: '#9d4edd' }, P6: { bg: 'rgba(6,214,160,.18)', color: '#06d6a0' },
        P7: { bg: 'rgba(58,66,85,.3)', color: '#8b949e' }, P8: { bg: 'rgba(255,68,102,.2)', color: '#ff4466' },
    };
    const c = MAP[s] ?? MAP.P4;
    return <span style={{ ...B.base, background: c.bg, color: c.color }}>{s}</span>;
};

const CATS = {
    asset_info:     { label: 'Asset Info',    icon: 'fa-box',            color: '#06d6a0', cols: ['jumlah_asset', 'cat_asset', 'asset_position', 'percentage_asset_actual', 'plan_asset_dismantle', 'actual_asset_dismantle'] },
    site_info:      { label: 'Site Info',     icon: 'fa-map-marker-alt', color: '#f72585', cols: ['assignee_group', 'tp_company', 'latitude', 'longitude', 'caf_submit', 'caf_approved', 'caf_status'] },
    permit_info:    { label: 'Permit Info',   icon: 'fa-file-alt',       color: '#ffd43b', cols: ['working_permit_start_date', 'working_permit_end_date', 'working_permit_status_name', 'sik_number', 'start_permit_tp_date', 'end_permit_tp_date', 'status_permit_tp'] },
    dismantle_info: { label: 'Dismantle Info', icon: 'fa-tools',         color: '#9d4edd', cols: ['site_status', 'site_issue', 'category_issue', 'detail_issue', 'remark_dismantle', 'mom', 'cat_pending_approval', 'aging_pending_approval', 'submit_before', 'approve_before', 'dismantle', 'submit_after', 'approve_after', 'pcaa_approve', 'closed', 'approved_nop', 'avg_approved_nop', 'partner_company', 'plan_dismantle_date', 'plan_dismantle_week', 'pic_team', 'act_dismantle_week', 'plan_kom', 'actual_cost', 'asset_active', 'asset_not_found', 'asset_undefined'] },
};
const MAIN_COLS = ['ticket_number', 'site_id', 'site_name', 'ticket_status_name', 'regional', 'network_operation_and_productivity', 'teritory_operation', 'workable_status', 'general_status', 'asset_status', 'ticket_batch', 'ticket_sub_type_name', 'ticket_created_date', 'priority_site', 'intersection'];
const COL_LABEL = {
    ticket_number: 'Ticket #', site_id: 'Site ID', site_name: 'Site Name', ticket_status_name: 'Status',
    regional: 'Regional', network_operation_and_productivity: 'NOP', teritory_operation: 'TO',
    workable_status: 'Workable', general_status: 'General Status', asset_status: 'Asset Status',
    ticket_batch: 'Batch', ticket_sub_type_name: 'Sub Type', ticket_created_date: 'Created Date',
    priority_site: 'Priority', intersection: 'Intersection', jumlah_asset: 'Jumlah Asset',
    cat_asset: 'Cat Asset', asset_position: 'Asset Position', percentage_asset_actual: '% Actual',
    plan_asset_dismantle: 'Plan Dismantle', actual_asset_dismantle: 'Actual Dismantle',
    assignee_group: 'Assignee Group', tp_company: 'TP Company', latitude: 'Lat', longitude: 'Lng',
    caf_submit: 'CAF Submit', caf_approved: 'CAF Approved', caf_status: 'CAF Status',
    working_permit_start_date: 'WP Start', working_permit_end_date: 'WP End',
    working_permit_status_name: 'WP Status', sik_number: 'SIK #',
    start_permit_tp_date: 'Permit TP Start', end_permit_tp_date: 'Permit TP End', status_permit_tp: 'Status Permit TP',
    site_status: 'Site Status', site_issue: 'Site Issue', category_issue: 'Category Issue',
    detail_issue: 'Detail Issue', remark_dismantle: 'Remark', mom: 'MOM',
    cat_pending_approval: 'Cat Pending', aging_pending_approval: 'Aging',
    submit_before: 'Submit Before', approve_before: 'Approve Before',
    approved_nop: 'Approved NOP', avg_approved_nop: 'Avg Approved NOP', dismantle: 'Dismantle',
    submit_after: 'Submit After', approve_after: 'Approve After', pcaa_approve: 'PCAA Approve', closed: 'Closed',
    partner_company: 'Partner', plan_dismantle_date: 'Plan Date', plan_dismantle_week: 'Plan Week',
    pic_team: 'PIC Team', act_dismantle_week: 'Act Week', plan_kom: 'Actual Disposed', actual_cost: 'Actual Cost',
    asset_active: 'Asset Still Active', asset_not_found: 'Asset Not Found', asset_undefined: 'Asset Undefined',
};
const ALL_REGS = ['REG01', 'REG02', 'REG03', 'REG04', 'REG05', 'REG06', 'REG07', 'REG08', 'REG09', 'REG10', 'REG11', 'REG12'];

export default function TrackerIndex() {
    const { result, filterOptions, auth } = usePage().props;
    const canSeeCost = ['super_admin', 'admin', 'regional_manager'].includes(auth?.user?.role);
    const CAT_CFG = canSeeCost ? CATS : {
        ...CATS,
        dismantle_info: { ...CATS.dismantle_info, cols: CATS.dismantle_info.cols.filter(c => !['plan_kom', 'actual_cost'].includes(c)) },
    };
    // Baca kategori aktif dari localStorage saat pertama render, supaya
    // tetap kepilih walau halaman ini di-reload penuh (klik filter lain).
    const [activeCats, setActiveCats] = useState(() => {
        try {
            const saved = window.localStorage.getItem(CATS_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [sort, setSort] = useState('ticket_created_date');
    const [dir, setDir] = useState('desc');
    const [editRow, setEditRow] = useState(null);
    const activeCols = [...MAIN_COLS, ...activeCats.flatMap(c => CAT_CFG[c]?.cols ?? [])];

    const persistCats = (next) => {
        try { window.localStorage.setItem(CATS_STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    };
    const toggleCat = (cat) => setActiveCats(prev => {
        const next = prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat];
        persistCats(next);
        return next;
    });
    const goToMain = () => { setActiveCats([]); persistCats([]); };

    const doSort = (col) => {
        if (!MAIN_COLS.includes(col)) return;
        const newDir = sort === col && dir === 'asc' ? 'desc' : 'asc';
        setSort(col); setDir(newDir);
        router.get(route('tracker.index'), { ...Object.fromEntries(new URLSearchParams(window.location.search)), sort: col, dir: newDir }, { preserveState: true });
    };

    const doExport = () => {
        const params = new URLSearchParams(window.location.search);
        params.set('cats', activeCats.join(','));
        window.location.href = route('tracker.export') + '?' + params.toString();
    };

    return (
        <AppLayout activeSubmenu="tracker" leftPanel={<LeftPanel filterOptions={filterOptions} auth={auth} />}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <div style={S.catBar}>
                    <button onClick={goToMain} style={{ ...S.catBtn, ...S.mainBtn }}>
                        <i className="fas fa-home" /> Main
                    </button>
                    {Object.entries(CAT_CFG).map(([key, cat]) => (
                        <button key={key} onClick={() => toggleCat(key)} style={{
                            ...S.catBtn,
                            background: activeCats.includes(key) ? cat.color : 'transparent',
                            color: activeCats.includes(key) ? '#0a0e14' : cat.color,
                            borderColor: cat.color,
                        }}>
                            <i className={`fas ${cat.icon}`} /> {cat.label}
                        </button>
                    ))}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ color: '#e6edf3', fontSize: '.8rem' }}>Total: <strong>{result.total?.toLocaleString('id-ID')}</strong></span>
                        <button onClick={doExport} style={S.exportBtn}><i className="fas fa-file-export" /> Export CSV</button>
                    </div>
                </div>

                <div className="table-scroll" style={{ flex: 1, overflow: 'auto' }}>
                    <table style={S.table}>
                        <thead>
                            <tr style={S.thead}>
                                <th style={{ ...S.th, width: 36 }}>#</th>
                                {activeCols.map(col => {
                                    const catColor = Object.values(CAT_CFG).find(c => c.cols.includes(col))?.color;
                                    return (
                                        <th key={col} style={{ ...S.th, color: catColor ?? '#e6edf3', cursor: MAIN_COLS.includes(col) ? 'pointer' : 'default' }} onClick={() => doSort(col)}>
                                            {COL_LABEL[col] ?? col}
                                            {sort === col && <i className={`fas fa-sort-${dir === 'asc' ? 'up' : 'down'}`} style={{ marginLeft: 4, fontSize: '.65rem', color: '#00b4d8' }} />}
                                        </th>
                                    );
                                })}
                                <th style={S.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(result.data ?? []).length === 0 && (
                                <tr><td colSpan={activeCols.length + 2} style={S.emptyCell}>Belum ada data. Import CSV dulu lalu jalankan Master Business Engine.</td></tr>
                            )}
                            {result.data?.map((row, idx) => (
                                <tr key={row.id ?? idx} style={S.tr}>
                                    <td style={{ ...S.td, color: '#6e7681', fontSize: '.75rem' }}>{(result.from ?? 0) + idx}</td>
                                    {activeCols.map(col => {
                                        const val = row[col];
                                        const content = col === 'ticket_status_name' || col === 'workable_status' || col === 'general_status' || col === 'asset_status'
                                            ? statusBadge(val)
                                            : col === 'priority_site' ? priorityBadge(val)
                                            : col === 'intersection' && val ? <span style={{ ...B.base, background: 'rgba(0,180,216,.15)', color: '#00b4d8' }}>{val}</span>
                                            : col === 'ticket_number' ? <span style={{ color: '#00b4d8', fontWeight: 600 }}>{val}</span>
                                            : (val ?? <span style={{ color: '#3a4255' }}>—</span>);
                                        return (
                                            <td key={col} style={{ ...S.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={typeof val === 'string' ? val : undefined}>
                                                {content}
                                            </td>
                                        );
                                    })}
                                    <td style={S.td}>
                                        <button onClick={() => setEditRow(row)} style={S.actEdit} title="Edit Manual">
                                            <i className="fas fa-edit" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination result={result} />
            </div>
            {editRow && <EditModal row={editRow} onClose={() => setEditRow(null)} canSeeCost={canSeeCost} />}
        </AppLayout>
    );
}

/* ─── LEFT PANEL: QUICK FILTERS ─── */
function LeftPanel({ filterOptions, auth }) {
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    const [regions, setRegions] = useState(params.regions ? params.regions.split(',') : ['all']);
    const [search, setSearch] = useState(params.search ?? '');
    const [startDate, setStartDate] = useState(params.start_date ?? '');
    const [endDate, setEndDate] = useState(params.end_date ?? '');
    const [filters, setFilters] = useState({
        ticket_status: params.ticket_status ? params.ticket_status.split(',') : [],
        ticket_batch: params.ticket_batch ? params.ticket_batch.split(',') : [],
        ticket_sub_type: params.ticket_sub_type ? params.ticket_sub_type.split(',') : [],
        nop: params.nop ? params.nop.split(',') : [],
    });

    const userRegCodes = auth?.user?.regions?.map(r => r.code) ?? [];
    const isSuperAdmin = auth?.user?.role === 'super_admin';
    const REG_LIST = isSuperAdmin || userRegCodes.length === 0 ? ALL_REGS : ALL_REGS.filter(r => userRegCodes.includes(r));

    const buildQuery = (overrides = {}) => {
        const base = { regions, ...filters, start_date: startDate, end_date: endDate, search, ...overrides };
        const q = {};
        if (base.regions && !base.regions.includes('all') && base.regions.length) q.regions = base.regions.join(',');
        ['ticket_status', 'ticket_batch', 'ticket_sub_type', 'nop'].forEach(k => { if (base[k]?.length) q[k] = base[k].join(','); });
        if (base.start_date) q.start_date = base.start_date;
        if (base.end_date) q.end_date = base.end_date;
        if (base.search?.trim()) q.search = base.search.trim();
        return q;
    };
    const applyFilters = (overrides = {}) => router.get(route('tracker.index'), buildQuery(overrides), { preserveState: false });
    const resetAll = () => {
        setRegions(['all']); setFilters({ ticket_status: [], ticket_batch: [], ticket_sub_type: [], nop: [] });
        setSearch(''); setStartDate(''); setEndDate('');
        router.get(route('tracker.index'), {});
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
        applyFilters({ regions: next });
    };
    const setMulti = (key, vals) => {
        setFilters(prev => ({ ...prev, [key]: vals }));
        applyFilters({ [key]: vals });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={F.header}>
                <span style={{ color: '#e6edf3', fontWeight: 700, fontSize: '.9rem' }}>
                    <i className="fas fa-filter" style={{ color: '#00b4d8', marginRight: 8 }} />Quick Filters
                </span>
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
                <div>
                    <div style={F.label}>TICKET STATUS</div>
                    <ExcelDropdown label="TICKET STATUS" options={filterOptions?.statuses ?? []} selected={filters.ticket_status} onChange={v => setMulti('ticket_status', v)} />
                </div>
                <div>
                    <div style={F.label}>TICKET BATCH</div>
                    <ExcelDropdown label="TICKET BATCH" options={filterOptions?.batches ?? []} selected={filters.ticket_batch} onChange={v => setMulti('ticket_batch', v)} />
                </div>
                <div>
                    <div style={F.label}>SUB TYPE</div>
                    <ExcelDropdown label="SUB TYPE" options={filterOptions?.subTypes ?? []} selected={filters.ticket_sub_type} onChange={v => setMulti('ticket_sub_type', v)} />
                </div>
                <div>
                    <div style={F.label}>NOP</div>
                    <ExcelDropdown label="NOP" options={filterOptions?.nops ?? []} selected={filters.nop} onChange={v => setMulti('nop', v)} />
                </div>
                <div>
                    <div style={F.label}>DATE RANGE (Created)</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...F.input, colorScheme: 'dark' }} />
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ ...F.input, colorScheme: 'dark' }} />
                    </div>
                </div>
                <div>
                    <div style={F.label}>SEARCH TICKET / SITE</div>
                    <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyFilters()} placeholder="Cari ticket, site, batch..." style={F.input} />
                </div>
                <button onClick={() => applyFilters()} style={F.btnApply}><i className="fas fa-search" /> Terapkan Filter</button>
            </div>
        </div>
    );
}

/* ─── EXCEL-STYLE DROPDOWN — search + checklist + Apply/Cancel ─── */
function ExcelDropdown({ label, options, selected, onChange }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [allChecked, setAllChecked] = useState(selected.length === 0);
    const [temp, setTemp] = useState(selected);
    const ref = useRef();

    useEffect(() => { setAllChecked(selected.length === 0); setTemp(selected); }, [selected.join(',')]);
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
    const isIndeter = !allChecked && temp.length > 0 && temp.length < options.length;

    const toggleAll = () => {
        if (allChecked) { setAllChecked(false); setTemp([]); }
        else { setAllChecked(true); setTemp([]); }
    };
    const toggleItem = (v) => {
        if (allChecked) {
            const next = options.filter(x => x !== v);
            setAllChecked(false); setTemp(next);
        } else {
            const next = temp.includes(v) ? temp.filter(x => x !== v) : [...temp, v];
            if (next.length === options.length) { setAllChecked(true); setTemp([]); }
            else { setAllChecked(false); setTemp(next); }
        }
    };
    const apply = () => { onChange(allChecked ? [] : temp); setOpen(false); setSearch(''); };
    const cancel = () => { setAllChecked(selected.length === 0); setTemp(selected); setOpen(false); setSearch(''); };
    const display = allChecked || (temp.length === 0 && !allChecked && selected.length === 0)
        ? `All ${label}` : temp.length === 0 && !allChecked ? 'None selected'
        : temp.length === 1 ? temp[0] : `${temp.length} dipilih`;
    const hasFilter = selected.length > 0;

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button onClick={() => setOpen(!open)} style={{
                ...F.input, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                color: hasFilter ? '#00b4d8' : '#e6edf3', borderColor: hasFilter ? '#00b4d8' : '#2a3140',
            }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>{display}</span>
                <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: '.65rem', color: '#6e7681', flexShrink: 0, marginLeft: 6 }} />
            </button>
            {open && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999, background: '#1c2029', border: '1px solid #2a3140', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column', maxHeight: 300 }}>
                    <div style={{ padding: 8, borderBottom: '1px solid #2a3140', flexShrink: 0 }}>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari..."
                               style={{ ...F.input, padding: '6px 10px', fontSize: '.8rem' }} autoFocus />
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        <label style={EX.item}>
                            <input type="checkbox" checked={allChecked}
                                   ref={el => { if (el) el.indeterminate = isIndeter; }}
                                   onChange={toggleAll} style={{ accentColor: '#00b4d8' }} />
                            <span style={{ color: '#e6edf3', fontWeight: 700 }}>All {label}</span>
                        </label>
                        <div style={{ height: 1, background: '#2a3140', margin: '2px 0' }} />
                        {filtered.map(opt => (
                            <label key={opt} style={EX.item}>
                                <input type="checkbox" checked={allChecked || temp.includes(opt)}
                                       onChange={() => toggleItem(opt)} style={{ accentColor: '#00b4d8' }} />
                                <span style={{ color: '#e6edf3' }}>{opt}</span>
                            </label>
                        ))}
                    </div>
                    <div style={{ padding: 8, borderTop: '1px solid #2a3140', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
                        <button onClick={cancel} style={EX.btnCancel}>Cancel</button>
                        <button onClick={apply} style={EX.btnApply}>Apply</button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── EDIT MODAL (Manual Update) ─── */
function EditModal({ row, onClose, canSeeCost }) {
    const [data, setData] = useState({
        tp_company: row.tp_company ?? '', latitude: row.latitude ?? '', longitude: row.longitude ?? '',
        caf_status: row.caf_status ?? '', caf_submit: row.caf_submit ?? '', caf_approved: row.caf_approved ?? '',
        start_permit_tp_date: row.start_permit_tp_date ?? '', end_permit_tp_date: row.end_permit_tp_date ?? '',
        status_permit_tp: row.status_permit_tp ?? '', ticket_batch: row.ticket_batch ?? '',
        site_status: row.site_status ?? '', site_issue: row.site_issue ?? '', category_issue: row.category_issue ?? '',
        detail_issue: row.detail_issue ?? '', remark_dismantle: row.remark_dismantle ?? '', mom: row.mom ?? '',
        partner_company: row.partner_company ?? '', plan_dismantle_date: row.plan_dismantle_date ?? '',
        pic_team: row.pic_team ?? '', act_dismantle_week: row.act_dismantle_week ?? '',
        plan_kom: row.plan_kom ?? '', actual_cost: row.actual_cost ?? '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setData(prev => ({ ...prev, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const res = await fetch(route('tracker.manual.store'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify({ ticket_number: row.ticket_number, ...data }),
            });
            const json = await res.json();
            if (json.success) {
                router.reload();
                onClose();
            } else {
                setError(json.message || 'Gagal menyimpan.');
            }
        } catch (err) {
            setError('Terjadi kesalahan koneksi.');
        } finally {
            setSaving(false);
        }
    };

    const fields = [
        ['tp_company', 'TP Company', 'text'], ['latitude', 'Latitude', 'number'], ['longitude', 'Longitude', 'number'],
        ['caf_status', 'CAF Status', 'text'], ['caf_submit', 'CAF Submit', 'text'], ['caf_approved', 'CAF Approved', 'text'],
        ['start_permit_tp_date', 'Permit TP Start', 'date'], ['end_permit_tp_date', 'Permit TP End', 'date'],
        ['status_permit_tp', 'Status Permit TP', 'text'], ['ticket_batch', 'Ticket Batch', 'text'],
        ['site_status', 'Site Status', 'text'], ['site_issue', 'Site Issue', 'text'], ['category_issue', 'Category Issue', 'text'],
        ['detail_issue', 'Detail Issue', 'text'], ['partner_company', 'Partner Company', 'text'],
        ['plan_dismantle_date', 'Plan Dismantle Date', 'date'], ['pic_team', 'PIC Team', 'text'],
        ['act_dismantle_week', 'Act Dismantle Week', 'text'],
        ...(canSeeCost ? [['plan_kom', 'Actual Disposed', 'text'], ['actual_cost', 'Actual Cost', 'text']] : []),
    ];

    return (
        <div style={M.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={M.box} className="animate-slide-in">
                <div style={M.header}>
                    <h3 style={{ color: '#e6edf3', fontSize: '1rem', fontWeight: 700 }}>Edit Manual: {row.ticket_number}</h3>
                    <button onClick={onClose} style={M.close}><i className="fas fa-times" /></button>
                </div>
                <form onSubmit={submit} style={{ padding: 20, maxHeight: '75vh', overflowY: 'auto' }}>
                    {error && <div style={{ color: '#ff6b6b', fontSize: '.82rem', marginBottom: 12 }}>{error}</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {fields.map(([key, label, type]) => (
                            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '.7rem', color: '#8b949e', fontWeight: 700 }}>{label}</label>
                                <input type={type} value={data[key]} onChange={e => set(key, e.target.value)}
                                    style={{ padding: '8px 10px', background: 'rgba(255,255,255,.04)', border: '1px solid #2a3140', borderRadius: 7, color: '#e6edf3', fontSize: '.82rem' }} />
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                        {['remark_dismantle', 'mom'].map(key => (
                            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '.7rem', color: '#8b949e', fontWeight: 700 }}>{key === 'mom' ? 'MOM' : 'Remark Dismantle'}</label>
                                <textarea value={data[key]} onChange={e => set(key, e.target.value)} rows={2}
                                    style={{ padding: '8px 10px', background: 'rgba(255,255,255,.04)', border: '1px solid #2a3140', borderRadius: 7, color: '#e6edf3', fontSize: '.82rem', resize: 'vertical' }} />
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                        <button type="button" onClick={onClose} style={M.btnCancel}>Batal</button>
                        <button type="submit" disabled={saving} style={M.btnSave}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Pagination({ result }) {
    if (!result?.last_page || result.last_page <= 1) return null;
    const goto = (page) => {
        const params = Object.fromEntries(new URLSearchParams(window.location.search));
        router.get(route('tracker.index'), { ...params, page }, { preserveState: true });
    };
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #2a3140', fontSize: '.8rem', color: '#8b949e' }}>
            <span>Menampilkan {result.from}–{result.to} dari {result.total?.toLocaleString('id-ID')}</span>
            <div style={{ display: 'flex', gap: 6 }}>
                <button disabled={result.current_page <= 1} onClick={() => goto(result.current_page - 1)} style={S.pageBtn}>Prev</button>
                <span style={{ padding: '4px 10px' }}>{result.current_page} / {result.last_page}</span>
                <button disabled={result.current_page >= result.last_page} onClick={() => goto(result.current_page + 1)} style={S.pageBtn}>Next</button>
            </div>
        </div>
    );
}

const S = {
    catBar: { display: 'flex', gap: 8, padding: '10px 20px', alignItems: 'center', borderBottom: '1px solid #2a3140', flexShrink: 0, flexWrap: 'wrap' },
    catBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, border: '1px solid', fontSize: '.75rem', fontWeight: 700, cursor: 'pointer' },
    mainBtn: { background: '#00b4d8', color: '#0a0e14', borderColor: '#00b4d8' },
    exportBtn: { padding: '7px 14px', background: 'linear-gradient(135deg,#00b4d8,#0096c7)', border: 'none', borderRadius: 7, color: '#fff', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '1400px' },
    thead: { background: '#1c2029', position: 'sticky', top: 0, zIndex: 5 },
    th: { padding: '10px 12px', textAlign: 'left', fontSize: '.72rem', fontWeight: 700, borderBottom: '1px solid #2a3140', whiteSpace: 'nowrap', textTransform: 'uppercase' },
    tr: { borderBottom: '1px solid rgba(255,255,255,.03)' },
    td: { padding: '9px 12px', fontSize: '.82rem', color: '#e6edf3' },
    emptyCell: { padding: 40, textAlign: 'center', color: '#8b949e' },
    actEdit: { width: 28, height: 28, borderRadius: 6, border: 'none', background: 'rgba(6,214,160,.15)', color: '#06d6a0', cursor: 'pointer' },
    pageBtn: { padding: '4px 12px', borderRadius: 6, border: '1px solid #2a3140', background: 'transparent', color: '#e6edf3', cursor: 'pointer', fontSize: '.8rem' },
};
const F = {
    header: { padding: '12px 16px', borderBottom: '1px solid #2a3140', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 },
    btnReset: { background: 'none', border: '1px solid #2a3140', borderRadius: 6, color: '#e6edf3', fontSize: '.75rem', padding: '4px 10px', cursor: 'pointer' },
    label: { fontSize: '.68rem', fontWeight: 700, color: '#6e7681', letterSpacing: '.6px', marginBottom: 6, textTransform: 'uppercase' },
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 },
    chip: { padding: '7px 4px', borderRadius: 6, fontSize: '.75rem', fontWeight: 600, cursor: 'pointer', textAlign: 'center', background: 'rgba(255,255,255,.04)', color: '#8b949e', border: '1px solid #2a3140' },
    chipActive: { background: '#00b4d8', color: '#fff', border: '1px solid #00b4d8' },
    input: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', background: '#1c2029', border: '1px solid #2a3140', borderRadius: 7, color: '#e6edf3', fontSize: '.82rem', outline: 'none' },
    btnApply: { padding: '10px 0', background: 'linear-gradient(135deg,#00b4d8,#0096c7)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: '.85rem', cursor: 'pointer' },
};
const EX = {
    item: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', fontSize: '.83rem', userSelect: 'none' },
    btnApply: { padding: '6px 16px', borderRadius: 6, fontSize: '.8rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: '#00b4d8', color: '#fff' },
    btnCancel: { padding: '6px 14px', borderRadius: 6, fontSize: '.8rem', fontWeight: 600, cursor: 'pointer', border: '1px solid #2a3140', background: 'rgba(255,255,255,.06)', color: '#e6edf3' },
};
const M = {
    overlay: { position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    box: { background: '#212631', borderRadius: 12, width: '100%', maxWidth: 760, border: '1px solid #2a3140' },
    header: { padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a3140' },
    close: { background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.1rem' },
    btnCancel: { padding: '8px 16px', background: 'rgba(255,255,255,.06)', border: '1px solid #2a3140', borderRadius: 7, color: '#8b949e', cursor: 'pointer', fontSize: '.82rem' },
    btnSave: { padding: '8px 20px', background: 'linear-gradient(135deg,#00b4d8,#0096c7)', border: 'none', borderRadius: 7, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.82rem' },
};
