import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { getDb } from './db';
import type { User } from './schema';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || account.provider !== 'google') return false;
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
