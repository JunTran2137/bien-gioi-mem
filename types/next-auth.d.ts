import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      uid: string;
      groupId: string | null;
      totalScore: number;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
  }
}
