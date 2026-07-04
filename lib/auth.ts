import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { getDb } from './db';
import type { User } from './schema';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }),
    // ── DEV-ONLY test credential ──────────────────────────────────────────────
    // Accepts  test1@test.com … test8@test.com  with password "test".
    // Auto-creates 8 test groups and assigns each user to its group.
    // Disabled in production.
    ...(process.env.NODE_ENV !== 'production' ? [
      Credentials({
        id: 'test-creds',
        name: 'Test (dev only)',
        credentials: {
          email: { label: 'Email (testN@test.com)', type: 'text' },
          password: { label: 'Password (test)', type: 'password' }
        },
        async authorize(credentials) {
          if (!credentials) return null;
          const email = String(credentials.email || '');
          const pw = String(credentials.password || '');
          if (pw !== 'test') return null;
          const m = email.match(/^test([1-8])@test\.com$/);
          if (!m) return null;
          const n = parseInt(m[1]);
          const uid = `test_uid_${n}`;
          const groupId = `test_group_${n}`;
          const groupName = `Nhóm ${n}`;
          const name = `Test User ${n}`;
          try {
            const db = getDb();
            db.prepare(`INSERT OR IGNORE INTO groups (id, name) VALUES (?, ?)`).run(groupId, groupName);
            db.prepare(
              `INSERT INTO users (uid, email, name, avatar, group_id) VALUES (?, ?, ?, NULL, ?)
               ON CONFLICT(uid) DO UPDATE SET name=excluded.name, group_id=excluded.group_id`
            ).run(uid, email, name, groupId);
            db.prepare(`UPDATE groups SET member_count = (SELECT COUNT(*) FROM users WHERE group_id = ?) WHERE id = ?`).run(groupId, groupId);
          } catch (e) {
            console.error('[auth] test user upsert failed', e);
            return null;
          }
          return { id: uid, email, name };
        }
      })
    ] : [])
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account) return false;
      // test-creds provider in dev: user already upserted in authorize()
      if (account.provider === 'test-creds') return true;
      if (account.provider !== 'google') return false;
      const uid = account.providerAccountId;
      const email = user.email || (profile?.email as string | undefined);
      const name = user.name || (profile?.name as string | undefined) || 'Người dùng';
      const avatar = user.image || (profile?.picture as string | undefined) || null;
      if (!email) return false;
      try {
        const db = getDb();
        db.prepare(
          `INSERT INTO users (uid, email, name, avatar)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(uid) DO UPDATE SET name=excluded.name, avatar=excluded.avatar, email=excluded.email`
        ).run(uid, email, name, avatar);
      } catch (e) {
        console.error('[auth] upsert failed', e);
        return false;
      }
      return true;
    },
    async jwt({ token, account, profile, user }) {
      if (account?.provider === 'google') {
        token.uid = account.providerAccountId;
        token.picture = (profile?.picture as string) || token.picture;
        token.name = (profile?.name as string) || token.name;
      }
      if (account?.provider === 'test-creds' && user) {
        token.uid = (user as any).id;
      }
      if (user && !token.uid) {
        token.uid = (user as any).id ?? token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      const uid = (token.uid as string) || (token.sub as string);
      try {
        const db = getDb();
        const row = db.prepare('SELECT * FROM users WHERE uid = ?').get(uid) as User | undefined;
        if (session.user) {
          (session.user as any).uid = uid;
          (session.user as any).groupId = row?.group_id ?? null;
          (session.user as any).totalScore = row?.total_score ?? 0;
        }
      } catch (e) {
        console.error('[auth] session lookup failed', e);
      }
      return session;
    }
  },
  pages: {
    signIn: '/'
  }
});
