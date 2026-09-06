"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Briefcase, ArrowRight, ShieldAlert, Layers } from "lucide-react";
import Image from "next/image";

function ManagerLoginForm() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role === "manager") {
        router.push("/manager");
      } else if (role === "admin") {
        router.push("/admin");
      }
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      login_id: identifier.trim(),
      password,
      portal: "manager",
      remember: remember.toString(),
    });

    if (res?.error) {
      const cleanMsg = res.error.replace("Error: ", "").replace("UNAUTHORIZED_PORTAL: ", "").replace("PORTAL_MISMATCH: ", "");
      setError(cleanMsg || "Invalid manager credentials. Access restricted.");
      setLoading(false);
    } else {
      router.push("/manager");
    }
  };

  if (status === "loading" || (status === "authenticated" && (session?.user as any)?.role === "manager")) {
    return (
      <div className="text-text-primary z-20 relative font-mono text-sm font-bold flex items-center gap-2">
        <Briefcase className="animate-spin text-accent-gold" size={18} />
        <span>Authenticating branch management session...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm z-20">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-accent-gold/10 border border-accent-gold/30 text-accent-gold text-[10px] font-mono uppercase tracking-widest font-bold mb-3">
          <Briefcase size={13} /> Branch Operations &amp; Management
        </div>
        <span className="text-accent-gold font-mono text-[11px] uppercase tracking-[0.15em] font-bold block mb-1">
          MANAGER ACCESS
        </span>
        <h2 className="text-2xl font-serif font-semibold text-text-primary tracking-tight">
          Branch Management Portal
        </h2>
        <p className="text-text-secondary text-xs mt-1">
          Authorized management login for financial audits, roster approvals, and operations oversight.
        </p>
      </div>

      {error && (
        <div className="mb-6 text-[#ff6b6b] bg-[#3a1616] p-3.5 text-xs font-mono border border-[#521d1d] leading-relaxed">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
            Manager ID or Email
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="block w-full border border-border-hairline bg-bg-base p-3 text-text-primary font-mono text-sm placeholder:text-text-secondary/40 focus:border-accent-gold focus:outline-none focus:ring-1 focus:ring-accent-gold transition-all uppercase tracking-wider"
            placeholder="e.g. MGR-0001 or test_manager"
            required
            autoComplete="username"
          />
        </div>

        <div>
          <div className="flex justify-between items-end mb-2">
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest">
              Manager Password
            </label>
            <Link
              href="/auth/forgot-password?role=manager"
              className="text-[11px] font-medium text-text-secondary hover:text-accent-gold transition-colors"
            >
              Forgot Key?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full border border-border-hairline bg-bg-base p-3 pr-10 text-text-primary font-mono text-sm placeholder:text-text-secondary/40 focus:border-accent-gold focus:outline-none focus:ring-1 focus:ring-accent-gold transition-all"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-text-primary transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center">
          <input
            id="remember-mgr"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 bg-bg-base border-border-hairline rounded text-accent-gold focus:ring-accent-gold cursor-pointer"
          />
          <label htmlFor="remember-mgr" className="ml-2 block text-xs text-text-secondary cursor-pointer">
            Remember management session (24h)
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent-gold text-bg-base hover:brightness-110 p-3 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
        >
          <span>{loading ? "Authenticating..." : "Access Manager Portal"}</span>
          <ArrowRight size={14} />
        </button>
      </form>

      {/* Alternative Portals */}
      <div className="mt-8 pt-6 border-t border-border-hairline space-y-2 text-center font-mono text-xs">
        <div className="text-text-secondary text-[11px] uppercase tracking-wider mb-2">
          Other Operational Portals
        </div>
        <div className="flex justify-center gap-4">
          <Link
            href="/branch/login"
            className="text-text-secondary hover:text-accent-copper transition-colors flex items-center gap-1 uppercase tracking-wider text-[11px]"
          >
            <Layers size={12} />
            <span>Branch Floor</span>
          </Link>
          <span className="text-text-secondary/40">&bull;</span>
          <Link
            href="/admin/login"
            className="text-text-secondary hover:text-accent-oxblood transition-colors flex items-center gap-1 uppercase tracking-wider text-[11px]"
          >
            <ShieldAlert size={12} />
            <span>Executive Admin</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ManagerLoginPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center p-6 bg-bg-base overflow-hidden selection:bg-accent-gold/30">
      {/* Background Graphic */}
      <div className="absolute inset-0 pointer-events-none opacity-10 flex items-center justify-center mix-blend-screen">
        <Image
          src="/blueprint-car.jpg"
          alt="Magma Autospa Blueprint"
          width={1200}
          height={800}
          className="object-cover w-full h-full"
          priority
        />
      </div>

      <div className="w-full max-w-md bg-bg-panel border border-border-hairline p-8 md:p-10 shadow-2xl relative z-10">
        <Suspense fallback={<div className="text-text-primary font-mono text-xs">Loading manager portal...</div>}>
          <ManagerLoginForm />
        </Suspense>
      </div>
    </main>
  );
}
