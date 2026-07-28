import { useState, useMemo } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

export default function Index({ users, roles }) {
    const { flash } = usePage().props;
    const [tab, setTab] = useState('web');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [showCreate, setShowCreate] = useState(false);

    const filtered = useMemo(() => {
        return users
            .filter((u) => (tab === 'web' ? u.can_access_web : u.can_access_mobapp))
            .filter((u) => !roleFilter || u.role === roleFilter)
            .filter((u) => {
                if (!search) return true;
                const q = search.toLowerCase();
                return (
                    u.full_name?.toLowerCase().includes(q) ||
                    u.username?.toLowerCase().includes(q) ||
                    u.email?.toLowerCase().includes(q)
                );
            });
    }, [users, tab, roleFilter, search]);

    return (
        <AppLayout activeIcon="users-cog">
            <div style={S.page}>
                {flash?.success && (
                    <div style={S.flashSuccess}>
                        <i className="fas fa-check-circle" /> {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div style={S.flashError}>
                        <i className="fas fa-times-circle" /> {flash.error}
                    </div>
                )}

                <div style={S.header}>
                    <h1 style={S.title}>User Management</h1>
                    <p style={S.subtitle}>Kelola akses user ke Web dan Field Team (MobApp)</p>
                </div>

                <div style={S.tabBar}>
                    <button
                        style={{ ...S.tab, ...(tab === 'web' ? S.tabActive : {}) }}
                        onClick={() => setTab('web')}
                    >
                        <i className="fas fa-desktop" /> Web
                    </button>
                    <button
                        style={{ ...S.tab, ...(tab === 'mobapp' ? S.tabActive : {}) }}
                        onClick={() => setTab('mobapp')}
                    >
                        <i className="fas fa-mobile-screen-button" /> Field Team (Mobile App)
                    </button>
                </div>

                <div style={S.toolbar}>
                    <input
                        type="search"
                        placeholder="Cari username / nama / email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={S.searchInput}
                    />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        style={S.roleSelect}
                    >
                        <option value="">Semua Role</option>
                        {roles.map((r) => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                    <button style={S.btnAdd} onClick={() => setShowCreate(true)}>
                        <i className="fas fa-plus" /> Tambah Staff
                    </button>
                </div>

                <div style={S.tableWrap}>
                    <table style={S.table}>
                        <thead>
                            <tr>
                                <th style={S.th}>#</th>
                                <th style={S.th}>Full Name</th>
                                <th style={S.th}>Username</th>
                                <th style={S.th}>Email</th>
                                <th style={S.th}>No HP</th>
                                <th style={S.th}>Role</th>
                                <th style={S.th}>Status</th>
                                <th style={S.th}>Periode Aktif</th>
                                <th style={S.th}>Last Login</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={9} style={S.emptyCell}>
                                        Belum ada user di tab ini.
                                    </td>
                                </tr>
                            )}
                            {filtered.map((u, i) => (
                                <tr key={u.id}>
                                    <td style={S.td}>{i + 1}</td>
                                    <td style={S.td}>{u.full_name}</td>
                                    <td style={{ ...S.td, color: '#00b4d8' }}>{u.username}</td>
                                    <td style={S.td}>{u.email}</td>
                                    <td style={S.td}>{u.phone || '-'}</td>
                                    <td style={S.td}>
                                        <span style={S.roleBadge}>{u.role || '-'}</span>
                                    </td>
                                    <td style={S.td}>
                                        <span style={u.is_active ? S.statusActive : S.statusInactive}>
                                            {u.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={S.td}>
                                        {u.active_from ? `${u.active_from} ~ ${u.active_until || '-'}` : '-'}
                                    </td>
                                    <td style={S.td}>{u.last_login || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {showCreate && (
                    <CreateUserModal
                        roles={roles}
                        onClose={() => setShowCreate(false)}
                    />
                )}
            </div>
        </AppLayout>
    );
}

function CreateUserModal({ roles, onClose }) {
    const { data, setData, post, processing, errors } = useForm({
        full_name: '',
        username: '',
        email: '',
        phone: '',
        role: roles[0] || '',
        can_access_web: true,
        can_access_mobapp: false,
        active_from: '',
        active_until: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('users.store'), {
            onSuccess: () => onClose(),
        });
    };

    return (
        <div style={S.modalOverlay}>
            <div style={S.modalBox}>
                <h2 style={S.modalTitle}>Tambah Staff</h2>
                <form onSubmit={submit} style={S.form}>
                    <Field label="Full Name" error={errors.full_name}>
                        <input value={data.full_name} onChange={(e) => setData('full_name', e.target.value)} />
                    </Field>
                    <Field label="Username" error={errors.username}>
                        <input value={data.username} onChange={(e) => setData('username', e.target.value)} />
                    </Field>
                    <Field label="Email" error={errors.email}>
                        <input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                    </Field>
                    <Field label="No HP" error={errors.phone}>
                        <input value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                    </Field>
                    <Field label="Role" error={errors.role}>
                        <select value={data.role} onChange={(e) => setData('role', e.target.value)}>
                            {roles.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </Field>
                    <div style={S.checkRow}>
                        <label style={S.checkLabel}>
                            <input
                                type="checkbox"
                                checked={data.can_access_web}
                                onChange={(e) => setData('can_access_web', e.target.checked)}
                            /> Akses Web
                        </label>
                        <label style={S.checkLabel}>
                            <input
                                type="checkbox"
                                checked={data.can_access_mobapp}
                                onChange={(e) => setData('can_access_mobapp', e.target.checked)}
                            /> Akses Field Team (MobApp)
                        </label>
                    </div>
                    <Field label="Periode Aktif Dari" error={errors.active_from}>
                        <input type="date" value={data.active_from} onChange={(e) => setData('active_from', e.target.value)} />
                    </Field>
                    <Field label="Periode Aktif Sampai" error={errors.active_until}>
                        <input type="date" value={data.active_until} onChange={(e) => setData('active_until', e.target.value)} />
                    </Field>

                    <div style={S.modalActions}>
                        <button type="button" style={S.btnCancel} onClick={onClose}>Batal</button>
                        <button type="submit" style={S.btnSubmit} disabled={processing}>
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({ label, error, children }) {
    return (
        <div style={S.field}>
            <label style={S.fieldLabel}>{label}</label>
            {children}
            {error && <span style={S.fieldError}>{error}</span>}
        </div>
    );
}

const S = {
    page: {
        color: '#e6edf3', fontFamily: "'IBM Plex Sans','Segoe UI',sans-serif", padding: '32px',
    },
    header: { marginBottom: '24px' },
    title: { fontSize: '1.6rem', fontWeight: 800, color: '#e6edf3' },
    subtitle: { color: '#e6edf3', opacity: 0.7, fontSize: '.9rem', marginTop: '4px' },
    tabBar: {
        display: 'flex', gap: '8px', borderBottom: '1px solid #2a3140',
        marginBottom: '20px',
    },
    tab: {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '12px 20px', background: 'transparent', border: 'none',
        borderBottom: '3px solid transparent', color: '#8b949e',
        fontSize: '.9rem', fontWeight: 600, cursor: 'pointer',
    },
    tabActive: { color: '#e6edf3', borderBottom: '3px solid #00b4d8' },
    toolbar: {
        display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center',
    },
    searchInput: {
        flex: 1, maxWidth: '320px', padding: '10px 14px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid #2a3140',
        borderRadius: '8px', color: '#e6edf3', fontSize: '.85rem',
    },
    roleSelect: {
        padding: '10px 14px', background: '#1c2029', border: '1px solid #2a3140',
        borderRadius: '8px', color: '#e6edf3', fontSize: '.85rem',
    },
    btnAdd: {
        marginLeft: 'auto', padding: '10px 20px',
        background: 'linear-gradient(135deg,#00b4d8,#0096c7)', border: 'none',
        borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '.85rem',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
    },
    tableWrap: {
        background: '#212631', border: '1px solid #2a3140', borderRadius: '12px',
        overflow: 'auto',
    },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: {
        textAlign: 'left', padding: '14px 16px', fontSize: '.72rem',
        letterSpacing: '.5px', color: '#e6edf3', opacity: 0.7,
        borderBottom: '1px solid #2a3140', textTransform: 'uppercase',
    },
    td: {
        padding: '14px 16px', fontSize: '.85rem', color: '#e6edf3',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
    },
    emptyCell: {
        padding: '32px', textAlign: 'center', color: '#e6edf3', opacity: 0.6,
    },
    roleBadge: {
        padding: '4px 10px', borderRadius: '6px', fontSize: '.75rem',
        fontWeight: 700, background: 'rgba(0,180,216,0.15)', color: '#00b4d8',
        border: '1px solid rgba(0,180,216,0.3)',
    },
    statusActive: {
        padding: '4px 10px', borderRadius: '6px', fontSize: '.75rem', fontWeight: 700,
        background: 'rgba(6,214,160,0.15)', color: '#06d6a0', border: '1px solid rgba(6,214,160,0.3)',
    },
    statusInactive: {
        padding: '4px 10px', borderRadius: '6px', fontSize: '.75rem', fontWeight: 700,
        background: 'rgba(255,107,107,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.3)',
    },
    flashSuccess: {
        marginBottom: '16px', padding: '12px 16px', borderRadius: '8px',
        background: 'rgba(6,214,160,0.12)', border: '1px solid rgba(6,214,160,0.3)',
        color: '#06d6a0', fontSize: '.85rem', display: 'flex', gap: '8px', alignItems: 'center',
    },
    flashError: {
        marginBottom: '16px', padding: '12px 16px', borderRadius: '8px',
        background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.3)',
        color: '#ff6b6b', fontSize: '.85rem', display: 'flex', gap: '8px', alignItems: 'center',
    },
    modalOverlay: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    },
    modalBox: {
        background: '#212631', border: '1px solid #2a3140', borderRadius: '12px',
        padding: '28px', width: '440px', maxHeight: '90vh', overflowY: 'auto',
    },
    modalTitle: { fontSize: '1.2rem', fontWeight: 800, marginBottom: '18px', color: '#e6edf3' },
    form: { display: 'flex', flexDirection: 'column', gap: '14px' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px' },
    fieldLabel: { fontSize: '.75rem', fontWeight: 700, color: '#e6edf3', opacity: 0.8 },
    fieldError: { fontSize: '.72rem', color: '#ff6b6b' },
    checkRow: { display: 'flex', flexDirection: 'column', gap: '8px' },
    checkLabel: {
        display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.85rem', color: '#e6edf3',
    },
    modalActions: {
        display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px',
    },
    btnCancel: {
        padding: '10px 18px', background: 'transparent', border: '1px solid #2a3140',
        borderRadius: '8px', color: '#e6edf3', cursor: 'pointer', fontSize: '.85rem',
    },
    btnSubmit: {
        padding: '10px 18px', background: 'linear-gradient(135deg,#00b4d8,#0096c7)',
        border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700,
        cursor: 'pointer', fontSize: '.85rem',
    },
};
