import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const inputLogin = credentials.email.trim();
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: inputLogin },
              { email: inputLogin.toLowerCase() },
              { email: inputLogin.replace('@abacusai.app', '') },
              { email: `${inputLogin}@abacusai.app` },
              { email: inputLogin.replace('@gmail.com', '') },
              { email: `${inputLogin}@gmail.com` }
            ]
          },
        });

        if (!user || !user.password) {
          return null;
        }

        let isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) {
          isPasswordValid = await bcrypt.compare(credentials.password.toLowerCase(), user.password);
        }
        if (!isPasswordValid) {
          const capitalized = credentials.password.charAt(0).toUpperCase() + credentials.password.slice(1);
          isPasswordValid = await bcrypt.compare(capitalized, user.password);
        }

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
