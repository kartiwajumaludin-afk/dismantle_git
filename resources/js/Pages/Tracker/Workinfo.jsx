import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

const COLS = [
    ['ticket_number', 'Ticket #'], ['site_id', 'Site ID'], ['site_name', 'Site Name'],
    ['regional', 'Regional'], ['network_operation_and_productivity', 'NOP'],
    ['work_info_status_name', 'Status'], ['work_info_note', 'Note'],
    ['work_info_user_updater', 'Updater'], ['work_info_role_updater', 'Role'],
    ['work_info_updated_date', 'Updated Date'],
];

const statusColor = (s) => {
    if (!s) return '#8b949e';
    if (s.includes('Closed') || s.includes('Approved')) return '#06d6a0';
    if (s.includes('Submitted') || s.includes('New')) return '#00b4d8';
    return '#8b949e';
};

export default function WorkinfoView() {
    const { result } = usePage().props;
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    const [search, setSearch] = useState(params.search ?? '');

    const applySearch = () => {
        router.get(route('tracker.workinfo'), search.trim() ? { search: search.trim() } : {}, { preserveState: true });
    };

    const goto = (page) => {
        router.get(route('tracker.workinfo'), { ...params, page }, { preserveState: true });
    };

    return (
        <AppLayout activeKey="workinfo">
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <div style={S.toolbar}>
                    <h2 style={S.title}><i className="fas fa-clipboard-list" style={{ color: '#9d4edd', marginRight: 10 }} /> Workinfo View</h2>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && applySearch()}
                            placeholder="Cari ticket, site, status, note..."
                            style={S.search}
                        />
                        <button onClick={applySearch} style={S.btnSearch}><i className="fas fa-search" /> Cari</button>
                        <span style={{ color: '#e6edf3', fontSize: '.8rem' }}>Total: <strong>{result.total?.toLocaleString('id-ID')}</strong></span>
                    </div>
                </div>
                <div className="table-scroll" style={{ flex: 1, overflow: 'auto' }}>
                    <table style={S.table}>
                        <thead>
                            <tr style={S.thead}>
                                <th style={{ ...S.th, width: 36 }}>#</th>
                                {COLS.map(([key, label]) => <th key={key} style={S.th}>{label}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {(result.data ?? []).length === 0 && (
                                <tr><td colSpan={COLS.length + 1} style={S.emptyCell}>Belum ada data workinfo.</td></tr>
                            )}
                            {result.data?.map((row, idx) => (
                                <tr key={row.id ?? idx} style={S.tr}>
                                    <td style={{ ...S.td, color: '#6e7681', fontSize: '.75rem' }}>{(result.from ?? 0) + idx}</td>
                                    {COLS.map(([key]) => (
                                        <td key={key} style={{
                                            ...S.td,
                                            ...(key === 'ticket_number' ? { color: '#00b4d8', fontWeight: 600 } : {}),
                                            ...(key === 'work_info_status_name' ? { color: statusColor(row[key]), fontWeight: 600 } : {}),
                                            maxWidth: key === 'work_info_note' ? 260 : undefined,
                                            overflow: key === 'work_info_note' ? 'hidden' : undefined,
                                            textOverflow: key === 'work_info_note' ? 'ellipsis' : undefined,
                                        }} title={key === 'work_info_note' ? row[key] : undefined}>
                                            {row[key] ?? <span style={{ color: '#3a4255' }}>—</span>}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {result.last_page > 1 && (
                    <div style={S.pagBar}>
                        <span>Menampilkan {result.from}–{result.to} dari {result.total?.toLocaleString('id-ID')}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button disabled={result.current_page <= 1} onClick={() => goto(result.current_page - 1)} style={S.pageBtn}>Prev</button>
                            <span style={{ padding: '4px 10px' }}>{result.current_page} / {result.last_page}</span>
                            <button disabled={result.current_page >= result.last_page} onClick={() => goto(result.current_page + 1)} style={S.pageBtn}>Next</button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

const S = {
    toolbar: { padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a3140', flexShrink: 0 },
    title: { fontSize: '1.1rem', fontWeight: 700, color: '#e6edf3', display: 'flex', alignItems: 'center' },
    search: { padding: '8px 14px', background: 'rgba(255,255,255,.05)', border: '1px solid #2a3140', borderRadius: 7, color: '#e6edf3', fontSize: '.85rem', width: 260 },
    btnSearch: { padding: '8px 16px', background: 'linear-gradient(135deg,#9d4edd,#7b2fbe)', border: 'none', borderRadius: 7, color: '#fff', fontWeight: 700, fontSize: '.8rem', cursor: 'pointer' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '1100px' },
    thead: { background: '#1c2029', position: 'sticky', top: 0, zIndex: 5 },
    th: { padding: '10px 12px', textAlign: 'left', fontSize: '.72rem', fontWeight: 700, color: '#8b949e', borderBottom: '1px solid #2a3140', whiteSpace: 'nowrap', textTransform: 'uppercase' },
    tr: { borderBottom: '1px solid rgba(255,255,255,.03)' },
    td: { padding: '9px 12px', fontSize: '.82rem', color: '#e6edf3', whiteSpace: 'nowrap' },
    emptyCell: { padding: 40, textAlign: 'center', color: '#8b949e' },
    pagBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #2a3140', fontSize: '.8rem', color: '#8b949e' },
    pageBtn: { padding: '4px 12px', borderRadius: 6, border: '1px solid #2a3140', background: 'transparent', color: '#e6edf3', cursor: 'pointer', fontSize: '.8rem' },
};
