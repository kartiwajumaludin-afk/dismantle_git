import AppLayout from '@/Layouts/AppLayout';

export default function Placeholder({ title, icon = 'fa-code', activeSubmenu }) {
    return (
        <AppLayout activeSubmenu={activeSubmenu}>
            <div style={S.wrap}>
                <div style={S.iconBox}>
                    <i className={`fas ${icon}`} style={S.icon} />
                </div>
                <h2 style={S.title}>{title}</h2>
                <p style={S.subtitle}>Halaman {title} — Segera Hadir</p>
                <span style={S.badge}>
                    <i className="fas fa-code" /> UNDER DEVELOPMENT
                </span>
            </div>
        </AppLayout>
    );
}

const S = {
    wrap: {
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '14px',
        color: '#e6edf3', textAlign: 'center', padding: '40px', height: '100%',
    },
    iconBox: {
        width: '64px', height: '64px', borderRadius: '16px',
        background: 'rgba(255,212,59,.1)', border: '1px solid rgba(255,212,59,.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    icon: { fontSize: '1.8rem', color: '#ffd43b' },
    title: { fontSize: '1.6rem', fontWeight: 800, color: '#e6edf3' },
    subtitle: { color: '#e6edf3', opacity: 0.75, fontSize: '.95rem' },
    badge: {
        marginTop: '8px', padding: '8px 22px', borderRadius: '40px',
        background: 'rgba(255,212,59,0.12)', border: '1px solid rgba(255,212,59,0.3)',
        color: '#ffd43b', fontWeight: 700, fontSize: '.85rem',
        display: 'flex', alignItems: 'center', gap: '8px',
    },
};
