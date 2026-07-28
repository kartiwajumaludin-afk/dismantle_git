import { useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Login() {
    const [showPass, setShowPass] = useState(false);
    const { data, setData, post, processing, errors } = useForm({
        username: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login.post'));
    };

    return (
        <div style={S.wrapper}>
            <div style={S.bg}>
                <div style={{ ...S.orb, width:'400px', height:'400px', background:'#00b4d8', top:'-100px', left:'-100px' }} />
                <div style={{ ...S.orb, width:'350px', height:'350px', background:'#9d4edd', bottom:'-80px', right:'-80px' }} />
                <div style={{ ...S.orb, width:'250px', height:'250px', background:'#ff6b6b', top:'50%', left:'50%', transform:'translate(-50%,-50%)' }} />
            </div>

            <div style={S.box}>
                <div style={S.rgbBar} />

                <div style={S.logo}>
                    <div style={S.logoIcon}>
                        <i className="fas fa-industry" />
                    </div>
                    <h1 style={S.logoTitle}>DISMANTLE</h1>
                    <p style={S.logoSub}>Asset Write-Off System</p>
                    <p style={S.logoVendor}>PT Mukti Mandiri Lestari</p>
                </div>

                {errors.username && (
                    <div style={S.alertError} className="animate-slide-in">
                        <i className="fas fa-exclamation-circle" />
                        {errors.username}
                    </div>
                )}

                <form onSubmit={submit} style={S.form}>
                    <div style={S.fieldGroup}>
                        <label style={S.fieldLabel}>USERNAME</label>
                        <div style={S.fieldWrap}>
                            <i className="fas fa-user" style={S.fieldIcon} />
                            <input
                                type="text"
                                style={{ ...S.fieldInput, ...(errors.username ? S.fieldInputError : {}) }}
                                placeholder="Masukkan username"
                                value={data.username}
                                onChange={e => setData('username', e.target.value)}
                                autoComplete="username"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div style={S.fieldGroup}>
                        <label style={S.fieldLabel}>PASSWORD</label>
                        <div style={S.fieldWrap}>
                            <i className="fas fa-lock" style={S.fieldIcon} />
                            <input
                                type={showPass ? 'text' : 'password'}
                                style={S.fieldInput}
                                placeholder="Masukkan password"
                                value={data.password}
                                onChange={e => setData('password', e.target.value)}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                style={S.togglePass}
                                onClick={() => setShowPass(!showPass)}
                                tabIndex={-1}
                            >
                                <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                            </button>
                        </div>
                    </div>

                    <div style={S.rememberRow}>
                        <label style={S.rememberLabel}>
                            <input
                                type="checkbox"
                                checked={data.remember}
                                onChange={e => setData('remember', e.target.checked)}
                                style={{ accentColor: '#00b4d8', cursor: 'pointer' }}
                            />
                            <span>Remember me</span>
                        </label>
                    </div>

                    <button type="submit" style={S.btnSubmit} disabled={processing}>
                        {processing
                            ? <><i className="fas fa-spinner fa-spin" /> Memproses...</>
                            : <><i className="fas fa-sign-in-alt" /> Login</>
                        }
                    </button>
                </form>

                <div style={S.footer}>
                    <span>© 2026 Dismantle System</span>
                    <span style={{ color: '#3a4255' }}>·</span>
                    <span>v2.0</span>
                </div>
            </div>

            <style>{`
                @keyframes rgbBorder {
                    0%   { background-position: 0% 50%; }
                    100% { background-position: 400% 50%; }
                }
                @keyframes pulseGlow {
                    0%, 100% { opacity:1; transform:scale(1); }
                    50%       { opacity:0.85; transform:scale(1.04); }
                }
            `}</style>
        </div>
    );
}

const S = {
    wrapper: {
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#0a0e14', padding: '20px', overflow: 'hidden',
        position: 'relative',
    },
    bg: { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 },
    orb: { position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.12 },
    box: {
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '440px',
        background: '#212631', borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        overflow: 'hidden', padding: '40px',
    },
    rgbBar: {
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: 'linear-gradient(90deg,#ff0000,#ff8800,#ffff00,#00ff00,#0000ff,#ff0000)',
        backgroundSize: '400% 400%',
        animation: 'rgbBorder 4s linear infinite',
    },
    logo: { textAlign: 'center', marginBottom: '32px' },
    logoIcon: {
        width: '64px', height: '64px', borderRadius: '16px',
        margin: '0 auto 12px',
        background: 'linear-gradient(135deg,#00b4d8,#0096c7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.8rem', color: '#fff',
        animation: 'pulseGlow 2s infinite',
    },
    logoTitle: {
        fontSize: '2rem', fontWeight: 800, letterSpacing: '4px',
        background: 'linear-gradient(135deg,#00b4d8,#9d4edd)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    },
    logoSub: { color: '#8b949e', fontSize: '.85rem', marginTop: '4px', letterSpacing: '2px' },
    logoVendor: { color: '#6e7681', fontSize: '.75rem', marginTop: '4px' },
    alertError: {
        display: 'flex', alignItems: 'center', gap: '10px',
        background: 'rgba(255,107,107,0.12)',
        border: '1px solid rgba(255,107,107,0.3)',
        color: '#ff6b6b', borderRadius: '8px',
        padding: '12px 16px', fontSize: '.875rem', marginBottom: '20px',
    },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    fieldLabel: { fontSize: '.75rem', fontWeight: 700, letterSpacing: '.8px', color: '#8b949e' },
    fieldWrap: { position: 'relative' },
    fieldIcon: {
        position: 'absolute', left: '14px', top: '50%',
        transform: 'translateY(-50%)',
        color: '#6e7681', fontSize: '.9rem', pointerEvents: 'none',
    },
    fieldInput: {
        width: '100%', padding: '13px 14px 13px 42px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid #2a3140', borderRadius: '8px',
        color: '#e6edf3', fontSize: '.95rem', outline: 'none',
        transition: 'all 0.3s ease',
    },
    fieldInputError: { borderColor: '#ff6b6b' },
    togglePass: {
        position: 'absolute', right: '12px', top: '50%',
        transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#ffffff', fontSize: '.95rem', padding: '4px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    rememberRow: { display: 'flex', alignItems: 'center' },
    rememberLabel: {
        display: 'flex', alignItems: 'center', gap: '8px',
        cursor: 'pointer', color: '#8b949e', fontSize: '.875rem',
    },
    btnSubmit: {
        width: '100%', padding: '14px',
        background: 'linear-gradient(135deg,#00b4d8,#0096c7)',
        border: 'none', borderRadius: '8px', color: '#fff',
        fontSize: '1rem', fontWeight: 700, letterSpacing: '.5px',
        cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', gap: '10px',
        transition: 'all 0.3s ease', marginTop: '4px',
    },
    footer: {
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '8px',
        marginTop: '28px', paddingTop: '20px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        color: '#6e7681', fontSize: '.75rem',
    },
};
