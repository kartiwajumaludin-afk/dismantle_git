import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';

// Shell UI Approve: sidebar icon (kiri) + RGB line vertikal, header atas,
// RGB line horizontal, dan left panel opsional (dipakai buat form
// Create User / upload dkk) yang bisa di-collapse.
//
// NAV_ITEMS masih statis (daftar manual) — nanti diganti dinamis begitu
// tabel menus/submenus & assignment per-user dipakai buat navigasi
// beneran (baru kepakai kalau menu access sungguhan sudah di-enforce).
const NAV_ITEMS = [
    { key: 'users',  icon: 'users-cog',   label: 'User Management', routeName: 'users.index' },
    { key: 'import',  icon: 'file-import', label: 'Import CSV',      routeName: 'import.index' },
];

export default function AppLayout({ children, leftPanel, activeKey }) {
    const { auth } = usePage().props;
    const [hoveredKey, setHoveredKey] = useState(null);
    const [panelOpen, setPanelOpen] = useState(true);

    const handleLogout = () => router.post(route('logout'));

    return (
        <div style={S.root}>
            <nav style={S.sidebar}>
                <div className="sidebar-rgb-line" />
                <div style={S.navIcons}>
                    {NAV_ITEMS.map((item) => (
                        <div
                            key={item.key}
                            style={S.navIconWrap}
                            onMouseEnter={() => setHoveredKey(item.key)}
                            onMouseLeave={() => setHoveredKey(null)}
                            onClick={() => router.visit(route(item.routeName))}
                        >
                            <div style={{
                                ...S.iconBox,
                                ...(activeKey === item.key ? S.iconBoxActive : {}),
                            }}>
                                <i className={`fas fa-${item.icon}`} />
                            </div>
                            {hoveredKey === item.key && <span style={S.iconLabel}>{item.label}</span>}
                        </div>
                    ))}
                </div>
                <button style={S.logoutIcon} onClick={handleLogout} title="Logout">
                    <i className="fas fa-sign-out-alt" />
                </button>
            </nav>

            <div style={S.contentWrapper}>
                <header style={S.header}>
                    <div>
                        <h1 style={S.headerTitle}>Dismantle Asset Write-Off</h1>
                        <div style={S.headerSub}>
                            dibuat oleh <span className="rgb-text">Kartiwa Jumaludin</span>
                        </div>
                    </div>
                    <div style={S.userCard}>
                        <i className="fas fa-user-circle" style={S.userAvatar} />
                        <div>
                            <div style={S.userName}>{auth?.user?.full_name ?? '—'}</div>
                            <div style={S.userRole}>{auth?.user?.role ?? '—'}</div>
                        </div>
                        <button style={S.logoutBtn} onClick={handleLogout}>
                            <i className="fas fa-sign-out-alt" />
                        </button>
                    </div>
                </header>

                <div className="rgb-line-full" />

                <div style={S.mainArea}>
                    {leftPanel && (
                        <>
                            <button
                                style={{ ...S.panelToggle, left: panelOpen ? '350px' : '0px' }}
                                onClick={() => setPanelOpen(!panelOpen)}
                            >
                                <i className={`fas fa-chevron-${panelOpen ? 'left' : 'right'}`} />
                            </button>
                            <div style={{
                                ...S.leftPanel,
                                width: panelOpen ? '350px' : '0px',
                                minWidth: panelOpen ? '350px' : '0px',
                                opacity: panelOpen ? 1 : 0,
                                overflow: panelOpen ? 'visible' : 'hidden',
                            }}>
                                {leftPanel}
                            </div>
                        </>
                    )}
                    <div style={S.rightContent}>{children}</div>
                </div>
            </div>
        </div>
    );
}

const S = {
    root: { display: 'flex', height: '100vh', background: '#0a0e14', overflow: 'hidden' },
    sidebar: {
        position: 'fixed', left: 0, top: 0, width: '80px', height: '100vh', zIndex: 1000,
        background: 'linear-gradient(180deg,#141821 0%,#1c2029 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'space-between', padding: '20px 0',
    },
    navIcons: { display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', alignItems: 'center' },
    navIconWrap: { position: 'relative', cursor: 'pointer' },
    iconBox: {
        width: '44px', height: '44px', borderRadius: '10px',
        border: '1px solid #2a3140', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.1rem', color: '#8b949e',
    },
    iconBoxActive: {
        background: 'linear-gradient(135deg,#00b4d8,#0096c7)', color: '#fff', borderColor: '#00b4d8',
    },
    iconLabel: {
        position: 'absolute', left: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)',
        background: '#212631', color: '#e6edf3', padding: '6px 12px', borderRadius: '6px',
        fontSize: '.8rem', whiteSpace: 'nowrap', border: '1px solid #2a3140', zIndex: 1001,
    },
    logoutIcon: {
        width: '44px', height: '44px', borderRadius: '10px',
        background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)',
        color: '#ff6b6b', fontSize: '1rem', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    contentWrapper: {
        marginLeft: '80px', width: 'calc(100% - 80px)',
        height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    },
    header: {
        padding: '0 32px', height: '72px', flexShrink: 0, background: '#141821',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    },
    headerTitle: { fontSize: '1.3rem', fontWeight: 800, color: '#e6edf3' },
    headerSub: { fontSize: '.78rem', color: '#e6edf3', opacity: 0.7 },
    userCard: {
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 14px', background: '#212631', borderRadius: '8px', border: '1px solid #2a3140',
    },
    userAvatar: { fontSize: '1.8rem', color: '#00b4d8' },
    userName: { fontSize: '.85rem', fontWeight: 600, color: '#e6edf3' },
    userRole: { fontSize: '.72rem', color: '#e6edf3', opacity: 0.6, textTransform: 'capitalize' },
    logoutBtn: {
        marginLeft: '8px', width: '30px', height: '30px', borderRadius: '6px',
        background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)',
        color: '#ff6b6b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    mainArea: { flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' },
    panelToggle: {
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        zIndex: 100, width: '18px', height: '48px',
        background: '#2a3140', border: '1px solid #3a4255',
        borderRadius: '0 6px 6px 0', color: '#8b949e', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '.65rem', transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)',
    },
    leftPanel: {
        background: '#212631', borderRight: '1px solid #2a3140', flexShrink: 0, height: '100%',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
    },
    rightContent: {
        flex: 1, background: '#0a0e14', height: '100%',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
    },
};
