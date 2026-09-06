import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      branch_id: string | null;
      branch_code?: string;
      address?: string;
      login_id?: string;
      must_change_password?: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
    branch_id: string | null;
    branch_code?: string;
    address?: string;
    login_id?: string;
    must_change_password?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    branch_id: string | null;
    branch_code?: string;
    address?: string;
    login_id?: string;
    must_change_password?: boolean;
    customExp?: number;
  }
}
