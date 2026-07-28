import { useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function ChangePassword() {
    const [showPass, setShowPass] = useState(false);
    const { data, setData, post, processing, errors } = useForm({
        password: '', password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.update'));
    };

    return (
        <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0a0e14',padding:'20px'}}>
            <div style={{width:'100%',maxWidth:'420px',background:'#212631',borderRadius:'16px',border:'1px solid rgba(255,255,255,.08)',padding:'40px',boxShadow:'0 24px 64px rgba(0,0,0,.5)'}}>
                <div style={{textAlign:'center',marginBottom:'28px'}}>
                    <div style={{width:'56px',height:'56px',borderRadius:'14px',background:'linear-gradient(135deg,#ffd43b,#f59e0b)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:'1.6rem',color:'#fff'}}>
                        <i className="fas fa-key" />
                    </div>
                    <h1 style={{fontSize:'1.4rem',fontWeight:800,color:'#e6edf3'}}>Ganti Password</h1>
                    <p style={{color:'#8b949e',fontSize:'.85rem',marginTop:'6px'}}>Anda wajib mengganti password sebelum melanjutkan</p>
                </div>

                <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:'18px'}}>
                    <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                        <label style={{fontSize:'.72rem',fontWeight:700,color:'#8b949e',letterSpacing:'.8px'}}>PASSWORD BARU</label>
                        <div style={{position:'relative'}}>
                            <input
                                type={showPass ? 'text' : 'password'}
                                style={{width:'100%',padding:'12px 42px 12px 14px',background:'rgba(255,255,255,.04)',border:`1px solid ${errors.password?'#ff6b6b':'#2a3140'}`,borderRadius:'8px',color:'#e6edf3',fontSize:'.9rem',outline:'none'}}
                                value={data.password}
                                onChange={e => setData('password', e.target.value)}
                                placeholder="Min. 8 karakter"
                            />
                            <button type="button" onClick={() => setShowPass(!showPass)}
                                style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#ffffff',cursor:'pointer',fontSize:'.9rem'}}>
                                <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                            </button>
                        </div>
                        {errors.password && <span style={{color:'#ff6b6b',fontSize:'.75rem'}}>{errors.password}</span>}
                    </div>

                    <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                        <label style={{fontSize:'.72rem',fontWeight:700,color:'#8b949e',letterSpacing:'.8px'}}>KONFIRMASI PASSWORD</label>
                        <input
                            type="password"
                            style={{width:'100%',padding:'12px 14px',background:'rgba(255,255,255,.04)',border:'1px solid #2a3140',borderRadius:'8px',color:'#e6edf3',fontSize:'.9rem',outline:'none'}}
                            value={data.password_confirmation}
                            onChange={e => setData('password_confirmation', e.target.value)}
                            placeholder="Ulangi password baru"
                        />
                    </div>

                    <button type="submit" disabled={processing}
                        style={{padding:'13px',background:'linear-gradient(135deg,#ffd43b,#f59e0b)',border:'none',borderRadius:'8px',color:'#0a0e14',fontWeight:800,fontSize:'1rem',cursor:'pointer',marginTop:'4px'}}>
                        {processing ? 'Menyimpan...' : 'Simpan & Lanjutkan'}
                    </button>
                </form>
            </div>
        </div>
    );
}
