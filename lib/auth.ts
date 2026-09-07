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
        login_id: { label: "Login ID / Email / Branch Code", type: "text" },
        password: { label: "Password", type: "password" },
        portal: { label: "Portal Context", type: "text" },
        remember: { label: "Remember Me", type: "text" },
      },
      async authorize(credentials) {
        const identifier = credentials?.login_id?.trim();
        const password = credentials?.password;
        const portal = (credentials as any)?.portal?.trim()?.toLowerCase();

        if (!identifier || !password) {
          throw new Error("MISSING_CREDENTIALS: Username/email and password are required.");
        }

        try {
          // ==========================================
          // 1. STRICT PORTAL: BRANCH FLOOR PORTAL
          // ==========================================
          if (portal === "branch") {
            // Boundary Guard: Check if credential belongs to a corporate user
            const userCheck = await db.query(
              `SELECT role, name FROM users WHERE (LOWER(login_id) = LOWER($1) OR LOWER(email) = LOWER($2)) AND is_active = TRUE LIMIT 1`,
              [identifier, identifier]
            );
            if (userCheck.rows.length > 0) {
              const corporateRole = userCheck.rows[0].role;
              const targetPortal = corporateRole === "admin" ? "/admin/login" : "/manager/login";
              throw new Error(
                `PORTAL_MISMATCH: This account has '${corporateRole}' corporate privileges. Please sign in via the ${corporateRole === 'admin' ? 'Admin' : 'Manager'} Portal (${targetPortal}).`
              );
            }

            // Authenticate strictly against branches table
            const branchRes = await db.query(
              `SELECT * FROM branches 
                    WHERE (LOWER(email) = LOWER($1) OR LOWER(branch_code) = LOWER($2) OR LOWER(code) = LOWER($3)) 
                      AND is_active = TRUE 
                    LIMIT 1`,
              [identifier, identifier, identifier]
            );

            if (branchRes.rows.length === 0) {
              throw new Error("INVALID_CREDENTIALS: No active branch profile found matching these credentials.");
            }

            const branch: any = branchRes.rows[0];
            if (!branch.password_hash) {
              throw new Error("ACCOUNT_ERROR: Branch account credentials are not configured. Contact your administrator.");
            }

            const passwordsMatch = await bcrypt.compare(password, branch.password_hash);
            if (!passwordsMatch) {
              throw new Error("INVALID_CREDENTIALS: Incorrect branch password.");
            }

            return {
              id: branch.id as string,
              email: branch.email as string | null,
              role: "branch",
              branch_id: branch.id as string,
              name: branch.name as string,
              login_id: (branch.branch_code || branch.code || branch.email) as string,
              branch_code: (branch.branch_code || branch.code) as string,
              address: (branch.address || branch.location) as string,
              must_change_password: Boolean(branch.must_change_password),
              remember: credentials.remember === "true",
            };
          }

          // ==========================================
          // 2. STRICT PORTAL: EXECUTIVE ADMIN PORTAL
          // ==========================================
          if (portal === "admin") {
            // Boundary Guard: Check if credential belongs to a branch profile
            const branchCheck = await db.query(
              `SELECT name FROM branches WHERE (LOWER(email) = LOWER($1) OR LOWER(branch_code) = LOWER($2) OR LOWER(code) = LOWER($3)) AND is_active = TRUE LIMIT 1`,
              [identifier, identifier, identifier]
            );
            if (branchCheck.rows.length > 0) {
              throw new Error(
                "PORTAL_MISMATCH: Branch floor profiles cannot access the Executive Admin Portal. Please sign in via the Branch Portal (/branch/login)."
              );
            }

            // Authenticate strictly against users table for role='admin'
            console.log(`[AUTH-DEBUG] Admin portal lookup for identifier: '${identifier}'`);
            const userRes = await db.query(
              `SELECT * FROM users WHERE (LOWER(login_id) = LOWER($1) OR LOWER(email) = LOWER($2)) AND is_active = TRUE LIMIT 1`,
              [identifier, identifier]
            );
            console.log(`[AUTH-DEBUG] Admin portal found rows:`, userRes.rows.length);

            if (userRes.rows.length === 0) {
              throw new Error("INVALID_CREDENTIALS: No administrative account found matching these credentials.");
            }

            const user: any = userRes.rows[0];
            if (user.role !== "admin") {
              throw new Error(
                `PORTAL_MISMATCH: Access restricted to corporate administrators. Your account role is '${user.role}'. Please use the Manager Portal (/manager/login).`
              );
            }

            const passwordsMatch = await bcrypt.compare(password, user.password_hash as string);
            if (!passwordsMatch) {
              throw new Error("INVALID_CREDENTIALS: Incorrect password.");
            }

            return {
              id: user.id as string,
              email: user.email as string | null,
              role: "admin",
              branch_id: user.branch_id as string | null,
              name: user.name as string,
              login_id: user.login_id as string,
              must_change_password: Boolean(user.must_change_password),
              remember: credentials.remember === "true",
            };
          }

          // ==========================================
          // 3. STRICT PORTAL: MANAGER CORPORATE PORTAL
          // ==========================================
          if (portal === "manager") {
            // Boundary Guard: Check if credential belongs to a branch profile
            const branchCheck = await db.query(
              `SELECT name FROM branches WHERE (LOWER(email) = LOWER($1) OR LOWER(branch_code) = LOWER($2) OR LOWER(code) = LOWER($3)) AND is_active = TRUE LIMIT 1`,
              [identifier, identifier, identifier]
            );
            if (branchCheck.rows.length > 0) {
              throw new Error(
                "PORTAL_MISMATCH: Branch floor profiles cannot access the Manager Portal. Please sign in via the Branch Portal (/branch/login)."
              );
            }

            // Authenticate against users table where role IN ('manager', 'admin')
            const userRes = await db.query(
              `SELECT * FROM users WHERE (LOWER(login_id) = LOWER($1) OR LOWER(email) = LOWER($2)) AND is_active = TRUE LIMIT 1`,
              [identifier, identifier]
            );

            if (userRes.rows.length === 0) {
              throw new Error("INVALID_CREDENTIALS: No management account found matching these credentials.");
            }

            const user: any = userRes.rows[0];
            if (user.role !== "manager" && user.role !== "admin") {
              throw new Error(
                `PORTAL_MISMATCH: Access restricted to management. Your account role is '${user.role}'. Individual staff accounts are retired in favor of Branch Profiles.`
              );
            }

            const passwordsMatch = await bcrypt.compare(password, user.password_hash as string);
            if (!passwordsMatch) {
              throw new Error("INVALID_CREDENTIALS: Incorrect password.");
            }

            return {
              id: user.id as string,
              email: user.email as string | null,
              role: user.role as string,
              branch_id: user.branch_id as string | null,
              name: user.name as string,
              login_id: user.login_id as string,
              must_change_password: Boolean(user.must_change_password),
              remember: credentials.remember === "true",
            };
          }

          // ==========================================
          // 4. UNIFIED GATEWAY (No Portal Specified)
          // ==========================================
          // Check branches first
          const branchRes = await db.query(
            `SELECT * FROM branches 
                  WHERE (LOWER(email) = LOWER($1) OR LOWER(branch_code) = LOWER($2) OR LOWER(code) = LOWER($3)) 
                    AND is_active = TRUE 
                  LIMIT 1`,
            [identifier, identifier, identifier]
          );

          if (branchRes.rows.length > 0) {
            const branch: any = branchRes.rows[0];
            if (branch.password_hash) {
              const passwordsMatch = await bcrypt.compare(password, branch.password_hash);
              if (passwordsMatch) {
                return {
                  id: branch.id as string,
                  email: branch.email as string | null,
                  role: "branch",
                  branch_id: branch.id as string,
                  name: branch.name as string,
                  login_id: (branch.branch_code || branch.code || branch.email) as string,
                  branch_code: (branch.branch_code || branch.code) as string,
                  address: (branch.address || branch.location) as string,
                  must_change_password: Boolean(branch.must_change_password),
                  remember: credentials.remember === "true",
                };
              }
            }
          }

          // Check corporate users (manager or admin)
          const userRes = await db.query(
            `SELECT * FROM users 
                  WHERE (LOWER(login_id) = LOWER($1) OR LOWER(email) = LOWER($2)) 
                    AND is_active = TRUE 
                    AND role IN ('manager', 'admin') 
                  LIMIT 1`,
            [identifier, identifier]
          );

          if (userRes.rows.length > 0) {
            const user: any = userRes.rows[0];
            const passwordsMatch = await bcrypt.compare(password, user.password_hash as string);
            if (passwordsMatch) {
              return {
                id: user.id as string,
                email: user.email as string | null,
                role: user.role as string,
                branch_id: user.branch_id as string | null,
                name: user.name as string,
                login_id: user.login_id as string,
                must_change_password: Boolean(user.must_change_password),
                remember: credentials.remember === "true",
              };
            }
          }

          throw new Error("INVALID_CREDENTIALS: Invalid credentials. Please verify your username/email and password.");
        } catch (error: any) {
          console.error("Authorize error:", error?.message || error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update") {
        if (session?.must_change_password !== undefined) {
          token.must_change_password = session.must_change_password;
        } else if (token.role === "branch" && token.id) {
          try {
            const b = await db.query(
              "SELECT must_change_password FROM branches WHERE id = $1 LIMIT 1",
              [token.id as string]
            );
            if (b.rows.length > 0) {
              token.must_change_password = Boolean(b.rows[0].must_change_password);
            }
          } catch (e) {
            console.warn("Error refreshing branch token in jwt update:", e);
          }
        }
      }

      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.branch_id = (user as any).branch_id;
        token.must_change_password = (user as any).must_change_password;
        token.name = user.name;
        token.login_id = (user as any).login_id;
        token.branch_code = (user as any).branch_code;
        token.address = (user as any).address;

        // Custom expiry logic for remember me
        const remember = (user as any).remember;
        if (remember === false) {
          token.customExp = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 1 day instead of default
        }
      }

      // Check custom expiry
      if (token.customExp && Math.floor(Date.now() / 1000) > (token.customExp as number)) {
        return {} as any;
      }

      return token;
    },
    async session({ session, token }) {
      if (!token.id) {
        session.expires = "1970-01-01T00:00:00.000Z";
        return session;
      }

      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).branch_id = token.branch_id as string | null;
        (session.user as any).must_change_password = token.must_change_password;
        session.user.name = token.name as string;
        (session.user as any).login_id = token.login_id as string;
        (session.user as any).branch_code = token.branch_code as string | undefined;
        (session.user as any).address = token.address as string | undefined;
      }
      return session;
    },
  },
};
