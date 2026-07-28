import { useState } from 'react';

export default function Index() {
    const [tab, setTab] = useState('web');

    return (
        <div style={S.page}>
            <div style={S.header}>
                <h1 style={S.title}>User Management</h1>
                <p style={S.subtitle}>Kelola akses user ke WebApp dan MobApp</p>
            </div>

            <div style={S.tabBar}>
                <button
                    style={{ ...S.tab, ...(tab === 'web' ? S.tabActive : {}) }}
                    onClick={() => setTab('web')}
                >
                    <i className="fas fa-desktop" /> User WebApp
                </button>
                <button
                    style={{ ...S.tab, ...(tab === 'mobapp' ? S.tabActive : {}) }}
                    onClick={() => setTab('mobapp')}
                >
                    <i className="fas fa-mobile-screen-button" /> User MobApp
                </button>
            </div>

            <div style={S.content}>
                {tab === 'web' && (
                    <EmptyState
                        icon="fa-desktop"
                        text="Belum ada data User WebApp"
                    />
                )}
                {tab === 'mobapp' && (
                    <EmptyState
                        icon="fa-mobile-screen-button"
                        text="Belum ada data User MobApp"
                    />
                )}
            </div>
        </div>
    );
}

function EmptyState({ icon, text }) {
    return (
        <div style={S.empty}>
            <i className={`fas ${icon}`} style={S.emptyIcon} />
            <p style={S.emptyText}>{text}</p>
        </div>
    );
}

const S = {
    page: {
        minHeight: '100vh', background: '#0a0e14', color: '#e6edf3',
        fontFamily: "'IBM Plex Sans','Segoe UI',sans-serif", padding: '32px',
    },
    header: { marginBottom: '24px' },
    title: { fontSize: '1.6rem', fontWeight: 800, color: '#e6edf3' },
    subtitle: { color: '#e6edf3', opacity: 0.7, fontSize: '.9rem', marginTop: '4px' },
    tabBar: {
        display: 'flex', gap: '8px', borderBottom: '1px solid #2a3140',
        marginBottom: '24px',
    },
    tab: {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '12px 20px', background: 'transparent', border: 'none',
        borderBottom: '3px solid transparent', color: '#8b949e',
        fontSize: '.9rem', fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    tabActive: {
        color: '#e6edf3', borderBottom: '3px solid #00b4d8',
    },
    content: {
        background: '#212631', border: '1px solid #2a3140',
        borderRadius: '12px', minHeight: '300px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    empty: { textAlign: 'center', padding: '40px' },
    emptyIcon: { fontSize: '2.4rem', color: '#ffd43b', marginBottom: '12px', display: 'block' },
    emptyText: { color: '#e6edf3', opacity: 0.75, fontSize: '.95rem' },
};
