import { redirect } from 'next/navigation';
import { signIn } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET /api/dev-switch?to=testN@test.com — dev-only instant user switch */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') redirect('/');
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('to') || '';
  if (!/^test[1-8]@test\.com$/.test(email)) redirect('/dev-login');
  await signIn('test-creds', { email, password: 'test', redirectTo: '/dev-login' });
}
