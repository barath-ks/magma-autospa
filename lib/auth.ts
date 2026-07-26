import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        login_id: { label: "Login ID", type: "text" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember Me", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.login_id || !credentials?.password) {
          return null;
        }

        try {
          const result = await db.execute({
            sql: "SELECT * FROM users WHERE login_id = ?",
            args: [credentials.login_id],
          });

          const user = result.rows[0];

          if (!user) {
            return null;
          }

          const passwordsMatch = await bcrypt.compare(
            credentials.password,
            user.password_hash as string
          );

          if (!passwordsMatch) {
            return null;
          }

          return {
            id: user.id as string,
            email: user.email as string | null,
            role: user.role as string,
            branch_id: user.branch_id as string | null,
            must_change_password: Boolean(user.must_change_password),
            remember: credentials.remember === "true",
          };
        } catch (error) {
          console.error("Authorize error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Handle session updates (e.g. after changing password)
      if (trigger === "update" && session?.must_change_password !== undefined) {
        token.must_change_password = session.must_change_password;
      }

      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.branch_id = (user as any).branch_id;
        token.must_change_password = (user as any).must_change_password;
        
        // Custom expiry logic for remember me
        const remember = (user as any).remember;
        if (remember === false) {
          token.customExp = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 1 day instead of default
        }
      }
      
      // Check custom expiry
      if (token.customExp && Math.floor(Date.now() / 1000) > (token.customExp as number)) {
        return {} as any; // Return empty to expire token
      }
      
      return token;
    },
    async session({ session, token }) {
      if (!token.id) {
        // Force expire session if token is empty
        session.expires = "1970-01-01T00:00:00.000Z";
        return session;
      }

      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).branch_id = token.branch_id as string | null;
        (session.user as any).must_change_password = token.must_change_password;
      }
      return session;
    },
  },
};
