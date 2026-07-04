import { redirect } from 'next/navigation';
import { auth, signIn } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DevLoginPage() {
  if (process.env.NODE_ENV === 'production') redirect('/');
  const session = await auth();

  async function doLogin(formData: FormData) {
    'use server';
    if (process.env.NODE_ENV === 'production') return;
    const email = formData.get('email') as string;
    await signIn('test-creds', { email, password: 'test', redirectTo: '/game/describe' });
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F7F4' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #D4E8DF' }}>
        <h1 style={{ fontFamily: 'serif', fontSize: 22, marginBottom: 4, color: '#1A2E25' }}>Dev Login</h1>
        <p style={{ fontSize: 13, color: '#6B7D74', marginBottom: 20 }}>
          {session?.user ? `Đang đăng nhập là ${session.user.email}` : 'Chỉ dùng trong development'}
        </p>

        {session?.user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href="/game/describe" style={btnStyle('#2E8B6B')}>→ Mô Tả &amp; Đoán Thẻ</a>
            <a href="/game/debate" style={btnStyle('#4A90D9')}>→ Nghị Trường Tranh Luận</a>
            <a href="/api/auth/signout" style={btnStyle('#E05C5C')}>Đăng xuất</a>
          </div>
        ) : (
          <form action={doLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#6B7D74', display: 'block', marginBottom: 4 }}>Email (test1@test.com … test8@test.com)</label>
              <select name="email" style={inputStyle} defaultValue="test1@test.com">
                {[1,2,3,4,5,6,7,8].map(n => (
                  <option key={n} value={`test${n}@test.com`}>test{n}@test.com — Nhóm {n} (quản trò: nhóm 1)</option>
                ))}
              </select>
            </div>
            <button type="submit" style={btnStyle('#2E8B6B')}>Đăng nhập thử nghiệm</button>
          </form>
        )}
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid #D4E8DF', fontSize: 13, background: '#F0F7F4', boxSizing: 'border-box' as const };
function btnStyle(bg: string) { return { display: 'block', width: '100%', padding: '10px 16px', borderRadius: 10, background: bg, color: '#fff', fontWeight: 600, textAlign: 'center' as const, fontSize: 14, cursor: 'pointer', textDecoration: 'none', border: 'none' }; }
