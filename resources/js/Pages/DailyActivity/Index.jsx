import { useState, useEffect, useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content ?? '';
const ALL_REGS = ['REG01', 'REG02', 'REG03', 'REG04', 'REG05', 'REG06', 'REG07', 'REG08', 'REG09', 'REG10', 'REG11', 'REG12'];

const TASK_STATUS_COLOR = {
    planned: '#8b949e', assigned: '#00b4d8', in_progress: '#ffd43b', working: '#ffd43b',
    reported: '#9d4edd', verified: '#06d6a0', completed: '#06d6a0', replanned: '#f72585',
};
const StatusBadge = ({ value, colorMap }) => {
    if (!value) return <span style={{ color: '#3a4255' }}>—</span>;
    const c = colorMap[value] ?? '#8b949e';
    return <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: '.72rem', fontWeight: 600, background: `${c}22`, color: c }}>{value}</span>;
};

const SUMMARY_CARDS = [
    ['total', 'Total', '#00b4d8'], ['planned', 'Planned', '#8b949e'], ['assigned', 'Assigned', '#00b4d8'],
    ['in_progress', 'In Progress', '#ffd43b'], ['reported', 'Reported', '#f97316'], ['completed', 'Completed', '#06d6a0'],
];

export default function DailyActivityIndex() {
    const { result, stats, filterOptions, auth, picUsers } = usePage().props;
    const [selected, setSelected] = useState([]);
    const [editRow, setEditRow] = useState(null);
    const [verifyRow, setVerifyRow] = useState(null);
    const [photosOpen, setPhotosOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleSelectAll = () => {
        const ids = (result.data ?? []).map(r => r.id);
        setSelected(selected.length === ids.length ? [] : ids);
    };

    const post = (url, data = {}) => {
        setBusy(true);
        router.post(route(url), data, { onFinish: () => setBusy(false) });
    };

    const doConfirm = (msg, url) => { if (confirm(msg)) post(url); };

    const COLS = [
        ['ticket_number', 'Ticket #'], ['site_id', 'Site ID'], ['site_name', 'Site Name'],
        ['regional', 'Regional'], ['network_operation_and_productivity', 'NOP'],
        ['ticket_status_name', 'Ticket Status'], ['sub_type', 'Sub Type'],
        ['plan_dismantle_date', 'Plan Date'], ['task_status', 'Task Status'],
        ['assignment_status', 'Assign Status'], ['pic_team', 'PIC Team'], ['assigned_by', 'Assigned By'],
        ['category_issue', 'Category Issue'], ['detail_issue', 'Detail Issue'], ['remark_dismantle', 'Remark Dismantle'],
        ['work_start_time', 'Start Time'], ['work_end_time', 'End Time'], ['work_duration', 'Duration'],
    ];

    return (
        <AppLayout activeSubmenu="daily_activity" leftPanel={<LeftPanel filterOptions={filterOptions} auth={auth} />}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <div style={S.statsBar}>
                    {SUMMARY_CARDS.map(([key, label, color]) => (
                        <div key={key} style={S.statCard}>
                            <div style={{ ...S.statValue, color }}>{(stats?.[key] ?? 0).toLocaleString('id-ID')}</div>
                            <div style={S.statLabel}>{label}</div>
                        </div>
                    ))}
                </div>

                <div style={S.toolbar}>
                    <h2 style={S.title}><i className="fas fa-running" style={{ color: '#00b4d8', marginRight: 10 }} /> Daily Activity</h2>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button disabled={busy} onClick={() => doConfirm('Populate data minggu berjalan dari Tracker?', 'daily.populate')} style={S.btn('#00b4d8')}><i className="fas fa-sync" /> Populate</button>
                        <button disabled={busy} onClick={() => post('daily.sync-status')} style={S.btn('#9d4edd')}><i className="fas fa-redo" /> Sync Status</button>
                        <button disabled={busy} onClick={() => doConfirm('HAPUS SEMUA data Daily Activity? Tindakan ini tidak bisa dibatalkan.', 'daily.truncate')} style={S.btn('#ff6b6b')}><i className="fas fa-trash" /> Truncate</button>
                        <button onClick={() => setPhotosOpen(true)} style={S.btn('#ffd43b')}><i className="fas fa-images" /> Photos</button>
                        <button disabled={selected.length === 0} onClick={() => setAssignOpen(true)} style={S.btn('#06d6a0')}><i className="fas fa-user-check" /> Assign ({selected.length})</button>
                        <button onClick={() => window.location.href = route('daily.export-da') + '?' + new URLSearchParams(Object.fromEntries(new URLSearchParams(window.location.search)))} style={S.btn('#00b4d8')}><i className="fas fa-file-export" /> Export DA</button>
                        <button onClick={() => window.location.href = route('daily.export-ts')} style={S.btn('#00b4d8')}><i className="fas fa-file-invoice" /> Export TS</button>
                    </div>
                </div>

                <div className="table-scroll" style={{ flex: 1, overflow: 'auto' }}>
                    <table style={S.table}>
                        <thead>
                            <tr style={S.thead}>
                                <th style={{ ...S.th, width: 32 }}><input type="checkbox" checked={selected.length > 0 && selected.length === (result.data ?? []).length} onChange={toggleSelectAll} /></th>
                                {COLS.map(([key, label]) => <th key={key} style={S.th}>{label}</th>)}
                                <th style={S.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(result.data ?? []).length === 0 && (
                                <tr><td colSpan={COLS.length + 2} style={S.emptyCell}>Belum ada data. Klik Populate buat narik data minggu berjalan dari Tracker.</td></tr>
                            )}
                            {result.data?.map((row) => (
                                <tr key={row.id} style={S.tr}>
                                    <td style={S.td}><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleSelect(row.id)} /></td>
                                    {COLS.map(([key]) => {
                                        const val = row[key];
                                        let content;
                                        if (key === 'ticket_number') content = <span style={{ color: '#00b4d8', fontWeight: 600 }}>{val}</span>;
                                        else if (key === 'task_status') content = <StatusBadge value={val} colorMap={TASK_STATUS_COLOR} />;
                                        else if (key === 'assignment_status') content = <StatusBadge value={val} colorMap={{ pending: '#ffd43b', accepted: '#06d6a0', rejected: '#ff6b6b' }} />;
                                        else content = val ?? <span style={{ color: '#3a4255' }}>—</span>;
                                        return (
                                            <td key={key} style={{ ...S.td, ...(key === 'remark_dismantle' ? { maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' } : {}) }} title={key === 'remark_dismantle' ? val : undefined}>
                                                {content}
                                            </td>
                                        );
                                    })}
                                    <td style={S.td}>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button onClick={() => setEditRow(row)} style={S.actBtn('#06d6a0')} title="Edit"><i className="fas fa-edit" /></button>
                                            <button onClick={() => setVerifyRow(row)} style={S.actBtn('#00b4d8')} title="Verify"><i className="fas fa-check-double" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination result={result} />
            </div>
            {editRow && <EditModal row={editRow} onClose={() => setEditRow(null)} />}
            {verifyRow && <VerifyModal row={verifyRow} onClose={() => setVerifyRow(null)} />}
            {photosOpen && <PhotosModal onClose={() => setPhotosOpen(false)} />}
            {assignOpen && <AssignModal ids={selected} picUsers={picUsers ?? []} onClose={() => { setAssignOpen(false); setSelected([]); }} />}
        </AppLayout>
    );
}

/* ─── LEFT PANEL ─── */
function LeftPanel({ filterOptions, auth }) {
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    const [mode, setMode] = useState(params.filter_mode ?? 'today');
    const [customDate, setCustomDate] = useState(params.filter_date ?? '');
    const [regions, setRegions] = useState(params.regions ? params.regions.split(',') : ['all']);
    const [picTeam, setPicTeam] = useState(params.pic_team ? params.pic_team.split(',') : []);
    const [taskStatus, setTaskStatus] = useState(params.task_status ? params.task_status.split(',') : []);
    const [nop, setNop] = useState(params.nop ? params.nop.split(',') : []);
    const [search, setSearch] = useState(params.search ?? '');
    const [perPage, setPerPage] = useState(params.per_page ?? '50');

    const userRegCodes = auth?.user?.regions?.map(r => r.code) ?? [];
    const isSuperAdmin = auth?.user?.role === 'super_admin';
    const REG_LIST = isSuperAdmin || userRegCodes.length === 0 ? ALL_REGS : ALL_REGS.filter(r => userRegCodes.includes(r));

    const buildQuery = (overrides = {}) => {
        const base = { filter_mode: mode, filter_date: customDate, regions, pic_team: picTeam, task_status: taskStatus, nop, search, per_page: perPage, ...overrides };
        const q = { filter_mode: base.filter_mode };
        if (base.filter_mode === 'custom' && base.filter_date) q.filter_date = base.filter_date;
        if (base.regions && !base.regions.includes('all') && base.regions.length) q.regions = base.regions.join(',');
        if (base.pic_team?.length) q.pic_team = base.pic_team.join(',');
        if (base.task_status?.length) q.task_status = base.task_status.join(',');
        if (base.nop?.length) q.nop = base.nop.join(',');
        if (base.search?.trim()) q.search = base.search.trim();
        if (base.per_page) q.per_page = base.per_page;
        return q;
    };
    const apply = (overrides = {}) => router.get(route('daily.index'), buildQuery(overrides), { preserveState: false });
    const switchMode = (m) => { setMode(m); apply({ filter_mode: m }); };
    const resetAll = () => {
        setMode('today'); setCustomDate(''); setRegions(['all']); setPicTeam([]); setTaskStatus([]); setNop([]); setSearch(''); setPerPage('50');
        router.get(route('daily.index'), {});
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
                    <div style={F.label}>TANGGAL PLAN</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                        {[['today', 'Today'], ['week', 'This Week'], ['all', 'All Plan'], ['custom', 'Custom']].map(([key, label]) => (
                            <button key={key} onClick={() => switchMode(key)} style={{ ...F.chip, ...(mode === key ? F.chipActive : {}) }}>{label}</button>
                        ))}
                    </div>
                    {mode === 'custom' && (
                        <input type="date" value={customDate} onChange={e => { setCustomDate(e.target.value); apply({ filter_date: e.target.value }); }} style={{ ...F.input, colorScheme: 'dark', marginTop: 6 }} />
                    )}
                </div>
                <div>
                    <div style={F.label}>REGION</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                        <button onClick={() => toggleRegion('all')} style={{ ...F.chip, gridColumn: '1/-1', ...(regions.includes('all') ? F.chipActive : {}) }}>All Region</button>
                        {REG_LIST.map(r => <button key={r} onClick={() => toggleRegion(r)} style={{ ...F.chip, ...(regions.includes(r) ? F.chipActive : {}) }}>{r.replace('REG', 'Region ')}</button>)}
                    </div>
                </div>
                <ExcelDropdown label="PIC TEAM" options={filterOptions?.picTeams ?? []} selected={picTeam} onChange={v => { setPicTeam(v); apply({ pic_team: v }); }} />
                <ExcelDropdown label="TASK STATUS" options={['planned', 'assigned', 'in_progress', 'working', 'reported', 'verified', 'completed', 'replanned']} selected={taskStatus} onChange={v => { setTaskStatus(v); apply({ task_status: v }); }} />
                <ExcelDropdown label="NOP" options={filterOptions?.nops ?? []} selected={nop} onChange={v => { setNop(v); apply({ nop: v }); }} />
                <div>
                    <div style={F.label}>SEARCH TICKET / SITE / PIC</div>
                    <div style={{ position: 'relative' }}>
                        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && apply()} placeholder="Cari..." style={{ ...F.input, paddingRight: 28 }} />
                        {search && <button onClick={() => { setSearch(''); apply({ search: '' }); }} style={F.clearBtn}><i className="fas fa-times" /></button>}
                    </div>
                </div>
                <div>
                    <div style={F.label}>ROWS PER PAGE</div>
                    <select value={perPage} onChange={e => { setPerPage(e.target.value); apply({ per_page: e.target.value }); }} style={F.input}>
                        {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n} rows</option>)}
                    </select>
                </div>
                <button onClick={() => apply()} style={F.btnApply}><i className="fas fa-search" /> Terapkan Filter</button>
            </div>
        </div>
    );
}

/* ─── EXCEL-STYLE DROPDOWN — muncul terus walau options masih kosong (belum
   Populate), biar filternya tetap kelihatan strukturnya, bukan hilang total ─── */
function ExcelDropdown({ label, options, selected, onChange }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [temp, setTemp] = useState(selected);
    const [allChecked, setAllChecked] = useState(selected.length === 0);
    const ref = useRef();

    useEffect(() => { setTemp(selected); setAllChecked(selected.length === 0); }, [selected.join(',')]);
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
    const toggleAll = () => { if (allChecked) { setAllChecked(false); setTemp([]); } else { setAllChecked(true); setTemp([]); } };
    const toggleItem = (v) => {
        if (allChecked) { setAllChecked(false); setTemp(options.filter(x => x !== v)); }
        else {
            const next = temp.includes(v) ? temp.filter(x => x !== v) : [...temp, v];
            if (next.length === options.length) { setAllChecked(true); setTemp([]); } else setTemp(next);
        }
    };
    const apply = () => { onChange(allChecked ? [] : temp); setOpen(false); setSearch(''); };
    const cancel = () => { setTemp(selected); setAllChecked(selected.length === 0); setOpen(false); setSearch(''); };
    const display = (allChecked || selected.length === 0) ? `All ${label}` : selected.length === 1 ? selected[0] : `${selected.length} dipilih`;

    return (
        <div>
            <div style={F.label}>{label}</div>
            <div ref={ref} style={{ position: 'relative' }}>
                <button onClick={() => setOpen(!open)} style={{ ...F.input, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: selected.length ? '#00b4d8' : '#e6edf3', borderColor: selected.length ? '#00b4d8' : '#2a3140' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{display}</span>
                    <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: '.65rem', color: '#6e7681' }} />
                </button>
                {open && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999, background: '#1c2029', border: '1px solid #2a3140', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,.5)', maxHeight: 280, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: 8, borderBottom: '1px solid #2a3140' }}>
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari..." style={{ ...F.input, padding: '6px 10px', fontSize: '.8rem' }} autoFocus />
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            <label style={EX.item}>
                                <input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = !allChecked && temp.length > 0 && temp.length < options.length; }} onChange={toggleAll} style={{ accentColor: '#00b4d8' }} />
                                <span style={{ color: '#e6edf3', fontWeight: 700 }}>All {label}</span>
                            </label>
                            <div style={{ height: 1, background: '#2a3140' }} />
                            {filtered.length === 0 && (
                                <div style={{ padding: '10px 12px', fontSize: '.78rem', color: '#6e7681' }}>Belum ada data (klik Populate dulu).</div>
                            )}
                            {filtered.map(opt => (
                                <label key={opt} style={EX.item}>
                                    <input type="checkbox" checked={allChecked || temp.includes(opt)} onChange={() => toggleItem(opt)} style={{ accentColor: '#00b4d8' }} />
                                    <span style={{ color: '#e6edf3' }}>{opt}</span>
                                </label>
                            ))}
                        </div>
                        <div style={{ padding: 8, borderTop: '1px solid #2a3140', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={cancel} style={EX.btnCancel}>Cancel</button>
                            <button onClick={apply} style={EX.btnApply}>Apply</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── EDIT MODAL (5 kolom) ─── */
function EditModal({ row, onClose }) {
    const [data, setData] = useState({
        plan_dismantle_date: row.plan_dismantle_date ?? '', pic_team: row.pic_team ?? '',
        category_issue: row.category_issue ?? '', detail_issue: row.detail_issue ?? '', remark_dismantle: row.remark_dismantle ?? '',
    });
    const [saving, setSaving] = useState(false);
    const submit = (e) => {
        e.preventDefault();
        setSaving(true);
        router.put(route('daily.update', row.id), data, { onFinish: () => { setSaving(false); onClose(); } });
    };
    return (
        <Modal title={`Edit: ${row.ticket_number}`} onClose={onClose}>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="Plan Dismantle Date"><input type="date" value={data.plan_dismantle_date} onChange={e => setData({ ...data, plan_dismantle_date: e.target.value })} style={{ ...F.input, colorScheme: 'dark' }} /></Field>
                <Field label="PIC Team"><input value={data.pic_team} onChange={e => setData({ ...data, pic_team: e.target.value })} style={F.input} /></Field>
                <Field label="Category Issue"><input value={data.category_issue} onChange={e => setData({ ...data, category_issue: e.target.value })} style={F.input} /></Field>
                <Field label="Detail Issue"><input value={data.detail_issue} onChange={e => setData({ ...data, detail_issue: e.target.value })} style={F.input} /></Field>
                <Field label="Remark Dismantle"><textarea value={data.remark_dismantle} onChange={e => setData({ ...data, remark_dismantle: e.target.value })} rows={3} style={{ ...F.input, resize: 'vertical' }} /></Field>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button type="button" onClick={onClose} style={M.btnCancel}>Batal</button>
                    <button type="submit" disabled={saving} style={M.btnSave}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
                </div>
            </form>
        </Modal>
    );
}

/* ─── VERIFY MODAL: Recorded / Skip / Replan ─── */
function VerifyModal({ row, onClose }) {
    const [action, setAction] = useState('recorded');
    const [replanDate, setReplanDate] = useState('');
    const [alsoRecorded, setAlsoRecorded] = useState(false);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        if (action === 'replan' && !replanDate) { alert('Tanggal replan wajib diisi.'); return; }
        setSaving(true);
        router.post(route('daily.verify', row.id), {
            action, verified_notes: notes, replan_date: replanDate || null, also_recorded: alsoRecorded,
        }, { onFinish: () => { setSaving(false); onClose(); } });
    };

    return (
        <Modal title={`Verify: ${row.ticket_number}`} onClose={onClose}>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    {[['recorded', 'Recorded', '#06d6a0'], ['skip', 'Skip', '#ffd43b'], ['replan', 'Replan', '#f72585']].map(([key, label, color]) => (
                        <button key={key} type="button" onClick={() => setAction(key)} style={{
                            flex: 1, padding: '10px 0', borderRadius: 8, fontWeight: 700, fontSize: '.85rem', cursor: 'pointer',
                            border: `1px solid ${color}`, background: action === key ? color : 'transparent', color: action === key ? '#0a0e14' : color,
                        }}>{label}</button>
                    ))}
                </div>
                {action === 'replan' && (
                    <>
                        <Field label="Tanggal Replan Baru *"><input type="date" required value={replanDate} onChange={e => setReplanDate(e.target.value)} style={{ ...F.input, colorScheme: 'dark' }} /></Field>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.82rem', color: '#e6edf3' }}>
                            <input type="checkbox" checked={alsoRecorded} onChange={e => setAlsoRecorded(e.target.checked)} style={{ accentColor: '#00b4d8' }} />
                            Sekaligus tandai Recorded (prefix [RECORDED+REPLAN])
                        </label>
                    </>
                )}
                <Field label="Catatan Verifikasi"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...F.input, resize: 'vertical' }} /></Field>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button type="button" onClick={onClose} style={M.btnCancel}>Batal</button>
                    <button type="submit" disabled={saving} style={M.btnSave}>{saving ? 'Menyimpan...' : 'Simpan Verifikasi'}</button>
                </div>
            </form>
        </Modal>
    );
}

/* ─── ASSIGN MODAL — PIC Team dipilih dari user Field Team (MobApp),
     bukan ketik manual ─── */
function AssignModal({ ids, picUsers, onClose }) {
    const [picTeam, setPicTeam] = useState('');
    const [saving, setSaving] = useState(false);
    const submit = (e) => {
        e.preventDefault();
        setSaving(true);
        router.post(route('daily.assign'), { ids, pic_team: picTeam }, { onFinish: () => { setSaving(false); onClose(); } });
    };
    return (
        <Modal title={`Assign ${ids.length} Task`} onClose={onClose}>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="PIC Team *">
                    <select required value={picTeam} onChange={e => setPicTeam(e.target.value)} style={F.input}>
                        <option value="">-- Pilih User Field Team --</option>
                        {picUsers.map(u => <option key={u.id} value={u.full_name}>{u.full_name} ({u.username})</option>)}
                    </select>
                    {picUsers.length === 0 && (
                        <div style={{ fontSize: '.72rem', color: '#ffd43b', marginTop: 4 }}>
                            Belum ada user dengan Akses Field Team (MobApp) — tambahkan dulu di User Management.
                        </div>
                    )}
                </Field>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button type="button" onClick={onClose} style={M.btnCancel}>Batal</button>
                    <button type="submit" disabled={saving} style={M.btnSave}>{saving ? 'Menyimpan...' : 'Assign'}</button>
                </div>
            </form>
        </Modal>
    );
}

/* ─── PHOTOS GALLERY MODAL ─── */
function PhotosModal({ onClose }) {
    const [folders, setFolders] = useState([]);
    const [activeTicket, setActiveTicket] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(route('daily.photos.folders')).then(r => r.json()).then(j => { setFolders(j.data ?? []); setLoading(false); });
    }, []);

    const openFolder = (ticket) => {
        setActiveTicket(ticket);
        fetch(route('daily.photos.byTicket', ticket)).then(r => r.json()).then(j => setPhotos(j.data ?? []));
    };
    const deletePhoto = (id) => {
        if (!confirm('Hapus foto ini?')) return;
        fetch(route('daily.photos.delete', id), { method: 'DELETE', headers: { 'X-CSRF-TOKEN': csrf() } })
            .then(() => openFolder(activeTicket));
    };
    const deleteFolder = (ticket) => {
        if (!confirm(`Hapus semua foto untuk ${ticket}?`)) return;
        fetch(route('daily.photos.deleteFolder', ticket), { method: 'DELETE', headers: { 'X-CSRF-TOKEN': csrf() } })
            .then(() => { setActiveTicket(null); setFolders(folders.filter(f => f.ticket_number !== ticket)); });
    };

    return (
        <Modal title="Photo Gallery" onClose={onClose} wide>
            {loading ? <div style={{ color: '#8b949e', padding: 20 }}>Memuat...</div> : (
                !activeTicket ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                        {folders.length === 0 && <div style={{ color: '#8b949e', gridColumn: '1/-1' }}>Belum ada foto. Foto diupload lewat APK Daily Activity.</div>}
                        {folders.map(f => (
                            <div key={f.ticket_number} onClick={() => openFolder(f.ticket_number)} style={{ padding: 14, background: '#1c2029', border: '1px solid #2a3140', borderRadius: 8, cursor: 'pointer' }}>
                                <i className="fas fa-folder" style={{ color: '#ffd43b', fontSize: '1.3rem' }} />
                                <div style={{ color: '#e6edf3', fontWeight: 600, marginTop: 6 }}>{f.ticket_number}</div>
                                <div style={{ color: '#8b949e', fontSize: '.78rem' }}>{f.jumlah} foto</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <button onClick={() => setActiveTicket(null)} style={M.btnCancel}><i className="fas fa-arrow-left" /> Kembali</button>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <a href={route('daily.photos.zip', activeTicket)} style={{ ...M.btnSave, textDecoration: 'none', display: 'inline-block' }}><i className="fas fa-file-archive" /> Export ZIP</a>
                                <button onClick={() => deleteFolder(activeTicket)} style={{ ...M.btnCancel, color: '#ff6b6b', borderColor: '#ff6b6b' }}><i className="fas fa-trash" /> Hapus Folder</button>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                            {photos.length === 0 && <div style={{ color: '#8b949e' }}>Tidak ada foto.</div>}
                            {photos.map(p => (
                                <div key={p.id} style={{ position: 'relative' }}>
                                    <img src={`/storage/${p.photo_path}`} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid #2a3140' }} />
                                    <button onClick={() => deletePhoto(p.id)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,107,107,.85)', border: 'none', borderRadius: 4, color: '#fff', width: 22, height: 22, cursor: 'pointer' }}><i className="fas fa-times" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            )}
        </Modal>
    );
}

/* ─── SHARED ─── */
function Modal({ title, onClose, children, wide }) {
    return (
        <div style={M.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ ...M.box, maxWidth: wide ? 720 : 480 }} className="animate-slide-in">
                <div style={M.header}>
                    <h3 style={{ color: '#e6edf3', fontSize: '1rem', fontWeight: 700 }}>{title}</h3>
                    <button onClick={onClose} style={M.close}><i className="fas fa-times" /></button>
                </div>
                <div style={{ padding: 20, maxHeight: '75vh', overflowY: 'auto' }}>{children}</div>
            </div>
        </div>
    );
}
function Field({ label, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '.72rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase' }}>{label}</label>
            {children}
        </div>
    );
}
function Pagination({ result }) {
    if (!result?.last_page || result.last_page <= 1) return null;
    const goto = (page) => {
        const params = Object.fromEntries(new URLSearchParams(window.location.search));
        router.get(route('daily.index'), { ...params, page }, { preserveState: true });
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
    statsBar: { display: 'flex', gap: 10, padding: '14px 20px 0', flexWrap: 'wrap', flexShrink: 0 },
    statCard: { flex: 1, minWidth: 100, background: '#1c2029', border: '1px solid #2a3140', borderRadius: 8, padding: '10px 4px', textAlign: 'center' },
    statValue: { fontSize: '1.3rem', fontWeight: 800 },
    statLabel: { fontSize: '.68rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 2 },
    toolbar: { padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a3140', flexShrink: 0, flexWrap: 'wrap', gap: 10 },
    title: { fontSize: '1.1rem', fontWeight: 700, color: '#e6edf3', display: 'flex', alignItems: 'center' },
    btn: (color) => ({ padding: '8px 14px', background: 'transparent', border: `1px solid ${color}`, borderRadius: 7, color, fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }),
    actBtn: (color) => ({ width: 26, height: 26, borderRadius: 6, border: 'none', background: `${color}22`, color, cursor: 'pointer' }),
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '1900px' },
    thead: { background: '#1c2029', position: 'sticky', top: 0, zIndex: 5 },
    th: { padding: '10px 12px', textAlign: 'left', fontSize: '.72rem', fontWeight: 700, color: '#8b949e', borderBottom: '1px solid #2a3140', whiteSpace: 'nowrap', textTransform: 'uppercase' },
    tr: { borderBottom: '1px solid rgba(255,255,255,.03)' },
    td: { padding: '9px 12px', fontSize: '.82rem', color: '#e6edf3', whiteSpace: 'nowrap' },
    emptyCell: { padding: 40, textAlign: 'center', color: '#8b949e' },
    pageBtn: { padding: '4px 12px', borderRadius: 6, border: '1px solid #2a3140', background: 'transparent', color: '#e6edf3', cursor: 'pointer', fontSize: '.8rem' },
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
const EX = {
    item: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', fontSize: '.83rem' },
    btnApply: { padding: '6px 16px', borderRadius: 6, fontSize: '.8rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: '#00b4d8', color: '#fff' },
    btnCancel: { padding: '6px 14px', borderRadius: 6, fontSize: '.8rem', fontWeight: 600, cursor: 'pointer', border: '1px solid #2a3140', background: 'rgba(255,255,255,.06)', color: '#e6edf3' },
};
const M = {
    overlay: { position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    box: { background: '#212631', borderRadius: 12, width: '100%', border: '1px solid #2a3140' },
    header: { padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a3140' },
    close: { background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.1rem' },
    btnCancel: { padding: '8px 16px', background: 'rgba(255,255,255,.06)', border: '1px solid #2a3140', borderRadius: 7, color: '#8b949e', cursor: 'pointer', fontSize: '.82rem' },
    btnSave: { padding: '8px 20px', background: 'linear-gradient(135deg,#00b4d8,#0096c7)', border: 'none', borderRadius: 7, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.82rem' },
};
