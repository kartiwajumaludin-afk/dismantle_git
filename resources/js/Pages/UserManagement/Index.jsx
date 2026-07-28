import { useState, useEffect, useRef } from 'react';
import { usePage, router, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

// Online jika last_seen_at < 5 menit yang lalu
const isOnline = (lastSeen) => {
    if (!lastSeen) return false;
    return (Date.now() - new Date(lastSeen).getTime()) < 5 * 60 * 1000;
};

export default function UserManagementIndex() {
    const { users, roles, regions, menus, filters, flash } = usePage().props;
    const [editModal, setEditModal]     = useState(null);
    const [detailModal, setDetailModal] = useState(null);
    const [tab, setTab]                 = useState(filters?.access || 'web');
    const [search, setSearch]           = useState(filters?.search ?? '');
    const [roleFilter, setRoleFilter]   = useState(filters?.role ?? '');

    // Daftar password sementara (create/reset) yang baru dibuat di sesi ini.
    // Cuma hidup di memori browser — nambah tiap create/reset, dan hilang
    // total begitu halaman di-refresh/ditutup. TIDAK PERNAH disimpan ke DB.
    const [tempPasswords, setTempPasswords] = useState([]);
    const lastCredId = useRef(null);

    useEffect(() => {
        if (flash?.credentials && flash.credentials.id !== lastCredId.current) {
            lastCredId.current = flash.credentials.id;
            setTempPasswords(prev => [...prev, flash.credentials]);
        }
    }, [flash?.credentials]);

    const applyFilter = (overrides = {}) => {
        router.get(route('users.index'), {
            search, role: roleFilter, access: tab, ...overrides,
        }, { preserveState: true });
    };

    const switchTab = (value) => {
        setTab(value);
        applyFilter({ access: value });
    };

    const roleBadgeColor = (role) => ({
        super_admin:      '#ff6b6b',
        admin:            '#00b4d8',
        regional_manager: '#06d6a0',
        vendor:           '#ffd43b',
        view:             '#9d4edd',
        logistic:         '#f72585',
    }[role] || '#8b949e');

    return (
        <AppLayout activeKey="users" leftPanel={<CreateUserForm roles={roles} regions={regions} menus={menus} />}>
            <div style={S.wrap}>
                {tempPasswords.length > 0 && (
                    <PasswordPanel items={tempPasswords} onClear={() => setTempPasswords([])} />
                )}

                {/* Tab Web / Field Team — tambahan di rebuild ini */}
                <div style={S.tabBar}>
                    <button
                        style={{ ...S.tab, ...(tab === 'web' ? S.tabActive : {}) }}
                        onClick={() => switchTab('web')}
                    >
                        <i className="fas fa-desktop" /> Web
                    </button>
                    <button
                        style={{ ...S.tab, ...(tab === 'mobapp' ? S.tabActive : {}) }}
                        onClick={() => switchTab('mobapp')}
                    >
                        <i className="fas fa-mobile-screen-button" /> Field Team (Mobile App)
                    </button>
                </div>

                {/* Toolbar */}
                <div style={S.toolbar}>
                    <h2 style={S.pageTitle}>
                        <i className="fas fa-users-cog" style={{ color: '#00b4d8', marginRight: '10px' }} />
                        User Management
                    </h2>
                    <div style={S.toolbarRight}>
                        <input
                            style={S.searchInput}
                            placeholder="Cari username / nama / email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && applyFilter()}
                        />
                        <CustomSelect
                            value={roleFilter}
                            onChange={setRoleFilter}
                            options={[{ value: '', label: 'Semua Role' }, ...roles.map(r => ({ value: r.name, label: r.name }))]}
                            width="160px"
                        />
                        <button style={S.btnFilter} onClick={() => applyFilter()}>
                            <i className="fas fa-search" /> Filter
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div style={S.tableWrap}>
                    <table style={S.table}>
                        <thead>
                            <tr style={S.thead}>
                                {['#','Full Name','Username','Email','No HP','Role','Regions','Menu Access','Status','Periode Aktif','Last Login','Online','Actions'].map(h => (
                                    <th key={h} style={S.th}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(users.data ?? []).length === 0 && (
                                <tr>
                                    <td colSpan={13} style={S.emptyCell}>Belum ada user di tab ini.</td>
                                </tr>
                            )}
                            {users.data?.map((user, idx) => (
                                <tr key={user.id} style={S.tr}>
                                    <td style={S.td}>{users.from + idx}</td>
                                    <td style={{ ...S.td, fontWeight: 600 }}>{user.full_name}</td>
                                    <td style={{ ...S.td, color: '#00b4d8' }}>{user.username}</td>
                                    <td style={S.td}>{user.email}</td>
                                    <td style={{ ...S.td, color:'#ffd43b' }}>{user.phone ?? <span style={{ color:'#3a4255' }}>—</span>}</td>
                                    <td style={S.td}>
                                        <span style={{ ...S.badge, background: roleBadgeColor(user.roles?.[0]?.name) + '22', color: roleBadgeColor(user.roles?.[0]?.name), border: `1px solid ${roleBadgeColor(user.roles?.[0]?.name)}44` }}>
                                            {user.roles?.[0]?.name ?? '-'}
                                        </span>
                                    </td>
                                    <td style={S.td}>
                                        <span style={{ ...S.badge, background: 'rgba(0,180,216,.1)', color: '#00b4d8', border: '1px solid rgba(0,180,216,.2)' }}>
                                            {user.regions?.length ?? 0} Region
                                        </span>
                                    </td>
                                    <td style={S.td}>
                                        <span style={{ ...S.badge, background: 'rgba(157,78,221,.1)', color: '#9d4edd', border: '1px solid rgba(157,78,221,.2)' }}>
                                            {user.menus?.length ?? 0} Menu - {user.submenus?.length ?? 0} Sub
                                        </span>
                                    </td>
                                    <td style={S.td}>
                                        <span style={{ ...S.badge, background: user.is_active ? 'rgba(6,214,160,.1)' : 'rgba(255,107,107,.1)', color: user.is_active ? '#06d6a0' : '#ff6b6b', border: `1px solid ${user.is_active ? 'rgba(6,214,160,.2)' : 'rgba(255,107,107,.2)'}` }}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ ...S.td, fontSize: '.78rem', color: '#8b949e' }}>
                                        {user.active_from} ~ {user.active_until}
                                    </td>
                                    <td style={{ ...S.td, fontSize: '.78rem', color: '#6e7681' }}>
                                        {user.last_login ? new Date(user.last_login).toLocaleString('id-ID') : '-'}
                                    </td>
                                    <td style={{ ...S.td, textAlign: 'center' }}>
                                        {isOnline(user.last_seen_at) ? (
                                            <span title={user.last_seen_at ? new Date(user.last_seen_at).toLocaleString('id-ID') : ''} style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(6,214,160,.15)', color:'#06d6a0', border:'1px solid rgba(6,214,160,.3)', borderRadius:6, padding:'2px 8px', fontSize:'.72rem', fontWeight:700 }}>
                                                <span style={{ width:7, height:7, borderRadius:'50%', background:'#06d6a0', display:'inline-block', boxShadow:'0 0 6px #06d6a0' }} />
                                                Online
                                            </span>
                                        ) : (
                                            <span title={user.last_seen_at ? new Date(user.last_seen_at).toLocaleString('id-ID') : 'Belum pernah login'} style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(110,118,129,.1)', color:'#6e7681', border:'1px solid rgba(110,118,129,.2)', borderRadius:6, padding:'2px 8px', fontSize:'.72rem', fontWeight:600 }}>
                                                <span style={{ width:7, height:7, borderRadius:'50%', background:'#6e7681', display:'inline-block' }} />
                                                Offline
                                            </span>
                                        )}
                                    </td>
                                    <td style={S.td}>
                                        <div style={S.actions}>
                                            <ActionBtn color="#00b4d8" icon="fa-eye"       title="Detail"        onClick={() => setDetailModal(user)} />
                                            <ActionBtn color="#06d6a0" icon="fa-edit"      title="Edit"          onClick={() => setEditModal(user)} />
                                            <ActionBtn color="#ffd43b" icon="fa-key"       title="Reset Password" onClick={() => { if (confirm(`Reset password "${user.username}" ke password baru (acak)?`)) router.post(route('users.reset-password', user.id)); }} />
                                            <ActionBtn color={user.is_active ? '#ff6b6b' : '#06d6a0'} icon={user.is_active ? 'fa-user-slash' : 'fa-user-check'} title={user.is_active ? 'Nonaktifkan' : 'Aktifkan'} onClick={() => router.post(route('users.toggle-active', user.id))} />
                                            <ActionBtn color="#ff4466" icon="fa-trash-alt" title="Hapus User" onClick={() => { if (confirm(`Hapus user "${user.username}"? Tindakan ini tidak bisa dibatalkan.`)) router.delete(route('users.destroy', user.id)); }} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination links={users.links} meta={users} />
            </div>
            {editModal   && <EditUserModal user={editModal}   roles={roles} regions={regions} menus={menus} onClose={() => setEditModal(null)} />}
            {detailModal && <DetailModal  user={detailModal}  onClose={() => setDetailModal(null)} />}
        </AppLayout>
    );
}

/* ─── PANEL DAFTAR PASSWORD SEMENTARA ─── */
function PasswordPanel({ items, onClear }) {
    const [copiedId, setCopiedId] = useState(null);

    const copyOne = (item) => {
        navigator.clipboard.writeText(`${item.username} : ${item.password}`);
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 1500);
    };

    const copyAll = () => {
        const text = items.map(i => `${i.username} : ${i.password}`).join('\n');
        navigator.clipboard.writeText(text);
    };

    return (
        <div style={P.wrap}>
            <div style={P.header}>
                <div style={P.headerLeft}>
                    <i className="fas fa-key" style={{ color: '#ffd43b' }} />
                    <span>Password Sementara ({items.length}) — cuma tampil sampai halaman ini di-refresh</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={P.btnCopyAll} onClick={copyAll}>
                        <i className="fas fa-copy" /> Copy Semua
                    </button>
                    <button style={P.btnClose} onClick={onClear}>
                        <i className="fas fa-times" />
                    </button>
                </div>
            </div>
            <div style={P.list}>
                {items.map(item => (
                    <div key={item.id} style={P.row}>
                        <span style={P.rowUser}>{item.username}</span>
                        <span style={P.rowAction}>{item.action}</span>
                        <code style={P.rowPass}>{item.password}</code>
                        <button style={P.btnCopyOne} onClick={() => copyOne(item)}>
                            <i className={`fas ${copiedId === item.id ? 'fa-check' : 'fa-copy'}`} />
                            {copiedId === item.id ? 'Ter-copy' : 'Copy'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── CUSTOM SELECT ─── */
function CustomSelect({ value, onChange, options, width = '100%' }) {
    const [open, setOpen]       = useState(false);
    const [hovered, setHovered] = useState(null);
    const selected = options.find(o => o.value === value) ?? options[0];
    return (
        <div style={{ position: 'relative', width, userSelect: 'none', zIndex: open ? 9001 : 'auto' }}>
            <div
                onClick={() => setOpen(!open)}
                style={{
                    padding: '8px 12px', background: '#1c2029',
                    border: `1px solid ${open ? '#00b4d8' : '#2a3140'}`,
                    borderRadius: '7px', color: '#e6edf3',
                    fontSize: '.85rem', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: '8px',
                }}
            >
                <span>{selected?.label}</span>
                <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: '.7rem', color: '#8b949e' }} />
            </div>
            {open && (
                <>
                    <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9000 }} />
                    <div style={{
                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                        background: '#1c2029', border: '1px solid #2a3140',
                        borderRadius: '7px', zIndex: 9001,
                        boxShadow: '0 8px 24px rgba(0,0,0,.6)',
                        overflow: 'hidden',
                    }}>
                        {options.map(opt => {
                            const isActive  = value === opt.value;
                            const isHovered = hovered === opt.value;
                            return (
                                <div
                                    key={opt.value}
                                    onClick={() => { onChange(opt.value); setOpen(false); }}
                                    onMouseEnter={() => setHovered(opt.value)}
                                    onMouseLeave={() => setHovered(null)}
                                    style={{
                                        padding: '9px 14px', fontSize: '.85rem', cursor: 'pointer',
                                        color:      isHovered ? '#ffffff' : isActive ? '#00b4d8' : '#e6edf3',
                                        background: isHovered ? '#00b4d8' : isActive ? 'rgba(0,180,216,.1)' : 'transparent',
                                        transition: 'background .12s, color .12s',
                                    }}
                                >
                                    {opt.label}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

/* ─── CREATE USER FORM (Left Panel) ─── */
function CreateUserForm({ roles, regions, menus }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        full_name: '', username: '', email: '', phone: '', role: '',
        active_from: '', active_until: '',
        regions: [], menus: [], submenus: [],
        must_change_password: true,
        can_access_web: true,
        can_access_mobapp: false,
    });
    const toggleRegion = (id) => {
        setData('regions', data.regions.includes(id) ? data.regions.filter(r => r !== id) : [...data.regions, id]);
    };
    const toggleAll = () => {
        setData('regions', data.regions.length === regions.length ? [] : regions.map(r => r.id));
    };
    const toggleMenu = (menuId, submenuIds) => {
        const hasMenu = data.menus.includes(menuId);
        setData('menus', hasMenu ? data.menus.filter(m => m !== menuId) : [...data.menus, menuId]);
        if (!hasMenu) {
            setData('submenus', [...new Set([...data.submenus, ...submenuIds])]);
        } else {
            setData('submenus', data.submenus.filter(s => !submenuIds.includes(s)));
        }
    };
    const toggleSubmenu = (submenuId, menuId) => {
        const hasSub = data.submenus.includes(submenuId);
        setData('submenus', hasSub ? data.submenus.filter(s => s !== submenuId) : [...data.submenus, submenuId]);
        if (!hasSub && !data.menus.includes(menuId)) {
            setData('menus', [...data.menus, menuId]);
        }
    };
    const submit = (e) => {
        e.preventDefault();
        post(route('users.store'), { onSuccess: () => reset() });
    };
    return (
        <form onSubmit={submit} style={F.form}>
            <div style={F.header}>
                <i className="fas fa-user-plus" style={{ color: '#00b4d8' }} />
                <span>Buat User Baru</span>
            </div>
            <div style={F.body} className="left-panel-scroll">
                <Field label="Full Name" error={errors.full_name}>
                    <input style={F.input} value={data.full_name} onChange={e => setData('full_name', e.target.value)} placeholder="Nama lengkap" />
                </Field>
                <Field label="Username" error={errors.username}>
                    <input style={F.input} value={data.username} onChange={e => setData('username', e.target.value)} placeholder="Username" autoComplete="off" />
                </Field>
                <Field label="Email" error={errors.email}>
                    <input style={F.input} type="email" value={data.email} onChange={e => setData('email', e.target.value)} placeholder="email@domain.com" />
                </Field>
                <Field label="No HP" error={errors.phone}>
                    <input style={F.input} type="tel" value={data.phone} onChange={e => setData('phone', e.target.value)} placeholder="Contoh: 0812-3456-7890" />
                </Field>
                <Field label="Role" error={errors.role}>
                    <CustomSelect
                        value={data.role}
                        onChange={val => setData('role', val)}
                        options={[{ value: '', label: '-- Pilih Role --' }, ...roles.map(r => ({ value: r.name, label: r.name }))]}
                    />
                </Field>
                <Field label="Aktif Dari" error={errors.active_from}>
                    <input style={{ ...F.input, colorScheme: 'dark' }} type="date" value={data.active_from} onChange={e => setData('active_from', e.target.value)} />
                </Field>
                <Field label="Aktif Sampai" error={errors.active_until}>
                    <input style={{ ...F.input, colorScheme: 'dark' }} type="date" value={data.active_until} onChange={e => setData('active_until', e.target.value)} />
                </Field>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" id="mcp" checked={data.must_change_password}
                        onChange={e => setData('must_change_password', e.target.checked)}
                        style={{ accentColor: '#00b4d8', cursor: 'pointer' }} />
                    <label htmlFor="mcp" style={{ fontSize: '.8rem', color: '#8b949e', cursor: 'pointer' }}>
                        Wajib ganti password saat login pertama
                    </label>
                </div>
                <div style={F.section}>
                    <span style={F.sectionLabel}>AKSES</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.82rem', color: '#e6edf3', cursor: 'pointer' }}>
                            <input type="checkbox" checked={data.can_access_web}
                                onChange={e => setData('can_access_web', e.target.checked)}
                                style={{ accentColor: '#00b4d8' }} />
                            Akses Web
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.82rem', color: '#e6edf3', cursor: 'pointer' }}>
                            <input type="checkbox" checked={data.can_access_mobapp}
                                onChange={e => setData('can_access_mobapp', e.target.checked)}
                                style={{ accentColor: '#00b4d8' }} />
                            Akses Field Team (MobApp)
                        </label>
                    </div>
                </div>
                <div style={F.section}>
                    <div style={F.sectionHeader}>
                        <span style={F.sectionLabel}>ASSIGN REGION</span>
                        <button type="button" style={F.btnAll} onClick={toggleAll}>
                            {data.regions.length === regions.length ? 'Clear All' : 'Select All'}
                        </button>
                    </div>
                    <div style={F.regionGrid}>
                        {regions.map(r => (
                            <button key={r.id} type="button" onClick={() => toggleRegion(r.id)}
                                style={{
                                    ...F.chip,
                                    background:  data.regions.includes(r.id) ? '#00b4d8' : 'rgba(255,255,255,.04)',
                                    color:       data.regions.includes(r.id) ? '#fff' : '#8b949e',
                                    border:      `1px solid ${data.regions.includes(r.id) ? '#00b4d8' : '#2a3140'}`,
                                }}>
                                {r.code}
                            </button>
                        ))}
                    </div>
                    {errors.regions && <span style={F.errText}>{errors.regions}</span>}
                </div>
                <div style={F.section}>
                    <span style={F.sectionLabel}>ACCESS CONTROL</span>
                    {menus.map(menu => (
                        <div key={menu.id} style={F.menuBlock}>
                            <label style={F.menuLabel}>
                                <input type="checkbox" checked={data.menus.includes(menu.id)}
                                    onChange={() => toggleMenu(menu.id, menu.submenus?.map(s => s.id) ?? [])}
                                    style={{ accentColor: '#00b4d8' }} />
                                <i className={`fas ${menu.icon}`} style={{ color: '#00b4d8', fontSize: '.85rem' }} />
                                <span style={{ fontWeight: 600, fontSize: '.85rem' }}>{menu.label}</span>
                            </label>
                            {menu.submenus?.length > 0 && (
                                <div style={F.submenuList}>
                                    {menu.submenus.map(sub => (
                                        <label key={sub.id} style={F.subLabel}>
                                            <input type="checkbox" checked={data.submenus.includes(sub.id)}
                                                onChange={() => toggleSubmenu(sub.id, menu.id)}
                                                style={{ accentColor: sub.color }} />
                                            <i className={`fas ${sub.icon}`} style={{ color: sub.color, fontSize: '.8rem' }} />
                                            <span style={{ fontSize: '.8rem' }}>{sub.label}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <div style={F.footer}>
                <button type="button" style={F.btnReset} onClick={() => reset()}>
                    <i className="fas fa-undo" /> Reset
                </button>
                <button type="submit" style={F.btnSubmit} disabled={processing}>
                    {processing ? <><i className="fas fa-spinner fa-spin" /> Menyimpan...</> : <><i className="fas fa-save" /> Simpan</>}
                </button>
            </div>
        </form>
    );
}

/* ─── EDIT MODAL ─── */
function EditUserModal({ user, roles, regions, menus, onClose }) {
    const { data, setData, put, processing, errors } = useForm({
        full_name:    user.full_name ?? '',
        username:     user.username ?? '',
        email:        user.email ?? '',
        phone:        user.phone ?? '',
        role:         user.roles?.[0]?.name ?? '',
        active_from:  user.active_from ?? '',
        active_until: user.active_until ?? '',
        regions:      user.regions?.map(r => r.id) ?? [],
        menus:        user.menus?.map(m => m.id) ?? [],
        submenus:     user.submenus?.map(s => s.id) ?? [],
        can_access_web:    user.can_access_web ?? true,
        can_access_mobapp: user.can_access_mobapp ?? false,
    });
    const [openMenus, setOpenMenus] = useState({});
    const toggleRegion = (id) => {
        setData('regions', data.regions.includes(id) ? data.regions.filter(r => r !== id) : [...data.regions, id]);
    };
    const toggleAllRegions = () => {
        setData('regions', data.regions.length === regions.length ? [] : regions.map(r => r.id));
    };
    const toggleMenu = (menuId, submenuIds) => {
        const has = data.menus.includes(menuId);
        setData('menus', has ? data.menus.filter(m => m !== menuId) : [...data.menus, menuId]);
        if (!has) {
            setData('submenus', [...new Set([...data.submenus, ...submenuIds])]);
            setOpenMenus(o => ({ ...o, [menuId]: true }));
        } else {
            setData('submenus', data.submenus.filter(s => !submenuIds.includes(s)));
        }
    };
    const toggleSubmenu = (submenuId, menuId) => {
        const has = data.submenus.includes(submenuId);
        setData('submenus', has ? data.submenus.filter(s => s !== submenuId) : [...data.submenus, submenuId]);
        if (!has && !data.menus.includes(menuId)) {
            setData('menus', [...data.menus, menuId]);
        }
    };
    const submit = (e) => {
        e.preventDefault();
        put(route('users.update', user.id), { onSuccess: onClose });
    };
    const allReg = data.regions.length === regions.length;
    const FS = { fontSize: '.72rem', fontWeight: 700, letterSpacing: '.6px', color: '#8b949e', textTransform: 'uppercase', marginBottom: 4 };
    return (
        <Modal title={`Edit User: ${user.username}`} onClose={onClose}>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <Field label="Full Name *" error={errors.full_name}>
                        <input style={F.input} value={data.full_name} onChange={e => setData('full_name', e.target.value)} required />
                    </Field>
                    <Field label="Username *" error={errors.username}>
                        <input style={F.input} value={data.username} onChange={e => setData('username', e.target.value)} required />
                    </Field>
                    <Field label="Email *" error={errors.email}>
                        <input style={F.input} type="email" value={data.email} onChange={e => setData('email', e.target.value)} required />
                    </Field>
                    <Field label="No HP" error={errors.phone}>
                        <input style={F.input} type="tel" value={data.phone} onChange={e => setData('phone', e.target.value)} placeholder="Contoh: 0812-3456-7890" />
                    </Field>
                    <Field label="Role *" error={errors.role}>
                        <CustomSelect value={data.role} onChange={val => setData('role', val)} options={roles.map(r => ({ value: r.name, label: r.name }))} />
                    </Field>
                </div>
                <div>
                    <div style={FS}><i className="fas fa-calendar-alt" style={{ color: '#00b4d8', marginRight: 4 }} /> Periode Aktif</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <Field label="Dari Tanggal">
                            <input style={{ ...F.input, colorScheme: 'dark' }} type="date" value={data.active_from} onChange={e => setData('active_from', e.target.value)} />
                        </Field>
                        <Field label="Sampai Tanggal">
                            <input style={{ ...F.input, colorScheme: 'dark' }} type="date" value={data.active_until} onChange={e => setData('active_until', e.target.value)} />
                        </Field>
                    </div>
                    <div style={{ fontSize: '.72rem', color: '#6e7681', marginTop: 4 }}>Kosongkan untuk hapus batas periode.</div>
                </div>
                <div>
                    <div style={FS}>Akses</div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '.82rem', color: '#e6edf3', cursor: 'pointer' }}>
                            <input type="checkbox" checked={data.can_access_web} onChange={e => setData('can_access_web', e.target.checked)} style={{ accentColor: '#00b4d8' }} /> Web
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '.82rem', color: '#e6edf3', cursor: 'pointer' }}>
                            <input type="checkbox" checked={data.can_access_mobapp} onChange={e => setData('can_access_mobapp', e.target.checked)} style={{ accentColor: '#00b4d8' }} /> Field Team (MobApp)
                        </label>
                    </div>
                </div>
                <div>
                    <div style={FS}>Assign Region</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, padding: 8, background: '#1c2029', border: '1px solid #2a3140', borderRadius: 7, maxHeight: 160, overflowY: 'auto' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 6px', borderRadius: 5, cursor: 'pointer', fontSize: '.8rem', color: allReg ? '#00b4d8' : '#8b949e', background: allReg ? 'rgba(0,180,216,.12)' : 'transparent' }}>
                            <input type="checkbox" checked={allReg} onChange={toggleAllRegions} style={{ accentColor: '#00b4d8' }} /> All
                        </label>
                        {regions.map(r => (
                            <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 6px', borderRadius: 5, cursor: 'pointer', fontSize: '.8rem', color: data.regions.includes(r.id) ? '#00b4d8' : '#8b949e', background: data.regions.includes(r.id) ? 'rgba(0,180,216,.12)' : 'transparent' }}>
                                <input type="checkbox" checked={data.regions.includes(r.id)} onChange={() => toggleRegion(r.id)} style={{ accentColor: '#00b4d8' }} /> {r.code}
                            </label>
                        ))}
                    </div>
                </div>
                <div>
                    <div style={FS}>Access Control</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {menus.map(menu => {
                            const subIds = menu.submenus?.map(s => s.id) ?? [];
                            const hasMenu = data.menus.includes(menu.id);
                            const isOpen = openMenus[menu.id];
                            return (
                                <div key={menu.id} style={{ border: '1px solid #2a3140', borderRadius: 7, overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#1c2029', cursor: 'pointer' }}
                                        onClick={() => setOpenMenus(o => ({ ...o, [menu.id]: !o[menu.id] }))}>
                                        <input type="checkbox" checked={hasMenu} onChange={() => toggleMenu(menu.id, subIds)}
                                            onClick={e => e.stopPropagation()} style={{ accentColor: '#00b4d8', width: 14, height: 14 }} />
                                        <i className={`fas ${menu.icon}`} style={{ color: '#00b4d8', fontSize: '.8rem', width: 16 }} />
                                        <span style={{ fontSize: '.85rem', color: '#e6edf3', fontWeight: 600, flex: 1 }}>{menu.label}</span>
                                        <i className="fas fa-chevron-down" style={{ fontSize: '.6rem', color: '#6e7681', transform: isOpen ? 'rotate(180deg)' : '', transition: 'transform .2s' }} />
                                    </div>
                                    {isOpen && (
                                        <div style={{ padding: '6px 12px 8px 32px', background: '#141821' }}>
                                            {menu.submenus?.map(sub => (
                                                <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0', fontSize: '.82rem', color: data.submenus.includes(sub.id) ? '#e6edf3' : '#8b949e', cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={data.submenus.includes(sub.id)} onChange={() => toggleSubmenu(sub.id, menu.id)} style={{ accentColor: '#00b4d8', width: 13, height: 13 }} />
                                                    <i className={`fas ${sub.icon}`} style={{ color: sub.color, fontSize: '.75rem', width: 14 }} />
                                                    {sub.label}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                    <button type="button" style={F.btnReset} onClick={onClose}>Batal</button>
                    <button type="submit" style={F.btnSubmit} disabled={processing}>
                        {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

/* ─── DETAIL MODAL ─── */
function DetailModal({ user, onClose }) {
    return (
        <Modal title={`Detail: ${user.username}`} onClose={onClose}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '.875rem' }}>
                {[
                    ['Full Name', user.full_name],
                    ['Username', user.username],
                    ['Email', user.email],
                    ['No HP', user.phone ?? '-'],
                    ['Role', user.roles?.[0]?.name ?? '-'],
                    ['Status', user.is_active ? 'Active' : 'Inactive'],
                    ['Akses Web', user.can_access_web ? 'Ya' : 'Tidak'],
                    ['Akses MobApp', user.can_access_mobapp ? 'Ya' : 'Tidak'],
                    ['Last Login', user.last_login ? new Date(user.last_login).toLocaleString('id-ID') : '-'],
                    ['Aktif Dari', user.active_from ?? '-'],
                    ['Aktif Sampai', user.active_until ?? '-'],
                ].map(([label, val]) => (
                    <div key={label}>
                        <div style={{ color: '#6e7681', fontSize: '.75rem', marginBottom: '2px' }}>{label}</div>
                        <div style={{ color: '#e6edf3', fontWeight: 500 }}>{val}</div>
                    </div>
                ))}
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button style={F.btnReset} onClick={onClose}>Tutup</button>
            </div>
        </Modal>
    );
}

/* ─── SHARED ─── */
function Modal({ title, onClose, children }) {
    return (
        <div style={M.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={M.box} className="animate-slide-in">
                <div style={M.header}>
                    <h3 style={M.title}>{title}</h3>
                    <button style={M.close} onClick={onClose}><i className="fas fa-times" /></button>
                </div>
                <div style={M.body}>{children}</div>
            </div>
        </div>
    );
}
function Field({ label, error, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.6px', color: '#8b949e', textTransform: 'uppercase' }}>{label}</label>
            {children}
            {error && <span style={F.errText}>{error}</span>}
        </div>
    );
}
function ActionBtn({ icon, color, title, onClick }) {
    return (
        <button onClick={onClick} title={title} style={{
            width: '28px', height: '28px', borderRadius: '6px', border: 'none',
            background: `${color}18`, color, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '.75rem',
        }}>
            <i className={`fas ${icon}`} />
        </button>
    );
}
function Pagination({ links, meta }) {
    if (!meta?.last_page || meta.last_page <= 1) return null;
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #2a3140', background: 'rgba(255,255,255,.01)', fontSize: '.8rem', color: '#8b949e' }}>
            <span>Menampilkan {meta.from}–{meta.to} dari {meta.total} user</span>
            <div style={{ display: 'flex', gap: '4px' }}>
                {links?.map((link, i) => (
                    <button key={i} disabled={!link.url}
                        onClick={() => link.url && router.visit(link.url)}
                        style={{
                            padding: '4px 10px', borderRadius: '5px', border: '1px solid',
                            borderColor: link.active ? '#00b4d8' : '#2a3140',
                            background: link.active ? '#00b4d8' : 'transparent',
                            color: link.active ? '#fff' : '#8b949e',
                            cursor: link.url ? 'pointer' : 'not-allowed', fontSize: '.8rem',
                        }}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ))}
            </div>
        </div>
    );
}

/* ─── STYLES ─── */
const S = {
    wrap:        { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
    tabBar: {
        display: 'flex', gap: '8px', padding: '10px 20px 0', flexShrink: 0,
        borderBottom: '1px solid #2a3140', background: 'rgba(255,255,255,.01)',
    },
    tab: {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 18px', background: 'transparent', border: 'none',
        borderBottom: '3px solid transparent', color: '#8b949e',
        fontSize: '.85rem', fontWeight: 600, cursor: 'pointer',
    },
    tabActive: { color: '#e6edf3', borderBottom: '3px solid #00b4d8' },
    toolbar:     { padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a3140', flexShrink: 0, background: 'rgba(255,255,255,.01)' },
    pageTitle:   { fontSize: '1.1rem', fontWeight: 700, color: '#e6edf3', display: 'flex', alignItems: 'center' },
    toolbarRight:{ display: 'flex', gap: '10px', alignItems: 'center' },
    searchInput: { padding: '8px 14px', background: 'rgba(255,255,255,.05)', border: '1px solid #2a3140', borderRadius: '7px', color: '#e6edf3', fontSize: '.85rem', width: '260px', outline: 'none' },
    btnFilter:   { padding: '8px 16px', background: 'linear-gradient(135deg,#00b4d8,#0096c7)', border: 'none', borderRadius: '7px', color: '#fff', fontWeight: 700, fontSize: '.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
    tableWrap:   { flex: 1, overflow: 'auto' },
    table:       { width: '100%', borderCollapse: 'collapse', minWidth: '1100px' },
    thead:       { background: '#1c2029', position: 'sticky', top: 0, zIndex: 10 },
    th:          { padding: '12px 14px', textAlign: 'left', fontSize: '.75rem', fontWeight: 700, color: '#8b949e', borderBottom: '1px solid #2a3140', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '.5px' },
    tr:          { borderBottom: '1px solid rgba(255,255,255,.03)' },
    td:          { padding: '12px 14px', fontSize: '.85rem', color: '#e6edf3', whiteSpace: 'nowrap' },
    emptyCell:   { padding: '32px', textAlign: 'center', color: '#e6edf3', opacity: 0.6 },
    badge:       { display: 'inline-block', padding: '3px 9px', borderRadius: '20px', fontSize: '.75rem', fontWeight: 600 },
    actions:     { display: 'flex', gap: '5px' },
};
const F = {
    form:         { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
    header:       { padding: '14px 18px', background: 'rgba(255,255,255,.02)', borderBottom: '1px solid #2a3140', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '.95rem', fontWeight: 700, color: '#e6edf3', flexShrink: 0 },
    body:         { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
    footer:       { padding: '12px 16px', borderTop: '1px solid #2a3140', flexShrink: 0, display: 'flex', gap: '10px', justifyContent: 'flex-end' },
    input:        { width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,.04)', border: '1px solid #2a3140', borderRadius: '7px', color: '#e6edf3', fontSize: '.85rem', outline: 'none' },
    section:      { display: 'flex', flexDirection: 'column', gap: '8px' },
    sectionHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    sectionLabel: { fontSize: '.7rem', fontWeight: 700, letterSpacing: '.8px', color: '#6e7681', textTransform: 'uppercase' },
    btnAll:       { fontSize: '.72rem', color: '#00b4d8', background: 'none', border: 'none', cursor: 'pointer' },
    regionGrid:   { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '4px' },
    chip:         { padding: '7px 4px', borderRadius: '6px', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', textAlign: 'center' },
    menuBlock:    { background: 'rgba(255,255,255,.02)', borderRadius: '8px', padding: '10px', border: '1px solid #2a3140' },
    menuLabel:    { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#e6edf3', marginBottom: '6px' },
    submenuList:  { display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '20px' },
    subLabel:     { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#8b949e', fontSize: '.82rem', padding: '3px 0' },
    btnReset:     { padding: '8px 16px', background: 'rgba(255,255,255,.06)', border: '1px solid #2a3140', borderRadius: '7px', color: '#8b949e', fontSize: '.82rem', cursor: 'pointer', fontWeight: 600 },
    btnSubmit:    { padding: '8px 20px', background: 'linear-gradient(135deg,#00b4d8,#0096c7)', border: 'none', borderRadius: '7px', color: '#fff', fontSize: '.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    errText:      { color: '#ff6b6b', fontSize: '.75rem' },
};
const M = {
    overlay: { position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
    box:     { background: '#212631', borderRadius: '12px', width: '100%', maxWidth: '680px', border: '1px solid #2a3140', boxShadow: '0 24px 64px rgba(0,0,0,.5)', overflow: 'hidden' },
    header:  { padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a3140', background: 'rgba(255,255,255,.02)' },
    title:   { fontSize: '1rem', fontWeight: 700, color: '#e6edf3' },
    close:   { background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.1rem', padding: '4px 8px' },
    body:    { padding: '20px', maxHeight: '85vh', overflowY: 'auto' },
};
const P = {
    wrap:   { margin: '14px 20px 0', background: 'rgba(255,212,59,.06)', border: '1px solid rgba(255,212,59,.25)', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid rgba(255,212,59,.2)' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.82rem', fontWeight: 700, color: '#ffd43b' },
    btnCopyAll: { padding: '5px 12px', background: 'rgba(255,212,59,.15)', border: '1px solid rgba(255,212,59,.35)', borderRadius: '6px', color: '#ffd43b', fontSize: '.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
    btnClose:   { padding: '5px 9px', background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '.85rem' },
    list:   { maxHeight: '160px', overflowY: 'auto', padding: '6px 14px' },
    row:    { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px dashed rgba(255,255,255,.06)', fontSize: '.8rem' },
    rowUser:   { color: '#00b4d8', fontWeight: 600, minWidth: '120px' },
    rowAction: { color: '#8b949e', fontSize: '.72rem', minWidth: '60px' },
    rowPass:   { flex: 1, background: 'rgba(0,0,0,.25)', padding: '3px 10px', borderRadius: '5px', color: '#ffd43b', fontFamily: 'monospace', fontSize: '.82rem' },
    btnCopyOne:{ padding: '4px 10px', background: 'rgba(255,255,255,.06)', border: '1px solid #2a3140', borderRadius: '5px', color: '#e6edf3', fontSize: '.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' },
};
