import { redirect } from 'next/navigation';
import { auth, signIn, signOut } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DevLoginPage() {
  if (process.env.NODE_ENV === 'production') redirect('/');
  const session = await auth();

  async function doSwitchUser(formData: FormData) {
    'use server';
    if (process.env.NODE_ENV === 'production') return;
    const email = formData.get('email') as string;
    if (!/^test[1-8]@test\.com$/.test(email)) return;
    // Sign out then redirect to the dev-switch API which signs in as new user
    await signOut({ redirectTo: `/api/dev-switch?to=${encodeURIComponent(email)}` });
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F7F4' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #D4E8DF' }}>
        <h1 style={{ fontFamily: 'serif', fontSize: 22, marginBottom: 4, color: '#1A2E25' }}>Dev Login</h1>
        <p style={{ fontSize: 13, color: '#6B7D74', marginBottom: 16 }}>
          {session?.user ? `Đang đăng nhập là ${session.user.email}` : 'Chỉ dùng trong development'}
        </p>

        {session?.user && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            <a href="/api/dev-create?game=describe" style={btnStyle('#2E8B6B')}>➕ Tạo phòng Mô Tả & Đoán Thẻ</a>
            <a href="/api/dev-create?game=debate" style={btnStyle('#4A90D9')}>➕ Tạo phòng Tranh Luận</a>
          </div>
        )}

        <form action={doSwitchUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#6B7D74', display: 'block', marginBottom: 4 }}>
              {session?.user ? 'Chuyển sang tài khoản khác' : 'Đăng nhập'}
            </label>
            <select name="email" style={inputStyle}>
              {[1,2,3,4,5,6,7,8].map(n => (
                <option key={n} value={`test${n}@test.com`}>test{n}@test.com — Nhóm {n}{n === 1 ? ' (quản trò)' : ''}</option>
              ))}
            </select>
          </div>
          <button type="submit" style={btnStyle('#F4A261')}>
            {session?.user ? '🔄 Đổi tài khoản' : '🔑 Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid #D4E8DF', fontSize: 13, background: '#F0F7F4', boxSizing: 'border-box' as const };
function btnStyle(bg: string) { return { display: 'block', width: '100%', padding: '10px 16px', borderRadius: 10, background: bg, color: '#fff', fontWeight: 600, textAlign: 'center' as const, fontSize: 14, cursor: 'pointer', textDecoration: 'none', border: 'none' }; }
