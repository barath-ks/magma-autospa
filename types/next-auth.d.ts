import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      branch_id: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
    branch_id: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    branch_id: string | null;
  }
}
