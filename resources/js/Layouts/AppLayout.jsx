import { useState } from 'react';

// Shell UI Approve: sidebar icon (kiri) + RGB line vertikal, header atas,
// RGB line horizontal di atas area konten. Sidebar sementara statis
// (cuma User Management) — nanti diganti dinamis begitu tabel
// menus/submenus & assignment-nya dibuat.
export default function AppLayout({ children, activeIcon = 'users-cog' }) {
    const [hovered, setHovered] = useState(false);

    return (
        <div style={S.root}>
            <nav style={S.sidebar}>
                <div className="sidebar-rgb-line" />
                <div style={S.navIcons}>
                    <div
                        style={S.navIconWrap}
                        onMouseEnter={() => setHovered(true)}
                        onMouseLeave={() => setHovered(false)}
                    >
                        <div style={{ ...S.iconBox, ...S.iconBoxActive }}>
                            <i className={`fas fa-${activeIcon}`} />
                        </div>
                        {hovered && <span style={S.iconLabel}>User Management</span>}
                    </div>
                </div>
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
                            <div style={S.userName}>Super Administrator</div>
                            <div style={S.userRole}>super_admin</div>
                        </div>
                    </div>
                </header>

                <div className="rgb-line-full" />

                <div style={S.mainArea}>{children}</div>
            </div>
        </div>
    );
}

const S = {
    root: { display: 'flex', minHeight: '100vh', background: '#0a0e14' },
    sidebar: {
        position: 'fixed', left: 0, top: 0, width: '80px', height: '100vh', zIndex: 1000,
        background: 'linear-gradient(180deg,#141821 0%,#1c2029 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: '20px',
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
    contentWrapper: { marginLeft: '80px', width: 'calc(100% - 80px)', minHeight: '100vh' },
    header: {
        padding: '0 32px', height: '72px', background: '#141821',
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
    userRole: { fontSize: '.72rem', color: '#e6edf3', opacity: 0.6 },
    mainArea: { minHeight: 'calc(100vh - 75px)' },
};
